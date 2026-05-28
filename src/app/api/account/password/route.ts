import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { currentPassword, newPassword } = passwordSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    })

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    const currentPasswordMatches = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!currentPasswordMatches) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ message: 'Password updated.' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Enter your current password and a new password with at least 8 characters.' }, { status: 400 })
    }

    console.error('[Password Update Error]', error)
    return NextResponse.json({ error: 'Unable to update password.' }, { status: 500 })
  }
}
