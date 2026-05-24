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
  role: z.enum(['STUDENT', 'TEACHER']),
  universityId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  let createdUserId: string | null = null

  try {
    const body = await req.json()
    const { name, email, password, role, universityId } = registerSchema.parse(body)
    const normalizedEmail = normalizeEmail(email)

    const university = await prisma.university.findUnique({ where: { id: universityId } })

    if (!university) {
      return NextResponse.json(
        { error: 'Choose a registered university.' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
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

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data.', details: error.errors }, { status: 400 })
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
