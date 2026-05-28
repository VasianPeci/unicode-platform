'use client'

import { useState } from 'react'
import { Users, Star, CheckCircle2, Trash2, UserCheck, Loader2 } from 'lucide-react'
import { generateAvatar } from '@/lib/utils'

type Props = {
  session: any
  students: any[]
}

export default function StudentsClient({ session, students: initial }: Props) {
  const [students, setStudents] = useState(initial)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const pendingCount = students.filter(s => s.emailVerifiedAt && !s.isActive).length

  function sortStudents(list: any[]) {
    return [...list].sort((a, b) => {
      const aPending = Boolean(a.emailVerifiedAt && !a.isActive)
      const bPending = Boolean(b.emailVerifiedAt && !b.isActive)
      if (aPending !== bPending) return aPending ? -1 : 1
      return b.totalPoints - a.totalPoints
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
        setStudents(prev => sortStudents(prev.map(s => s.id === id ? { ...s, isActive: true } : s)))
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
        setStudents(prev => prev.filter(s => s.id !== id))
      }
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
          <Users size={28} style={{ color: 'var(--accent)' }} />
          Students
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {students.length} enrolled students
          {pendingCount > 0 && ` - ${pendingCount} pending approval`}
        </p>
      </div>

      {/* TABLE */}
      <div className="glass rounded-2xl overflow-hidden">

        {/* HEADER ROW */}
        <div
          className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="col-span-4">Student</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Points</div>
          <div className="col-span-2">Solved</div>
          <div className="col-span-1"></div>
        </div>

        {/* ROWS */}
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {students.map((s, i) => {
            const pendingApproval = Boolean(s.emailVerifiedAt && !s.isActive)

            return (
              <div
                key={s.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 py-4 items-start md:items-center transition-all"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
              {/* STUDENT */}
              <div className="md:col-span-4 flex items-center gap-3">
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                  >
                    {generateAvatar(s.name)}
                  </div>
                  {i < 3 && (
                    <span className="absolute -top-1 -right-1 text-xs">
                      #{i + 1}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs" style={{ color: s.isActive ? 'var(--success)' : pendingApproval ? '#f59e0b' : 'var(--danger)' }}>
                    {s.isActive ? 'Active' : pendingApproval ? 'Pending approval' : 'Email not confirmed'}
                  </p>
                </div>
              </div>

              {/* EMAIL */}
              <div className="md:col-span-3 flex items-center justify-between gap-3 min-w-0">
                <span className="md:hidden text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Email</span>
                <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                  {s.email}
                </p>
              </div>

              {/* POINTS */}
              <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-1.5">
                <span className="md:hidden text-xs" style={{ color: 'var(--text-muted)' }}>Points</span>
                <span className="flex items-center gap-1.5">
                  <Star size={13} style={{ color: '#f59e0b' }} />
                  <span className="text-sm font-semibold">{s.totalPoints}</span>
                </span>
              </div>

              {/* SOLVED */}
              <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-1.5">
                <span className="md:hidden text-xs" style={{ color: 'var(--text-muted)' }}>Solved</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                  <span className="text-sm">{s._count.submissions}</span>
                </span>
              </div>

              {/* DELETE */}
              <div className="md:col-span-1 flex justify-end gap-1">
                {pendingApproval && (
                  <button
                    onClick={() => handleApprove(s.id)}
                    disabled={approvingId === s.id}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(52,211,153,0.1)', border: 'none', color: 'var(--success)', cursor: approvingId === s.id ? 'not-allowed' : 'pointer' }}
                    title="Approve registration"
                  >
                    {approvingId === s.id ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />}
                  </button>
                )}
                {confirmId === s.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', opacity: deletingId === s.id ? 0.6 : 1 }}
                    >
                      {deletingId === s.id ? '...' : 'Yes'}
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
                    onClick={() => setConfirmId(s.id)}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(248,113,113,0.1)'
                      e.currentTarget.style.color = 'var(--danger)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'none'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }}
                    title="Delete student"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
            )
          })}

          {students.length === 0 && (
            <div className="px-6 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
              No students enrolled yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
