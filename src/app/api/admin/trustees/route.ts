import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
  }

  try {
    const prisma = getPrismaClient()
    const admin = await prisma.user.findUnique({
      where: { institutionSubject: session.subject },
      select: { role: true },
    })
    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    const trustees = await prisma.user.findMany({
      where: { role: 'TRUSTEE' },
      orderBy: { institutionSubject: 'asc' },
      select: { institutionSubject: true },
    })
    return NextResponse.json({ trustees })
  } catch (error) {
    console.error('[admin/trustees] Unable to load trustee accounts:', error)
    return NextResponse.json({ error: 'Trustee data is temporarily unavailable' }, { status: 503 })
  }
}
