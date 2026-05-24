import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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