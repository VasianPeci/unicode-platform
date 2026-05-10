'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, CheckCircle2, Circle } from 'lucide-react'
import { DIFFICULTY_CONFIG } from '@/types'
import type { ProblemListItem } from '@/types'

const DIFFICULTIES = ['All', 'EASY', 'MEDIUM', 'HARD']

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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Problems</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{total} problems available</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search problems…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <div className="flex gap-2">
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
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
          <div className="col-span-1">#</div>
          <div className="col-span-5">Title</div>
          <div className="col-span-2">Difficulty</div>
          <div className="col-span-2">Acceptance</div>
          <div className="col-span-2">Tags</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : problems.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
            No problems found
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {problems.map((p, i) => {
              const diff = DIFFICULTY_CONFIG[p.difficulty as keyof typeof DIFFICULTY_CONFIG]
              return (
                <Link
                  key={p.id}
                  href={`/problems/${p.slug}`}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all group"
                  style={{ textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Status */}
                  <div className="col-span-1">
                    {p.isSolved
                      ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      : <Circle size={16} style={{ color: 'var(--text-muted)' }} />
                    }
                  </div>

                  {/* Title */}
                  <div className="col-span-5">
                    <span className="text-sm font-medium group-hover:text-white transition-colors"
                      style={{ color: 'var(--text-primary)' }}>
                      {p.title}
                    </span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {p.points} pts
                    </span>
                  </div>

                  {/* Difficulty */}
                  <div className="col-span-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-md"
                      style={{ color: diff.color, background: diff.bg }}>
                      {diff.label}
                    </span>
                  </div>

                  {/* Acceptance */}
                  <div className="col-span-2">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {p.acceptanceRate}%
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="col-span-2 flex items-center gap-2">
                    {p.tags.slice(0, 2).map(tag => (
                      <span key={tag.id} className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--bg-highlight)', color: 'var(--text-muted)' }}>
                        {tag.name}
                      </span>
                    ))}
                    {p.tags.length > 2 && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{p.tags.length - 2}</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}