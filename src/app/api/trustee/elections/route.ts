import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'TRUSTEE') {
    return NextResponse.json({ error: 'Trustee access required' }, { status: 403 })
  }

  try {
    const prisma = getPrismaClient()
    const user = await prisma.user.findUnique({
      where: { institutionSubject: session.subject },
      select: { id: true, role: true },
    })
    if (!user || user.role !== 'TRUSTEE') {
      return NextResponse.json({ error: 'Trustee access required' }, { status: 403 })
    }

    const assignments = await prisma.electionTrustee.findMany({
      where: { trusteeId: user.id },
      orderBy: { assignedAt: 'desc' },
      select: {
        seatIndex: true,
        election: {
          select: {
            id: true,
            name: true,
            status: true,
            startTime: true,
            endTime: true,
            trusteeThreshold: true,
            _count: { select: { trustees: true } },
          },
        },
      },
    })
    return NextResponse.json({
      assignments: assignments.map(({ election, seatIndex }) => {
        const { _count, ...details } = election
        return { ...details, trusteeCount: _count.trustees, seatIndex }
      }),
    })
  } catch (error) {
    console.error('[trustee/elections] Unable to load assignments:', error)
    return NextResponse.json({ error: 'Trustee assignments are temporarily unavailable' }, { status: 503 })
  }
}
