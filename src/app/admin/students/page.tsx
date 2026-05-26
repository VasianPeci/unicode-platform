import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import StudentsClient from './StudentsClient'

export default async function StudentsPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/auth/login')
  if (!['ADMIN', 'TEACHER'].includes(session.user.role))
    redirect('/dashboard')

  const students = await prisma.user.findMany({
    where: {
      universityId: session.user.universityId,
      role: 'STUDENT',
    },
    orderBy: { totalPoints: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      totalPoints: true,
      createdAt: true,
      isActive: true,
      emailVerifiedAt: true,
      _count: {
        select: {
          submissions: { where: { status: 'ACCEPTED' } },
        },
      },
    },
  })
  const orderedStudents = students.sort((a, b) => {
    const aPending = Boolean(a.emailVerifiedAt && !a.isActive)
    const bPending = Boolean(b.emailVerifiedAt && !b.isActive)
    if (aPending !== bPending) return aPending ? -1 : 1
    return b.totalPoints - a.totalPoints
  })

  return (
    <StudentsClient session={session} students={orderedStudents} />
  )
}
