import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contests = await prisma.contest.findMany({
    where: { createdBy: { universityId: session.user.universityId } },
    orderBy: { startsAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: {
        select: {
          problems: { where: { problem: { isPublished: true } } },
          participants: { where: { user: { role: 'STUDENT' } } },
        },
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
    isCreatedByMe: c.createdBy.id === session.user.id,
    canDelete: session.user.role === 'ADMIN' || (session.user.role === 'TEACHER' && c.createdBy.id === session.user.id),
  }))

  return NextResponse.json({ data: result })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { title, description, startsAt, endsAt, isPublic, problemIds, rules } = await req.json()
    const ids = Array.isArray(problemIds) ? problemIds : []
    const startDate = new Date(startsAt)
    const endDate = new Date(endsAt)

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Add at least one problem' }, { status: 400 })
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Choose valid start and end times' }, { status: 400 })
    }

    if (endDate.getTime() <= startDate.getTime()) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    const allowedProblemCount = await prisma.problem.count({
      where: {
        id: { in: ids },
        isPublished: true,
        createdBy: { universityId: session.user.universityId },
      },
    })

    if (allowedProblemCount !== ids.length) {
      return NextResponse.json({ error: 'One or more problems are not available in your university' }, { status: 400 })
    }

    const contest = await prisma.contest.create({
      data: {
        title,
        description,
        startsAt: startDate,
        endsAt: endDate,
        isPublic: isPublic ?? true,
        rules,
        createdById: session.user.id,
        ...(ids.length && {
          problems: {
            create: ids.map((id: string, idx: number) => ({
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
