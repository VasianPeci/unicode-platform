import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action } = await req.json().catch(() => ({ action: '' }))
  if (action !== 'approve')
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      emailVerifiedAt: true,
      universityId: true,
    },
  })

  if (!target)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (target.universityId !== session.user.universityId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!['STUDENT', 'TEACHER'].includes(target.role))
    return NextResponse.json({ error: 'Only student and teacher registrations can be approved.' }, { status: 400 })

  if (!target.emailVerifiedAt && !target.isActive)
    return NextResponse.json({ error: 'This user has not confirmed their email yet.' }, { status: 400 })

  if (target.isActive)
    return NextResponse.json({ data: target, message: 'User is already approved.' })

  const approved = await prisma.user.update({
    where: { id: params.id },
    data: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ data: approved, message: 'Registration approved.' })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'TEACHER'].includes(session.user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = params

  const target = await prisma.user.findUnique({
    where: { id },
    select: { universityId: true, role: true },
  })

  if (!target)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (target.universityId !== session.user.universityId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Only ADMIN can delete teachers; ADMIN or TEACHER can delete students
  if (target.role === 'TEACHER' && session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Only admins can delete teachers' }, { status: 403 })

  if (!['STUDENT', 'TEACHER'].includes(target.role))
    return NextResponse.json({ error: 'Cannot delete this user' }, { status: 400 })

  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
