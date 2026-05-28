import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { ensureEmailVerificationTable } from '@/lib/emailVerification'
import { prisma } from '@/lib/prisma'
import { ensureAccountSecurityCodeTable } from '@/lib/securityCodes'

const deleteUniversitySchema = z.object({
  password: z.string().min(1),
  confirmationName: z.string().trim().min(1),
})

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only university admins can remove a university.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { password, confirmationName } = deleteUniversitySchema.parse(body)

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { university: true },
    })

    if (!admin) return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    if (admin.role !== 'ADMIN' || admin.universityId !== session.user.universityId) {
      return NextResponse.json({ error: 'Only university admins can remove a university.' }, { status: 403 })
    }

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash)
    if (!passwordMatches) {
      return NextResponse.json({ error: 'Password is incorrect.' }, { status: 400 })
    }

    if (confirmationName.trim() !== admin.university.name) {
      return NextResponse.json({ error: 'Type the university name exactly to confirm removal.' }, { status: 400 })
    }

    await ensureEmailVerificationTable()
    await ensureAccountSecurityCodeTable()

    const universityId = admin.universityId
    const users = await prisma.user.findMany({
      where: { universityId },
      select: { id: true },
    })
    const userIds = users.map(user => user.id)

    const [problems, contests] = await Promise.all([
      prisma.problem.findMany({
        where: { createdById: { in: userIds } },
        select: { id: true },
      }),
      prisma.contest.findMany({
        where: { createdById: { in: userIds } },
        select: { id: true },
      }),
    ])

    const problemIds = problems.map(problem => problem.id)
    const contestIds = contests.map(contest => contest.id)

    await prisma.$transaction(async tx => {
      await tx.contestParticipant.deleteMany({
        where: {
          OR: [
            { userId: { in: userIds } },
            { contestId: { in: contestIds } },
          ],
        },
      })

      await tx.contestProblem.deleteMany({
        where: {
          OR: [
            { contestId: { in: contestIds } },
            { problemId: { in: problemIds } },
          ],
        },
      })

      await tx.problemTag.deleteMany({
        where: { problemId: { in: problemIds } },
      })

      await tx.submission.deleteMany({
        where: {
          OR: [
            { userId: { in: userIds } },
            { problemId: { in: problemIds } },
            { contestId: { in: contestIds } },
          ],
        },
      })

      await tx.contest.deleteMany({
        where: { id: { in: contestIds } },
      })

      await tx.problem.deleteMany({
        where: { id: { in: problemIds } },
      })

      await tx.emailVerification.deleteMany({
        where: { userId: { in: userIds } },
      })

      await tx.accountSecurityCode.deleteMany({
        where: { userId: { in: userIds } },
      })

      await tx.user.deleteMany({
        where: { id: { in: userIds } },
      })

      await tx.university.delete({
        where: { id: universityId },
      })
    })

    return NextResponse.json({
      message: 'University and all associated accounts were removed.',
      data: {
        removedUsers: userIds.length,
        removedProblems: problemIds.length,
        removedContests: contestIds.length,
      },
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Enter your password and the university name.' }, { status: 400 })
    }

    console.error('[University Delete Error]', error)
    return NextResponse.json({ error: 'Unable to remove university.' }, { status: 500 })
  }
}
