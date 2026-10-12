'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import TimeGreeting from '@/components/TimeGreeting'

type Summary = {
  registeredVoters: number
  activeElections: number
  pendingNominations: number
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/summary')
      .then(async response => {
        if (!response.ok) throw new Error('Admin dashboard is temporarily unavailable')
        return response.json() as Promise<Summary>
      })
      .then(setSummary)
      .catch(err => setError(err instanceof Error ? err.message : 'Unable to load dashboard'))
  }, [])

  const stats = [
    ['Voters registered', summary?.registeredVoters],
    ['Active elections', summary?.activeElections],
    ['Pending nominations', summary?.pendingNominations],
  ]

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 md:p-10">
        <TimeGreeting />
        <h1 className="text-3xl font-black text-foreground mb-8">Admin dashboard</h1>
        {error && <p role="alert" className="badge-danger mb-6">{error}</p>}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {stats.map(([label, value]) => (
            <article key={label} className="stat-card">
              <h2 className="text-sm text-muted-foreground">{label}</h2>
              <p className="text-3xl font-bold text-foreground mt-2">{value ?? '—'}</p>
            </article>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/nominations" className="btn-primary px-5 py-3">Review nominations</Link>
          <Link href="/admin/elections" className="btn-outline px-5 py-3">Manage elections</Link>
          <Link href="/admin/tally" className="btn-outline px-5 py-3">Live tally & audit</Link>
        </div>
      </main>
    </div>
  )
}
