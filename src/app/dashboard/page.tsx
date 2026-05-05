import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) return null

  const [recentSubmissions, problemStats, userRank, upcomingContest] =
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

      prisma.user.count({
        where: {
          universityId: session.user.universityId,
          role: 'STUDENT',
          totalPoints: { gt: session.user.totalPoints },
        },
      }),

      prisma.contest.findFirst({
        where: { startsAt: { gt: new Date() } },
        orderBy: { startsAt: 'asc' },
      }),
    ])

  return (
    <DashboardClient
      session={session}
      recentSubmissions={recentSubmissions}
      problemStats={problemStats}
      userRank={userRank}
      upcomingContest={upcomingContest}
    />
  )
}