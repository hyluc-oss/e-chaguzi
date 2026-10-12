import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getPrismaClient } from '@/lib/prisma'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'ADMIN') redirect('/auth/admin')

  const user = await getPrismaClient().user.findUnique({
    where: { institutionSubject: session.subject },
    select: { role: true },
  })
  if (user?.role !== 'ADMIN') redirect('/')

  return children
}
