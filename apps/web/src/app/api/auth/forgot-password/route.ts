import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePasswordResetToken, sendPasswordResetEmail } from '@/lib/password-reset'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const customer = await prisma.customer.findFirst({
      where: {
        email: normalizedEmail,
      },
    })

    const genericMessage = 'If your account is eligible, a password reset link has been sent.'
    const socialRegistrationMessage = 'You registered using your Google or Github account, please use the same to Login'

    if (!customer) {
      return NextResponse.json({ message: genericMessage }, { status: 200 })
    }

    const customerWithRegistrationType = customer as typeof customer & {
      registrationType?: 'GOOGLE' | 'GITHUB' | 'DIRECT'
    }

    if (
      customerWithRegistrationType.registrationType === 'GOOGLE' ||
      customerWithRegistrationType.registrationType === 'GITHUB'
    ) {
      return NextResponse.json({ message: socialRegistrationMessage }, { status: 200 })
    }

    const { rawToken, hashedToken, expiresAt } = generatePasswordResetToken()

    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: expiresAt,
      },
    })

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetLink = `${appUrl}/reset-password?token=${rawToken}`
    await sendPasswordResetEmail(normalizedEmail, resetLink)

    return NextResponse.json({ message: genericMessage }, { status: 200 })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
