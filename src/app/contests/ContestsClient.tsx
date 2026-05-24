'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { Trophy, Clock, Users, ChevronRight, Plus, CheckCircle2, Trash2 } from 'lucide-react'
import { formatCount, formatDateTime, formatRelative } from '@/lib/utils'

type Props = {
  session: any
  contests: any[]
}

export default function ContestsClient({ session, contests }: Props) {
  const now = new Date()
  const [items, setItems] = useState(contests)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  const canCreate = session?.user?.role === 'TEACHER'

  async function handleDelete(contest: any) {
    const canDelete = session?.user?.role === 'ADMIN' || (session?.user?.role === 'TEACHER' && contest.createdBy?.id === session?.user?.id)
    if (!canDelete) return
    const ok = window.confirm(`Remove "${contest.title}" from contests?`)
    if (!ok) return

    setDeletingId(contest.id)
    try {
      const res = await fetch(`/api/contests/${contest.id}`, { method: 'DELETE' })
      if (res.ok) {
        setItems(prev => prev.filter(c => c.id !== contest.id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 app-shell-main overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
                <Trophy size={28} style={{ color: 'var(--accent)' }} />
                Contests
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                {formatCount(items.length, 'total contest', 'total contests')}
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
            {items.length === 0 && (
              <div className="glass rounded-2xl p-12 text-center">
                No contests yet
              </div>
            )}

            {items.map((contest) => {
              const status = getStatus(contest)
              const s = statusConfig[status]
              const isCreatedByMe = contest.createdBy?.id === session?.user?.id
              const canDelete = session?.user?.role === 'ADMIN' || (session?.user?.role === 'TEACHER' && isCreatedByMe)

              return (
                <div
                  key={contest.id}
                  className="glass rounded-2xl p-6 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">

                    <div className="flex-1">
                      {session?.user?.role === 'STUDENT' && contest.participants?.length > 0 && (
                        <span className="float-right inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                          style={{ color: 'var(--success)', background: 'rgba(52,211,153,0.1)' }}>
                          <CheckCircle2 size={12} /> Joined
                        </span>
                      )}

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
                        <Link href={`/contests/${contest.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                          {contest.title}
                        </Link>
                        {isCreatedByMe && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
                            style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                            Created by you
                          </span>
                        )}
                      </h2>
                      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                        Created by {contest.createdBy?.name}
                      </p>

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
                          {formatCount(contest._count.problems, 'problem')}
                        </span>

                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {formatCount(contest._count.participants, 'participant')}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDateTime(contest.startsAt)} {'to'} {formatDateTime(contest.endsAt)}
                        </span>
                      </div>

                    </div>

                    <div className="flex items-center gap-2">
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(contest)}
                          disabled={deletingId === contest.id}
                          className="p-2 rounded-lg transition-all"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: deletingId === contest.id ? 'not-allowed' : 'pointer' }}
                          title="Remove contest"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <ChevronRight
                        size={20}
                        className="text-muted group-hover:translate-x-1 transition-transform"
                      />
                    </div>
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
