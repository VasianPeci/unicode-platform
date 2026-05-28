'use client'

import Link from 'next/link'
import {
  Users,
  GraduationCap,
  Trophy,
  ShieldCheck,
  UserCheck,
  Settings,
} from 'lucide-react'

type Props = {
  session: any
  teacherCount: number
  studentCount: number
  pendingCount: number
  contestCount: number
}

export default function AdminClient({
  session,
  teacherCount,
  studentCount,
  pendingCount,
  contestCount,
}: Props) {
  const stats = [
    {
      label: `Teacher${teacherCount == 1 ? '' : 's'}`,
      value: teacherCount,
      icon: GraduationCap,
      href: '/admin/teachers',
      color: '#7c6df8',
    },
    {
      label: `Student${studentCount == 1 ? '' : 's'}`,
      value: studentCount,
      icon: Users,
      href: '/admin/students',
      color: '#38bdf8',
    },
    {
      label: 'Pending',
      value: pendingCount,
      icon: UserCheck,
      href: pendingCount > 0 ? '/admin/teachers' : '/admin/students',
      color: '#f59e0b',
    },
    {
      label: `Contest${contestCount == 1 ? '' : 's'}`,
      value: contestCount,
      icon: Trophy,
      href: '/contests',
      color: '#f59e0b',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto">

          {/* HEADER */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
                <ShieldCheck size={28} style={{ color: 'var(--accent)' }} />
                Admin Panel
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                {session.user.universityName}
              </p>
            </div>

            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none' }}
            >
              <Settings size={16} />
              Settings
            </Link>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map(({ label, value, icon: Icon, href, color }) => (
              <Link
                key={label}
                href={href}
                className="glass rounded-2xl p-5 transition-all group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: `${color}18`,
                    border: `1px solid ${color}30`,
                  }}
                >
                  <Icon size={20} style={{ color }} />
                </div>

                <p className="text-3xl font-bold">{value}</p>
                <p className="text-sm mt-1 text-muted">{label}</p>
              </Link>
            ))}
          </div>

          {/* QUICK ACTIONS */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Approvals</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/admin/teachers"
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                }}
              >
                <GraduationCap size={18} style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium">
                  Review teachers
                </span>
              </Link>

              <Link
                href="/admin/students"
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                }}
              >
                <Users size={18} style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium">Review students</span>
              </Link>
            </div>
          </div>

    </div>
  )
}
