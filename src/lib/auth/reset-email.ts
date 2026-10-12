import nodemailer from 'nodemailer'

export function isResetEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD &&
    process.env.EMAIL_FROM,
  )
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT)
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  const from = process.env.EMAIL_FROM

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password || !from) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM must be configured')
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  })

  await transport.sendMail({
    from,
    to: email,
    subject: 'Reset your e-Chaguzi password',
    text: `Use this link to set a new e-Chaguzi password. It expires in 20 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this message.`,
    html: `<p>Use this link to set a new e-Chaguzi password. It expires in 20 minutes:</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, you can ignore this message.</p>`,
  })
}

