import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createEmailVerificationCode, normalizeEmail, VERIFICATION_WINDOW_MINUTES } from '@/lib/emailVerification'
import { EmailDeliveryError, sendRegistrationCode } from '@/lib/mail'

const resendSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = resendSchema.parse(body)
    const normalizedEmail = normalizeEmail(email)

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, isActive: true, emailVerifiedAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'No pending registration was found for this email.' }, { status: 404 })
    }

    if (user.emailVerifiedAt || user.isActive) {
      return NextResponse.json({ error: 'This email is already confirmed.' }, { status: 400 })
    }

    const verification = await createEmailVerificationCode(user.id, normalizedEmail)
    await sendRegistrationCode(normalizedEmail, verification.code, VERIFICATION_WINDOW_MINUTES)

    return NextResponse.json({
      data: { email: user.email, expiresAt: verification.expiresAt },
      message: 'A new confirmation code has been sent.',
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }

    if (String(error.message || '').includes('SENDGRID_API_KEY') || String(error.message || '').includes('SENDGRID_FROM_EMAIL')) {
      return NextResponse.json({ error: 'Email confirmation is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL, then try again.' }, { status: 503 })
    }

    if (error instanceof EmailDeliveryError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    console.error('[Email Verification Resend Error]', error)
    return NextResponse.json({ error: 'Unable to send confirmation code.' }, { status: 500 })
  }
}
