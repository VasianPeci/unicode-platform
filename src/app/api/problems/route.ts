import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const difficulty = searchParams.get('difficulty')
  const tag = searchParams.get('tag')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = { isPublished: true }
  if (difficulty) where.difficulty = difficulty
  if (search) where.title = { contains: search, mode: 'insensitive' }
  if (tag) where.tags = { some: { tag: { name: tag } } }

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        _count: { select: { submissions: true } },
        submissions: {
          where: { userId: session.user.id, status: 'ACCEPTED' },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: [{ difficulty: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.problem.count({ where }),
  ])

  // Calculate acceptance rate
  const result = await Promise.all(
    problems.map(async (p) => {
      const accepted = await prisma.submission.count({
        where: { problemId: p.id, status: 'ACCEPTED' },
      })
      const total = p._count.submissions
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        difficulty: p.difficulty,
        points: p.points,
        tags: p.tags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name, color: pt.tag.color })),
        acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
        totalSubmissions: total,
        isSolved: p.submissions.length > 0,
      }
    })
  )

  return NextResponse.json({
    data: result,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'TEACHER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { title, description, difficulty, points, timeLimit, memoryLimit, testCases, starterCode, constraints, examples, hints, tagIds } = body

    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')

    const problem = await prisma.problem.create({
      data: {
        title,
        slug,
        description,
        difficulty,
        points: points || (difficulty === 'EASY' ? 10 : difficulty === 'MEDIUM' ? 20 : 40),
        timeLimit: timeLimit || 2000,
        memoryLimit: memoryLimit || 256,
        testCases: testCases || [],
        starterCode: starterCode || {},
        constraints,
        examples: examples || [],
        hints: hints || [],
        createdById: session.user.id,
        isPublished: false,
        ...(tagIds?.length && {
          tags: { create: tagIds.map((tagId: string) => ({ tagId })) },
        }),
      },
      include: { tags: { include: { tag: true } } },
    })

    return NextResponse.json({ data: problem }, { status: 201 })
  } catch (error: any) {
    console.error('[Problem Create Error]', error)
    return NextResponse.json({ error: 'Failed to create problem' }, { status: 500 })
  }
}
