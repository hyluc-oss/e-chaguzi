import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { isResetEmailConfigured, sendPasswordResetEmail } from '@/lib/auth/reset-email'
import { getPrismaClient } from '@/lib/prisma'

const genericResponse = {
  message: 'If the Student ID and Gmail address match our records, a reset link will be sent.',
}
const TOKEN_LIFETIME_MS = 20 * 60 * 1000
const REQUEST_COOLDOWN_MS = 2 * 60 * 1000

export async function POST(request: NextRequest) {
  if (process.env.LOCAL_AUTH_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Password reset is unavailable' }, { status: 404 })
  }
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }
  if (!isResetEmailConfigured()) {
    console.error('[auth/forgot-password] SMTP settings are incomplete')
    return NextResponse.json({ error: 'Password reset email is not configured' }, { status: 503 })
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
    !('studentId' in body) ||
    typeof body.studentId !== 'string' ||
    body.studentId.length > 100 ||
    !('gmail' in body) ||
    typeof body.gmail !== 'string' ||
    body.gmail.length > 254
  ) {
    return NextResponse.json({ error: 'Enter your Student ID and Gmail address' }, { status: 400 })
  }

  try {
    const studentId = body.studentId.trim()
    const gmail = body.gmail.trim().toLowerCase()
    const client = getPrismaClient()
    const user = await client.user.findFirst({
      where: {
        institutionSubject: `local:student:${studentId}`,
        role: 'VOTER',
        email: gmail,
      },
      select: { id: true },
    })
    if (!user) return NextResponse.json(genericResponse)

    const now = new Date()
    const recentRequest = await client.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gte: new Date(now.getTime() - REQUEST_COOLDOWN_MS) } },
      select: { tokenHash: true },
    })
    if (recentRequest) return NextResponse.json(genericResponse)

    await client.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    })
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    await client.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS),
      },
    })

    const configuredBaseUrl = process.env.APP_BASE_URL
    const baseUrl = configuredBaseUrl ? new URL(configuredBaseUrl) : new URL(request.nextUrl.origin)
    if (
      (baseUrl.protocol !== 'https:' && baseUrl.hostname !== 'localhost' && baseUrl.hostname !== '127.0.0.1') ||
      baseUrl.username ||
      baseUrl.password
    ) {
      throw new Error('APP_BASE_URL must use HTTPS except for local development')
    }
    const resetUrl = new URL('/auth/reset-password', baseUrl)
    resetUrl.searchParams.set('token', token)

    try {
      await sendPasswordResetEmail(gmail, resetUrl.toString())
    } catch (error) {
      await client.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      })
      console.error('[auth/forgot-password] Unable to deliver reset email:', error)
    }
    return NextResponse.json(genericResponse)
  } catch (error) {
    console.error('[auth/forgot-password] Unable to process reset request:', error)
    return NextResponse.json({ error: 'Password reset is temporarily unavailable' }, { status: 503 })
  }
}
