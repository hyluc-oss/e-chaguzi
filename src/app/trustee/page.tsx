'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TimeGreeting from '@/components/TimeGreeting'

type Assignment = {
  id: string
  name: string
  status: string
  startTime: string
  endTime: string
  trusteeThreshold: number
  trusteeCount: number
  seatIndex: number
}

export default function TrusteePage() {
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/trustee/elections')
      .then(async response => {
        const data = await response.json() as { assignments?: Assignment[]; error?: string }
        if (!response.ok) throw new Error(data.error ?? 'Unable to load trustee assignments')
        if (active) setAssignments(data.assignments ?? [])
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load trustee assignments')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/auth/login')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-background p-6 md:p-10">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div>
          <TimeGreeting />
          <h1 className="text-3xl font-black text-foreground">Trustee assignments</h1>
        </div>
        <button type="button" onClick={signOut} className="btn-outline px-4 py-2">Sign out</button>
      </header>
      <section className="mx-auto mt-8 grid max-w-5xl gap-4">
        {loading && <p role="status" className="text-muted-foreground">Loading assignments…</p>}
        {error && <p role="alert" className="badge-danger">{error}</p>}
        {!loading && !error && assignments.length === 0 && (
          <p className="text-muted-foreground">No election trustee assignments.</p>
        )}
        {assignments.map(assignment => (
          <article key={assignment.id} className="glass-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">{assignment.name}</h2>
                <p className="mt-1 text-sm text-gray-400">
                  {new Date(assignment.startTime).toLocaleString()} — {new Date(assignment.endTime).toLocaleString()}
                </p>
              </div>
              <span className="badge-gold">{assignment.status}</span>
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-gray-500">Trustee seat</dt>
                <dd className="text-white">{assignment.seatIndex} of {assignment.trusteeCount}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Decryption quorum</dt>
                <dd className="text-white">{assignment.trusteeThreshold} trustees</dd>
              </div>
              <div>
                <dt className="text-gray-500">Key-share ceremony</dt>
                <dd className="text-[#FCD116]">Not yet available</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </main>
  )
}
