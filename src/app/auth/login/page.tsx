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
  const [code, setCode] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function checkRegistrationStatus(targetEmail: string) {
    const statusRes = await fetch('/api/auth/registration-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail }),
    })

    if (!statusRes.ok) return null
    const statusData = await statusRes.json()
    return statusData.data
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    setUnverifiedEmail('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      const status = await checkRegistrationStatus(email)
      if (status?.registered && !status?.verified) {
        setUnverifiedEmail(status.email || email)
        setError('This email is not properly registered. Confirm the email or send a new code.')
      } else if (status?.registered && status?.pendingApproval) {
        setError('Your email is confirmed. An admin must approve your account before you can sign in.')
      } else {
        setError('Invalid email or password.')
      }
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleResend() {
    const targetEmail = unverifiedEmail || email
    setResending(true)
    setError('')
    setNotice('')

    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Unable to send a new code.')
    } else {
      setUnverifiedEmail(data.data?.email || targetEmail)
      setNotice('A new confirmation code has been sent. It expires in 5 minutes.')
    }

    setResending(false)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    setError('')
    setNotice('')

    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unverifiedEmail || email, code }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Unable to confirm email.')
      setVerifying(false)
      return
    }

    const signInRes = await signIn('credentials', {
      email: unverifiedEmail || email,
      password,
      redirect: false,
    })

    if (signInRes?.error) {
      const status = await checkRegistrationStatus(unverifiedEmail || email)
      setNotice(status?.pendingApproval
        ? 'Email confirmed. Your account is pending admin approval.'
        : 'Email confirmed. Sign in with your password to continue.')
      setUnverifiedEmail('')
      setVerifying(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden auth-login-bg px-6">
      <div className="auth-grid" />
      <div className="auth-scanline" />

      <div className="relative w-full max-w-md animate-auth-card">
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
              required
              className="w-full px-4 py-3 rounded-xl text-sm transition-all"
              style={inputStyle}
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
                required
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm transition-all"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
                style={{ color: 'var(--text-muted)' }}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {notice && (
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: 'var(--success)' }}>
              {notice}
            </div>
          )}

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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {unverifiedEmail && (
          <form onSubmit={handleVerify} className="mt-4 space-y-3 p-4 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Confirmation code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              className="w-full px-4 py-3 rounded-xl text-sm transition-all"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                disabled={verifying}
                className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: verifying ? 'not-allowed' : 'pointer' }}
              >
                {verifying && <Loader2 size={16} className="animate-spin" />}
                Confirm
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'var(--bg-highlight)', color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: resending ? 'not-allowed' : 'pointer' }}
              >
                {resending && <Loader2 size={16} className="animate-spin" />}
                Send again
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>DEMO ACCOUNTS</p>
          <div className="space-y-2">
            {[
              { label: 'Admin', email: 'admin@fti.edu.al', pass: 'admin123' },
              { label: 'Teacher', email: 'teacher@fti.edu.al', pass: 'teacher123' },
              { label: 'Student', email: 'alice@fti.edu.al', pass: 'student123' },
            ].map(({ label, email: e, pass }) => (
              <button
                key={label}
                onClick={() => { setEmail(e); setPassword(pass); setUnverifiedEmail(''); setError(''); setNotice('') }}
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
