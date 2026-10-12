import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ electionId: string }> },
) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'VOTER') {
    return NextResponse.json({ error: 'Voter access required' }, { status: 403 })
  }

  try {
    const { electionId } = await params
    const prisma = getPrismaClient()
    const user = await prisma.user.findUnique({
      where: { institutionSubject: session.subject },
      select: { facultyKey: true, residenceKey: true, classKey: true },
    })
    if (!user) return NextResponse.json({ error: 'Voter profile not found' }, { status: 403 })

    const now = new Date()
    await prisma.election.updateMany({
      where: { status: 'SCHEDULED', startTime: { lte: now }, endTime: { gt: now } },
      data: { status: 'ACTIVE' },
    })
    await prisma.election.updateMany({
      where: { status: { in: ['ACTIVE', 'SCHEDULED'] }, endTime: { lte: now } },
      data: { status: 'CLOSED' },
    })

    const election = await prisma.election.findFirst({
      where: {
        id: electionId,
        status: 'ACTIVE',
        startTime: { lte: now },
        endTime: { gt: now },
      },
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        races: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            position: true,
            scope: true,
            scopeKey: true,
            candidates: {
              orderBy: { name: 'asc' },
              select: { id: true, name: true, runningMateName: true, manifesto: true },
            },
          },
        },
        voterRoots: { orderBy: { createdAt: 'desc' }, take: 1, select: { root: true } },
      },
    })
    if (!election) return NextResponse.json({ error: 'Active election not found' }, { status: 404 })

    const races = election.races.filter(race => {
      switch (race.position) {
        case 'USRC_EXECUTIVE':
          return true
        case 'FACULTY_REPRESENTATIVE':
          return user.facultyKey === race.scopeKey
        case 'FLOOR_DELEGATE':
          return user.residenceKey === race.scopeKey
        case 'CLASS_REPRESENTATIVE':
          return user.classKey === race.scopeKey
      }
    })
    return NextResponse.json({
      election: { ...election, races, voterRoots: undefined },
      merkleRoot: election.voterRoots[0]?.root ?? null,
    })
  } catch (error) {
    console.error('[election] Unable to load election:', error)
    return NextResponse.json({ error: 'Election data is temporarily unavailable' }, { status: 503 })
  }
}
