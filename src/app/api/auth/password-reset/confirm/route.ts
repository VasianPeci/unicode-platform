import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { normalizeEmail } from '@/lib/emailVerification'
import { prisma } from '@/lib/prisma'
import { verifySecurityCode } from '@/lib/securityCodes'

const confirmPasswordResetSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, code, password } = confirmPasswordResetSchema.parse(body)
    const normalizedEmail = normalizeEmail(email)

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, isActive: true, emailVerifiedAt: true },
    })

    if (!user || (!user.emailVerifiedAt && !user.isActive)) {
      return NextResponse.json({ error: 'Invalid or expired reset code.' }, { status: 400 })
    }

    const verification = await verifySecurityCode({
      userId: user.id,
      email: user.email,
      purpose: 'PASSWORD_RESET',
      code,
    })

    if (!verification.ok && verification.reason === 'expired') {
      return NextResponse.json({ error: 'Reset code expired. Send a new code and try again.' }, { status: 400 })
    }

    if (!verification.ok) {
      return NextResponse.json({ error: 'Invalid reset code.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ message: 'Password reset. Sign in with your new password.' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Enter the reset code and a new password with at least 8 characters.' }, { status: 400 })
    }

    console.error('[Password Reset Confirm Error]', error)
    return NextResponse.json({ error: 'Unable to reset password.' }, { status: 500 })
  }
}
