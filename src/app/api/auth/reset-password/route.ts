import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth/local-accounts'
import { getPrismaClient } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  if (process.env.LOCAL_AUTH_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Password reset is unavailable' }, { status: 404 })
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
  if (
    !body ||
    typeof body !== 'object' ||
    !('token' in body) ||
    typeof body.token !== 'string' ||
    !/^[a-f0-9]{64}$/.test(body.token) ||
    !('password' in body) ||
    typeof body.password !== 'string' ||
    body.password.length < 12 ||
    body.password.length > 256
  ) {
    return NextResponse.json({ error: 'Use a valid reset link and a password of at least 12 characters' }, { status: 400 })
  }

  const newPassword = body.password
  const tokenHash = createHash('sha256').update(body.token).digest('hex')
  const now = new Date()
  const client = getPrismaClient()
  try {
    const token = await client.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
        user: {
          role: 'VOTER',
          institutionSubject: { startsWith: 'local:student:' },
        },
      },
      select: { userId: true },
    })
    if (!token) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired. Request a new one.' }, { status: 400 })
    }

    const updated = await client.$transaction(async transaction => {
      const consumed = await transaction.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      })
      if (consumed.count !== 1) return false
      await transaction.user.update({
        where: { id: token.userId },
        data: { passwordHash: hashPassword(newPassword) },
      })
      return true
    })
    if (!updated) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired. Request a new one.' }, { status: 400 })
    }
    return NextResponse.json({ message: 'Password updated. You can now sign in.' })
  } catch (error) {
    console.error('[auth/reset-password] Unable to reset student password:', error)
    return NextResponse.json({ error: 'Password reset is temporarily unavailable' }, { status: 503 })
  }
}
