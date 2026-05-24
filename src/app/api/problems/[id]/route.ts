import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const problem = await prisma.problem.findFirst({
    where: {
      OR: [{ id: params.id }, { slug: params.id }],
      isPublished: true,
      createdBy: { universityId: session.user.universityId },
    },
    include: {
      tags: { include: { tag: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  if (!problem) return NextResponse.json({ error: 'Problem not found' }, { status: 404 })

  // Check if user solved it
  const solved = await prisma.submission.findFirst({
    where: { problemId: problem.id, userId: session.user.id, status: 'ACCEPTED' },
    select: { id: true },
  })

  const [accepted, totalSubmissions] = await Promise.all([
    prisma.submission.count({
      where: { problemId: problem.id, status: 'ACCEPTED', user: { role: 'STUDENT' } },
    }),
    prisma.submission.count({
      where: { problemId: problem.id, user: { role: 'STUDENT' } },
    }),
  ])

  // Filter hidden test cases for students
  const testCases = (problem.testCases as any[]).map((tc, i) => ({
    ...tc,
    input: tc.isHidden ? undefined : tc.input,
    expectedOutput: tc.isHidden ? undefined : tc.expectedOutput,
  }))

  return NextResponse.json({
    data: {
      id: problem.id,
      title: problem.title,
      slug: problem.slug,
      description: problem.description,
      difficulty: problem.difficulty,
      points: problem.points,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      constraints: problem.constraints,
      examples: problem.examples,
      hints: problem.hints,
      starterCode: problem.starterCode,
      tags: problem.tags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name, color: pt.tag.color })),
      createdBy: problem.createdBy,
      isCreatedByMe: problem.createdBy.id === session.user.id,
      canDelete: session.user.role === 'ADMIN' || (session.user.role === 'TEACHER' && problem.createdBy.id === session.user.id),
      acceptanceRate: totalSubmissions > 0 ? Math.round((accepted / totalSubmissions) * 100) : 0,
      totalSubmissions,
      isSolved: !!solved,
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'TEACHER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.problem.findUnique({
    where: { id: params.id },
    select: { createdById: true, createdBy: { select: { universityId: true } } },
  })

  if (!existing) return NextResponse.json({ error: 'Problem not found' }, { status: 404 })
  if (existing.createdBy.universityId !== session.user.universityId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (session.user.role === 'TEACHER' && existing.createdById !== session.user.id) {
    return NextResponse.json({ error: 'You can only edit problems you created' }, { status: 403 })
  }

  const body = await req.json()
  const problem = await prisma.problem.update({
    where: { id: params.id },
    data: body,
  })

  return NextResponse.json({ data: problem })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'TEACHER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const problem = await prisma.problem.findUnique({
    where: { id: params.id },
    select: { createdById: true, createdBy: { select: { universityId: true } } },
  })

  if (!problem) return NextResponse.json({ error: 'Problem not found' }, { status: 404 })
  if (problem.createdBy.universityId !== session.user.universityId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (session.user.role === 'TEACHER' && problem.createdById !== session.user.id) {
    return NextResponse.json({ error: 'You can only remove problems you created' }, { status: 403 })
  }

  await prisma.problem.update({
    where: { id: params.id },
    data: { isPublished: false },
  })

  return NextResponse.json({ message: 'Problem removed' })
}
