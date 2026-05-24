import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar'
import { Crown, Star, Code2 } from 'lucide-react'
import { formatCount, generateAvatar } from '@/lib/utils'

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions)!

  const users = await prisma.user.findMany({
    where: { universityId: session!.user.universityId, role: 'STUDENT' },
    orderBy: { totalPoints: 'desc' },
    take: 50,
    select: {
      id: true, name: true, totalPoints: true, avatarUrl: true,
      _count: { select: { submissions: { where: { status: 'ACCEPTED' } } } },
    },
  })

  const currentUserRank = users.findIndex(u => u.id === session!.user.id) + 1

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 app-shell-main overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Crown size={28} style={{ color: '#f59e0b' }} />
              Leaderboard
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {session!.user.universityName} - Top {formatCount(users.length, 'student')}
            </p>
          </div>

          {/* Current user rank highlight */}
          {currentUserRank > 0 && (
            <div className="mb-6 p-4 rounded-2xl flex items-center gap-4"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)' }}>
              <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>#{currentUserRank}</span>
              <div>
                <p className="font-medium">Your current rank</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {formatCount(session!.user.totalPoints, 'point')}
                </p>
              </div>
            </div>
          )}

          {/* Top 3 podium */}
          {users.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {users.slice(0, 3).map((u, index) => {
                const actualRank = index + 1
                const colors = { 1: '#f59e0b', 2: '#94a3b8', 3: '#cd7f32' }
                const heights = { 1: 'h-36', 2: 'h-28', 3: 'h-24' }
                const color = colors[actualRank as keyof typeof colors]
                return (
                  <div key={u.id} className={`glass rounded-2xl p-4 flex flex-col items-center text-center ${heights[actualRank as keyof typeof heights]}`}
                    style={{ border: `1px solid ${color}30` }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2"
                      style={{ background: `${color}20`, color, border: `2px solid ${color}` }}>
                      {generateAvatar(u.name)}
                    </div>
                    <p className="text-sm font-semibold truncate w-full">{u.name.split(' ')[0]}</p>
                    <p className="text-xs mt-1" style={{ color }}>#{actualRank}</p>
                    <p className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                      {u.totalPoints}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
              style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              <div className="col-span-1">Rank</div>
              <div className="col-span-5">Student</div>
              <div className="col-span-3">Points</div>
              <div className="col-span-3">Solved</div>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {users.map((u, i) => {
                const rank = i + 1
                const isCurrentUser = u.id === session!.user.id
                const rankColor = rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#cd7f32' : 'var(--text-muted)'
                return (
                  <div key={u.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all"
                    style={{
                      background: isCurrentUser ? 'var(--accent-dim)' : 'transparent',
                      borderLeft: isCurrentUser ? '3px solid var(--accent)' : '3px solid transparent',
                    }}>
                    <div className="col-span-1">
                      <span className="text-sm font-bold" style={{ color: rankColor }}>
                        #{rank}
                      </span>
                    </div>
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                        {generateAvatar(u.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: isCurrentUser ? 'var(--text-primary)' : 'var(--text-primary)' }}>
                          {u.name} {isCurrentUser && <span className="text-xs" style={{ color: 'var(--accent)' }}>(you)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-1.5">
                        <Star size={13} style={{ color: '#f59e0b' }} />
                        <span className="font-semibold">{u.totalPoints}</span>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-1.5">
                        <Code2 size={13} style={{ color: 'var(--success)' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{u._count.submissions}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
