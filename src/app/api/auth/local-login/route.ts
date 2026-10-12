import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  createSessionToken,
  getSessionCookieOptions,
} from '@/lib/auth/session'
import { verifyPassword } from '@/lib/auth/local-accounts'
import { getPrismaClient } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  if (process.env.LOCAL_AUTH_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Local sign-in is not enabled' }, { status: 404 })
  }
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || !('portal' in body) || (body.portal !== 'student' && body.portal !== 'admin')) {
    return NextResponse.json({ error: 'Select a valid sign-in portal' }, { status: 400 })
  }

  const portal = body.portal
  const idValue = portal === 'admin'
    ? 'adminId' in body ? body.adminId : undefined
    : 'studentId' in body ? body.studentId : undefined
  const id = typeof idValue === 'string' ? idValue.trim() : ''
  const password = 'password' in body && typeof body.password === 'string' ? body.password : ''
  const rememberMe = 'rememberMe' in body && body.rememberMe === true
  if (!id || id.length > 100 || password.length > 256) {
    return NextResponse.json({ error: 'Invalid ID or password' }, { status: 401 })
  }

  try {
    const role = portal === 'admin' ? 'ADMIN' : 'VOTER'
    const subject = `local:${portal}:${id}`
    const user = await getPrismaClient().user.findUnique({
      where: { institutionSubject: subject },
      select: { institutionSubject: true, role: true, passwordHash: true },
    })
    if (!user || user.role !== role || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid ID or password' }, { status: 401 })
    }

    const response = NextResponse.json({ redirectTo: portal === 'admin' ? '/admin' : '/' })
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(user.institutionSubject, user.role, rememberMe),
      getSessionCookieOptions(rememberMe),
    )
    return response
  } catch (error) {
    console.error('[auth/local-login] Unable to authenticate local account:', error)
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable' }, { status: 503 })
  }
}
