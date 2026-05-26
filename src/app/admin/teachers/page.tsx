import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCount } from '@/lib/utils'
import TeachersClient from './TeachersClient'
import { GraduationCap } from 'lucide-react'

export default async function TeachersPage() {
  const session = await getServerSession(authOptions)!
  if (session!.user.role !== 'ADMIN') redirect('/dashboard')

  const teachers = await prisma.user.findMany({
    where: { universityId: session!.user.universityId, role: 'TEACHER' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, createdAt: true, isActive: true, emailVerifiedAt: true,
      _count: { select: { createdProblems: true, createdContests: true } },
    },
  })
  const orderedTeachers = teachers.sort((a, b) => {
    const aPending = Boolean(a.emailVerifiedAt && !a.isActive)
    const bPending = Boolean(b.emailVerifiedAt && !b.isActive)
    if (aPending !== bPending) return aPending ? -1 : 1
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  return (
    <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <GraduationCap size={28} style={{ color: 'var(--accent)' }} />
              Teachers
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>{formatCount(orderedTeachers.length, 'teacher')}</p>
          </div>

          <div>
            <TeachersClient teachers={orderedTeachers} />
          </div>
    </div>
  )
}
