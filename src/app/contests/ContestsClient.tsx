'use client'

import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { Trophy, Clock, Users, ChevronRight, Plus } from 'lucide-react'
import { formatDateTime, formatRelative } from '@/lib/utils'

type Props = {
  session: any
  contests: any[]
}

export default function ContestsClient({ session, contests }: Props) {
  const now = new Date()

  const getStatus = (c: { startsAt: string | Date; endsAt: string | Date }) => {
    const start = new Date(c.startsAt)
    const end = new Date(c.endsAt)

    if (now < start) return 'UPCOMING'
    if (now > end) return 'ENDED'
    return 'ACTIVE'
  }

  const statusConfig = {
    UPCOMING: { label: 'Upcoming', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
    ACTIVE: { label: 'Live', color: 'var(--success)', bg: 'rgba(52,211,153,0.1)' },
    ENDED: { label: 'Ended', color: 'var(--text-muted)', bg: 'var(--bg-elevated)' },
  }

  const canCreate = ['ADMIN', 'TEACHER'].includes(session?.user?.role)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 ml-60 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
                <Trophy size={28} style={{ color: 'var(--accent)' }} />
                Contests
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                {contests.length} total contests
              </p>
            </div>

            {canCreate && (
              <Link
                href="/admin/contests/new"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <Plus size={16} /> New Contest
              </Link>
            )}
          </div>

          {/* LIST */}
          <div className="space-y-4">
            {contests.length === 0 && (
              <div className="glass rounded-2xl p-12 text-center">
                No contests yet
              </div>
            )}

            {contests.map((contest) => {
              const status = getStatus(contest)
              const s = statusConfig[status]

              return (
                <div
                  key={contest.id}
                  className="glass rounded-2xl p-6 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">

                    <div className="flex-1">

                      {/* STATUS */}
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ color: s.color, background: s.bg }}
                        >
                          {status === 'ACTIVE' && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 animate-pulse bg-green-400" />
                          )}
                          {s.label}
                        </span>

                        <span className="text-xs text-muted">
                          {status === 'ACTIVE' && `Ends ${formatRelative(contest.endsAt)}`}
                          {status === 'UPCOMING' && `Starts ${formatRelative(contest.startsAt)}`}
                        </span>
                      </div>

                      {/* TITLE */}
                      <h2 className="text-lg font-semibold mb-1">
                        {contest.title}
                      </h2>

                      {/* DESCRIPTION */}
                      {contest.description && (
                        <p className="text-sm mb-3 text-muted">
                          {contest.description}
                        </p>
                      )}

                      {/* META */}
                      <div className="flex gap-4 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Trophy size={12} />
                          {contest._count.problems} problems
                        </span>

                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {contest._count.participants} participants
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDateTime(contest.startsAt)} → {formatDateTime(contest.endsAt)}
                        </span>
                      </div>

                    </div>

                    <ChevronRight
                      size={20}
                      className="text-muted group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </main>
    </div>
  )
}