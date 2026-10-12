'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'

type Vote = {
  electionId: string
  electionName: string
  transactionHash: string
  blockNumber: number
}
type AuditLog = {
  id: string
  action: string
  subjectType: string | null
  subjectId: string | null
  txHash: string | null
  createdAt: string
  election: { name: string } | null
}

export default function AdminTallyPage() {
  const [votes, setVotes] = useState<Vote[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [chainStatus, setChainStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function refresh() {
      try {
        const response = await fetch('/api/admin/tally')
        const data = await response.json() as {
          votes?: Vote[]
          logs?: AuditLog[]
          chainStatus?: string
          error?: string
        }
        if (!response.ok) throw new Error(data.error ?? 'Unable to load audit data')
        if (active) {
          setVotes(data.votes ?? [])
          setLogs(data.logs ?? [])
          setChainStatus(data.chainStatus ?? 'unavailable')
          setError('')
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load audit data')
      }
    }
    void refresh()
    const interval = window.setInterval(() => { void refresh() }, 10_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-black text-foreground">Tally & audit</h1>
          <span className={chainStatus === 'connected' ? 'badge-success' : 'badge-gold'}>
            {chainStatus === 'connected' ? '● Chain connected' : `● Chain ${chainStatus}`}
          </span>
        </div>
        {error && <p role="alert" className="badge-danger mb-5">{error}</p>}
        <section className="glass-card p-5 mb-8">
          <h2 className="font-semibold text-white mb-4">Recent vote inclusions</h2>
          {votes.length === 0 && <p className="text-sm text-gray-400">No vote events available.</p>}
          <div className="grid gap-3">
            {votes.map(vote => (
              <div key={`${vote.electionId}-${vote.transactionHash}`} className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-gray-300 font-mono break-all">{vote.electionName} · {vote.transactionHash}</span>
                <span className="text-gray-500">Block {vote.blockNumber}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Audit log</h2>
          {logs.length === 0 && <p className="text-sm text-gray-400">No audit events.</p>}
          <div className="grid gap-3">
            {logs.map(log => (
              <div key={log.id} className="border-t border-white/10 pt-3 flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <p className="text-white">{log.action} · {log.election?.name ?? 'System'}</p>
                  {log.txHash && <p className="text-xs text-gray-500 font-mono break-all">{log.txHash}</p>}
                </div>
                <time className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</time>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
