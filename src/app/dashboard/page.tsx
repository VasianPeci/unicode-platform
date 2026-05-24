import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/auth/login')
  if (session.user.role === 'ADMIN') redirect('/admin')

  const [recentSubmissions, problemStats, currentUser, upcomingContest, createdProblemCount, createdContestCount, submissionCount] =
    await Promise.all([
      prisma.submission.findMany({
        where: { userId: session.user.id },
        orderBy: { submittedAt: 'desc' },
        take: 5,
        include: {
          problem: {
            select: { title: true, slug: true, difficulty: true },
          },
        },
      }),

      prisma.submission.groupBy({
        by: ['status'],
        where: { userId: session.user.id },
        _count: true,
      }),

      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { totalPoints: true },
      }),

      prisma.contest.findFirst({
        where: {
          startsAt: { gt: new Date() },
          createdBy: { universityId: session.user.universityId },
        },
        orderBy: { startsAt: 'asc' },
      }),

      prisma.problem.count({
        where: { createdById: session.user.id, isPublished: true },
      }),

      prisma.contest.count({
        where: { createdById: session.user.id },
      }),

      prisma.submission.count({
        where: { userId: session.user.id },
      }),
    ])

  // Convert Dates to ISO strings and ensure proper typing
  const formattedSubmissions = recentSubmissions.map(sub => ({
    id: sub.id,
    status: sub.status,
    submittedAt: sub.submittedAt.toISOString(),
    language: sub.language,
    problem: {
      title: sub.problem.title,
      slug: sub.problem.slug,
      difficulty: sub.problem.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
    },
  }))

  const formattedContest = upcomingContest ? {
    id: upcomingContest.id,
    title: upcomingContest.title,
    startsAt: upcomingContest.startsAt.toISOString(),
    endsAt: upcomingContest.endsAt.toISOString(),
  } : null

  return (
    <DashboardClient
      session={session as any}
      currentTotalPoints={currentUser?.totalPoints ?? session.user.totalPoints}
      recentSubmissions={formattedSubmissions}
      problemStats={problemStats}
      upcomingContest={formattedContest}
      createdProblemCount={createdProblemCount}
      createdContestCount={createdContestCount}
      submissionCount={submissionCount}
    />
  )
}
