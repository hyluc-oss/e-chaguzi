'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'

type Election = {
  id: string
  name: string
  status: string
  trusteeThreshold: number
  startTime: string
  endTime: string
  chainElectionId: number
  contractAddress: string | null
  races: { id: string; position: string; scope: string; scopeKey: string }[]
  trustees: { seatIndex: number; trustee: { institutionSubject: string } }[]
  voterRoots: { root: string; transactionHash: string | null; createdAt: string }[]
}

type TrusteeAccount = { institutionSubject: string }

type Position = 'USRC_EXECUTIVE' | 'FACULTY_REPRESENTATIVE' | 'FLOOR_DELEGATE' | 'CLASS_REPRESENTATIVE'
type RaceDraft = {
  key: string
  position: Position
  scope: string
  scopeKey: string
}

const POSITIONS: { value: Position; label: string; defaultScope?: string; defaultScopeKey?: string }[] = [
  { value: 'USRC_EXECUTIVE', label: 'USRC President & Vice-President', defaultScope: 'All-University', defaultScopeKey: 'ALL' },
  { value: 'FACULTY_REPRESENTATIVE', label: 'Faculty / College Representative' },
  { value: 'FLOOR_DELEGATE', label: 'Floor / Block Delegate' },
  { value: 'CLASS_REPRESENTATIVE', label: 'Class Representative' },
]

function createInitialRaces(): RaceDraft[] {
  return POSITIONS.map(({ value, defaultScope = '', defaultScopeKey = '' }) => ({
    key: value,
    position: value,
    scope: defaultScope,
    scopeKey: defaultScopeKey,
  }))
}

