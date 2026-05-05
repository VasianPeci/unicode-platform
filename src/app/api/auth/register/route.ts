import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  universityDomain: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, universityDomain } = registerSchema.parse(body)

    // Find university by domain
    const emailDomain = email.split('@')[1]
    const university = await prisma.university.findFirst({
      where: {
        OR: [
          { domain: emailDomain },
          { domain: universityDomain },
        ],
      },
    })

    if (!university) {
      return NextResponse.json(
        { error: 'Your email domain is not associated with any registered university.' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'STUDENT',
        universityId: university.id,
      },
      select: { id: true, email: true, name: true, role: true },
    })

    return NextResponse.json({ data: user, message: 'Account created successfully.' }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data.', details: error.errors }, { status: 400 })
    }
    console.error('[Register Error]', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
