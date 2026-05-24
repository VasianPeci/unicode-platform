'use client'
import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Code2, Loader2, Search } from 'lucide-react'

type RegisterRole = 'STUDENT' | 'TEACHER'

type UniversityOption = {
  id: string
  name: string
  domain: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'STUDENT' as RegisterRole,
    universityId: '',
  })
  const [universitySearch, setUniversitySearch] = useState('')
  const [universities, setUniversities] = useState<UniversityOption[]>([])
  const [loadingUniversities, setLoadingUniversities] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoadingUniversities(true)

    fetch(`/api/universities?search=${encodeURIComponent(universitySearch)}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => setUniversities(data.data || []))
      .catch(error => {
        if (error.name !== 'AbortError') setUniversities([])
      })
      .finally(() => setLoadingUniversities(false))

    return () => controller.abort()
  }, [universitySearch])

  const selectedUniversity = universities.find(university => university.id === form.universityId)

  const setText = (field: 'name' | 'email' | 'password' | 'confirm') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(current => ({ ...current, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!form.universityId) {
      setError('Choose your university.')
      return
    }

    setLoading(true)
    setError('')
    setNotice('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        universityId: form.universityId,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Registration failed.')
      setLoading(false)
      return
    }

    setVerificationEmail(data.data?.email || form.email)
    setNotice('A confirmation code has been sent. It expires in 5 minutes.')
    setLoading(false)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    setError('')
    setNotice('')

    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: verificationEmail, code }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Unable to confirm email.')
      setVerifying(false)
      return
    }

    setSuccess(true)
    await signIn('credentials', {
      email: verificationEmail,
      password: form.password,
      redirect: false,
    })
    router.push('/dashboard')
    router.refresh()
  }

  async function handleResend() {
    setResending(true)
    setError('')
    setNotice('')

    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: verificationEmail || form.email }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Unable to send a new code.')
    } else {
      setVerificationEmail(data.data?.email || verificationEmail || form.email)
      setNotice('A new confirmation code has been sent. It expires in 5 minutes.')
    }

    setResending(false)
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  const fieldClass = 'w-full px-4 py-3 rounded-xl text-sm transition-all'

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(124,109,248,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(124,109,248,0.03) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />
      <div className="relative w-full max-w-md px-6 animate-fade-in py-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)' }}>
            <Code2 size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-xl font-bold tracking-tight gradient-text">UniCode</span>
        </div>

        <h1 className="text-3xl font-bold mb-2">Create account</h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
          Join your university&apos;s coding community
        </p>

        {success ? (
          <div className="p-6 rounded-xl text-center" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <CheckCircle2 size={28} className="mx-auto mb-3" style={{ color: 'var(--success)' }} />
            <p className="text-lg font-semibold" style={{ color: 'var(--success)' }}>Email confirmed</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Taking you to your dashboard...</p>
          </div>
        ) : verificationEmail ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="p-4 rounded-xl text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Enter the 6-digit code sent to <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{verificationEmail}</span>.
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Confirmation code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                className={fieldClass}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
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
              disabled={verifying}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: verifying ? 'not-allowed' : 'pointer' }}
            >
              {verifying && <Loader2 size={16} className="animate-spin" />}
              {verifying ? 'Confirming...' : 'Confirm email'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: resending ? 'not-allowed' : 'pointer' }}
            >
              {resending && <Loader2 size={16} className="animate-spin" />}
              {resending ? 'Sending...' : 'Send code again'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={setText('name')}
                required
                className={fieldClass}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={setText('email')}
                required
                className={fieldClass}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Role</label>
              <select
                value={form.role}
                onChange={e => setForm(current => ({ ...current, role: e.target.value as RegisterRole }))}
                className={fieldClass}
                style={inputStyle}
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Search university</label>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={universitySearch}
                  onChange={e => {
                    setUniversitySearch(e.target.value)
                    setForm(current => ({ ...current, universityId: '' }))
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div className="mt-2 max-h-36 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                {loadingUniversities ? (
                  <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading universities...</div>
                ) : universities.length === 0 ? (
                  <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>No universities found</div>
                ) : universities.map(university => (
                  <button
                    key={university.id}
                    type="button"
                    onClick={() => {
                      setForm(current => ({ ...current, universityId: university.id }))
                      setUniversitySearch(university.name)
                    }}
                    className="w-full text-left px-4 py-3 text-sm transition-all"
                    style={{
                      background: form.universityId === university.id ? 'var(--accent-dim)' : 'transparent',
                      color: 'var(--text-primary)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="block font-medium">{university.name}</span>
                    <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{university.domain}</span>
                  </button>
                ))}
              </div>

              {selectedUniversity && (
                <p className="mt-2 text-xs" style={{ color: 'var(--success)' }}>
                  Selected: {selectedUniversity.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={setText('password')}
                required
                minLength={8}
                className={fieldClass}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Confirm password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={setText('confirm')}
                required
                minLength={8}
                className={fieldClass}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
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
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Sending code...' : 'Create account'}
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent)' }} className="hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
