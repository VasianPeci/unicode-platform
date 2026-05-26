import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/auth/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  const [teacherCount, studentCount, pendingCount, contestCount] =
    await Promise.all([
      prisma.user.count({
        where: { universityId: session.user.universityId, role: 'TEACHER' },
      }),
      prisma.user.count({
        where: { universityId: session.user.universityId, role: 'STUDENT' },
      }),
      prisma.user.count({
        where: {
          universityId: session.user.universityId,
          role: { in: ['STUDENT', 'TEACHER'] },
          isActive: false,
          emailVerifiedAt: { not: null },
        },
      }),
      prisma.contest.count({
        where: { createdBy: { universityId: session.user.universityId } },
      }),
    ])

  return (
    <AdminClient
      session={session}
      teacherCount={teacherCount}
      studentCount={studentCount}
      pendingCount={pendingCount}
      contestCount={contestCount}
    />
  )
}
