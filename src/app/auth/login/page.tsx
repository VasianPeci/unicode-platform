'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Code2, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(124,109,248,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(124,109,248,0.03) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
        style={{ background: 'radial-gradient(circle, #7c6df8 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-8"
        style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-md px-6 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)' }}>
            <Code2 size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-xl font-bold tracking-tight gradient-text">UniCode</span>
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
          Sign in to your university coding account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              className="w-full px-4 py-3 rounded-xl text-sm transition-all"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm transition-all"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
                style={{ color: 'var(--text-muted)' }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
            style={{
              background: loading ? 'var(--accent-dim)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => !loading && ((e.target as HTMLElement).style.background = 'var(--accent-hover)')}
            onMouseLeave={e => !loading && ((e.target as HTMLElement).style.background = 'var(--accent)')}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>DEMO ACCOUNTS</p>
          <div className="space-y-2">
            {[
              { label: 'Admin', email: 'admin@university.edu', pass: 'admin123' },
              { label: 'Teacher', email: 'teacher@university.edu', pass: 'teacher123' },
              { label: 'Student', email: 'alice@university.edu', pass: 'student123' },
            ].map(({ label, email: e, pass }) => (
              <button
                key={label}
                onClick={() => { setEmail(e); setPassword(pass) }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all"
                style={{ background: 'var(--bg-highlight)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
                onMouseEnter={el => (el.target as HTMLElement).style.color = 'var(--text-primary)'}
                onMouseLeave={el => (el.target as HTMLElement).style.color = 'var(--text-secondary)'}
              >
                <span className="font-medium" style={{ color: 'var(--accent)' }}>{label}</span>
                <span>{e}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" style={{ color: 'var(--accent)' }} className="hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