export default function AdminElectionsPage() {
  const [elections, setElections] = useState<Election[]>([])
  const [availableTrustees, setAvailableTrustees] = useState<TrusteeAccount[]>([])
  const [trusteeSubjects, setTrusteeSubjects] = useState<string[]>(['', '', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [contractAddress, setContractAddress] = useState('')
  const [races, setRaces] = useState<RaceDraft[]>(createInitialRaces)

  function updateRace(key: string, field: 'scope' | 'scopeKey', value: string) {
    setRaces(current => current.map(race => race.key === key ? { ...race, [field]: value } : race))
  }

  function addRace(position: Position) {
    if (position === 'USRC_EXECUTIVE') return
    setRaces(current => [
      ...current,
      { key: `${position}-${crypto.randomUUID()}`, position, scope: '', scopeKey: '' },
    ])
  }

  function removeRace(key: string) {
    setRaces(current => current.filter(race => race.key !== key))
  }

  async function load() {
    const response = await fetch('/api/admin/elections')
    const data = await response.json() as { elections?: Election[]; error?: string }
    if (!response.ok) throw new Error(data.error ?? 'Unable to load elections')
    setElections(data.elections ?? [])
  }

  useEffect(() => {
    Promise.all([fetch('/api/admin/elections'), fetch('/api/admin/trustees')])
      .then(async ([electionsResponse, trusteesResponse]) => {
        const [electionsData, trusteesData] = await Promise.all([
          electionsResponse.json() as Promise<{ elections?: Election[]; error?: string }>,
          trusteesResponse.json() as Promise<{ trustees?: TrusteeAccount[]; error?: string }>,
        ])
        if (!electionsResponse.ok) throw new Error(electionsData.error ?? 'Unable to load elections')
        if (!trusteesResponse.ok) throw new Error(trusteesData.error ?? 'Unable to load trustees')
        setElections(electionsData.elections ?? [])
        setAvailableTrustees(trusteesData.trustees ?? [])
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Unable to load elections'))
  }, [])

  async function createElection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/elections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contractAddress,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          trusteeSubjects,
          races: races.map(({ position, scope, scopeKey }) => ({ position, scope, scopeKey })),
        }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Unable to create election')
      setName('')
      await load()
      setSuccess('Election created.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create election')
    } finally {
      setSubmitting(false)
    }
  }

  async function registerRoot(electionId: string) {
    setError('')
    const response = await fetch(`/api/admin/elections/${electionId}/roots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await response.json() as { error?: string }
    if (!response.ok) {
      setError(data.error ?? 'Unable to register root')
      return
    }
    await load()
  }

  async function updateElection(electionId: string, action: 'publish' | 'close') {
    setError('')
    const response = await fetch('/api/admin/elections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ electionId, action }),
    })
    const data = await response.json() as { error?: string }
    if (!response.ok) {
      setError(data.error ?? 'Unable to update election')
      return
    }
    await load()
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 md:p-10">
        <h1 className="text-3xl font-black text-foreground mb-8">Elections</h1>
        {error && <p role="alert" className="badge-danger mb-6">{error}</p>}
        {success && <p role="status" className="badge-success mb-6">{success}</p>}

        <form onSubmit={createElection} className="glass-card p-6 space-y-4 mb-10">
          <h2 className="text-xl font-bold text-white">Create election</h2>
          <label className="block text-sm text-gray-300">Election name
            <input required maxLength={160} value={name} onChange={event => setName(event.target.value)} className="input-field mt-2" />
          </label>
          <label className="block text-sm text-gray-300">Deployed ballot contract address
            <input required value={contractAddress} onChange={event => setContractAddress(event.target.value)} className="input-field mt-2 font-mono" />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm text-gray-300">Starts
              <input required type="datetime-local" value={startTime} onChange={event => setStartTime(event.target.value)} className="input-field mt-2" />
            </label>
            <label className="block text-sm text-gray-300">Ends
              <input required type="datetime-local" value={endTime} onChange={event => setEndTime(event.target.value)} className="input-field mt-2" />
            </label>
          </div>
          <fieldset className="space-y-3 border-t border-white/10 pt-4">
            <legend className="font-semibold text-white">Independent key trustees (3-of-5)</legend>
            {availableTrustees.length === 0 && (
              <p className="text-sm text-gray-400">
                No trustee accounts are registered. Trustees must sign in through the configured institutional trustee group first.
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              {trusteeSubjects.map((subject, index) => (
                <label key={index} className="block text-sm text-gray-300">
                  Trustee {index + 1}
                  <select
                    required
                    value={subject}
                    onChange={event => setTrusteeSubjects(current =>
                      current.map((value, slot) => slot === index ? event.target.value : value),
                    )}
                    className="input-field mt-2"
                  >
                    <option value="">Select trustee account</option>
                    {availableTrustees.map(trustee => {
                      const selectedElsewhere = trusteeSubjects.some(
                        (value, slot) => slot !== index && value === trustee.institutionSubject,
                      )
                      return (
                        <option
                          key={trustee.institutionSubject}
                          value={trustee.institutionSubject}
                          disabled={selectedElsewhere}
                        >
                          {trustee.institutionSubject}
                        </option>
                      )
                    })}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-5">
            {POSITIONS.map(position => {
              const positionRaces = races.filter(race => race.position === position.value)
              return (
                <fieldset key={position.value} className="space-y-3 border-t border-white/10 pt-4">
                  <legend className="font-semibold text-white">{position.label}</legend>
                  {positionRaces.map((race, index) => (
                    <div key={race.key} className="grid sm:grid-cols-2 gap-4 items-end">
                      <label className="block text-sm text-gray-300">
                        {position.value === 'USRC_EXECUTIVE' ? 'Scope' : `Scope ${index + 1}`}
                        <input
                          required
                          readOnly={position.value === 'USRC_EXECUTIVE'}
                          value={race.scope}
                          onChange={event => updateRace(race.key, 'scope', event.target.value)}
                          className="input-field mt-2"
                        />
                      </label>
                      <div className="flex items-end gap-3">
                        <label className="block min-w-0 flex-1 text-sm text-gray-300">
                          Eligibility key
                          <input
                            required
                            readOnly={position.value === 'USRC_EXECUTIVE'}
                            value={race.scopeKey}
                            onChange={event => updateRace(race.key, 'scopeKey', event.target.value)}
                            className="input-field mt-2"
                          />
                        </label>
                        {position.value !== 'USRC_EXECUTIVE' && positionRaces.length > 1 && (
                          <button type="button" onClick={() => removeRace(race.key)} className="btn-outline px-3 py-2">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {position.value !== 'USRC_EXECUTIVE' && (
                    <button type="button" onClick={() => addRace(position.value)} className="btn-outline px-4 py-2">
                      Add {position.label.toLowerCase()} scope
                    </button>
                  )}
                </fieldset>
              )
            })}
          </div>
          <button
            disabled={submitting || new Set(trusteeSubjects).size !== 5 || trusteeSubjects.includes('')}
            type="submit"
            className="btn-primary px-5 py-3"
          >
            {submitting ? 'Creating…' : 'Create election'}
          </button>
        </form>

        <div className="grid gap-4">
          {elections.map(election => (
            <article key={election.id} className="glass-card p-6">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{election.name}</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {election.status} · Election #{election.chainElectionId} · {new Date(election.startTime).toLocaleString()} — {new Date(election.endTime).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-1">{election.contractAddress ?? 'No contract address'}</p>
                  <p className="text-sm text-gray-300 mt-2">
                    Trustee quorum: {election.trusteeThreshold}-of-{election.trustees.length}
                  </p>
                  <ul className="text-xs text-gray-400 mt-1">
                    {election.trustees.map(trustee => (
                      <li key={trustee.seatIndex}>
                        Trustee {trustee.seatIndex}: {trustee.trustee.institutionSubject}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2">
                  {election.status === 'DRAFT' && (
                    <button onClick={() => updateElection(election.id, 'publish')} className="btn-primary px-4 py-2">Publish</button>
                  )}
                  {(election.status === 'ACTIVE' || election.status === 'SCHEDULED') && (
                    <button onClick={() => updateElection(election.id, 'close')} className="btn-outline px-4 py-2">Close</button>
                  )}
                </div>
              </div>
              <ul className="grid sm:grid-cols-2 gap-2 my-5 text-sm text-gray-300">
                {election.races.map(race => (
                  <li key={race.id}>{race.position.replaceAll('_', ' ')} · {race.scope}</li>
                ))}
              </ul>
              <button type="button" onClick={() => registerRoot(election.id)} className="btn-outline px-4 py-2">
                Build &amp; upload voter root
              </button>
              {election.voterRoots.map(root => (
                <p key={root.root} className="text-xs text-gray-500 font-mono mt-3 break-all">
                  {root.root} · {root.transactionHash ?? 'No transaction hash'}
                </p>
              ))}
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
