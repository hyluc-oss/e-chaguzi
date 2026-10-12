import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

const ABI = ['event VoteCast(uint256 indexed candidateId, bytes32 nullifierHash)']

export async function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
  }

  try {
    const prisma = getPrismaClient()
    const [admin, logs, elections] = await Promise.all([
      prisma.user.findUnique({
        where: { institutionSubject: session.subject },
        select: { role: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          action: true,
          subjectType: true,
          subjectId: true,
          txHash: true,
          createdAt: true,
          election: { select: { name: true } },
        },
      }),
      prisma.election.findMany({
        where: { contractAddress: { not: null } },
        select: { id: true, name: true, contractAddress: true },
      }),
    ])
    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    const rpcUrl = process.env.RPC_PROVIDER_URL
    if (elections.length === 0 || !rpcUrl) {
      return NextResponse.json({ chainStatus: 'not_configured', votes: [], logs })
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const fromBlock = Number(process.env.BALLOT_DEPLOYMENT_BLOCK ?? 0)
    if (!Number.isSafeInteger(fromBlock) || fromBlock < 0) {
      return NextResponse.json({ error: 'Invalid ballot deployment block configuration' }, { status: 500 })
    }
    const votes = (await Promise.all(elections.map(async election => {
      if (!election.contractAddress) return []
      const contract = new ethers.Contract(election.contractAddress, ABI, provider)
      const events = await contract.queryFilter(contract.filters.VoteCast(), fromBlock, 'latest')
      return events.slice(-100).map(event => ({
        electionId: election.id,
        electionName: election.name,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      }))
    }))).flat().slice(-100).reverse()
    return NextResponse.json({ chainStatus: 'connected', votes, logs })
  } catch (error) {
    console.error('[admin/tally] Unable to load tally and audit data:', error)
    return NextResponse.json({ error: 'Tally and audit data is temporarily unavailable' }, { status: 502 })
  }
}
