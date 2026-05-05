'use client'

import Link from 'next/link'
import {
  Code2,
  Trophy,
  Star,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react'

import { DIFFICULTY_CONFIG, STATUS_CONFIG } from '@/types'
import { formatRelative } from '@/lib/utils'

type Props = {
  session: any
  recentSubmissions: any[]
  problemStats: any[]
  userRank: number
  upcomingContest: any
}

export default function DashboardClient({
  session,
  recentSubmissions,
  problemStats,
  userRank,
  upcomingContest,
}: Props) {
  const solved =
    problemStats.find((s) => s.status === 'ACCEPTED')?._count || 0

  const rank = userRank + 1

  const stats = [
    {
      label: 'Points',
      value: session.user.totalPoints,
      icon: Star,
      color: 'var(--accent)',
    },
    {
      label: 'Problems Solved',
      value: solved,
      icon: CheckCircle2,
      color: 'var(--success)',
    },
    {
      label: 'University Rank',
      value: `#${rank}`,
      icon: TrendingUp,
      color: '#f59e0b',
    },
    {
      label: 'Submissions',
      value: recentSubmissions.length,
      icon: Code2,
      color: '#38bdf8',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 stagger-children">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-1">
          Welcome back,{' '}
          <span className="gradient-text">
            {session.user.name.split(' ')[0]}
          </span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {session.user.role.charAt(0) +
            session.user.role.slice(1).toLowerCase()}{' '}
          · {session.user.universityName}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: `${color}18`,
                  border: `1px solid ${color}30`,
                }}
              >
                <Icon size={18} style={{ color }} />
              </div>
            </div>

            <p
              className="text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {value}
            </p>

            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-lg">Recent submissions</h2>

            <Link
              href="/problems"
              className="text-sm flex items-center gap-1"
              style={{ color: 'var(--accent)' }}
            >
              All problems <ArrowRight size={14} />
            </Link>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <Code2 size={32} className="mx-auto mb-3 opacity-20" />
              <p style={{ color: 'var(--text-muted)' }}>
                No submissions yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSubmissions.map((sub) => {
                const diff =
                  DIFFICULTY_CONFIG[sub.problem.difficulty]
                const status = STATUS_CONFIG[sub.status]

                return (
                  <Link
                    key={sub.id}
                    href={`/problems/${sub.problem.slug}`}
                    className="flex items-center gap-4 p-3 rounded-xl transition-all"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {sub.problem.title}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {formatRelative(sub.submittedAt)}
                      </p>
                    </div>

                    <span
                      className="text-xs px-2 py-0.5 rounded-md"
                      style={{
                        color: diff.color,
                        background: diff.bg,
                      }}
                    >
                      {diff.label}
                    </span>

                    <span
                      className="text-xs"
                      style={{ color: status.color }}
                    >
                      {status.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Quick start</h2>

            <div className="space-y-2">
              <Link href="/problems?difficulty=EASY">
                Easy problems →
              </Link>

              <Link href="/problems?difficulty=MEDIUM">
                Medium problems →
              </Link>

              <Link href="/contests">Join contest →</Link>
            </div>
          </div>

          {upcomingContest && (
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'var(--accent-dim)',
                border: '1px solid var(--border-accent)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} />
                <span>UPCOMING CONTEST</span>
              </div>

              <p className="font-semibold">
                {upcomingContest.title}
              </p>

              <p className="text-sm">
                {formatRelative(upcomingContest.startsAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}