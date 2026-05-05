import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ContestsClient from './ContestsClient'

export default async function ContestsPage() {
  const session = await getServerSession(authOptions)

  const contests = await prisma.contest.findMany({
    orderBy: { startsAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { problems: true, participants: true } },
    },
  })

  return (
    <ContestsClient
      session={session}
      contests={contests}
    />
  )
}