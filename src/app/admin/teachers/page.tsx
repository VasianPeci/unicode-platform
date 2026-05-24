import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCount } from '@/lib/utils'
import { AddTeacherForm } from './AddTeacherForm'
import TeachersClient from './TeachersClient'
import { GraduationCap } from 'lucide-react'

export default async function TeachersPage() {
  const session = await getServerSession(authOptions)!
  if (session!.user.role !== 'ADMIN') redirect('/dashboard')

  const teachers = await prisma.user.findMany({
    where: { universityId: session!.user.universityId, role: 'TEACHER' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, createdAt: true,
      _count: { select: { createdProblems: true, createdContests: true } },
    },
  })

  return (
    <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <GraduationCap size={28} style={{ color: 'var(--accent)' }} />
              Teachers
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>{formatCount(teachers.length, 'teacher')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add teacher form */}
            <div className="lg:col-span-1">
              <AddTeacherForm universityId={session!.user.universityId} />
            </div>

            {/* Teachers list */}
            <div className="lg:col-span-2">
              <TeachersClient teachers={teachers} />
            </div>
          </div>
    </div>
  )
}
