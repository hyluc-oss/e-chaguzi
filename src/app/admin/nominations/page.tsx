'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'

type Nomination = {
  id: string
  candidateName: string
  runningMateName: string | null
  manifesto: string
  position: string
  scope: string
  scopeKey: string
  createdAt: string
  applicant: { institutionSubject: string }
}

const labels: Record<string, string> = {
  USRC_EXECUTIVE: 'USRC President & Vice-President',
  FACULTY_REPRESENTATIVE: 'Faculty / College Representative',
  FLOOR_DELEGATE: 'Floor / Block Delegate',
  CLASS_REPRESENTATIVE: 'Class Representative',
}

export default function AdminNominationsPage() {
  const [nominations, setNominations] = useState<Nomination[]>([])
  const [error, setError] = useState('')

  async function load() {
    const response = await fetch('/api/admin/nominations')
    const data = await response.json() as { nominations?: Nomination[]; error?: string }
    if (!response.ok) throw new Error(data.error ?? 'Unable to load nominations')
    setNominations(data.nominations ?? [])
  }

  useEffect(() => {
    fetch('/api/admin/nominations')
      .then(async response => {
        const data = await response.json() as { nominations?: Nomination[]; error?: string }
        if (!response.ok) throw new Error(data.error ?? 'Unable to load nominations')
        setNominations(data.nominations ?? [])
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Unable to load nominations'))
  }, [])

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    setError('')
    const response = await fetch('/api/admin/nominations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nominationId: id, decision }),
    })
    const data = await response.json() as { error?: string }
    if (!response.ok) {
      setError(data.error ?? 'Unable to review nomination')
      return
    }
    await load()
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 md:p-10">
        <h1 className="text-3xl font-black text-foreground mb-8">Nomination applications</h1>
        {error && <p role="alert" className="badge-danger mb-5">{error}</p>}
        {nominations.length === 0 && <p className="text-muted-foreground">No pending applications.</p>}
        <div className="grid gap-4">
          {nominations.map(nomination => (
            <article key={nomination.id} className="glass-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{nomination.candidateName}</h2>
                  {nomination.runningMateName && (
                    <p className="text-sm text-gray-300">Vice-President: {nomination.runningMateName}</p>
                  )}
                  <p className="text-sm text-gray-400 mt-1">
                    {labels[nomination.position] ?? nomination.position} · {nomination.scope}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {nomination.applicant.institutionSubject} · {new Date(nomination.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => decide(nomination.id, 'APPROVED')} className="btn-primary px-4 py-2">
                    Approve candidate
                  </button>
                  <button onClick={() => decide(nomination.id, 'REJECTED')} className="btn-outline px-4 py-2">
                    Reject application
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-4 whitespace-pre-wrap">{nomination.manifesto}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
