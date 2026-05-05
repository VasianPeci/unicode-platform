'use client'
import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'

export function AddTeacherForm({ universityId }: { universityId: string }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess(false)

    const res = await fetch('/api/users/create-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, universityId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return }
    setSuccess(true)
    setForm({ name: '', email: '', password: '' })
    setLoading(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  const inputStyle = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', outline: 'none',
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-semibold mb-5 flex items-center gap-2">
        <UserPlus size={18} style={{ color: 'var(--accent)' }} />
        Add Teacher
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { label: 'Full name', field: 'name', type: 'text', placeholder: 'Prof. Smith' },
          { label: 'Email', field: 'email', type: 'email', placeholder: 'prof@university.edu' },
          { label: 'Password', field: 'password', type: 'password', placeholder: '••••••••' },
        ].map(({ label, field, type, placeholder }) => (
          <div key={field}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
            <input
              type={type} value={form[field as keyof typeof form]}
              onChange={set(field)} placeholder={placeholder} required
              className="w-full px-3 py-2.5 rounded-xl text-sm transition-all"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        ))}

        {error && (
          <p className="text-xs py-2 px-3 rounded-lg"
            style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--danger)' }}>{error}</p>
        )}
        {success && (
          <p className="text-xs py-2 px-3 rounded-lg"
            style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--success)' }}>Teacher added!</p>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Adding…' : 'Add teacher'}
        </button>
      </form>
    </div>
  )
}
