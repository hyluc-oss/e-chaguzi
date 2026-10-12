import { NextResponse } from 'next/server'
import { getSamlClient } from '@/lib/auth/saml'

export async function GET() {
  try {
    const metadata = getSamlClient().generateServiceProviderMetadata(null)
    return new NextResponse(metadata, {
      headers: { 'Content-Type': 'application/samlmetadata+xml; charset=utf-8' },
    })
  } catch (error) {
    console.error('[auth] Unable to generate SAML metadata:', error)
    return NextResponse.json({ error: 'Institutional sign-in is not configured' }, { status: 503 })
  }
}
