export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type OpenRouterChatOptions = {
  messages: OpenRouterMessage[]
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
}

export const DEFAULT_OPENROUTER_MODEL = 'openrouter/free'

export class OpenRouterConfigurationError extends Error {}
export class OpenRouterRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

export function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name]
  if (!raw) return fallback

  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export async function callOpenRouterChat({
  messages,
  temperature = 0.2,
  maxTokens = 700,
  timeoutMs = 15000,
}: OpenRouterChatOptions) {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL

  if (!apiKey) {
    throw new OpenRouterConfigurationError('OpenRouter is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-OpenRouter-Title': process.env.OPENROUTER_APP_TITLE || 'UniCode Platform',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    })

    const body = await response.text()
    if (!response.ok) {
      throw new OpenRouterRequestError(`OpenRouter request failed with HTTP ${response.status}`, response.status)
    }

    const data = body ? JSON.parse(body) : {}
    const content = data.choices?.[0]?.message?.content

    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('OpenRouter returned an empty response')
    }

    return {
      content: content.trim(),
      model: data.model || model,
    }
  } finally {
    clearTimeout(timeout)
  }
}
