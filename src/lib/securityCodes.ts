import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/emailVerification'

export const SECURITY_CODE_WINDOW_MINUTES = 10

export type SecurityCodePurpose = 'EMAIL_CHANGE' | 'PASSWORD_RESET'

type SecurityCodeRow = {
  id: string
  codeHash: string
  expiresAt: Date
}

let tableReady: Promise<void> | null = null

export async function ensureAccountSecurityCodeTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "account_security_codes" (
          "id" TEXT PRIMARY KEY,
          "email" TEXT NOT NULL,
          "purpose" TEXT NOT NULL,
          "codeHash" TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "consumedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
        )
      `)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "account_security_codes_email_purpose_idx" ON "account_security_codes"("email", "purpose")')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "account_security_codes_userId_purpose_idx" ON "account_security_codes"("userId", "purpose")')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "account_security_codes_expiresAt_idx" ON "account_security_codes"("expiresAt")')
    })()
  }

  return tableReady
}

export async function createSecurityCode(userId: string, email: string, purpose: SecurityCodePurpose) {
  await ensureAccountSecurityCodeTable()

  const normalizedEmail = normalizeEmail(email)
  const code = crypto.randomInt(100000, 1000000).toString()
  const codeHash = await bcrypt.hash(code, 12)
  const expiresAt = new Date(Date.now() + SECURITY_CODE_WINDOW_MINUTES * 60 * 1000)

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "account_security_codes"
      SET "consumedAt" = NOW()
      WHERE "userId" = ${userId} AND "purpose" = ${purpose} AND "consumedAt" IS NULL
    `,
    prisma.$executeRaw`
      INSERT INTO "account_security_codes" ("id", "email", "purpose", "codeHash", "expiresAt", "userId")
      VALUES (${crypto.randomUUID()}, ${normalizedEmail}, ${purpose}, ${codeHash}, ${expiresAt}, ${userId})
    `,
  ])

  return { code, expiresAt }
}

export async function verifySecurityCode({
  userId,
  email,
  purpose,
  code,
}: {
  userId: string
  email: string
  purpose: SecurityCodePurpose
  code: string
}) {
  await ensureAccountSecurityCodeTable()

  const normalizedEmail = normalizeEmail(email)
  const rows = await prisma.$queryRaw<SecurityCodeRow[]>`
    SELECT "id", "codeHash", "expiresAt"
    FROM "account_security_codes"
    WHERE "userId" = ${userId}
      AND "email" = ${normalizedEmail}
      AND "purpose" = ${purpose}
      AND "consumedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 1
  `

  const securityCode = rows[0]
  if (!securityCode) {
    return { ok: false as const, reason: 'invalid' as const }
  }

  if (securityCode.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, reason: 'expired' as const }
  }

  const matches = await bcrypt.compare(code.trim(), securityCode.codeHash)
  if (!matches) {
    return { ok: false as const, reason: 'invalid' as const }
  }

  await prisma.$executeRaw`
    UPDATE "account_security_codes"
    SET "consumedAt" = NOW()
    WHERE "id" = ${securityCode.id}
  `

  return { ok: true as const }
}
