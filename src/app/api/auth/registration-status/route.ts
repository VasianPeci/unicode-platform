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
      select: { email: true, role: true, isActive: true, emailVerifiedAt: true },
    })

    if (!user) {
      return NextResponse.json({ data: { registered: false, verified: false, approved: false, pendingApproval: false } })
    }

    const verified = Boolean(user.emailVerifiedAt || user.isActive)
    const verification = verified ? null : await getLatestVerification(normalizedEmail)

    return NextResponse.json({
      data: {
        registered: true,
        verified,
        approved: user.isActive,
        pendingApproval: verified && !user.isActive,
        email: user.email,
        role: user.role,
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
