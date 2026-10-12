import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

async function getAdmin(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'ADMIN') return null
  return getPrismaClient().user.findUnique({
    where: { institutionSubject: session.subject },
    select: { id: true, role: true },
  })
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdmin(request)
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }
    const nominations = await getPrismaClient().nominationRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        candidateName: true,
        runningMateName: true,
        manifesto: true,
        position: true,
        scope: true,
        scopeKey: true,
        createdAt: true,
        applicant: { select: { institutionSubject: true } },
      },
    })
    return NextResponse.json({ nominations })
  } catch (error) {
    console.error('[admin/nominations] Unable to load applications:', error)
    return NextResponse.json({ error: 'Nomination data is temporarily unavailable' }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdmin(request)
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    const body: unknown = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { nominationId, decision, reviewNote } = body as Record<string, unknown>
    if (
      typeof nominationId !== 'string' ||
      (decision !== 'APPROVED' && decision !== 'REJECTED') ||
      (reviewNote !== undefined && typeof reviewNote !== 'string')
    ) {
      return NextResponse.json({ error: 'Invalid nomination decision' }, { status: 400 })
    }

    const prisma = getPrismaClient()
    const nomination = await prisma.$transaction(async tx => {
      const pending = await tx.nominationRequest.findFirst({
        where: { id: nominationId, status: 'PENDING' },
      })
      if (!pending) return null

      if (decision === 'APPROVED') {
        await tx.candidate.create({
          data: {
            raceId: pending.raceId,
            nominationId: pending.id,
            name: pending.candidateName,
            runningMateName: pending.runningMateName,
            manifesto: pending.manifesto,
          },
        })
      }

      const reviewed = await tx.nominationRequest.update({
        where: { id: pending.id },
        data: {
          status: decision,
          reviewedById: admin.id,
          reviewedAt: new Date(),
          reviewNote: typeof reviewNote === 'string' ? reviewNote.slice(0, 1000) : null,
        },
        select: { id: true, status: true, reviewedAt: true },
      })
      await tx.auditLog.create({
        data: {
          electionId: pending.electionId,
          actorId: admin.id,
          action: decision === 'APPROVED' ? 'NOMINATION_APPROVED' : 'NOMINATION_REJECTED',
          subjectType: 'NominationRequest',
          subjectId: pending.id,
        },
      })
      return reviewed
    })

    if (!nomination) return NextResponse.json({ error: 'Pending nomination not found' }, { status: 404 })
    return NextResponse.json({ nomination })
  } catch (error) {
    console.error('[admin/nominations] Unable to review application:', error)
    return NextResponse.json({ error: 'Nomination review failed' }, { status: 503 })
  }
}
