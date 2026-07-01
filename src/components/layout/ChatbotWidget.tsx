'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react'

type ChatMessage = {
  role: 'assistant' | 'user'
  content: string
}

function initialMessage(name: string, role: string) {
  const firstName = name.split(' ')[0]

  if (role === 'ADMIN') {
    return `Hi ${firstName}. I can help you use the admin panel, manage users, and understand problems or contests.`
  }

  if (role === 'TEACHER') {
    return `Hi ${firstName}. I can help you create problems, create contests, and understand teacher workflows.`
  }

  return `Hi ${firstName}. I can help you find problems, join contests, track points, and review submissions.`
}

export function ChatbotWidget() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const user = session?.user

  useEffect(() => {
    if (!user || messages.length > 0) return
    setMessages([
      {
        role: 'assistant',
        content: initialMessage(user.name || 'there', user.role),
      },
    ])
  }, [messages.length, user])

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  const prompts = useMemo(() => {
    if (user?.role === 'ADMIN') {
      return ['What can admins do?', 'How do removals work?']
    }

    if (user?.role === 'TEACHER') {
      return ['How do I create a contest?', 'Can teachers earn points?']
    }

    return ['How do I earn points?', 'How do contests work?']
  }, [user?.role])

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

  if (status !== 'authenticated' || !user) return null

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
      {open && (
        <section
          className="w-[calc(100vw-2.5rem)] max-w-[390px] h-[560px] max-h-[calc(100vh-6rem)] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)' }}
            >
              <Bot size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-sm">UniCode Assistant</h2>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                Site guide
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              aria-label="Close assistant"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => {
              const isUser = message.role === 'user'

              return (
                <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[84%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: isUser ? 'var(--accent)' : 'var(--bg-elevated)',
                      border: isUser ? '1px solid var(--accent)' : '1px solid var(--border)',
                      color: isUser ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="px-3.5 py-2.5 rounded-2xl text-sm flex items-center gap-2"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  Thinking
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
            {error && (
              <div
                className="mb-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}
              >
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: loading || !input.trim() ? 'var(--accent-dim)' : 'var(--accent)',
                  border: 'none',
                  color: '#fff',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                }}
                aria-label="Send message"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105"
        style={{
          background: 'var(--accent)',
          color: '#fff',
          border: '1px solid var(--border-accent)',
        }}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? <X size={22} /> : <MessageCircle size={23} />}
      </button>
    </div>
  )
}
