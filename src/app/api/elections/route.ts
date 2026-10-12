import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/prisma'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'VOTER') {
    return NextResponse.json({ error: 'Voter access required' }, { status: 403 })
  }

  try {
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
    const elections = await prisma.election.findMany({
      where: {
        status: { in: ['DRAFT', 'SCHEDULED', 'ACTIVE'] },
        endTime: { gt: now },
      },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        name: true,
        status: true,
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
      },
    })

    return NextResponse.json({
      elections: elections.map(election => ({
        ...election,
        races: election.races.filter(race => {
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
        }),
      })),
    })
  } catch (error) {
    console.error('[elections] Unable to load active elections:', error)
    return NextResponse.json({ error: 'Election data is temporarily unavailable' }, { status: 503 })
  }
}
