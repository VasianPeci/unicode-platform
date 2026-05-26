import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Teachers must register themselves and be approved by the university admin.' },
    { status: 410 },
  )
}
