import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Only students can join contests' }, { status: 403 })
  }

  const contest = await prisma.contest.findFirst({
    where: {
      id: params.id,
      createdBy: { universityId: session.user.universityId },
    },
    select: { startsAt: true, endsAt: true },
  })

  if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 })

  const now = new Date()
  if (now > contest.endsAt) {
    return NextResponse.json({ error: 'Contest has already ended' }, { status: 400 })
  }

  await prisma.contestParticipant.upsert({
    where: { contestId_userId: { contestId: params.id, userId: session.user.id } },
    create: { contestId: params.id, userId: session.user.id },
    update: {},
  })

  return NextResponse.json({ success: true })
}
