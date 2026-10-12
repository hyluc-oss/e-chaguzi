import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'
import { buildTreeFromLeaves } from '@/lib/merkleTree'

const ABI = [
  'function electionId() view returns (uint256)',
  'function addMerkleRoot(uint256 root) external',
]
const BN254_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ electionId: string }> },
) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
  }
  const electionId = (await params).electionId

  const rpcUrl = process.env.RPC_PROVIDER_URL ?? 'http://127.0.0.1:8545'
  const adminPrivateKey = process.env.ELECTION_ADMIN_PRIVATE_KEY
  if (!adminPrivateKey) {
    return NextResponse.json({ error: 'On-chain root management is not configured' }, { status: 503 })
  }

  try {
    const prisma = getPrismaClient()
    const [admin, election, existing] = await Promise.all([
      prisma.user.findUnique({
        where: { institutionSubject: session.subject },
        select: { id: true, role: true },
      }),
      prisma.election.findUnique({
        where: { id: electionId },
        select: { id: true, chainElectionId: true, contractAddress: true },
      }),
      prisma.voterCommitment.findMany({
        where: { electionId },
        orderBy: { leafIndex: 'asc' },
        select: { commitment: true },
      }),
    ])
    if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 })
    if (!election.contractAddress) return NextResponse.json({ error: 'Ballot contract is not configured' }, { status: 409 })
    if (existing.length === 0) return NextResponse.json({ error: 'No voter commitments are registered' }, { status: 409 })

    const tree = await buildTreeFromLeaves(existing.map(item => item.commitment))
    const root = BigInt(tree.root.toString())
    if (root <= 0n || root >= BN254_SCALAR_FIELD) {
      return NextResponse.json({ error: 'Generated Merkle root is outside the BN254 scalar field' }, { status: 500 })
    }
    const rootValue = root.toString()
    const alreadyRegistered = await prisma.voterMerkleRoot.findUnique({
      where: { electionId_root: { electionId, root: rootValue } },
    })
    if (alreadyRegistered) return NextResponse.json({ error: 'Current voter Merkle root is already registered' }, { status: 409 })

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(adminPrivateKey, provider)
    const contract = new ethers.Contract(election.contractAddress, ABI, wallet)
    const contractElectionId = ethers.toBigInt(await contract.electionId())
    if (contractElectionId !== BigInt(election.chainElectionId)) {
      return NextResponse.json({ error: 'The configured ballot contract belongs to another election' }, { status: 409 })
    }
    const tx = await contract.addMerkleRoot(root)
    const receipt = await tx.wait()
    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ error: 'On-chain Merkle root transaction failed' }, { status: 502 })
    }

    const rootRecord = await prisma.$transaction(async txDb => {
      const record = await txDb.voterMerkleRoot.create({
        data: { electionId, root: rootValue, transactionHash: receipt.hash },
      })
      await txDb.auditLog.create({
        data: {
          electionId,
          actorId: admin.id,
          action: 'VOTER_MERKLE_ROOT_ADDED',
          subjectType: 'VoterMerkleRoot',
          subjectId: record.id,
          txHash: receipt.hash,
        },
      })
      return record
    })
    return NextResponse.json({ root: rootRecord }, { status: 201 })
  } catch (error) {
    console.error('[admin/elections/roots] Root registration failed:', error)
    return NextResponse.json({ error: 'Merkle root registration failed' }, { status: 502 })
  }
}
