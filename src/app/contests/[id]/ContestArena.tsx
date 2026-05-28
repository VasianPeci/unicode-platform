'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import {
  Trophy, Clock, Users, CheckCircle2, Circle,
  Loader2, Medal, ArrowLeft, Star,
} from 'lucide-react'
import { DIFFICULTY_CONFIG } from '@/types'
import { formatCount } from '@/lib/utils'

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

type ContestProblem = {
  id: string
  title: string
  slug: string
  difficulty: Difficulty
  points: number
}

type ContestProps = {
  id: string
  title: string
  description: string | null
  rules: string | null
  startsAt: string
  endsAt: string
  status: 'UPCOMING' | 'ACTIVE' | 'ENDED'
  isJoined: boolean
  myScore: number
  participantCount: number
  createdBy: { name: string }
  problems: ContestProblem[]
}

type LeaderboardEntry = {
  rank: number
  userId: string
  name: string
  solved: number
  points: number
  totalTimeSec: number
  solvedProblems: string[]
}

function formatDuration(seconds: number) {
  if (seconds < 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const rankMedal = (rank: number) => {
  if (rank === 1) return <Medal size={16} style={{ color: '#f59e0b' }} />
  if (rank === 2) return <Medal size={16} style={{ color: '#9ca3af' }} />
  if (rank === 3) return <Medal size={16} style={{ color: '#b45309' }} />
  return <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>#{rank}</span>
}

export default function ContestArena({
  session,
  contest: initial,
}: {
  session: any
  contest: ContestProps
}) {
  const router = useRouter()
  const [contest] = useState(initial)
  const [tab, setTab] = useState<'problems' | 'leaderboard'>('problems')
  const [joining, setJoining] = useState(false)
  const [isJoined, setIsJoined] = useState(initial.isJoined)
  const [myScore, setMyScore] = useState(initial.myScore)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingBoard, setLoadingBoard] = useState(false)
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set())
  const isStudent = session?.user?.role === 'STUDENT'

  // Countdown
  const [timeLeft, setTimeLeft] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const start = new Date(contest.startsAt).getTime()
      const end = new Date(contest.endsAt).getTime()

      if (contest.status === 'UPCOMING') {
        setTimeLeft(Math.max(0, Math.floor((start - now) / 1000)))
      } else if (contest.status === 'ACTIVE') {
        setTimeLeft(Math.max(0, Math.floor((end - now) / 1000)))
        setElapsed(Math.max(0, Math.floor((now - start) / 1000)))
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [contest])

  // Load solved problems from submissions
  useEffect(() => {
    if (!isJoined || contest.status === 'UPCOMING') return
    const problemIds = contest.problems.map(p => p.id)
    fetch(`/api/submissions?contestId=${contest.id}`)
      .then(r => r.json())
      .then(data => {
        const solved = new Set<string>(
          (data.data || [])
            .filter((s: any) => s.status === 'ACCEPTED' && problemIds.includes(s.problemId))
            .map((s: any) => s.problemId)
        )
        setSolvedIds(solved)
      })
      .catch(() => {})
  }, [isJoined, contest])

  const fetchLeaderboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingBoard(true)
    try {
      const res = await fetch(`/api/contests/${contest.id}/leaderboard`)
      const data = await res.json()
      const entries = data.data || []
      setLeaderboard(entries)
      const currentUser = entries.find((entry: LeaderboardEntry) => entry.userId === session?.user?.id)
      if (currentUser) setMyScore(currentUser.points)
    } finally {
      if (showLoading) setLoadingBoard(false)
    }
  }, [contest.id, session?.user?.id])

  useEffect(() => {
    if (tab === 'leaderboard') fetchLeaderboard()
  }, [tab, fetchLeaderboard])

  useEffect(() => {
    if (!isJoined || contest.status === 'UPCOMING') return
    fetchLeaderboard(false)
  }, [isJoined, contest.status, fetchLeaderboard])

  // Auto-refresh leaderboard every 30s when active
  useEffect(() => {
    if (contest.status !== 'ACTIVE' || !isJoined) return
    const id = setInterval(() => fetchLeaderboard(tab === 'leaderboard'), 30000)
    return () => clearInterval(id)
  }, [contest.status, isJoined, tab, fetchLeaderboard])

  async function handleJoin() {
    if (!isStudent) return
    setJoining(true)
    try {
      const res = await fetch(`/api/contests/${contest.id}/join`, { method: 'POST' })
      if (res.ok) {
        setIsJoined(true)
        setMyScore(0)
        router.refresh()
      }
    } finally {
      setJoining(false)
    }
  }

  const statusConfig = {
    UPCOMING: { label: 'Upcoming', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
    ACTIVE: { label: 'Live', color: 'var(--success)', bg: 'rgba(52,211,153,0.1)' },
    ENDED: { label: 'Ended', color: 'var(--text-muted)', bg: 'var(--bg-elevated)' },
  }
  const s = statusConfig[contest.status]
  const totalContestPoints = contest.problems.reduce((sum, problem) => sum + problem.points, 0)
  const completedContest = totalContestPoints > 0 && myScore >= totalContestPoints

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 app-shell-main p-4 pt-20 sm:p-6 md:p-8 md:pt-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Back */}
          <Link href="/contests" className="inline-flex items-center gap-1.5 text-sm"
            style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            <ArrowLeft size={15} /> All contests
          </Link>

          {/* Header card */}
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ color: s.color, background: s.bg }}>
                    {contest.status === 'ACTIVE' && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-green-400 animate-pulse" />
                    )}
                    {s.label}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{contest.title}</h1>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    by {contest.createdBy.name}
                  </span>
                </div>

                {contest.description && (
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {contest.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 sm:gap-5 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1.5">
                    <Trophy size={14} /> {formatCount(contest.problems.length, 'problem')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={14} /> {formatCount(contest.participantCount, 'participant')}
                  </span>
                  {isJoined && contest.status !== 'UPCOMING' && (
                    <span className="flex items-center gap-1.5" style={{ color: completedContest ? 'var(--success)' : 'inherit' }}>
                      {completedContest ? <CheckCircle2 size={14} /> : <Star size={14} />}
                      {myScore} / {formatCount(totalContestPoints, 'point')}
                      {completedContest && <span className="font-medium">Completed</span>}
                    </span>
                  )}
                </div>
              </div>

              {/* Timer + join */}
              <div className="flex flex-col items-start sm:items-end gap-3 flex-shrink-0">
                {contest.status !== 'ENDED' && (
                  <div className="text-right">
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      {contest.status === 'UPCOMING' ? 'Starts in' : 'Time remaining'}
                    </p>
                    <p className="text-3xl font-mono font-bold"
                      style={{ color: timeLeft < 300 && contest.status === 'ACTIVE' ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {formatDuration(timeLeft)}
                    </p>
                  </div>
                )}

                {contest.status === 'ENDED' && (
                  <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    Contest ended
                  </span>
                )}

                {isStudent && !isJoined && contest.status !== 'ENDED' && (
                  <button onClick={handleJoin} disabled={joining}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: joining ? 'not-allowed' : 'pointer' }}>
                    {joining && <Loader2 size={14} className="animate-spin" />}
                    {joining ? 'Joining...' : 'Join Contest'}
                  </button>
                )}

                {isJoined && (
                  <span className="flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: 'var(--success)' }}>
                    <CheckCircle2 size={15} /> Joined
                  </span>
                )}
              </div>
            </div>

            {contest.rules && (
              <div className="mt-4 pt-4 text-sm" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Rules: </span>
                {contest.rules}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl w-full sm:w-fit overflow-x-auto"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {(['problems', 'leaderboard'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all"
                style={{
                  background: tab === t ? 'var(--accent)' : 'transparent',
                  color: tab === t ? '#fff' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer',
                }}>
                {t}
              </button>
            ))}
          </div>

          {/* Problems tab */}
          {tab === 'problems' && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                <div className="col-span-1">#</div>
                <div className="col-span-6">Problem</div>
                <div className="col-span-2">Difficulty</div>
                <div className="col-span-2">Points</div>
                <div className="col-span-1">Status</div>
              </div>

              {contest.status === 'UPCOMING' ? (
                <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={32} className="mx-auto mb-3 opacity-30" />
                  <p>Problems will be revealed when the contest starts</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {contest.problems.map((p, i) => {
                    const diff = DIFFICULTY_CONFIG[p.difficulty]
                    const solved = solvedIds.has(p.id)
                    const canSolve = isStudent ? (isJoined || contest.status === 'ENDED') : contest.status !== 'UPCOMING'
                    const href = isStudent
                      ? `/problems/${p.slug}?contestId=${contest.id}`
                      : `/problems/${p.slug}`

                    const inner = (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 py-4 items-start md:items-center"
                        onMouseEnter={e => canSolve && (e.currentTarget.style.background = 'var(--bg-elevated)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div className="md:col-span-1 text-sm font-mono" style={{ color: 'var(--text-muted)' }}>#{i + 1}</div>
                        <div className="md:col-span-6">
                          <p className="text-sm font-medium">{p.title}</p>
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between md:block">
                          <span className="md:hidden text-xs" style={{ color: 'var(--text-muted)' }}>Difficulty</span>
                          <span className="text-xs font-medium px-2 py-1 rounded-md"
                            style={{ color: diff.color, background: diff.bg }}>
                            {diff.label}
                          </span>
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between md:block text-sm font-medium">
                          <span className="md:hidden text-xs font-normal" style={{ color: 'var(--text-muted)' }}>Points</span>
                          {formatCount(p.points, 'point')}
                        </div>
                        <div className="md:col-span-1 flex items-center justify-between md:block">
                          <span className="md:hidden text-xs" style={{ color: 'var(--text-muted)' }}>Status</span>
                          {solved
                            ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                            : <Circle size={16} style={{ color: 'var(--text-muted)' }} />
                          }
                        </div>
                      </div>
                    )

                    return canSolve ? (
                      <Link key={p.id} href={href}
                        style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={p.id} style={{ opacity: 0.6, cursor: 'not-allowed' }}>{inner}</div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Leaderboard tab */}
          {tab === 'leaderboard' && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="font-semibold">Leaderboard</h2>
                {contest.status === 'ACTIVE' && (
                  <button onClick={() => fetchLeaderboard()}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Refresh
                  </button>
                )}
              </div>

              {loadingBoard ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                  <Users size={32} className="mx-auto mb-3 opacity-30" />
                  <p>No submissions yet</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
                    style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-4">Participant</div>
                    <div className="col-span-3">Solved</div>
                    <div className="col-span-2">Points</div>
                    <div className="col-span-2">Time</div>
                  </div>

                  <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {leaderboard.map(entry => {
                      const isMe = entry.userId === session?.user?.id
                      return (
                        <div key={entry.userId}
                          className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 py-4 items-start md:items-center"
                          style={{ background: isMe ? 'var(--accent-dim)' : 'transparent' }}>
                          <div className="md:col-span-1 flex items-center">
                            {rankMedal(entry.rank)}
                          </div>
                          <div className="md:col-span-4">
                            <p className="text-sm font-medium">
                              {entry.name}
                              {isMe && <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--accent)', color: '#fff' }}>you</span>}
                            </p>
                          </div>
                          <div className="md:col-span-3 flex items-center justify-between md:block">
                            <span className="md:hidden text-xs" style={{ color: 'var(--text-muted)' }}>Solved</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold"
                                style={{ color: 'var(--success)' }}>
                                {entry.solved}
                              </span>
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                / {contest.problems.length}
                              </span>
                              {/* Problem dots */}
                              <div className="flex gap-1">
                                {contest.problems.map(p => (
                                  <div key={p.id} className="w-2 h-2 rounded-full"
                                    style={{ background: entry.solvedProblems.includes(p.id) ? 'var(--success)' : 'var(--bg-elevated)', border: '1px solid var(--border)' }} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="md:col-span-2 flex items-center justify-between md:block text-sm font-semibold"
                            style={{ color: 'var(--accent)' }}>
                            <span className="md:hidden text-xs font-normal" style={{ color: 'var(--text-muted)' }}>Points</span>
                            {entry.points}
                          </div>
                          <div className="md:col-span-2 flex items-center justify-between md:block text-sm" style={{ color: 'var(--text-muted)' }}>
                            <span className="md:hidden text-xs">Time</span>
                            <span>{entry.solved > 0 ? formatTime(entry.totalTimeSec) : '-'}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
