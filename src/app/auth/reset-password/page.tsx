import ResetPasswordForm from './ResetPasswordForm'
import { notFound } from 'next/navigation'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  if (process.env.LOCAL_AUTH_ENABLED !== 'true') notFound()
  const { token } = await searchParams
  return <ResetPasswordForm token={token ?? ''} />
}
