import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { judgeSubmission } from '@/lib/judge'
import { judgeComplexityWithAi } from '@/lib/aiComplexity'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { code, language, problemId, contestId } = await req.json()
    const activeContestId = typeof contestId === 'string' && contestId.trim() ? contestId : null
    const isStudent = session.user.role === 'STUDENT'

    if (!code || !language || !problemId) {
      return NextResponse.json({ error: 'code, language and problemId are required' }, { status: 400 })
    }

    const problem = await prisma.problem.findFirst({
      where: { id: problemId, isPublished: true },
      select: {
        title: true,
        description: true,
        constraints: true,
        testCases: true,
        timeLimit: true,
        memoryLimit: true,
        points: true,
      },
    })

    if (!problem) return NextResponse.json({ error: 'Problem not found' }, { status: 404 })

    let contestPointValue = problem.points

    if (activeContestId) {
      if (!isStudent) {
        return NextResponse.json({ error: 'Only students can submit to contests' }, { status: 403 })
      }

      const contest = await prisma.contest.findFirst({
        where: {
          id: activeContestId,
          createdBy: { universityId: session.user.universityId },
        },
        select: {
          startsAt: true,
          endsAt: true,
          problems: {
            where: { problemId },
            select: { pointOverride: true },
          },
          participants: {
            where: { userId: session.user.id },
            select: { userId: true },
          },
        },
      })

      if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 })

      const now = new Date()
      if (now < contest.startsAt) {
        return NextResponse.json({ error: 'Contest has not started yet' }, { status: 400 })
      }
      if (now > contest.endsAt) {
        return NextResponse.json({ error: 'Contest has already ended' }, { status: 400 })
      }
      if (contest.problems.length === 0) {
        return NextResponse.json({ error: 'Problem is not part of this contest' }, { status: 400 })
      }
      if (contest.participants.length === 0) {
        return NextResponse.json({ error: 'Join the contest before submitting' }, { status: 403 })
      }

      contestPointValue = contest.problems[0].pointOverride ?? problem.points
    }

    // Create pending submission
    const submission = await prisma.submission.create({
      data: {
        code,
        language,
        status: 'PENDING',
        userId: session.user.id,
        problemId,
        contestId: activeContestId,
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

    const aiComplexity = await judgeComplexityWithAi({
      code,
      language,
      correctnessStatus: result.status,
      problem: {
        title: problem.title,
        description: problem.description,
        constraints: problem.constraints,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
      },
    })

    // Check if this is the first accepted submission for points
    let pointsAwarded = 0
    let aiComplexityBonusAwarded = 0
    let contestPointsAwarded = 0
    let contestAiComplexityBonusAwarded = 0

    if (result.status === 'ACCEPTED') {
      const [previousAccepted, previousBestComplexity] = await Promise.all([
        prisma.submission.findFirst({
          where: {
            userId: session.user.id,
            problemId,
            status: 'ACCEPTED',
            id: { not: submission.id },
          },
        }),
        prisma.submission.aggregate({
          where: {
            userId: session.user.id,
            problemId,
            status: 'ACCEPTED',
            id: { not: submission.id },
          },
          _max: { aiComplexityBonus: true },
        }),
      ])

      if (isStudent) {
        const basePointsAwarded = previousAccepted ? 0 : problem.points
        const previousBestBonus = previousBestComplexity._max.aiComplexityBonus ?? 0
        aiComplexityBonusAwarded = Math.max(0, aiComplexity.bonusPoints - previousBestBonus)
        pointsAwarded = basePointsAwarded + aiComplexityBonusAwarded

        if (pointsAwarded > 0) {
          await prisma.user.update({
            where: { id: session.user.id },
            data: { totalPoints: { increment: pointsAwarded } },
          })
        }
      }

      if (isStudent && activeContestId) {
        const [previousContestAccepted, previousContestBestComplexity] = await Promise.all([
          prisma.submission.findFirst({
            where: {
              userId: session.user.id,
              problemId,
              contestId: activeContestId,
              status: 'ACCEPTED',
              id: { not: submission.id },
            },
          }),
          prisma.submission.aggregate({
            where: {
              userId: session.user.id,
              problemId,
              contestId: activeContestId,
              status: 'ACCEPTED',
              id: { not: submission.id },
            },
            _max: { aiComplexityBonus: true },
          }),
        ])

        const contestBasePointsAwarded = previousContestAccepted ? 0 : contestPointValue
        const previousContestBestBonus = previousContestBestComplexity._max.aiComplexityBonus ?? 0
        contestAiComplexityBonusAwarded = Math.max(0, aiComplexity.bonusPoints - previousContestBestBonus)
        contestPointsAwarded = contestBasePointsAwarded + contestAiComplexityBonusAwarded

        if (contestPointsAwarded > 0) {
          await prisma.contestParticipant.update({
            where: { contestId_userId: { contestId: activeContestId, userId: session.user.id } },
            data: { score: { increment: contestPointsAwarded } },
          })
        }
      }
    }

    if (result.status !== 'ACCEPTED') {
      aiComplexityBonusAwarded = 0
      contestAiComplexityBonusAwarded = 0
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
        aiComplexityStatus: aiComplexity.status,
        aiTimeComplexity: aiComplexity.timeComplexity,
        aiSpaceComplexity: aiComplexity.spaceComplexity,
        aiComplexityScore: aiComplexity.score,
        aiComplexityBonus: aiComplexity.bonusPoints,
        aiComplexityBonusAwarded,
        aiComplexityFeedback: aiComplexity.feedback,
        aiComplexityModel: aiComplexity.model,
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
        contestPointsAwarded,
        aiComplexityStatus: updated.aiComplexityStatus,
        aiTimeComplexity: updated.aiTimeComplexity,
        aiSpaceComplexity: updated.aiSpaceComplexity,
        aiComplexityScore: updated.aiComplexityScore,
        aiComplexityBonus: updated.aiComplexityBonus,
        aiComplexityBonusAwarded: updated.aiComplexityBonusAwarded,
        contestAiComplexityBonusAwarded,
        aiComplexityFeedback: updated.aiComplexityFeedback,
        aiComplexityModel: updated.aiComplexityModel,
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
  const contestId = searchParams.get('contestId')
  const userId = searchParams.get('userId') || session.user.id

  // Non-admins can only see their own submissions
  const targetUserId = ['ADMIN', 'TEACHER'].includes(session.user.role) ? userId : session.user.id

  const submissions = await prisma.submission.findMany({
    where: {
      userId: targetUserId,
      ...(problemId && { problemId }),
      ...(contestId && { contestId }),
    },
    orderBy: { submittedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      problemId: true,
      contestId: true,
      status: true,
      language: true,
      runtimeMs: true,
      memoryKb: true,
      pointsAwarded: true,
      aiComplexityStatus: true,
      aiTimeComplexity: true,
      aiSpaceComplexity: true,
      aiComplexityScore: true,
      aiComplexityBonus: true,
      aiComplexityBonusAwarded: true,
      aiComplexityFeedback: true,
      aiComplexityModel: true,
      submittedAt: true,
      problem: { select: { title: true, slug: true } },
    },
  })

  return NextResponse.json({ data: submissions })
}
