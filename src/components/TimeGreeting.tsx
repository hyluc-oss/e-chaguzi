'use client'

import { useEffect, useState } from 'react'

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Africa/Dar_es_Salaam',
    }).format(new Date()),
  )

  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function TimeGreeting() {
  const [greeting, setGreeting] = useState('')
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting())
    updateGreeting()
    const interval = window.setInterval(updateGreeting, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/auth/profile')
      .then(async response => {
        if (response.status === 401 || response.status === 403) return null
        if (!response.ok) throw new Error('Unable to load the signed-in user name')
        return response.json() as Promise<{ displayName?: string | null }>
      })
      .then(profile => {
        if (active && profile?.displayName) setDisplayName(profile.displayName)
      })
      .catch(error => console.error('[greeting] Unable to load the signed-in user name:', error))
    return () => { active = false }
  }, [])

  if (!greeting) return null

  return (
    <p className="mb-2 text-sm font-semibold text-primary">
      {greeting}{displayName ? `, ${displayName}` : ''}
    </p>
  )
}
