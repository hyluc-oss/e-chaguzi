import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expectedHex, ...extra] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !expectedHex || extra.length) return false

  const expected = Buffer.from(expectedHex, 'hex')
  if (expected.length !== 64) return false
  const actual = scryptSync(password, salt, expected.length)
  return timingSafeEqual(actual, expected)
}
