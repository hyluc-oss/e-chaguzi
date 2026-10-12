import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const errors = []
const checks = []
const placeholderPattern = /(?:TENANT_ID|YOUR_PUBLIC_HOST|PASTE_|REPLACE_WITH|ENTRA_.*_ID)/i

function value(name) {
  const current = process.env[name]?.trim()
  if (!current || placeholderPattern.test(current)) {
    errors.push(`${name} is missing or still contains a placeholder`)
    return null
  }
  return current
}

function checkUrl(name, protocols) {
  const configured = value(name)
  if (!configured) return null
  try {
    const parsed = new URL(configured)
    if (!protocols.includes(parsed.protocol)) throw new Error()
    return parsed
  } catch {
    errors.push(`${name} must be an absolute ${protocols.join(' or ')} URL`)
    return null
  }
}

const databaseUrl = value('DATABASE_URL')
const sessionSecret = value('SESSION_SECRET')
if (sessionSecret && sessionSecret.length < 32) {
  errors.push('SESSION_SECRET must be at least 32 characters')
}

const entryPoint = checkUrl('SAML_ENTRY_POINT', ['https:'])
if (entryPoint && entryPoint.hostname !== 'login.microsoftonline.com') {
  errors.push('SAML_ENTRY_POINT must use login.microsoftonline.com')
}

const issuer = checkUrl('SAML_ISSUER', ['https:'])
const callbackUrl = checkUrl('SAML_CALLBACK_URL', ['https:', 'http:'])
if (callbackUrl) {
  const isLocalHttp = callbackUrl.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '::1'].includes(callbackUrl.hostname)
  if (callbackUrl.protocol !== 'https:' && !isLocalHttp) {
    errors.push('SAML_CALLBACK_URL must use HTTPS except for localhost development')
  }
  if (callbackUrl.pathname !== '/api/auth/callback') {
    errors.push('SAML_CALLBACK_URL path must be /api/auth/callback')
  }
}

const certificate = process.env.SAML_IDP_CERT?.replace(/\\n/g, '\n').trim()
if (
  !certificate ||
  placeholderPattern.test(certificate) ||
  !certificate.includes('-----BEGIN CERTIFICATE-----') ||
  !certificate.includes('-----END CERTIFICATE-----')
) {
  errors.push('SAML_IDP_CERT must contain the Entra PEM signing certificate')
}

const adminGroup = value('SAML_ADMIN_GROUP_ID')
const trusteeGroup = value('SAML_TRUSTEE_GROUP_ID')
if (adminGroup && trusteeGroup && adminGroup === trusteeGroup) {
  errors.push('SAML_ADMIN_GROUP_ID and SAML_TRUSTEE_GROUP_ID must be distinct')
}

value('SAML_GROUPS_CLAIM')
value('SAML_FACULTY_CLAIM')
value('SAML_RESIDENCE_CLAIM')
value('SAML_CLASS_CLAIM')

if (databaseUrl) {
  try {
    const parsed = new URL(databaseUrl)
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || parsed.pathname.length < 2) {
      throw new Error('DATABASE_URL must identify a PostgreSQL database')
    }
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    })
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.push('PostgreSQL connection succeeded')
    } finally {
      await prisma.$disconnect()
    }
  } catch {
    errors.push('PostgreSQL connection failed; verify DATABASE_URL and that the database server is running')
  }
}

if (issuer && callbackUrl && issuer.origin !== callbackUrl.origin) {
  errors.push('SAML_ISSUER and SAML_CALLBACK_URL should use the same public host')
}

if (errors.length) {
  console.error('Authentication configuration is not ready:')
  for (const error of errors) console.error(`- ${error}`)
  for (const check of checks) console.log(`- ${check}`)
  process.exitCode = 1
} else {
  console.log('Authentication configuration checks passed:')
  for (const check of checks) console.log(`- ${check}`)
  console.log('- Required SAML and session settings are present and structurally valid')
}
