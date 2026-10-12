import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const user = await getPrismaClient().user.findUnique({
      where: { institutionSubject: session.subject },
      select: { displayName: true, role: true },
    })
    if (!user || user.role !== session.role) {
      return NextResponse.json({ error: 'Authenticated profile is unavailable' }, { status: 403 })
    }
    return NextResponse.json({ displayName: user.displayName })
  } catch (error) {
    console.error('[auth/profile] Unable to load authenticated profile:', error)
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 503 })
  }
}
