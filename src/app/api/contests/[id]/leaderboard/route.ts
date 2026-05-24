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
    select: {
      startsAt: true,
      endsAt: true,
      problems: {
        where: { problem: { isPublished: true } },
        select: {
          problemId: true,
          pointOverride: true,
          problem: { select: { points: true } },
        },
      },
    },
  })

  if (!contest) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const problemIds = contest.problems.map(p => p.problemId)
  const pointsByProblem = new Map(
    contest.problems.map(p => [p.problemId, p.pointOverride ?? p.problem.points])
  )

  // Get all participants
  const participants = await prisma.contestParticipant.findMany({
    where: { contestId: params.id, user: { role: 'STUDENT' } },
    include: { user: { select: { id: true, name: true, totalPoints: true } } },
  })

  // Get accepted submissions for this contest's problems, submitted during contest window
  const submissions = await prisma.submission.findMany({
    where: {
      contestId: params.id,
      problemId: { in: problemIds },
      userId: { in: participants.map(p => p.userId) },
      status: 'ACCEPTED',
      submittedAt: { gte: contest.startsAt, lte: contest.endsAt },
    },
    orderBy: { submittedAt: 'asc' },
    select: {
      userId: true,
      problemId: true,
      submittedAt: true,
    },
  })

  // Build per-user stats: first accepted submission per problem
  const userStats = new Map<string, { solved: Set<string>; totalTime: number; points: number }>()

  for (const p of participants) {
    userStats.set(p.userId, { solved: new Set(), totalTime: 0, points: 0 })
  }

  for (const sub of submissions) {
    const stats = userStats.get(sub.userId)
    if (!stats || stats.solved.has(sub.problemId)) continue

    stats.solved.add(sub.problemId)
    stats.totalTime += (new Date(sub.submittedAt).getTime() - contest.startsAt.getTime()) / 1000
    stats.points += pointsByProblem.get(sub.problemId) ?? 0
  }

  // Build ranked list
  const ranked = participants
    .map(p => {
      const stats = userStats.get(p.userId)!
      return {
        userId: p.userId,
        name: p.user.name,
        solved: stats.solved.size,
        totalTimeSec: Math.round(stats.totalTime),
        points: stats.points,
        solvedProblems: Array.from(stats.solved),
      }
    })
    .sort((a, b) => {
      if (b.solved !== a.solved) return b.solved - a.solved
      return a.totalTimeSec - b.totalTimeSec
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }))

  return NextResponse.json({ data: ranked })
}
