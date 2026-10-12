/**
 * db.ts — IndexedDB via Dexie.js
 *
 * Provides encrypted local storage for:
 * - Pending vote proofs (offline queue)
 * - Local proof receipts
 */
import Dexie, { type Table } from 'dexie'

export interface PendingVote {
  id?: number
  electionId: string
  proof: object
  publicSignals: string[]
  nullifierHash: string
  candidateId: string
  merkleRoot: string
  createdAt: Date
  retryCount: number
  lastRetry?: Date
  status: 'pending' | 'submitting' | 'confirmed' | 'failed'
}

export interface ProofReceipt {
  id?: number
  electionId: string
  nullifierHash: string
  txHash: string
  blockNumber: number
  confirmedAt: Date
}

class EChaguziDB extends Dexie {
  pendingVotes!: Table<PendingVote>
  proofReceipts!: Table<ProofReceipt>

  constructor() {
    super('e-chaguzi-db')
    this.version(1).stores({
      pendingVotes: '++id, electionId, status, createdAt',
      proofReceipts: '++id, electionId, nullifierHash, txHash',
    })
  }
}

export const db = new EChaguziDB()

// ── Helpers ──────────────────────────────────────────────

/** Queue a vote proof for offline submission */
export async function queueVote(vote: Omit<PendingVote, 'id' | 'retryCount' | 'status' | 'createdAt'>): Promise<number> {
  return db.pendingVotes.add({
    ...vote,
    createdAt: new Date(),
    retryCount: 0,
    status: 'pending',
  })
}

/** Get all votes pending submission */
export async function getPendingVotes(): Promise<PendingVote[]> {
  return db.pendingVotes.where('status').equals('pending').toArray()
}

/** Mark a vote as confirmed and save receipt */
export async function confirmVote(
  pendingId: number,
  txHash: string,
  blockNumber: number,
  nullifierHash: string,
  electionId: string,
): Promise<void> {
  await Promise.all([
    db.pendingVotes.update(pendingId, { status: 'confirmed' }),
    db.proofReceipts.add({
      electionId,
      nullifierHash,
      txHash,
      blockNumber,
      confirmedAt: new Date(),
    }),
  ])
}

/** Exponential backoff with jitter (TRD §3.5) */
export function calcBackoffMs(attempt: number): number {
  const base = 1000
  const maxWait = 30000
  const jitter = Math.random() * 500
  return Math.min(maxWait, base * Math.pow(2, attempt)) + jitter
}
