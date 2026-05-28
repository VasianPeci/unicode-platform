import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Code2, Clock, Sparkles } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar'
import { DIFFICULTY_CONFIG, STATUS_CONFIG } from '@/types'
import { formatCount, formatRelative } from '@/lib/utils'

export default async function SubmissionsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const submissions = await prisma.submission.findMany({
    where: { userId: session.user.id },
    orderBy: { submittedAt: 'desc' },
    include: {
      problem: {
        select: {
          title: true,
          slug: true,
          difficulty: true,
        },
      },
    },
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 app-shell-main overflow-y-auto p-4 pt-20 sm:p-6 md:p-8 md:pt-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Code2 size={28} style={{ color: 'var(--accent)' }} />
              Submissions
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {formatCount(submissions.length, 'submission')} for your account
            </p>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
              style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              <div className="col-span-5">Problem</div>
              <div className="col-span-2">Difficulty</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Language</div>
              <div className="col-span-2">Submitted</div>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                No submissions yet
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {submissions.map((submission) => {
                  const diff = DIFFICULTY_CONFIG[submission.problem.difficulty]
                  const status = STATUS_CONFIG[submission.status]

                  return (
                    <Link
                      key={submission.id}
                      href={`/problems/${submission.problem.slug}`}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 py-4 items-start md:items-center transition-all"
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="md:col-span-5 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {submission.problem.title}
                        </p>
                        {typeof submission.aiComplexityScore === 'number' && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <Sparkles size={11} style={{ color: 'var(--accent)' }} />
                            AI {submission.aiComplexityScore}/10
                            {submission.aiComplexityBonusAwarded > 0 && (
                              <span style={{ color: 'var(--success)' }}>
                                +{submission.aiComplexityBonusAwarded} bonus
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2 flex items-center justify-between md:block">
                        <span className="md:hidden text-xs" style={{ color: 'var(--text-muted)' }}>Difficulty</span>
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium"
                          style={{ color: diff.color, background: diff.bg }}>
                          {diff.label}
                        </span>
                      </div>
                      <div className="md:col-span-2 flex items-center justify-between md:block">
                        <span className="md:hidden text-xs" style={{ color: 'var(--text-muted)' }}>Status</span>
                        <span className="text-xs font-medium" style={{ color: status.color }}>
                          {status.label}
                        </span>
                      </div>
                      <div className="md:col-span-1 flex items-center justify-between md:block text-xs uppercase" style={{ color: 'var(--text-muted)' }}>
                        <span className="md:hidden normal-case">Language</span>
                        <span>{submission.language}</span>
                      </div>
                      <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="md:hidden">Submitted</span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} />
                          {formatRelative(submission.submittedAt)}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
