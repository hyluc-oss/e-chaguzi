import ForgotPasswordForm from './ForgotPasswordForm'
import { notFound } from 'next/navigation'

export default function ForgotPasswordPage() {
  if (process.env.LOCAL_AUTH_ENABLED !== 'true') notFound()
  return <ForgotPasswordForm />
}
