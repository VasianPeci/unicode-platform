'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, Code2, Trophy, Users, BookOpen,
  LogOut, Crown, ShieldCheck, PanelLeftClose, PanelLeftOpen, Menu, X, Settings, Bot
} from 'lucide-react'
import { cn, formatCount, generateAvatar } from '@/lib/utils'

const EXPANDED_WIDTH = '15rem'
const COLLAPSED_WIDTH = '5rem'

const studentNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/problems', icon: Code2, label: 'Problems' },
  { href: '/contests', icon: Trophy, label: 'Contests' },
  { href: '/leaderboard', icon: Crown, label: 'Leaderboard' },
  { href: '/assistant', icon: Bot, label: 'Assistant' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

const teacherNav = [
  ...studentNav,
  { href: '/admin/problems/new', icon: BookOpen, label: 'Create Problem' },
  { href: '/admin/contests/new', icon: Trophy, label: 'Create Contest' },
]

const adminNav = [
  { href: '/admin', icon: ShieldCheck, label: 'Admin Panel' },
  { href: '/problems', icon: Code2, label: 'Problems' },
  { href: '/contests', icon: Trophy, label: 'Contests' },
  { href: '/leaderboard', icon: Crown, label: 'Leaderboard' },
  { href: '/assistant', icon: Bot, label: 'Assistant' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [livePoints, setLivePoints] = useState<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('unicode-sidebar-collapsed')
    setCollapsed(saved === 'true')
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH)
    localStorage.setItem('unicode-sidebar-collapsed', String(collapsed))
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (session?.user?.role !== 'STUDENT') return

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
  }, [session?.user?.role])

  if (status === 'loading') {
    return (
      <>
        <button
          className="md:hidden fixed left-4 top-4 z-[70] h-10 w-10 rounded-xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          aria-label="Open navigation"
        >
          <Menu size={18} className="mx-auto" style={{ color: 'var(--text-secondary)' }} />
        </button>
      <aside
          className="sidebar-panel hidden md:block fixed left-0 top-0 h-full transition-all duration-300"
          style={{
            '--desktop-sidebar-width': 'var(--sidebar-width)',
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border)',
          } as CSSProperties}
        />
      </>
    )
  }

  if (!session?.user) return null

  const role = session.user.role
  const nav = role === 'ADMIN' ? adminNav : role === 'TEACHER' ? teacherNav : studentNav
  const initials = generateAvatar(session.user.name || '?')
  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase()
  const points = livePoints ?? session.user.totalPoints ?? 0

  const sidebar = (
    <aside
      className={cn(
        'sidebar-panel fixed left-0 top-0 h-full flex flex-col z-50 transition-all duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
      style={{
        '--desktop-sidebar-width': collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      } as CSSProperties}
    >
      <button
        onClick={() => setCollapsed(value => !value)}
        className="sidebar-edge-toggle hidden md:flex"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
      </button>

      <div
        className={cn('flex items-center gap-3 px-4 py-5', collapsed && 'md:justify-center')}
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'var(--accent-dim)',
            border: '1px solid var(--border-accent)',
          }}
        >
          <Code2 size={16} style={{ color: 'var(--accent)' }} />
        </div>

        <span className={cn('font-bold text-lg tracking-tight gradient-text', collapsed && 'md:hidden')}>
          UniCode
        </span>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto p-1.5 rounded-lg transition-all md:hidden"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          title="Close navigation"
          aria-label="Close navigation"
        >
          <X size={16} />
        </button>
      </div>

      {session.user.universityName && (
        <div className={cn('px-5 py-3', collapsed && 'md:hidden')} style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-muted)' }}>
            {session.user.universityName}
          </p>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                collapsed && 'md:justify-center md:px-0'
              )}
              title={collapsed ? label : undefined}
              style={{
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <Icon size={16} />
              <span className={cn(collapsed && 'md:hidden')}>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div
          className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2', collapsed && 'md:justify-center md:px-0')}
          style={{ background: 'var(--bg-elevated)' }}
          title={collapsed ? `${session.user.name} - ${roleLabel}` : undefined}
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

          <div className={cn('min-w-0 flex-1', collapsed && 'md:hidden')}>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {session.user.name}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {role === 'STUDENT' ? `${roleLabel} - ${formatCount(points, 'point')}` : roleLabel}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all', collapsed && 'md:justify-center md:px-0')}
          title={collapsed ? 'Sign out' : undefined}
          style={{
            color: 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--danger)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
          }}
        >
          <LogOut size={15} />
          <span className={cn(collapsed && 'md:hidden')}>Sign out</span>
        </button>
      </div>
    </aside>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed left-4 top-4 z-[70] h-10 w-10 rounded-xl flex items-center justify-center shadow-lg"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>
      {mobileOpen && (
        <button
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}
      {sidebar}
    </>
  )
}
