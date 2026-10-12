import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
  }

  try {
    const prisma = getPrismaClient()
    const [registeredVoters, activeElections, pendingNominations] = await Promise.all([
      prisma.voterCommitment.count(),
      prisma.election.count({ where: { status: 'ACTIVE' } }),
      prisma.nominationRequest.count({ where: { status: 'PENDING' } }),
    ])
    return NextResponse.json({ registeredVoters, activeElections, pendingNominations })
  } catch (error) {
    console.error('[admin/summary] Unable to load dashboard counts:', error)
    return NextResponse.json({ error: 'Admin dashboard is temporarily unavailable' }, { status: 503 })
  }
}
