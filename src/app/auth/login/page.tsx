import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const localAuthEnabled = process.env.LOCAL_AUTH_ENABLED === 'true'

  return <LoginForm portal="student" error={error} localAuthEnabled={localAuthEnabled} />
}
