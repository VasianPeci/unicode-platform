import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createEmailVerificationCode, normalizeEmail, VERIFICATION_WINDOW_MINUTES } from '@/lib/emailVerification'
import { EmailDeliveryError, sendRegistrationCode } from '@/lib/mail'

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT'),
  registerNewUniversity: z.boolean().default(false),
  universityId: z.string().uuid().optional(),
  universityName: z.string().min(2).max(120).optional(),
  universityDomain: z.string().min(3).max(120).optional(),
})

function normalizeDomain(domain: string) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .replace(/^@/, '')
}

export async function POST(req: NextRequest) {
  let createdUserId: string | null = null
  let createdUniversityId: string | null = null

  try {
    const body = await req.json()
    const {
      name,
      email,
      password,
      role,
      registerNewUniversity,
      universityId,
      universityName,
      universityDomain,
    } = registerSchema.parse(body)
    const normalizedEmail = normalizeEmail(email)

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = registerNewUniversity
      ? await prisma.$transaction(async tx => {
          const normalizedDomain = normalizeDomain(universityDomain || '')
          const cleanUniversityName = universityName?.trim() || ''

          if (!cleanUniversityName || !normalizedDomain) {
            throw new Error('NEW_UNIVERSITY_DETAILS_REQUIRED')
          }

          if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalizedDomain)) {
            throw new Error('INVALID_UNIVERSITY_DOMAIN')
          }

          const existingUniversity = await tx.university.findFirst({
            where: {
              OR: [
                { domain: normalizedDomain },
                { name: { equals: cleanUniversityName, mode: 'insensitive' } },
              ],
            },
            select: { id: true },
          })

          if (existingUniversity) {
            throw new Error('UNIVERSITY_ALREADY_EXISTS')
          }

          const university = await tx.university.create({
            data: {
              name: cleanUniversityName,
              domain: normalizedDomain,
            },
          })
          createdUniversityId = university.id

          return tx.user.create({
            data: {
              name,
              email: normalizedEmail,
              passwordHash,
              role: 'ADMIN',
              isActive: false,
              universityId: university.id,
            },
            select: { id: true, email: true, name: true, role: true },
          })
        })
      : await prisma.$transaction(async tx => {
          if (!universityId) {
            throw new Error('UNIVERSITY_REQUIRED')
          }

          const university = await tx.university.findUnique({ where: { id: universityId } })

          if (!university) {
            throw new Error('UNIVERSITY_NOT_FOUND')
          }

          return tx.user.create({
            data: {
              name,
              email: normalizedEmail,
              passwordHash,
              role,
              isActive: false,
              universityId: university.id,
            },
            select: { id: true, email: true, name: true, role: true },
          })
        })
    createdUserId = user.id

    const verification = await createEmailVerificationCode(user.id, normalizedEmail)
    await sendRegistrationCode(normalizedEmail, verification.code, VERIFICATION_WINDOW_MINUTES)

    return NextResponse.json({
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        expiresAt: verification.expiresAt,
      },
      message: 'Confirmation code sent. Confirm your email within 5 minutes to finish registration.',
    }, { status: 201 })
  } catch (error: any) {
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => null)
    }
    if (createdUniversityId) {
      await prisma.university.delete({ where: { id: createdUniversityId } }).catch(() => null)
    }

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data.', details: error.errors }, { status: 400 })
    }

    if (error.message === 'UNIVERSITY_REQUIRED' || error.message === 'UNIVERSITY_NOT_FOUND') {
      return NextResponse.json({ error: 'Choose a registered university.' }, { status: 400 })
    }

    if (error.message === 'NEW_UNIVERSITY_DETAILS_REQUIRED') {
      return NextResponse.json({ error: 'Enter the university name and domain.' }, { status: 400 })
    }

    if (error.message === 'INVALID_UNIVERSITY_DOMAIN') {
      return NextResponse.json({ error: 'Enter a valid university domain, for example university.edu.' }, { status: 400 })
    }

    if (error.message === 'UNIVERSITY_ALREADY_EXISTS' || error.code === 'P2002') {
      return NextResponse.json({ error: 'This university is already registered. Choose it from the list or contact its admin.' }, { status: 409 })
    }

    if (String(error.message || '').includes('SENDGRID_API_KEY') || String(error.message || '').includes('SENDGRID_FROM_EMAIL')) {
      return NextResponse.json({ error: 'Email confirmation is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL, then try again.' }, { status: 503 })
    }

    if (error instanceof EmailDeliveryError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    console.error('[Register Error]', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
