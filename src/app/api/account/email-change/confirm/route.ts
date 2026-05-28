import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { normalizeEmail } from '@/lib/emailVerification'
import { prisma } from '@/lib/prisma'
import { verifySecurityCode } from '@/lib/securityCodes'

const confirmEmailChangeSchema = z.object({
  newEmail: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { newEmail, code } = confirmEmailChangeSchema.parse(body)
    const normalizedNewEmail = normalizeEmail(newEmail)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true },
    })

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    if (normalizeEmail(user.email) === normalizedNewEmail) {
      return NextResponse.json({ error: 'Enter a different email address.' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedNewEmail },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const verification = await verifySecurityCode({
      userId: user.id,
      email: user.email,
      purpose: 'EMAIL_CHANGE',
      code,
    })

    if (!verification.ok && verification.reason === 'expired') {
      return NextResponse.json({ error: 'Confirmation code expired. Send a new code and try again.' }, { status: 400 })
    }

    if (!verification.ok) {
      return NextResponse.json({ error: 'Invalid confirmation code.' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: normalizedNewEmail,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        totalPoints: true,
        avatarUrl: true,
      },
    })

    return NextResponse.json({ data: updated, message: 'Email updated.' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Enter the new email and 6-digit confirmation code.' }, { status: 400 })
    }

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    console.error('[Email Change Confirm Error]', error)
    return NextResponse.json({ error: 'Unable to update email.' }, { status: 500 })
  }
}
