import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contest = await prisma.contest.findFirst({
    where: {
      id: params.id,
      createdBy: { universityId: session.user.universityId },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      problems: {
        where: { problem: { isPublished: true } },
        orderBy: { orderIndex: 'asc' },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true,
              difficulty: true,
              points: true,
            },
          },
        },
      },
      participants: {
        where: { userId: session.user.id, user: { role: 'STUDENT' } },
        select: { joinedAt: true },
      },
      _count: { select: { participants: { where: { user: { role: 'STUDENT' } } } } },
    },
  })

  if (!contest) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const status = now < contest.startsAt ? 'UPCOMING' : now > contest.endsAt ? 'ENDED' : 'ACTIVE'

  return NextResponse.json({
    data: {
      ...contest,
      startsAt: contest.startsAt.toISOString(),
      endsAt: contest.endsAt.toISOString(),
      createdAt: contest.createdAt.toISOString(),
      status,
      isJoined: session.user.role === 'STUDENT' && contest.participants.length > 0,
    },
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'TEACHER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const contest = await prisma.contest.findUnique({
    where: { id: params.id },
    select: {
      createdById: true,
      createdBy: { select: { universityId: true } },
    },
  })

  if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
  if (contest.createdBy.universityId !== session.user.universityId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (session.user.role === 'TEACHER' && contest.createdById !== session.user.id) {
    return NextResponse.json({ error: 'You can only remove contests you created' }, { status: 403 })
  }

  await prisma.submission.updateMany({
    where: { contestId: params.id },
    data: { contestId: null },
  })

  await prisma.contest.delete({ where: { id: params.id } })

  return NextResponse.json({ message: 'Contest removed' })
}
