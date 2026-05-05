'use client'

import { Users, Star, CheckCircle2 } from 'lucide-react'
import { generateAvatar, formatDate } from '@/lib/utils'

type Props = {
  session: any
  students: any[]
}

export default function StudentsClient({ session, students }: Props) {
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
        </p>
      </div>

      {/* TABLE */}
      <div className="glass rounded-2xl overflow-hidden">

        {/* HEADER ROW */}
        <div
          className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
          style={{
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="col-span-4">Student</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Points</div>
          <div className="col-span-2">Solved</div>
          <div className="col-span-1">Joined</div>
        </div>

        {/* ROWS */}
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {students.map((s, i) => (
            <div
              key={s.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all"
            >

              {/* STUDENT */}
              <div className="col-span-4 flex items-center gap-3">
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: 'var(--bg-elevated)',
                      color: 'var(--accent)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {generateAvatar(s.name)}
                  </div>

                  {i < 3 && (
                    <span className="absolute -top-1 -right-1 text-xs">
                      {['🥇', '🥈', '🥉'][i]}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p
                    className="text-xs"
                    style={{
                      color: s.isActive ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {s.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              {/* EMAIL */}
              <div className="col-span-3">
                <p
                  className="text-sm truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {s.email}
                </p>
              </div>

              {/* POINTS */}
              <div className="col-span-2 flex items-center gap-1.5">
                <Star size={13} style={{ color: '#f59e0b' }} />
                <span className="text-sm font-semibold">
                  {s.totalPoints}
                </span>
              </div>

              {/* SOLVED */}
              <div className="col-span-2 flex items-center gap-1.5">
                <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                <span className="text-sm">
                  {s._count.submissions}
                </span>
              </div>

              {/* DATE */}
              <div className="col-span-1">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(s.createdAt)}
                </p>
              </div>

            </div>
          ))}

          {students.length === 0 && (
            <div className="px-6 py-12 text-center text-muted">
              No students enrolled yet
            </div>
          )}
        </div>

      </div>

    </div>
  )
}