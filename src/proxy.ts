import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from './lib/auth/session'

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (
    path === '/auth/login' ||
    path === '/auth/admin' ||
    path === '/auth/forgot-password' ||
    path === '/auth/reset-password' ||
    path.startsWith('/api/auth/')
  ) return NextResponse.next()

  const isAdminPage = path === '/admin' || path.startsWith('/admin/')
  const isAdminApi = path === '/api/admin' || path.startsWith('/api/admin/')
  const isTrusteePage = path === '/trustee' || path.startsWith('/trustee/')
  const isTrusteeApi = path === '/api/trustee' || path.startsWith('/api/trustee/')
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)

  if (isAdminPage || isAdminApi) {
    if (session?.role === 'ADMIN') return NextResponse.next()
    if (isAdminApi) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }
    return redirectToLogin(request, '/auth/admin')
  }

  if (isTrusteePage || isTrusteeApi) {
    if (session?.role === 'TRUSTEE') return NextResponse.next()
    if (isTrusteeApi) {
      return NextResponse.json({ error: 'Trustee access required' }, { status: 403 })
    }
    return redirectToLogin(request)
  }

  if (session?.role === 'VOTER') return NextResponse.next()
  if (path.startsWith('/api/')) {
    return NextResponse.json({ error: 'Voter access required' }, { status: 401 })
  }
  return redirectToLogin(request)
}

function redirectToLogin(request: NextRequest, loginPath = '/auth/login') {
  const loginUrl = new URL(loginPath, request.url)
  loginUrl.searchParams.set('returnTo', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|circuits/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?|wasm|zkey)$).*)',
  ],
}
