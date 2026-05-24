'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Code2,
  Trophy,
  Star,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react'

import { DIFFICULTY_CONFIG, STATUS_CONFIG } from '@/types'
import { formatRelative, pluralize } from '@/lib/utils'

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'
type SubmissionStatus = 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'COMPILATION_ERROR' | 'PENDING'

type Props = {
  session: any
  currentTotalPoints: number
  recentSubmissions: Array<{
    id: string
    status: SubmissionStatus
    submittedAt: string
    language: string
    problem: {
      title: string
      slug: string
      difficulty: Difficulty
    }
  }>
  problemStats: any[]
  upcomingContest: any
  createdProblemCount: number
  createdContestCount: number
  submissionCount: number
}

export default function DashboardClient({
  session,
  currentTotalPoints,
  recentSubmissions,
  problemStats,
  upcomingContest,
  createdProblemCount,
  createdContestCount,
  submissionCount,
}: Props) {
  const [livePoints, setLivePoints] = useState(currentTotalPoints)
  const solved =
    problemStats.find((s) => s.status === 'ACCEPTED')?._count || 0

  const isStudent = session.user.role === 'STUDENT'

  useEffect(() => {
    if (!isStudent) return

    let mounted = true
    const syncPoints = async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (mounted) setLivePoints(data.data?.totalPoints ?? 0)
      } catch {}
    }

    syncPoints()
    const id = setInterval(syncPoints, 5000)
    window.addEventListener('focus', syncPoints)
    window.addEventListener('unicode-points-changed', syncPoints)
    document.addEventListener('visibilitychange', syncPoints)

    return () => {
      mounted = false
      clearInterval(id)
      window.removeEventListener('focus', syncPoints)
      window.removeEventListener('unicode-points-changed', syncPoints)
      document.removeEventListener('visibilitychange', syncPoints)
    }
  }, [isStudent])

  const stats = isStudent ? [
    {
      label: pluralize(livePoints, 'Point'),
      value: livePoints,
      icon: Star,
      color: 'var(--accent)',
    },
    {
      label: pluralize(solved, 'Problem Solved', 'Problems Solved'),
      value: solved,
      icon: CheckCircle2,
      color: 'var(--success)',
    },
    {
      label: pluralize(submissionCount, 'Submission'),
      value: submissionCount,
      icon: Code2,
      color: '#38bdf8',
    },
  ] : [
    {
      label: pluralize(createdProblemCount, 'Problem Created', 'Problems Created'),
      value: createdProblemCount,
      icon: CheckCircle2,
      color: 'var(--success)',
    },
    {
      label: pluralize(createdContestCount, 'Contest Created', 'Contests Created'),
      value: createdContestCount,
      icon: Trophy,
      color: 'var(--accent)',
    },
    {
      label: pluralize(submissionCount, 'Submission'),
      value: submissionCount,
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
          - {session.user.universityName}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              href="/submissions"
              className="text-sm flex items-center gap-1"
              style={{ color: 'var(--accent)' }}
            >
              All submissions <ArrowRight size={14} />
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
                const diff = DIFFICULTY_CONFIG[sub.problem.difficulty]
                const status = STATUS_CONFIG[sub.status]

                return (
                  <Link
                    key={sub.id}
                    href={`/problems/${sub.problem.slug}`}
                    className="flex items-center gap-4 p-3 rounded-xl transition-all"
                    style={{ background: 'var(--bg-elevated)', textDecoration: 'none' }}
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
                      className="text-xs px-2 py-0.5 rounded-md font-medium"
                      style={{
                        color: diff.color,
                        background: diff.bg,
                      }}
                    >
                      {diff.label}
                    </span>

                    <span
                      className="text-xs font-medium"
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
              <Link 
                href="/problems?difficulty=EASY"
                className="flex items-center justify-between p-3 rounded-xl transition-all"
                style={{ background: 'var(--bg-elevated)', textDecoration: 'none' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                  <span className="text-sm">Easy problems</span>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </Link>

              <Link 
                href="/problems?difficulty=MEDIUM"
                className="flex items-center justify-between p-3 rounded-xl transition-all"
                style={{ background: 'var(--bg-elevated)', textDecoration: 'none' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} />
                  <span className="text-sm">Medium problems</span>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </Link>

              <Link
                href={isStudent ? '/contests' : '/admin/contests/new'}
                className="flex items-center justify-between p-3 rounded-xl transition-all"
                style={{ background: 'var(--bg-elevated)', textDecoration: 'none' }}>
                <div className="flex items-center gap-2">
                  <Trophy size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-sm">{isStudent ? 'Join a contest' : 'Create a contest'}</span>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </Link>
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
                <Clock size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>UPCOMING CONTEST</span>
              </div>

              <p className="font-semibold mb-1">{upcomingContest.title}</p>

              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {formatRelative(upcomingContest.startsAt)}
              </p>

              <Link 
                href="/contests"
                className="block text-center py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
                View contest
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
