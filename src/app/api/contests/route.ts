import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contests = await prisma.contest.findMany({
    orderBy: { startsAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      _count: {
        select: { problems: true, participants: true },
      },
    },
  })

  const now = new Date()
  const result = contests.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    startsAt: c.startsAt.toISOString(),
    endsAt: c.endsAt.toISOString(),
    isPublic: c.isPublic,
    problemCount: c._count.problems,
    participantCount: c._count.participants,
    status: now < c.startsAt ? 'UPCOMING' : now > c.endsAt ? 'ENDED' : 'ACTIVE',
    createdBy: c.createdBy,
  }))

  return NextResponse.json({ data: result })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'TEACHER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { title, description, startsAt, endsAt, isPublic, problemIds, rules } = await req.json()

    const contest = await prisma.contest.create({
      data: {
        title,
        description,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        isPublic: isPublic ?? true,
        rules,
        createdById: session.user.id,
        ...(problemIds?.length && {
          problems: {
            create: problemIds.map((id: string, idx: number) => ({
              problemId: id,
              orderIndex: idx,
            })),
          },
        }),
      },
    })

    return NextResponse.json({ data: contest }, { status: 201 })
  } catch (error) {
    console.error('[Contest Create Error]', error)
    return NextResponse.json({ error: 'Failed to create contest' }, { status: 500 })
  }
}
