'use client'

import { FormEvent, useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'

type Race = { id: string; position: string; scope: string }
type Election = { id: string; name: string; races: Race[] }

const POSITION_LABELS: Record<string, string> = {
  USRC_EXECUTIVE: 'USRC President & Vice-President',
  FACULTY_REPRESENTATIVE: 'Faculty / College Representative',
  FLOOR_DELEGATE: 'Floor / Block Delegate',
  CLASS_REPRESENTATIVE: 'Class Representative',
}

export default function NominationApplyPage() {
  const [elections, setElections] = useState<Election[]>([])
  const [electionId, setElectionId] = useState('')
  const [raceId, setRaceId] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [runningMateName, setRunningMateName] = useState('')
  const [manifesto, setManifesto] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/elections')
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load available positions')
        const data = await response.json() as { elections: Election[] }
        setElections(data.elections)
        setElectionId(data.elections[0]?.id ?? '')
      })
      .catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load available positions'))
  }, [])

  const selectedElection = elections.find(election => election.id === electionId)
  const races = selectedElection?.races ?? []
  const selectedRace = races.find(race => race.id === raceId)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const response = await fetch('/api/nomination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ electionId, raceId, candidateName, runningMateName, manifesto }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Unable to submit nomination')
      setMessage('Nomination submitted for review.')
      setCandidateName('')
      setRunningMateName('')
      setManifesto('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit nomination')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-dark">
      <NavBar />
      <section className="max-w-2xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-3xl font-black text-white mb-8">Request nomination</h1>
        <form onSubmit={submit} className="glass-card p-6 space-y-5">
          <label className="block text-sm text-gray-300">
            Election
            <select required value={electionId} onChange={event => {
              setElectionId(event.target.value)
              setRaceId('')
            }} className="input-field mt-2">
              <option value="">Select election</option>
              {elections.map(election => <option key={election.id} value={election.id}>{election.name}</option>)}
            </select>
          </label>
          <label className="block text-sm text-gray-300">
            Position and scope
            <select required value={raceId} onChange={event => setRaceId(event.target.value)} className="input-field mt-2">
              <option value="">Select position</option>
              {races.map(race => (
                <option key={race.id} value={race.id}>
                  {POSITION_LABELS[race.position] ?? race.position} — {race.scope}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-gray-300">
            Candidate name
            <input required maxLength={120} value={candidateName} onChange={event => setCandidateName(event.target.value)} className="input-field mt-2" />
          </label>
          {selectedRace?.position === 'USRC_EXECUTIVE' && (
            <label className="block text-sm text-gray-300">
              Vice-President candidate name
              <input required maxLength={120} value={runningMateName} onChange={event => setRunningMateName(event.target.value)} className="input-field mt-2" />
            </label>
          )}
          <label className="block text-sm text-gray-300">
            Manifesto
            <textarea required maxLength={5000} rows={6} value={manifesto} onChange={event => setManifesto(event.target.value)} className="input-field mt-2" />
          </label>
          {message && <p role="status" className="text-sm text-gray-300">{message}</p>}
          <button disabled={submitting || !elections.length} type="submit" className="btn-primary px-5 py-3">
            {submitting ? 'Submitting…' : 'Submit nomination'}
          </button>
        </form>
      </section>
    </main>
  )
}
