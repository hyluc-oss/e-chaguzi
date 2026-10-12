'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

export default function ForgotPasswordForm() {
  const [studentId, setStudentId] = useState('')
  const [gmail, setGmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, gmail }),
      })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Unable to request a password reset')
      setMessage(result.message ?? 'If your details match, a reset link will be sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request a password reset')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-shell min-h-screen flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-10">
        <header className="text-center">
          <p className="text-2xl font-bold tracking-tight text-foreground">e-Chaguzi</p>
          <p className="mt-1 text-sm text-muted-foreground">University Election Portal</p>
        </header>
        <h1 className="mt-8 text-xl font-bold text-foreground">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter your Student ID and the Gmail address registered to your account. We’ll send a secure password-reset link.
        </p>
        {message && <p role="status" className="badge-success mt-5 whitespace-normal">{message}</p>}
        {error && <p role="alert" className="badge-danger mt-5 whitespace-normal">{error}</p>}
        <form onSubmit={requestReset} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-foreground">
            Student registration number
            <input
              autoComplete="username"
              required
              maxLength={100}
              value={studentId}
              onChange={event => setStudentId(event.target.value)}
              placeholder="e.g. CYB/2024/001"
              className="input-field mt-2 rounded-full px-5 py-3"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Registered Gmail address
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={gmail}
              onChange={event => setGmail(event.target.value)}
              placeholder="student@gmail.com"
              className="input-field mt-2 rounded-full px-5 py-3"
            />
          </label>
          <button type="submit" disabled={submitting} className="btn-primary w-full rounded-full py-3.5">
            {submitting ? 'Sending…' : 'Send password reset link'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link href="/auth/login" className="font-medium text-primary hover:underline">Back to student sign in</Link>
        </p>
      </section>
    </main>
  )
}

