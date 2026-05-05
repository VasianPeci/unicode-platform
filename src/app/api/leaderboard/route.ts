import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')

  const users = await prisma.user.findMany({
    where: {
      universityId: session.user.universityId,
      role: 'STUDENT',
      totalPoints: { gt: 0 },
    },
    orderBy: { totalPoints: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      totalPoints: true,
      avatarUrl: true,
      _count: {
        select: {
          submissions: { where: { status: 'ACCEPTED' } },
        },
      },
    },
  })

  const leaderboard = users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    name: u.name,
    totalPoints: u.totalPoints,
    problemsSolved: u._count.submissions,
    avatarUrl: u.avatarUrl,
  }))

  return NextResponse.json({ data: leaderboard })
}
