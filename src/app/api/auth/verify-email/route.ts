import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeEmail, verifyEmailCode } from '@/lib/emailVerification'

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, code } = verifySchema.parse(body)
    const result = await verifyEmailCode(normalizeEmail(email), code)

    if (!result.ok && result.reason === 'expired') {
      return NextResponse.json({ error: 'Confirmation code expired. Send a new code and try again.' }, { status: 400 })
    }

    if (!result.ok) {
      return NextResponse.json({ error: 'Invalid confirmation code.' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Email confirmed. Registration complete.' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Enter the 6-digit confirmation code.' }, { status: 400 })
    }

    console.error('[Verify Email Error]', error)
    return NextResponse.json({ error: 'Unable to confirm email.' }, { status: 500 })
  }
}
