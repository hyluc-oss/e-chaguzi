'use client'

import { useEffect, useState } from 'react'

interface Props {
  targetDate: Date
}

function pad(n: number) { return String(n).padStart(2, '0') }

export default function ElectionCountdown({ targetDate }: Props) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const update = () => {
      const diff = Math.max(0, targetDate.getTime() - Date.now())
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  if (!mounted) return null

  const units = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Mins' },
    { value: timeLeft.seconds, label: 'Secs' },
  ]

  return (
    <div className="flex justify-center gap-4">
      {units.map((unit, i) => (
        <div key={i} className="countdown-digit">
          <div className="countdown-number">{pad(unit.value)}</div>
          <span className="text-gray-500 text-xs uppercase tracking-widest font-medium">{unit.label}</span>
        </div>
      ))}
    </div>
  )
}
