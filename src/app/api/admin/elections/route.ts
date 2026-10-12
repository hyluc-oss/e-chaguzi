import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

const POSITION_VALUES = [
  'USRC_EXECUTIVE',
  'FACULTY_REPRESENTATIVE',
  'FLOOR_DELEGATE',
  'CLASS_REPRESENTATIVE',
] as const

function isPosition(value: unknown): value is typeof POSITION_VALUES[number] {
  return typeof value === 'string' && POSITION_VALUES.includes(value as typeof POSITION_VALUES[number])
}

async function requireAdmin(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'ADMIN') return null
  const user = await getPrismaClient().user.findUnique({
    where: { institutionSubject: session.subject },
    select: { id: true, role: true },
  })
  return user?.role === 'ADMIN' ? user : null
}

export async function GET(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }
    const elections = await getPrismaClient().election.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        trusteeThreshold: true,
        chainElectionId: true,
        contractAddress: true,
        status: true,
        startTime: true,
        endTime: true,
        races: { select: { id: true, position: true, scope: true, scopeKey: true } },
        trustees: {
          orderBy: { seatIndex: 'asc' },
          select: { seatIndex: true, trustee: { select: { institutionSubject: true } } },
        },
        voterRoots: { select: { root: true, transactionHash: true, createdAt: true } },
      },
    })
    return NextResponse.json({ elections })
  } catch (error) {
    console.error('[admin/elections] Unable to load elections:', error)
    return NextResponse.json({ error: 'Election data is temporarily unavailable' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { name, startTime, endTime, races, contractAddress, trusteeSubjects } = body as Record<string, unknown>
    if (
      typeof name !== 'string' || !name.trim() || name.trim().length > 160 ||
      typeof startTime !== 'string' || typeof endTime !== 'string' ||
      typeof contractAddress !== 'string' || !ethers.isAddress(contractAddress) ||
      !Array.isArray(trusteeSubjects) || trusteeSubjects.length !== 5 ||
      !trusteeSubjects.every(subject => typeof subject === 'string' && subject.trim()) ||
      !Array.isArray(races) || races.length < POSITION_VALUES.length
    ) {
      return NextResponse.json({ error: 'Provide a valid contract address, election dates, name, five trustees, and all four position types' }, { status: 400 })
    }
    const subjects = trusteeSubjects.map(subject => typeof subject === 'string' ? subject.trim() : '')
    if (new Set(subjects).size !== 5) {
      return NextResponse.json({ error: 'Select five distinct trustees' }, { status: 400 })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Election end must be after its start' }, { status: 400 })
    }

    const validRaces: { position: typeof POSITION_VALUES[number]; scope: string; scopeKey: string }[] = []
    for (const race of races) {
      if (!race || typeof race !== 'object') {
        return NextResponse.json({ error: 'Invalid race scope' }, { status: 400 })
      }
      const item = race as Record<string, unknown>
      if (
        !isPosition(item.position) ||
        typeof item.scope !== 'string' || !item.scope.trim() || item.scope.length > 160 ||
        (item.position !== 'USRC_EXECUTIVE' &&
          (typeof item.scopeKey !== 'string' || !item.scopeKey.trim() || item.scopeKey.length > 160))
      ) {
        return NextResponse.json({ error: 'Each position requires a valid scope' }, { status: 400 })
      }
      const scopeKey = item.position === 'USRC_EXECUTIVE' ? 'ALL' : item.scopeKey
      if (typeof scopeKey !== 'string') {
        return NextResponse.json({ error: 'Each position requires a valid eligibility key' }, { status: 400 })
      }
      validRaces.push({ position: item.position, scope: item.scope.trim(), scopeKey: scopeKey.trim() })
    }

    const positions = new Set(validRaces.map(race => race.position))
    if (POSITION_VALUES.some(position => !positions.has(position))) {
      return NextResponse.json({ error: 'Include at least one race for every position type' }, { status: 400 })
    }
    if (validRaces.filter(race => race.position === 'USRC_EXECUTIVE').length !== 1) {
      return NextResponse.json({ error: 'An election must have exactly one USRC executive ticket race' }, { status: 400 })
    }

    const prisma = getPrismaClient()
    const trustees = await prisma.user.findMany({
      where: { institutionSubject: { in: subjects }, role: 'TRUSTEE' },
      select: { id: true, institutionSubject: true },
    })
    if (trustees.length !== 5) {
      return NextResponse.json({ error: 'All five trustees must have signed in using the configured trustee group' }, { status: 409 })
    }
    const trusteeBySubject = new Map(trustees.map(trustee => [trustee.institutionSubject, trustee]))
    const orderedTrustees = subjects.flatMap((subject, index) => {
      const trustee = trusteeBySubject.get(subject)
      return trustee ? [{ trusteeId: trustee.id, seatIndex: index + 1 }] : []
    })
    if (orderedTrustees.length !== 5) {
      return NextResponse.json({ error: 'Unable to verify the selected trustee roster' }, { status: 409 })
    }

    const election = await prisma.$transaction(async tx => {
      const created = await tx.election.create({
        data: {
          name: name.trim(),
          contractAddress,
          startTime: start,
          endTime: end,
          races: { create: validRaces },
          trustees: { create: orderedTrustees },
        },
        select: { id: true, name: true, status: true, trusteeThreshold: true },
      })
      await tx.auditLog.create({
        data: {
          electionId: created.id,
          actorId: admin.id,
          action: 'ELECTION_CREATED',
          subjectType: 'Election',
          subjectId: created.id,
        },
      })
      await tx.auditLog.create({
        data: {
          electionId: created.id,
          actorId: admin.id,
          action: 'KEY_TRUSTEE_ROSTER_ASSIGNED',
          subjectType: 'Election',
          subjectId: created.id,
          details: { trusteeCount: 5, threshold: created.trusteeThreshold },
        },
      })
      return created
    })
    return NextResponse.json({ election }, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Race scopes must be unique within an election' }, { status: 409 })
    }
    console.error('[admin/elections] Unable to create election:', error)
    return NextResponse.json({ error: 'Election creation failed' }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    const { electionId, action } = body as Record<string, unknown>
    if (typeof electionId !== 'string' || (action !== 'publish' && action !== 'close')) {
      return NextResponse.json({ error: 'Invalid election action' }, { status: 400 })
    }

    const prisma = getPrismaClient()
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      select: { id: true, status: true, startTime: true, endTime: true, contractAddress: true },
    })
    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 })

    let status: 'SCHEDULED' | 'ACTIVE' | 'CLOSED'
    if (action === 'close') {
      if (election.status !== 'ACTIVE' && election.status !== 'SCHEDULED') {
        return NextResponse.json({ error: 'Election cannot be closed from its current status' }, { status: 409 })
      }
      status = 'CLOSED'
    } else {
      const now = new Date()
      if (election.status !== 'DRAFT' || election.endTime <= now) {
        return NextResponse.json({ error: 'Election cannot be published from its current status' }, { status: 409 })
      }
      if (!election.contractAddress) {
        return NextResponse.json({ error: 'Configure the deployed ballot contract before publishing' }, { status: 409 })
      }
      const trusteeCount = await prisma.electionTrustee.count({ where: { electionId } })
      if (trusteeCount !== 5) {
        return NextResponse.json({ error: 'Assign five independent key trustees before publishing' }, { status: 409 })
      }
      if ((await prisma.voterMerkleRoot.count({ where: { electionId } })) === 0) {
        return NextResponse.json({ error: 'Upload an on-chain voter Merkle root before publishing' }, { status: 409 })
      }
      status = election.startTime > now ? 'SCHEDULED' : 'ACTIVE'
    }

    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.election.update({
        where: { id: electionId },
        data: { status },
        select: { id: true, name: true, status: true },
      })
      await tx.auditLog.create({
        data: {
          electionId,
          actorId: admin.id,
          action: status === 'CLOSED' ? 'ELECTION_CLOSED' : 'ELECTION_PUBLISHED',
          subjectType: 'Election',
          subjectId: electionId,
        },
      })
      return changed
    })
    return NextResponse.json({ election: updated })
  } catch (error) {
    console.error('[admin/elections] Unable to update election:', error)
    return NextResponse.json({ error: 'Election update failed' }, { status: 503 })
  }
}
