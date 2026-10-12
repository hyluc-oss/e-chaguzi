import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'VOTER') {
    return NextResponse.json({ error: 'Voter access required' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { electionId, raceId, candidateName, runningMateName, manifesto } = body as Record<string, unknown>
  if (
    typeof electionId !== 'string' ||
    typeof raceId !== 'string' ||
    typeof candidateName !== 'string' ||
    !candidateName.trim() ||
    candidateName.trim().length > 120 ||
    typeof manifesto !== 'string' ||
    !manifesto.trim() ||
    manifesto.trim().length > 5000 ||
    (runningMateName !== undefined && runningMateName !== null &&
      (typeof runningMateName !== 'string' || runningMateName.trim().length > 120))
  ) {
    return NextResponse.json({ error: 'Check the nomination fields and try again' }, { status: 400 })
  }

  try {
    const prisma = getPrismaClient()
    const [user, race] = await Promise.all([
      prisma.user.findUnique({
        where: { institutionSubject: session.subject },
        select: { id: true },
      }),
      prisma.electionRace.findFirst({
        where: {
          id: raceId,
          electionId,
          election: {
            status: { in: ['DRAFT', 'SCHEDULED'] },
            startTime: { gt: new Date() },
            endTime: { gt: new Date() },
          },
        },
        select: { id: true, position: true, scope: true, scopeKey: true },
      }),
    ])
    if (!user) return NextResponse.json({ error: 'Voter profile not found' }, { status: 403 })
    if (!race) return NextResponse.json({ error: 'The selected position is not accepting nominations' }, { status: 404 })
    if (race.position === 'USRC_EXECUTIVE' &&
      (typeof runningMateName !== 'string' || !runningMateName.trim())) {
      return NextResponse.json({ error: 'A USRC nomination must include both ticket candidates' }, { status: 400 })
    }

    const nomination = await prisma.$transaction(async tx => {
      const created = await tx.nominationRequest.create({
        data: {
          applicantId: user.id,
          electionId,
          raceId,
          candidateName: candidateName.trim(),
          runningMateName: typeof runningMateName === 'string' && runningMateName.trim()
            ? runningMateName.trim()
            : null,
          manifesto: manifesto.trim(),
          position: race.position,
          scope: race.scope,
          scopeKey: race.scopeKey,
        },
        select: { id: true, status: true, createdAt: true },
      })
      await tx.auditLog.create({
        data: {
          electionId,
          actorId: user.id,
          action: 'NOMINATION_SUBMITTED',
          subjectType: 'NominationRequest',
          subjectId: created.id,
        },
      })
      return created
    })
    return NextResponse.json({ nomination }, { status: 201 })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ error: 'A nomination for this position already exists' }, { status: 409 })
    }
    console.error('[nomination] Unable to submit request:', error)
    return NextResponse.json({ error: 'Nomination service is temporarily unavailable' }, { status: 503 })
  }
}
