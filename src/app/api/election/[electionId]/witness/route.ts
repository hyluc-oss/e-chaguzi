import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { buildTreeFromLeaves } from '@/lib/merkleTree'
import { getPrismaClient } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ electionId: string }> },
) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'VOTER') {
    return NextResponse.json({ error: 'Voter access required' }, { status: 403 })
  }
  const { electionId } = await params
  const commitment = request.nextUrl.searchParams.get('commitment')
  if (!commitment || !/^(0|[1-9][0-9]*)$/.test(commitment) || commitment.length > 77) {
    return NextResponse.json({ error: 'Invalid commitment' }, { status: 400 })
  }

  try {
    const prisma = getPrismaClient()
    const [leaf, leaves, latestRoot] = await Promise.all([
      prisma.voterCommitment.findUnique({
        where: { electionId_commitment: { electionId, commitment } },
        select: { leafIndex: true },
      }),
      prisma.voterCommitment.findMany({
        where: { electionId },
        orderBy: { leafIndex: 'asc' },
        select: { commitment: true },
      }),
      prisma.voterMerkleRoot.findFirst({
        where: { electionId },
        orderBy: { createdAt: 'desc' },
        select: { root: true },
      }),
    ])
    if (!leaf) return NextResponse.json({ error: 'Commitment is not registered' }, { status: 404 })

    const tree = await buildTreeFromLeaves(leaves.map(item => item.commitment))
    const root = tree.root.toString()
    if (!latestRoot || latestRoot.root !== root) {
      return NextResponse.json({ error: 'The voter tree has not yet been committed on-chain' }, { status: 409 })
    }

    const proof = tree.createProof(leaf.leafIndex)
    return NextResponse.json({
      root,
      leafIndex: leaf.leafIndex,
      pathElements: proof.siblings.map(siblings => siblings[0].toString()),
      pathIndices: proof.pathIndices,
    })
  } catch (error) {
    console.error('[election/witness] Unable to build membership proof:', error)
    return NextResponse.json({ error: 'Voter proof data is temporarily unavailable' }, { status: 503 })
  }
}
