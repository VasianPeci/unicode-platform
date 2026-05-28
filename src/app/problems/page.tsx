'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, CheckCircle2, Circle, Trash2 } from 'lucide-react'
import { DIFFICULTY_CONFIG } from '@/types'
import { formatCount } from '@/lib/utils'
import type { ProblemListItem } from '@/types'

const DIFFICULTIES = ['All', 'EASY', 'MEDIUM', 'HARD']

function ProblemRowsSkeleton() {
  return (
    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 py-4 items-center">
          <div className="hidden md:block md:col-span-1">
            <div className="skeleton skeleton-circle h-4 w-4" />
          </div>
          <div className="md:col-span-4 space-y-2">
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-3 w-24" />
          </div>
          <div className="skeleton h-6 w-24 md:col-span-2" />
          <div className="skeleton h-4 w-20 md:col-span-2" />
          <div className="skeleton h-4 w-32 md:col-span-2" />
          <div className="hidden md:block md:col-span-1" />
        </div>
      ))}
    </div>
  )
}

export default function ProblemsPage() {
  const searchParams = useSearchParams()
  const [problems, setProblems] = useState<ProblemListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState(() => {
    const d = searchParams.get('difficulty')
    return d && DIFFICULTIES.includes(d) ? d : 'All'
  })
  const [total, setTotal] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchProblems = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (difficulty !== 'All') params.set('difficulty', difficulty)

    const res = await fetch(`/api/problems?${params}`)
    const data = await res.json()
    setProblems(data.data || [])
    setTotal(data.meta?.total || 0)
    setLoading(false)
  }, [search, difficulty])

  useEffect(() => {
    const t = setTimeout(fetchProblems, 300)
    return () => clearTimeout(t)
  }, [fetchProblems])

  async function handleDelete(problem: ProblemListItem) {
    if (!problem.canDelete) return
    const ok = window.confirm(`Remove "${problem.title}" from the problem list?`)
    if (!ok) return

    setDeletingId(problem.id)
    try {
      const res = await fetch(`/api/problems/${problem.id}`, { method: 'DELETE' })
      if (res.ok) {
        setProblems(prev => prev.filter(p => p.id !== problem.id))
        setTotal(prev => Math.max(0, prev - 1))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 pt-20 sm:p-6 md:p-8 md:pt-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Problems</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{formatCount(total, 'problem')} available</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {DIFFICULTIES.map(d => {
            const active = difficulty === d
            const cfg = d !== 'All' ? DIFFICULTY_CONFIG[d as keyof typeof DIFFICULTY_CONFIG] : null
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? 'var(--accent)' : 'var(--bg-surface)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  color: active ? '#fff' : cfg?.color || 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {d === 'All' ? 'All' : DIFFICULTY_CONFIG[d as keyof typeof DIFFICULTY_CONFIG].label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
          <div className="col-span-1">#</div>
          <div className="col-span-4">Title</div>
          <div className="col-span-2">Difficulty</div>
          <div className="col-span-2">Acceptance</div>
          <div className="col-span-2">Tags</div>
          <div className="col-span-1"></div>
        </div>

        {loading ? (
          <ProblemRowsSkeleton />
        ) : problems.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
            No problems found
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {problems.map((p, i) => {
              const diff = DIFFICULTY_CONFIG[p.difficulty as keyof typeof DIFFICULTY_CONFIG]
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 py-4 items-start md:items-center transition-all group"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Status */}
                  <div className="hidden md:block md:col-span-1">
                    {p.isSolved
                      ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      : <Circle size={16} style={{ color: 'var(--text-muted)' }} />
                    }
                  </div>

                  {/* Title */}
                  <div className="md:col-span-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="md:hidden flex-shrink-0">
                        {p.isSolved
                          ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                          : <Circle size={16} style={{ color: 'var(--text-muted)' }} />
                        }
                      </span>
                      <Link href={`/problems/${p.slug}`} className="text-sm font-medium group-hover:text-white transition-colors truncate"
                        style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {p.title}
                      </Link>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {p.points} pts
                      </span>
                    </div>
                    {p.isCreatedByMe && (
                      <span className="inline-block mt-2 text-xs px-1.5 py-0.5 rounded"
                        style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                        Created by you
                      </span>
                    )}
                  </div>

                  {/* Difficulty */}
                  <div className="md:col-span-2 flex items-center justify-between md:block">
                    <span className="md:hidden text-xs" style={{ color: 'var(--text-muted)' }}>Difficulty</span>
                    <span className="text-xs font-medium px-2 py-1 rounded-md"
                      style={{ color: diff.color, background: diff.bg }}>
                      {diff.label}
                    </span>
                  </div>

                  {/* Acceptance */}
                  <div className="md:col-span-2 flex items-center justify-between md:block">
                    <span className="md:hidden text-xs" style={{ color: 'var(--text-muted)' }}>Acceptance</span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {p.acceptanceRate}%
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-2">
                    <span className="md:hidden text-xs" style={{ color: 'var(--text-muted)' }}>Tags</span>
                    <div className="flex items-center gap-2 overflow-hidden">
                    {p.tags.slice(0, 2).map(tag => (
                      <span key={tag.id} className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--bg-highlight)', color: 'var(--text-muted)' }}>
                        {tag.name}
                      </span>
                    ))}
                    {p.tags.length > 2 && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{p.tags.length - 2}</span>
                    )}
                    {p.tags.length === 0 && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>None</span>
                    )}
                    </div>
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    {p.canDelete && (
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={deletingId === p.id}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: deletingId === p.id ? 'not-allowed' : 'pointer' }}
                        title="Remove problem"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
