import { NextRequest, NextResponse } from 'next/server'
import { ENTRA_GROUPS_CLAIM, getSamlClient } from '@/lib/auth/saml'
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

function getGroups(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value) && value.every(group => typeof group === 'string')) return value
  return []
}

function getClaim(profile: Record<string, unknown>, claim: string | undefined) {
  if (!claim) return null
  const value = profile[claim]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const samlResponse = form.get('SAMLResponse')
  if (typeof samlResponse !== 'string') {
    return NextResponse.json({ error: 'Missing SAML response' }, { status: 400 })
  }

  try {
    const saml = getSamlClient()
    const { profile } = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse })
    if (!profile?.nameID) {
      return NextResponse.json({ error: 'Institutional identity is missing' }, { status: 401 })
    }

    const adminGroupId = process.env.SAML_ADMIN_GROUP_ID
    const trusteeGroupId = process.env.SAML_TRUSTEE_GROUP_ID
    const groups = getGroups(profile[ENTRA_GROUPS_CLAIM])
    const isAdmin = Boolean(adminGroupId && groups.includes(adminGroupId))
    const isTrustee = Boolean(trusteeGroupId && groups.includes(trusteeGroupId))
    if (isAdmin && isTrustee) {
      const response = NextResponse.json({ error: 'Institutional account has conflicting portal roles' }, { status: 403 })
      response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
      return response
    }
    const role = isAdmin ? 'ADMIN' : isTrustee ? 'TRUSTEE' : 'VOTER'
    const facultyKey = getClaim(profile, process.env.SAML_FACULTY_CLAIM)
    const residenceKey = getClaim(profile, process.env.SAML_RESIDENCE_CLAIM)
    const classKey = getClaim(profile, process.env.SAML_CLASS_CLAIM)
    const displayName =
      getClaim(profile, 'displayName') ??
      getClaim(profile, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name')

    const user = await getPrismaClient().user.upsert({
      where: { institutionSubject: profile.nameID },
      create: { institutionSubject: profile.nameID, role, displayName, facultyKey, residenceKey, classKey },
      update: {
        role,
        ...(displayName && { displayName }),
        ...(facultyKey && { facultyKey }),
        ...(residenceKey && { residenceKey }),
        ...(classKey && { classKey }),
      },
      select: { id: true, institutionSubject: true, role: true, displayName: true },
    })

    const destination = new URL(
      user.role === 'ADMIN' ? '/admin' : user.role === 'TRUSTEE' ? '/trustee' : '/',
      request.url,
    )
    const response = NextResponse.redirect(destination)
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(user.institutionSubject, user.role),
      sessionCookieOptions,
    )
    return response
  } catch (error) {
    console.error('[auth] SAML response validation failed:', error)
    return NextResponse.json({ error: 'Institutional sign-in failed' }, { status: 401 })
  }
}
