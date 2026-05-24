import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getLatestVerification, normalizeEmail } from '@/lib/emailVerification'

const statusSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = statusSchema.parse(body)
    const normalizedEmail = normalizeEmail(email)

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { email: true, isActive: true },
    })

    if (!user) {
      return NextResponse.json({ data: { registered: false, verified: false } })
    }

    const verification = user.isActive ? null : await getLatestVerification(normalizedEmail)

    return NextResponse.json({
      data: {
        registered: true,
        verified: user.isActive,
        email: user.email,
        expiresAt: verification?.expiresAt || null,
      },
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }

    console.error('[Registration Status Error]', error)
    return NextResponse.json({ error: 'Unable to check registration status.' }, { status: 500 })
  }
}
