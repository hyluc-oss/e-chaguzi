import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

const BN254_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

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
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  const { commitment, electionId } = body as Record<string, unknown>
  if (
    typeof commitment !== 'string' ||
    commitment.length > 77 ||
    !/^(0|[1-9][0-9]*)$/.test(commitment) ||
    BigInt(commitment) <= 0n ||
    BigInt(commitment) >= BN254_SCALAR_FIELD ||
    typeof electionId !== 'string' ||
    !electionId
  ) {
    return NextResponse.json({ error: 'Invalid commitment or election ID' }, { status: 400 })
  }

  try {
    const prisma = getPrismaClient()
    const created = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${electionId}))`
      const election = await tx.election.findUnique({
        where: { id: electionId },
        select: { status: true, startTime: true },
      })
      if (!election || election.startTime <= new Date() || election.status === 'CLOSED') return null

      const leafIndex = await tx.voterCommitment.count({ where: { electionId } })
      if (leafIndex >= 2 ** 20) throw new Error('Voter Merkle tree capacity reached')
      return tx.voterCommitment.create({
        data: { electionId, commitment, leafIndex },
        select: { id: true, leafIndex: true, createdAt: true },
      })
    }, { isolationLevel: 'Serializable' })

    if (!created) return NextResponse.json({ error: 'Voter registration is closed' }, { status: 409 })
    return NextResponse.json({ registered: true, ...created }, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Commitment is already registered for this election' }, { status: 409 })
    }
    console.error('[register] Unable to store voter commitment:', error)
    return NextResponse.json({ error: 'Voter registration is temporarily unavailable' }, { status: 503 })
  }
}
