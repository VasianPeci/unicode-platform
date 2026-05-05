'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Code2, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, universityDomain: '' }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error || 'Registration failed.'); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/auth/login'), 2000)
  }

  const inputStyle = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', outline: 'none',
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(124,109,248,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(124,109,248,0.03) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />
      <div className="relative w-full max-w-md px-6 animate-fade-in">
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
            <p className="text-lg font-semibold" style={{ color: 'var(--success)' }}>Account created! 🎉</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Redirecting to login…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full name', field: 'name', type: 'text', placeholder: 'Jane Smith' },
              { label: 'University email', field: 'email', type: 'email', placeholder: 'jane@university.edu' },
              { label: 'Password', field: 'password', type: 'password', placeholder: '••••••••' },
              { label: 'Confirm password', field: 'confirm', type: 'password', placeholder: '••••••••' },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                <input
                  type={type}
                  value={form[field as keyof typeof form]}
                  onChange={set(field)}
                  placeholder={placeholder}
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            ))}

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
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
