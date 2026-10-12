import { SAML, ValidateInResponseTo, type CacheProvider } from '@node-saml/node-saml'
import { getPrismaClient } from '@/lib/prisma'

const globalForSaml = globalThis as typeof globalThis & { saml?: SAML }

export function getSamlClient() {
  const entryPoint = process.env.SAML_ENTRY_POINT
  const issuer = process.env.SAML_ISSUER
  const callbackUrl = process.env.SAML_CALLBACK_URL
  const idpCert = process.env.SAML_IDP_CERT?.replace(/\\n/g, '\n')
  if (!entryPoint || !issuer || !callbackUrl || !idpCert) {
    throw new Error('Microsoft Entra SAML is not configured')
  }

  if (!globalForSaml.saml) {
    const cacheProvider: CacheProvider = {
      async saveAsync(key, value) {
        const now = new Date()
        await getPrismaClient().samlRequest.create({
          data: { id: key, value, createdAt: now },
        })
        return { value, createdAt: now.getTime() }
      },
      async getAsync(key) {
        const prisma = getPrismaClient()
        const request = await prisma.samlRequest.findUnique({ where: { id: key } })
        if (!request || request.createdAt.getTime() < Date.now() - 8 * 60 * 60 * 1000) {
          await prisma.samlRequest.deleteMany({ where: { id: key } })
          return null
        }
        return request.value
      },
      async removeAsync(key) {
        if (!key) return null
        const prisma = getPrismaClient()
        const request = await prisma.samlRequest.findUnique({ where: { id: key } })
        if (!request) return null
        await prisma.samlRequest.delete({ where: { id: key } })
        return request.value
      },
    }

    globalForSaml.saml = new SAML({
      entryPoint,
      issuer,
      callbackUrl,
      idpCert,
      validateInResponseTo: ValidateInResponseTo.always,
      requestIdExpirationPeriodMs: 8 * 60 * 60 * 1000,
      cacheProvider,
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: true,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
    })
  }

  return globalForSaml.saml
}

export const ENTRA_GROUPS_CLAIM =
  process.env.SAML_GROUPS_CLAIM ?? 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'
