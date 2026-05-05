import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { judgeSubmission } from '@/lib/judge'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { code, language, problemId, contestId } = await req.json()

    if (!code || !language || !problemId) {
      return NextResponse.json({ error: 'code, language and problemId are required' }, { status: 400 })
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { testCases: true, timeLimit: true, memoryLimit: true, points: true },
    })

    if (!problem) return NextResponse.json({ error: 'Problem not found' }, { status: 404 })

    // Create pending submission
    const submission = await prisma.submission.create({
      data: {
        code,
        language,
        status: 'PENDING',
        userId: session.user.id,
        problemId,
        contestId: contestId || null,
      },
    })

    // Run judge (async in production, inline here for simplicity)
    const result = await judgeSubmission(
      code,
      language,
      problem.testCases as any[],
      problem.timeLimit,
      problem.memoryLimit
    )

    // Check if this is the first accepted submission for points
    let pointsAwarded = 0
    if (result.status === 'ACCEPTED') {
      const previousAccepted = await prisma.submission.findFirst({
        where: {
          userId: session.user.id,
          problemId,
          status: 'ACCEPTED',
          id: { not: submission.id },
        },
      })

      if (!previousAccepted) {
        pointsAwarded = problem.points
        // Award points to user
        await prisma.user.update({
          where: { id: session.user.id },
          data: { totalPoints: { increment: pointsAwarded } },
        })

        // If in contest, award contest points too
        if (contestId) {
          await prisma.contestParticipant.upsert({
            where: { contestId_userId: { contestId, userId: session.user.id } },
            update: { score: { increment: pointsAwarded } },
            create: { contestId, userId: session.user.id, score: pointsAwarded },
          })
        }
      }
    }

    // Update submission with results
    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: result.status,
        runtimeMs: result.runtimeMs,
        memoryKb: result.memoryKb,
        testResults: result.testResults as any,
        errorMsg: result.errorMsg,
        pointsAwarded,
      },
    })

    return NextResponse.json({
      data: {
        id: updated.id,
        status: updated.status,
        runtimeMs: updated.runtimeMs,
        memoryKb: updated.memoryKb,
        testResults: updated.testResults,
        errorMsg: updated.errorMsg,
        pointsAwarded: updated.pointsAwarded,
        submittedAt: updated.submittedAt,
      },
    })
  } catch (error: any) {
    console.error('[Submission Error]', error)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const problemId = searchParams.get('problemId')
  const userId = searchParams.get('userId') || session.user.id

  // Non-admins can only see their own submissions
  const targetUserId = ['ADMIN', 'TEACHER'].includes(session.user.role) ? userId : session.user.id

  const submissions = await prisma.submission.findMany({
    where: {
      userId: targetUserId,
      ...(problemId && { problemId }),
    },
    orderBy: { submittedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      status: true,
      language: true,
      runtimeMs: true,
      memoryKb: true,
      pointsAwarded: true,
      submittedAt: true,
      problem: { select: { title: true, slug: true } },
    },
  })

  return NextResponse.json({ data: submissions })
}
