import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'VOTER') {
    return NextResponse.json({ error: 'Voter access required' }, { status: 403 })
  }

  return NextResponse.json(
    { error: 'Encrypted ballot submission is unavailable until the election key and tally protocol are configured' },
    { status: 503 },
  )
}
