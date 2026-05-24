import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ContestsClient from './ContestsClient'

export default async function ContestsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const contests = await prisma.contest.findMany({
    where: { createdBy: { universityId: session.user.universityId } },
    orderBy: { startsAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
      participants: {
        where: { userId: session.user.id, user: { role: 'STUDENT' } },
        select: { userId: true },
      },
      _count: {
        select: {
          problems: { where: { problem: { isPublished: true } } },
          participants: { where: { user: { role: 'STUDENT' } } },
        },
      },
    },
  })

  return (
    <ContestsClient
      session={session}
      contests={contests}
    />
  )
}
