'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { formatCount, generateAvatar, formatDate } from '@/lib/utils'

type Props = {
  teachers: any[]
}

export default function TeachersClient({ teachers: initial }: Props) {
  const [teachers, setTeachers] = useState(initial)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTeachers(prev => prev.filter(t => t.id !== id))
      }
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
    <div className="space-y-3">
      {teachers.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
          No teachers yet. Add one to get started.
        </div>
      )}
      {teachers.map(t => (
        <div
          key={t.id}
          className="glass rounded-2xl p-5 flex items-center gap-4 transition-all"
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-accent)' }}>
            {generateAvatar(t.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{t.name}</p>
            <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{t.email}</p>
          </div>
          <div className="text-right flex-shrink-0 mr-2">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {formatCount(t._count.createdProblems, 'problem')} - {formatCount(t._count.createdContests, 'contest')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Joined {formatDate(t.createdAt)}
            </p>
          </div>

          {confirmId === t.id ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleDelete(t.id)}
                disabled={deletingId === t.id}
                className="text-xs px-2 py-1 rounded-lg font-medium"
                style={{ background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', opacity: deletingId === t.id ? 0.6 : 1 }}
              >
                {deletingId === t.id ? '...' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                className="text-xs px-2 py-1 rounded-lg font-medium"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmId(t.id)}
              className="p-2 rounded-lg transition-all flex-shrink-0"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(248,113,113,0.1)'
                e.currentTarget.style.color = 'var(--danger)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
              title="Delete teacher"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
