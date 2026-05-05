import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar'
import { AddTeacherForm } from './AddTeacherForm'
import { GraduationCap } from 'lucide-react'
import { generateAvatar, formatDate } from '@/lib/utils'

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-60 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <GraduationCap size={28} style={{ color: 'var(--accent)' }} />
              Teachers
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>{teachers.length} teachers</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add teacher form */}
            <div className="lg:col-span-1">
              <AddTeacherForm universityId={session!.user.universityId} />
            </div>

            {/* Teachers list */}
            <div className="lg:col-span-2 space-y-3">
              {teachers.length === 0 && (
                <div className="glass rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  No teachers yet. Add one to get started.
                </div>
              )}
              {teachers.map(t => (
                <div key={t.id} className="glass rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-accent)' }}>
                    {generateAvatar(t.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.name}</p>
                    <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{t.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {t._count.createdProblems} problems · {t._count.createdContests} contests
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Joined {formatDate(t.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
