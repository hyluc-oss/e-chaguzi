'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ShieldCheck, Vote } from 'lucide-react'

type Portal = 'student' | 'admin'

export default function LoginForm({
  portal,
  error: initialError,
  localAuthEnabled,
}: {
  portal: Portal
  error?: string
  localAuthEnabled: boolean
}) {
  const router = useRouter()
  const [accountId, setAccountId] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(
    initialError === 'sso_unavailable' ? 'University sign-in is currently unavailable.' : '',
  )
  const [submitting, setSubmitting] = useState(false)
  const isAdmin = portal === 'admin'

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/local-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal,
          ...(isAdmin ? { adminId: accountId } : { studentId: accountId }),
          password,
          rememberMe,
        }),
      })
      const data = await response.json() as { redirectTo?: string; error?: string }
      if (!response.ok || !data.redirectTo) {
        throw new Error(data.error ?? 'Sign-in is unavailable')
      }
      router.replace(data.redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in is unavailable')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-shell min-h-screen flex items-center justify-center px-5 py-10">
      <section className="login-card w-full max-w-lg rounded-3xl border border-border bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-10">
        <header className="flex flex-col items-center text-center">
          <div className="login-logo mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            {isAdmin ? <ShieldCheck aria-hidden="true" size={28} /> : <Vote aria-hidden="true" size={28} />}
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">e-Chaguzi</p>
          <p className="mt-1 text-sm text-muted-foreground">University Election Portal</p>
          <div className="mt-8 w-full border-t border-border" />
        </header>

        <div className="mt-7">
          <h1 className="text-xl font-bold text-foreground">
            {isAdmin ? 'Administrator sign in' : 'Student sign in'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isAdmin
              ? 'Sign in with your authorized administrator account to manage elections.'
              : 'Enter your university credentials to access the voting platform.'}
          </p>
        </div>

        {error && <p role="alert" className="badge-danger mt-5">{error}</p>}

        {localAuthEnabled ? (
          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-foreground">
              {isAdmin ? 'Administrator ID' : 'Student registration number'}
              <input
                type="text"
                autoComplete="username"
                required
                maxLength={100}
                value={accountId}
                onChange={event => setAccountId(event.target.value)}
                placeholder={isAdmin ? 'e.g. ADMIN/2026/001' : 'e.g. CYB/2024/001'}
                className="input-field mt-2 rounded-full px-5 py-3"
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Password
              <span className="relative mt-2 block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  maxLength={256}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="input-field rounded-full py-3 pl-5 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground hover:text-primary"
                >
                  {showPassword
                    ? <EyeOff aria-hidden="true" size={19} />
                    : <Eye aria-hidden="true" size={19} />}
                </button>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={event => setRememberMe(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span>
                Keep me signed in for 30 days
                <span className="mt-1 block text-xs">
                  Don’t select this on a shared or public device.
                </span>
              </span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-2 w-full rounded-full py-3.5"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <Link
            href={`/api/auth/login?portal=${portal}`}
            className="btn-primary mt-6 w-full rounded-full py-3.5"
          >
            Continue with university account
          </Link>
        )}

        {localAuthEnabled && !isAdmin && (
          <div className="mt-4 flex justify-end">
            <Link href="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        )}

        {localAuthEnabled && (
          <Link
            href={`/api/auth/login?portal=${portal}`}
            className="mt-4 block text-center text-sm font-medium text-primary hover:underline"
          >
            Sign in with university account
          </Link>
        )}

        <footer className="mt-7 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          Authorized university users only.
          <p className="mt-3">
            {isAdmin ? (
              <>Student? <Link href="/auth/login" className="font-medium text-primary hover:underline">Go to student sign in</Link></>
            ) : (
              <>Administrator? <Link href="/auth/admin" className="font-medium text-primary hover:underline">Go to administrator sign in</Link></>
            )}
          </p>
        </footer>
      </section>
    </main>
  )
}
