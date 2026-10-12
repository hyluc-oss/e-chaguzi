import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'echaguzi_session'
const SESSION_LIFETIME_SECONDS = 60 * 30
const REMEMBERED_SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30

export interface Session {
  subject: string
  role: 'VOTER' | 'ADMIN' | 'TRUSTEE'
  expiresAt: number
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) return null
  return secret
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createSessionToken(
  subject: string,
  role: Session['role'],
  rememberMe = false,
) {
  const secret = getSessionSecret()
  if (!secret) throw new Error('SESSION_SECRET must be set to at least 32 characters')

  const lifetime = rememberMe ? REMEMBERED_SESSION_LIFETIME_SECONDS : SESSION_LIFETIME_SECONDS
  const payload: Session = {
    subject,
    role,
    expiresAt: Math.floor(Date.now() / 1000) + lifetime,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.${sign(encodedPayload, secret)}`
}

export function verifySessionToken(token: string | undefined): Session | null {
  const secret = getSessionSecret()
  if (!secret || !token) return null

  const [encodedPayload, signature, ...extra] = token.split('.')
  if (!encodedPayload || !signature || extra.length > 0) return null

  const expected = Buffer.from(sign(encodedPayload, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const payload: unknown = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString())
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('subject' in payload) ||
      typeof payload.subject !== 'string' ||
      !payload.subject ||
      !('role' in payload) ||
      (payload.role !== 'VOTER' && payload.role !== 'ADMIN' && payload.role !== 'TRUSTEE') ||
      !('expiresAt' in payload) ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return payload as Session
  } catch {
    return null
  }
}

const baseSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export function getSessionCookieOptions(rememberMe = false) {
  return {
    ...baseSessionCookieOptions,
    maxAge: rememberMe ? REMEMBERED_SESSION_LIFETIME_SECONDS : SESSION_LIFETIME_SECONDS,
  }
}

export const sessionCookieOptions = getSessionCookieOptions()
