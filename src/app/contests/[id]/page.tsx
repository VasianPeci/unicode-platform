import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ContestArena from './ContestArena'

export default async function ContestPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

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
        select: { joinedAt: true, score: true },
      },
      _count: { select: { participants: { where: { user: { role: 'STUDENT' } } } } },
    },
  })

  if (!contest) redirect('/contests')

  const now = new Date()
  const status = now < contest.startsAt ? 'UPCOMING' : now > contest.endsAt ? 'ENDED' : 'ACTIVE'

  return (
    <ContestArena
      session={session}
      contest={{
        id: contest.id,
        title: contest.title,
        description: contest.description,
        rules: contest.rules,
        startsAt: contest.startsAt.toISOString(),
        endsAt: contest.endsAt.toISOString(),
        status,
        isJoined: session.user.role === 'STUDENT' && contest.participants.length > 0,
        myScore: session.user.role === 'STUDENT' ? contest.participants[0]?.score ?? 0 : 0,
        participantCount: contest._count.participants,
        createdBy: contest.createdBy,
        problems: contest.problems.map(cp => ({
          id: cp.problem.id,
          title: cp.problem.title,
          slug: cp.problem.slug,
          difficulty: cp.problem.difficulty,
          points: cp.pointOverride ?? cp.problem.points,
        })),
      }}
    />
  )
}
