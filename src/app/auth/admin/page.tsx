import LoginForm from '../login/LoginForm'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const localAuthEnabled = process.env.LOCAL_AUTH_ENABLED === 'true'

  return <LoginForm portal="admin" error={error} localAuthEnabled={localAuthEnabled} />
}
