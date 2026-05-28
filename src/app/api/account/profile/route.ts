import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name } = profileSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        totalPoints: true,
        avatarUrl: true,
      },
    })

    return NextResponse.json({ data: user, message: 'Profile updated.' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Enter a name between 2 and 100 characters.' }, { status: 400 })
    }

    console.error('[Profile Update Error]', error)
    return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 })
  }
}
