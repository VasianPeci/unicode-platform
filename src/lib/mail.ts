const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

export class EmailDeliveryError extends Error {}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

function normalizeFromAddress(value: string) {
  const trimmed = value.trim()
  if (/^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(trimmed)) return trimmed
  if (/^.+<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$/.test(trimmed)) return trimmed

  const looseMatch = trimmed.match(/^(.+?)\s+([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)$/)
  if (looseMatch) return `${looseMatch[1].trim()} <${looseMatch[2]}>`

  throw new EmailDeliveryError('SENDGRID_FROM_EMAIL must be an email address or use Name <email@example.com> format.')
}

async function sendCodeEmail({
  email,
  code,
  expiresInMinutes,
  subject,
  heading,
  intro,
}: {
  email: string
  code: string
  expiresInMinutes: number
  subject: string
  heading: string
  intro: string
}) {
  const apiKey = requiredEnv('SENDGRID_API_KEY')
  const from = normalizeFromAddress(requiredEnv('SENDGRID_FROM_EMAIL'))
  const fromMatch = from.match(/^(?:(.+)\s)?<([^<>]+)>$/)
  const fromName = fromMatch?.[1]?.trim() || 'UniCode'
  const fromEmail = fromMatch?.[2] || from

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'UniCode/1.0',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email }],
        },
      ],
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject,
      content: [
        {
          type: 'text/plain',
          value: `${intro} Code: ${code}. It expires in ${expiresInMinutes} minutes.`,
        },
        {
          type: 'text/html',
          value: `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
              <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
              <p style="margin:0 0 16px">${intro}</p>
              <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:0 0 16px">${code}</div>
              <p style="margin:0;color:#4b5563">This code expires in ${expiresInMinutes} minutes.</p>
            </div>
          `,
        },
      ],
    }),
  })

  if (response.status !== 202) {
    const text = await response.text()
    throw new EmailDeliveryError(`SendGrid email failed with HTTP ${response.status}${text ? `: ${text}` : ''}`)
  }
}

export async function sendRegistrationCode(email: string, code: string, expiresInMinutes: number) {
  return sendCodeEmail({
    email,
    code,
    expiresInMinutes,
    subject: 'Your UniCode confirmation code',
    heading: 'Confirm your UniCode email',
    intro: 'Use this code to complete your registration:',
  })
}

export async function sendEmailChangeCode(email: string, code: string, expiresInMinutes: number) {
  return sendCodeEmail({
    email,
    code,
    expiresInMinutes,
    subject: 'Confirm your UniCode email change',
    heading: 'Confirm your current email',
    intro: 'Use this code to confirm this email before changing your UniCode account email:',
  })
}

export async function sendPasswordResetCode(email: string, code: string, expiresInMinutes: number) {
  return sendCodeEmail({
    email,
    code,
    expiresInMinutes,
    subject: 'Reset your UniCode password',
    heading: 'Reset your UniCode password',
    intro: 'Use this code to set a new password for your UniCode account:',
  })
}
