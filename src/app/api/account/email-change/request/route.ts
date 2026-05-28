import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { normalizeEmail } from '@/lib/emailVerification'
import { EmailDeliveryError, sendEmailChangeCode } from '@/lib/mail'
import { prisma } from '@/lib/prisma'
import { createSecurityCode, SECURITY_CODE_WINDOW_MINUTES } from '@/lib/securityCodes'

const requestEmailChangeSchema = z.object({
  newEmail: z.string().email(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { newEmail } = requestEmailChangeSchema.parse(body)
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

    const securityCode = await createSecurityCode(user.id, user.email, 'EMAIL_CHANGE')
    await sendEmailChangeCode(user.email, securityCode.code, SECURITY_CODE_WINDOW_MINUTES)

    return NextResponse.json({
      data: {
        email: user.email,
        expiresAt: securityCode.expiresAt,
      },
      message: 'A confirmation code has been sent to your current email.',
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Enter a valid new email address.' }, { status: 400 })
    }

    if (String(error.message || '').includes('SENDGRID_API_KEY') || String(error.message || '').includes('SENDGRID_FROM_EMAIL')) {
      return NextResponse.json({ error: 'Email delivery is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL, then try again.' }, { status: 503 })
    }

    if (error instanceof EmailDeliveryError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    console.error('[Email Change Request Error]', error)
    return NextResponse.json({ error: 'Unable to send confirmation code.' }, { status: 500 })
  }
}
