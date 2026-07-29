import crypto from 'crypto'
import nodemailer from 'nodemailer'

const PASSWORD_RESET_TTL_MINUTES = 60

export function generatePasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000)

  return {
    rawToken,
    hashedToken,
    expiresAt,
  }
}

export function hashPasswordResetToken(rawToken: string) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const gmailUser = process.env.GMAIL_USER
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

  if (!gmailUser || !gmailAppPassword) {
    console.warn('GMAIL_USER/GMAIL_APP_PASSWORD missing, logging reset link instead of sending email')
    console.log(`Password reset link for ${email}: ${resetLink}`)
    return
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  })

  await transporter.sendMail({
    from: gmailUser,
    to: email,
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password.</p>
        <p>Click the button below to set a new password:</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">
            Reset Password
          </a>
        </p>
        <p>This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.</p>
      </div>
    `,
  })
}

export async function sendAccountActivationEmail(
  email: string,
  activationLink: string,
  name: string
) {
  const gmailUser = process.env.GMAIL_USER
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

  if (!gmailUser || !gmailAppPassword) {
    console.warn('GMAIL_USER/GMAIL_APP_PASSWORD missing, logging activation link instead of sending email')
    console.log(`Account activation link for ${email}: ${activationLink}`)
    return
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  })

  await transporter.sendMail({
    from: gmailUser,
    to: email,
    subject: 'Activate your account',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Activate your account</h2>
        <p>Hello ${name},</p>
        <p>Use the button below to create your password and activate your account.</p>
        <p>
          <a href="${activationLink}" style="display:inline-block;padding:10px 16px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">
            Activate Account
          </a>
        </p>
        <p>This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.</p>
      </div>
    `,
  })
}
