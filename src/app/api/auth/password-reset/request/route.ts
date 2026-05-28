import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeEmail } from '@/lib/emailVerification'
import { EmailDeliveryError, sendPasswordResetCode } from '@/lib/mail'
import { prisma } from '@/lib/prisma'
import { createSecurityCode, SECURITY_CODE_WINDOW_MINUTES } from '@/lib/securityCodes'

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
})

const genericMessage = 'If that email belongs to an account, a reset code has been sent.'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = requestPasswordResetSchema.parse(body)
    const normalizedEmail = normalizeEmail(email)

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, isActive: true, emailVerifiedAt: true },
    })

    if (!user || (!user.emailVerifiedAt && !user.isActive)) {
      return NextResponse.json({ message: genericMessage })
    }

    const securityCode = await createSecurityCode(user.id, user.email, 'PASSWORD_RESET')
    await sendPasswordResetCode(user.email, securityCode.code, SECURITY_CODE_WINDOW_MINUTES)

    return NextResponse.json({
      data: { email: user.email, expiresAt: securityCode.expiresAt },
      message: genericMessage,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }

    if (String(error.message || '').includes('SENDGRID_API_KEY') || String(error.message || '').includes('SENDGRID_FROM_EMAIL')) {
      return NextResponse.json({ error: 'Email delivery is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL, then try again.' }, { status: 503 })
    }

    if (error instanceof EmailDeliveryError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    console.error('[Password Reset Request Error]', error)
    return NextResponse.json({ error: 'Unable to send reset code.' }, { status: 500 })
  }
}
