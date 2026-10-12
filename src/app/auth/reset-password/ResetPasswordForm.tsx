'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Unable to reset password')
      setMessage(result.message ?? 'Password updated. You can now sign in.')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password')
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
        <h1 className="mt-8 text-xl font-bold text-foreground">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use at least 12 characters. This reset link can only be used once.
        </p>
        {message ? (
          <div className="mt-6">
            <p role="status" className="badge-success whitespace-normal">{message}</p>
            <Link href="/auth/login" className="btn-primary mt-5 w-full rounded-full py-3.5">
              Return to sign in
            </Link>
          </div>
        ) : (
          <>
            {error && <p role="alert" className="badge-danger mt-5 whitespace-normal">{error}</p>}
            <form onSubmit={resetPassword} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-foreground">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={256}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="input-field mt-2 rounded-full px-5 py-3"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={256}
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  className="input-field mt-2 rounded-full px-5 py-3"
                />
              </label>
              <button type="submit" disabled={submitting || !token} className="btn-primary w-full rounded-full py-3.5">
                {submitting ? 'Updating…' : 'Update password'}
              </button>
              {!token && <p role="alert" className="text-sm text-red-700">The reset link is missing or invalid.</p>}
            </form>
          </>
        )}
      </section>
    </main>
  )
}

