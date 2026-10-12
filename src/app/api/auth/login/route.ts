import { NextRequest, NextResponse } from 'next/server'
import { getSamlClient } from '@/lib/auth/saml'

export async function GET(request: NextRequest) {
  try {
    const saml = getSamlClient()
    const destination = await saml.getAuthorizeUrlAsync('', request.nextUrl.host, {})
    return NextResponse.redirect(destination)
  } catch (error) {
    console.error('[auth] Unable to start institutional SSO:', error)
    const loginPath = request.nextUrl.searchParams.get('portal') === 'admin'
      ? '/auth/admin?error=sso_unavailable'
      : '/auth/login?error=sso_unavailable'
    return NextResponse.redirect(new URL(loginPath, request.url))
  }
}
