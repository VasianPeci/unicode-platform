import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  callOpenRouterChat,
  numberFromEnv,
  OpenRouterConfigurationError,
  OpenRouterMessage,
  OpenRouterRequestError,
} from '@/lib/openRouter'

type IncomingMessage = {
  role?: string
  content?: string
}

function roleCapabilities(role: string) {
  if (role === 'ADMIN') {
    return [
      'The user is an admin. Admins use Admin Panel as their main page.',
      'Admins can approve and manage teachers and students.',
      'Admins can view problems, contests, leaderboard, submissions, and settings.',
      'Admins can remove any problem or contest.',
      'Admins can solve problems for practice, but they do not receive points and are not ranked.',
      'Admins cannot create or join contests.',
    ].join('\n')
  }

  if (role === 'TEACHER') {
    return [
      'The user is a professor/teacher.',
      'Teachers can create problems and contests for their university.',
      'Teachers can remove only the problems and contests they created.',
      'Teachers can view problems, contests, leaderboard, submissions, and settings.',
      'Teachers can solve problems for practice, but they do not receive points and are not ranked.',
      'Teachers cannot join contests as participants.',
    ].join('\n')
  }

  return [
    'The user is a student.',
    'Students can solve published problems, submit code, earn points, and see submissions.',
    'Students can join active or upcoming contests when allowed, solve contest problems, and see contest scores.',
    'Students appear on the leaderboard based on points.',
    'Students can manage their account in settings.',
  ].join('\n')
}

function sanitizeMessages(messages: IncomingMessage[]) {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: String(message.content || '').trim().slice(0, 1200),
    }))
    .filter((message) => message.content)
    .slice(-10)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const history = sanitizeMessages(Array.isArray(body.messages) ? body.messages : [])

    if (!history.some((message) => message.role === 'user')) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: [
          'You are the UniCode site assistant.',
          'Explain what users can do in this university coding platform and guide them through navigation and workflows.',
          'Keep answers concise, practical, and role-aware.',
          'Do not provide or reveal secrets, environment variables, hidden test cases, or private data.',
          'Do not solve programming problems for the user; explain where to practice, submit, review submissions, or join contests.',
          `Current user: ${session.user.name}`,
          `Role: ${session.user.role}`,
          `University: ${session.user.universityName}`,
          roleCapabilities(session.user.role),
        ].join('\n'),
      },
      ...history,
    ]

    const answer = await callOpenRouterChat({
      messages,
      temperature: 0.25,
      maxTokens: 650,
      timeoutMs: numberFromEnv('AI_COMPLEXITY_TIMEOUT_MS', 15000),
    })

    return NextResponse.json({ data: { message: answer.content, model: answer.model } })
  } catch (error: any) {
    if (error instanceof OpenRouterConfigurationError) {
      return NextResponse.json({ error: 'Assistant is not configured. Add OPENROUTER_API_KEY to enable it.' }, { status: 503 })
    }

    if (error instanceof OpenRouterRequestError) {
      return NextResponse.json({ error: `Assistant request failed with HTTP ${error.status}` }, { status: 502 })
    }

    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: 'Assistant request timed out' }, { status: 504 })
    }

    return NextResponse.json({ error: 'Assistant could not answer right now' }, { status: 500 })
  }
}
