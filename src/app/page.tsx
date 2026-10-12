'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'
import TimeGreeting from '@/components/TimeGreeting'

type Race = {
  id: string
  position: string
  scope: string
  candidates: { id: string; name: string; runningMateName: string | null; manifesto: string }[]
}

type Election = {
  id: string
  name: string
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED'
  startTime: string
  endTime: string
  races: Race[]
}

const POSITION_LABELS: Record<string, string> = {
  USRC_EXECUTIVE: 'USRC President & Vice-President',
  FACULTY_REPRESENTATIVE: 'Faculty / College Representative',
  FLOOR_DELEGATE: 'Floor / Block Delegate',
  CLASS_REPRESENTATIVE: 'Class Representative',
}

export default function HomePage() {
  const [elections, setElections] = useState<Election[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/elections')
      .then(async response => {
        if (!response.ok) throw new Error('Election data is temporarily unavailable')
        return response.json() as Promise<{ elections: Election[] }>
      })
      .then(data => {
        if (active) setElections(data.elections)
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load elections')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <main className="min-h-screen bg-dark">
      <NavBar />
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-14">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <TimeGreeting />
            <h1 className="text-3xl font-black text-white">Elections</h1>
          </div>
          <Link href="/nomination/apply" className="btn-outline px-5 py-3">
            Request nomination
          </Link>
        </header>

        {loading && <p role="status" className="text-gray-400">Loading elections…</p>}
        {error && <p role="alert" className="badge-danger">{error}</p>}
        {!loading && !error && elections.length === 0 && (
          <p className="text-gray-400">No active elections.</p>
        )}

        <div className="grid gap-6">
          {elections.map(election => (
            <article key={election.id} className="glass-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-bold text-white">{election.name}</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Closes {new Date(election.endTime).toLocaleString()}
                  </p>
                </div>
                <span className={election.status === 'ACTIVE' ? 'badge-success' : 'badge-gold'}>
                  ● {election.status === 'ACTIVE' ? 'Voting open' : 'Registration open'}
                </span>
              </div>
              {election.races.map(race => (
                <section key={race.id} className="border-t border-white/10 py-5">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold text-white">
                        {POSITION_LABELS[race.position] ?? race.position}
                      </h3>
                      <p className="text-sm text-gray-400">{race.scope}</p>
                    </div>
                    {election.status === 'ACTIVE' ? (
                      <button type="button" disabled className="btn-primary px-4 py-2">
                        Ballot unavailable
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500">Ballot opens {new Date(election.startTime).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {race.candidates.map(candidate => (
                      <article key={candidate.id} className="candidate-card glass-card p-4">
                        <h4 className="text-white font-semibold">{candidate.name}</h4>
                        {candidate.runningMateName && (
                          <p className="text-sm text-gray-300">Vice-President: {candidate.runningMateName}</p>
                        )}
                        <p className="text-sm text-gray-400 mt-2">{candidate.manifesto}</p>
                      </article>
                    ))}
                    {race.candidates.length === 0 && (
                      <p className="text-sm text-gray-500">No approved candidates.</p>
                    )}
                  </div>
                </section>
              ))}
              {election.races.length === 0 && (
                <p className="text-gray-400">No positions available for your eligibility profile.</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
