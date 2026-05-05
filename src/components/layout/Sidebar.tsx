'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, Code2, Trophy, Users, BookOpen,
  LogOut, ChevronRight, Crown, GraduationCap, ShieldCheck
} from 'lucide-react'
import { cn, generateAvatar } from '@/lib/utils'

const studentNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/problems', icon: Code2, label: 'Problems' },
  { href: '/contests', icon: Trophy, label: 'Contests' },
  { href: '/leaderboard', icon: Crown, label: 'Leaderboard' },
]

const teacherNav = [
  ...studentNav,
  { href: '/admin/problems/new', icon: BookOpen, label: 'Create Problem' },
  { href: '/admin/contests/new', icon: Trophy, label: 'Create Contest' },
]

const adminNav = [
  ...studentNav,
  { href: '/admin', icon: ShieldCheck, label: 'Admin Panel' },
  { href: '/admin/teachers', icon: GraduationCap, label: 'Teachers' },
  { href: '/admin/students', icon: Users, label: 'Students' },
]

export function Sidebar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // 🚨 IMPORTANT: prevent rendering before hydration
  if (status === 'loading') {
    return (
      <aside className="fixed left-0 top-0 h-full w-60"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
      />
    )
  }

  if (!session?.user) return null

  const role = session.user.role

  const nav =
    role === 'ADMIN'
      ? adminNav
      : role === 'TEACHER'
      ? teacherNav
      : studentNav

  const initials = generateAvatar(session.user.name || '?')

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-50"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: 'var(--accent-dim)',
            border: '1px solid var(--border-accent)',
          }}
        >
          <Code2 size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <span className="font-bold text-lg tracking-tight gradient-text">
          UniCode
        </span>
      </div>

      {/* University */}
      {session.user.universityName && (
        <div
          className="px-5 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <p
            className="text-xs font-medium truncate"
            style={{ color: 'var(--text-muted)' }}
          >
            {session.user.universityName}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href))

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all'
              )}
              style={{
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
              }}
            >
              <Icon size={16} />
              {label}
              {active && (
                <ChevronRight size={14} className="ml-auto opacity-60" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div
        className="px-3 py-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              border: '1px solid var(--border-accent)',
            }}
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {session.user.name}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {role.charAt(0) + role.slice(1).toLowerCase()} ·{' '}
              {session.user.totalPoints ?? 0} pts
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
          style={{
            color: 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              'rgba(248,113,113,0.1)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--danger)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
          }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}