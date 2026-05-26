import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const VERIFICATION_WINDOW_MINUTES = 5

type VerificationRow = {
  id: string
  codeHash: string
  expiresAt: Date
  userId: string
}

let tableReady: Promise<void> | null = null

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function ensureEmailVerificationTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "email_verifications" (
          "id" TEXT PRIMARY KEY,
          "email" TEXT NOT NULL,
          "codeHash" TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "consumedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
        )
      `)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "email_verifications_email_idx" ON "email_verifications"("email")')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "email_verifications_userId_idx" ON "email_verifications"("userId")')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "email_verifications_expiresAt_idx" ON "email_verifications"("expiresAt")')
    })()
  }

  return tableReady
}

export async function createEmailVerificationCode(userId: string, email: string) {
  await ensureEmailVerificationTable()

  const normalizedEmail = normalizeEmail(email)
  const code = crypto.randomInt(100000, 1000000).toString()
  const codeHash = await bcrypt.hash(code, 12)
  const expiresAt = new Date(Date.now() + VERIFICATION_WINDOW_MINUTES * 60 * 1000)

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "email_verifications"
      SET "consumedAt" = NOW()
      WHERE "userId" = ${userId} AND "consumedAt" IS NULL
    `,
    prisma.$executeRaw`
      INSERT INTO "email_verifications" ("id", "email", "codeHash", "expiresAt", "userId")
      VALUES (${crypto.randomUUID()}, ${normalizedEmail}, ${codeHash}, ${expiresAt}, ${userId})
    `,
  ])

  return { code, expiresAt }
}

export async function getLatestVerification(email: string) {
  await ensureEmailVerificationTable()

  const normalizedEmail = normalizeEmail(email)
  const rows = await prisma.$queryRaw<VerificationRow[]>`
    SELECT "id", "codeHash", "expiresAt", "userId"
    FROM "email_verifications"
    WHERE "email" = ${normalizedEmail} AND "consumedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 1
  `

  return rows[0] || null
}

export async function verifyEmailCode(email: string, code: string) {
  const verification = await getLatestVerification(email)
  if (!verification) {
    return { ok: false as const, reason: 'invalid' as const }
  }

  if (verification.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, reason: 'expired' as const, userId: verification.userId }
  }

  const matches = await bcrypt.compare(code.trim(), verification.codeHash)
  if (!matches) {
    return { ok: false as const, reason: 'invalid' as const, userId: verification.userId }
  }

  const user = await prisma.user.findUnique({
    where: { id: verification.userId },
    select: { id: true, email: true, role: true, isActive: true },
  })

  if (!user) {
    return { ok: false as const, reason: 'invalid' as const, userId: verification.userId }
  }

  const shouldActivate = user.role === 'ADMIN' || user.isActive

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "email_verifications"
      SET "consumedAt" = NOW()
      WHERE "id" = ${verification.id}
    `,
    prisma.$executeRaw`
      UPDATE "users"
      SET "emailVerifiedAt" = NOW(), "isActive" = ${shouldActivate}, "updatedAt" = NOW()
      WHERE "id" = ${verification.userId}
    `,
  ])

  return {
    ok: true as const,
    userId: verification.userId,
    email: user.email,
    role: user.role,
    approved: shouldActivate,
  }
}
