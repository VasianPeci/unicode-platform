'use client'

import { useState } from 'react'
import { Loader2, Trash2, UserCheck } from 'lucide-react'
import { formatCount, generateAvatar, formatDate } from '@/lib/utils'

type Props = {
  teachers: any[]
}

export default function TeachersClient({ teachers: initial }: Props) {
  const [teachers, setTeachers] = useState(initial)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const pendingCount = teachers.filter(t => t.emailVerifiedAt && !t.isActive).length

  function sortTeachers(list: any[]) {
    return [...list].sort((a, b) => {
      const aPending = Boolean(a.emailVerifiedAt && !a.isActive)
      const bPending = Boolean(b.emailVerifiedAt && !b.isActive)
      if (aPending !== bPending) return aPending ? -1 : 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  async function handleApprove(id: string) {
    setApprovingId(id)
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (res.ok) {
        setTeachers(prev => sortTeachers(prev.map(t => t.id === id ? { ...t, isActive: true } : t)))
      }
    } finally {
      setApprovingId(null)
    }
  }

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
          No teachers registered yet.
        </div>
      )}
      {pendingCount > 0 && (
        <div className="glass rounded-2xl p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {formatCount(pendingCount, 'teacher')} pending approval
        </div>
      )}
      {teachers.map(t => {
        const pendingApproval = Boolean(t.emailVerifiedAt && !t.isActive)

        return (
          <div
            key={t.id}
            className="glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all"
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
            <p className="text-xs mt-1" style={{ color: t.isActive ? 'var(--success)' : pendingApproval ? '#f59e0b' : 'var(--danger)' }}>
              {t.isActive ? 'Active' : pendingApproval ? 'Pending approval' : 'Email not confirmed'}
            </p>
          </div>
          <div className="text-left sm:text-right flex-shrink-0 sm:mr-2 w-full sm:w-auto">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {formatCount(t._count.createdProblems, 'problem')} - {formatCount(t._count.createdContests, 'contest')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Joined {formatDate(t.createdAt)}
            </p>
          </div>

          {pendingApproval && (
            <button
              onClick={() => handleApprove(t.id)}
              disabled={approvingId === t.id}
              className="p-2 rounded-lg transition-all flex-shrink-0"
              style={{ background: 'rgba(52,211,153,0.1)', border: 'none', color: 'var(--success)', cursor: approvingId === t.id ? 'not-allowed' : 'pointer' }}
              title="Approve registration"
            >
              {approvingId === t.id ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
            </button>
          )}

          {confirmId === t.id ? (
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
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
        )
      })}
    </div>
  )
}
