'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Loader2, Send, Sparkles, UserRound } from 'lucide-react'

type ChatMessage = {
  role: 'assistant' | 'user'
  content: string
}

type Props = {
  user: {
    name: string
    role: string
    universityName: string
  }
}

function roleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase()
}

function initialMessage(user: Props['user']) {
  const firstName = user.name.split(' ')[0]
  if (user.role === 'ADMIN') {
    return `Hi ${firstName}. I can help you navigate the admin panel, approvals, users, problems, contests, and account settings.`
  }
  if (user.role === 'TEACHER') {
    return `Hi ${firstName}. I can help you create problems, build contests, review submissions, and understand what teacher accounts can do.`
  }
  return `Hi ${firstName}. I can help you find problems, join contests, understand points, review submissions, and use the leaderboard.`
}

export default function AssistantClient({ user }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: initialMessage(user) },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const prompts = useMemo(() => {
    if (user.role === 'ADMIN') {
      return ['What can admins manage?', 'How do problem and contest removals work?', 'Where do I approve users?']
    }
    if (user.role === 'TEACHER') {
      return ['How do I create a contest?', 'What can teachers do with problems?', 'Can teachers earn points?']
    }
    return ['How do I earn points?', 'How do contests work?', 'Where can I see my submissions?']
  }, [user.role])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    const content = text.trim()
    if (!content || loading) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Assistant could not answer')
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data.data.message },
      ])
    } catch (err: any) {
      setError(err.message || 'Assistant could not answer')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-7rem)] min-h-[640px] flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)' }}
            >
              <Bot size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Assistant</h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {roleLabel(user.role)} - {user.universityName}
              </p>
            </div>
          </div>
        </div>

        <div
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          Site guide
        </div>
      </div>

      <div className="glass rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((message, index) => {
            const isUser = message.role === 'user'
            const Icon = isUser ? UserRound : Bot

            return (
              <div key={index} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-accent)' }}
                  >
                    <Icon size={15} />
                  </div>
                )}

                <div
                  className="max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: isUser ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: isUser ? '#fff' : 'var(--text-secondary)',
                    border: isUser ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  {message.content}
                </div>

                {isUser && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    <Icon size={15} />
                  </div>
                )}
              </div>
            )
          })}

          {loading && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-accent)' }}
              >
                <Bot size={15} />
              </div>
              <div
                className="rounded-2xl px-4 py-3 text-sm flex items-center gap-2"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                <Loader2 size={14} className="animate-spin" />
                Thinking
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 sm:p-5" style={{ borderTop: '1px solid var(--border)' }}>
          {error && (
            <div
              className="mb-3 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full text-xs transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              rows={1}
              className="flex-1 px-4 py-3 rounded-xl text-sm resize-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
              style={{ background: loading || !input.trim() ? 'var(--accent-dim)' : 'var(--accent)', border: 'none', color: '#fff', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer' }}
              aria-label="Send message"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
