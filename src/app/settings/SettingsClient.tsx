'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { AlertTriangle, CheckCircle2, Loader2, Lock, Mail, Save, Settings, ShieldCheck, Trash2, User } from 'lucide-react'

type Props = {
  user: {
    name: string
    email: string
    role: string
    universityName: string
  }
}

type SectionStatus = {
  error: string
  notice: string
}

const emptyStatus: SectionStatus = { error: '', notice: '' }

export default function SettingsClient({ user }: Props) {
  const router = useRouter()
  const { update } = useSession()
  const [currentEmail, setCurrentEmail] = useState(user.email)
  const [name, setName] = useState(user.name)
  const [profileStatus, setProfileStatus] = useState(emptyStatus)
  const [emailStatus, setEmailStatus] = useState(emptyStatus)
  const [passwordStatus, setPasswordStatus] = useState(emptyStatus)
  const [universityStatus, setUniversityStatus] = useState(emptyStatus)
  const [profileLoading, setProfileLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [universityLoading, setUniversityLoading] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailCodeSent, setEmailCodeSent] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [universityDeleteForm, setUniversityDeleteForm] = useState({
    password: '',
    confirmationName: '',
  })

  const roleLabel = user.role.charAt(0) + user.role.slice(1).toLowerCase()
  const isAdmin = user.role === 'ADMIN'

  async function refreshSession() {
    await update()
    router.refresh()
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileStatus(emptyStatus)

    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()

    if (!res.ok) {
      setProfileStatus({ error: data.error || 'Unable to update profile.', notice: '' })
      setProfileLoading(false)
      return
    }

    setName(data.data?.name || name)
    setProfileStatus({ error: '', notice: data.message || 'Profile updated.' })
    await refreshSession()
    setProfileLoading(false)
  }

  async function handleEmailCodeRequest(e: React.FormEvent) {
    e.preventDefault()
    setEmailLoading(true)
    setEmailStatus(emptyStatus)

    const res = await fetch('/api/account/email-change/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail }),
    })
    const data = await res.json()

    if (!res.ok) {
      setEmailStatus({ error: data.error || 'Unable to send confirmation code.', notice: '' })
      setEmailLoading(false)
      return
    }

    setEmailCodeSent(true)
    setEmailStatus({ error: '', notice: data.message || 'Confirmation code sent.' })
    setEmailLoading(false)
  }

  async function handleEmailConfirm(e: React.FormEvent) {
    e.preventDefault()
    setEmailLoading(true)
    setEmailStatus(emptyStatus)

    const res = await fetch('/api/account/email-change/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail, code: emailCode }),
    })
    const data = await res.json()

    if (!res.ok) {
      setEmailStatus({ error: data.error || 'Unable to update email.', notice: '' })
      setEmailLoading(false)
      return
    }

    setCurrentEmail(data.data?.email || newEmail)
    setNewEmail('')
    setEmailCode('')
    setEmailCodeSent(false)
    setEmailStatus({ error: '', notice: data.message || 'Email updated.' })
    await refreshSession()
    setEmailLoading(false)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordStatus(emptyStatus)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ error: 'New passwords do not match.', notice: '' })
      return
    }

    setPasswordLoading(true)

    const res = await fetch('/api/account/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setPasswordStatus({ error: data.error || 'Unable to update password.', notice: '' })
      setPasswordLoading(false)
      return
    }

    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordStatus({ error: '', notice: data.message || 'Password updated.' })
    setPasswordLoading(false)
  }

  async function handleUniversityDelete(e: React.FormEvent) {
    e.preventDefault()
    setUniversityStatus(emptyStatus)

    if (universityDeleteForm.confirmationName !== user.universityName) {
      setUniversityStatus({ error: 'Type the university name exactly to confirm removal.', notice: '' })
      return
    }

    setUniversityLoading(true)

    const res = await fetch('/api/account/university', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(universityDeleteForm),
    })
    const data = await res.json()

    if (!res.ok) {
      setUniversityStatus({ error: data.error || 'Unable to remove university.', notice: '' })
      setUniversityLoading(false)
      return
    }

    setUniversityStatus({ error: '', notice: data.message || 'University removed.' })
    await signOut({ callbackUrl: '/auth/login' })
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    outline: 'none',
  }
  const inputClass = 'w-full px-4 py-3 rounded-xl text-sm transition-all'
  const labelStyle = { color: 'var(--text-secondary)' }

  const renderStatus = ({ error, notice }: SectionStatus) => (
    <>
      {notice && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: 'var(--success)' }}>
          <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6 stagger-children">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Settings size={26} style={{ color: 'var(--accent)' }} />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>
          {roleLabel} - {user.universityName}
        </p>
      </div>

      <form onSubmit={handleProfileSubmit} className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)' }}>
            <User size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{currentEmail}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={labelStyle}>Full name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            className={inputClass}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {renderStatus(profileStatus)}

        <button
          type="submit"
          disabled={profileLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: profileLoading ? 'not-allowed' : 'pointer' }}
        >
          {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {profileLoading ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      <form onSubmit={emailCodeSent ? handleEmailConfirm : handleEmailCodeRequest} className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.28)' }}>
            <Mail size={18} style={{ color: '#38bdf8' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Email</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Current: {currentEmail}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={labelStyle}>New email</label>
          <input
            type="email"
            value={newEmail}
            onChange={e => {
              setNewEmail(e.target.value)
              if (emailCodeSent) {
                setEmailCodeSent(false)
                setEmailCode('')
                setEmailStatus(emptyStatus)
              }
            }}
            required
            className={inputClass}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {emailCodeSent && (
          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>Code sent to current email</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={emailCode}
              onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              className={inputClass}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        )}

        {renderStatus(emailStatus)}

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            disabled={emailLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: emailLoading ? 'not-allowed' : 'pointer' }}
          >
            {emailLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {emailLoading ? 'Working...' : emailCodeSent ? 'Confirm email change' : 'Send confirmation code'}
          </button>

          {emailCodeSent && (
            <button
              type="button"
              onClick={() => {
                setEmailCodeSent(false)
                setEmailCode('')
                setEmailStatus(emptyStatus)
              }}
              className="inline-flex items-center justify-center px-4 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              Change email input
            </button>
          )}
        </div>
      </form>

      <form onSubmit={handlePasswordSubmit} className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.28)' }}>
            <Lock size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Password</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Enter your current password first.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>Current password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={e => setPasswordForm(current => ({ ...current, currentPassword: e.target.value }))}
              required
              className={inputClass}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>New password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm(current => ({ ...current, newPassword: e.target.value }))}
              required
              minLength={8}
              className={inputClass}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={labelStyle}>Confirm password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm(current => ({ ...current, confirmPassword: e.target.value }))}
              required
              minLength={8}
              className={inputClass}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        </div>

        {renderStatus(passwordStatus)}

        <button
          type="submit"
          disabled={passwordLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: passwordLoading ? 'not-allowed' : 'pointer' }}
        >
          {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
          {passwordLoading ? 'Saving...' : 'Update password'}
        </button>
      </form>

      {isAdmin && (
        <form onSubmit={handleUniversityDelete} className="glass rounded-2xl p-6 space-y-4"
          style={{ borderColor: 'rgba(248,113,113,0.28)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.28)' }}>
              <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Remove university</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                This removes {user.universityName} and every account associated with it.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl text-sm"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', color: 'var(--text-secondary)' }}>
            Problems, contests, submissions, teachers, students, admins, verification codes, and password reset codes for this university will be permanently removed.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Admin password</label>
              <input
                type="password"
                value={universityDeleteForm.password}
                onChange={e => setUniversityDeleteForm(current => ({ ...current, password: e.target.value }))}
                required
                className={inputClass}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--danger)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Type university name</label>
              <input
                type="text"
                value={universityDeleteForm.confirmationName}
                onChange={e => setUniversityDeleteForm(current => ({ ...current, confirmationName: e.target.value }))}
                required
                placeholder={user.universityName}
                className={inputClass}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--danger)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {renderStatus(universityStatus)}

          <button
            type="submit"
            disabled={universityLoading || universityDeleteForm.confirmationName !== user.universityName}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: universityDeleteForm.confirmationName === user.universityName ? 'var(--danger)' : 'rgba(248,113,113,0.25)',
              color: '#fff',
              border: 'none',
              cursor: universityLoading || universityDeleteForm.confirmationName !== user.universityName ? 'not-allowed' : 'pointer',
            }}
          >
            {universityLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {universityLoading ? 'Removing...' : 'Remove university'}
          </button>
        </form>
      )}
    </div>
  )
}
