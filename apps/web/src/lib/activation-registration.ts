import bcrypt from 'bcryptjs'

import { generatePasswordResetToken, sendAccountActivationEmail } from './password-reset'
import { prisma } from './prisma'

interface ActivationRegistrationData {
  name?: string
  email?: string
}

interface ActivationRegistrationResult {
  success: boolean
  error?: string
}

export async function startEmailActivationRegistration(
  data: ActivationRegistrationData
): Promise<ActivationRegistrationResult> {
  try {
    const name = data.name?.trim()
    const email = data.email?.toLowerCase().trim()

    if (!name || !email) {
      return {
        success: false,
        error: 'Name and email are required',
      }
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        email,
      },
    })

    if (existingCustomer) {
      return {
        success: false,
        error: 'An account with Email already exists',
      }
    }

    const { rawToken, hashedToken, expiresAt } = generatePasswordResetToken()
    const placeholderPassword = await bcrypt.hash(rawToken, 10)

    await prisma.customer.create({
      data: {
        email,
        password: placeholderPassword,
        name,
        company: null,
        registrationType: 'DIRECT',
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: expiresAt,
      },
    })

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const activationLink = `${appUrl}/reset-password?token=${rawToken}`

    await sendAccountActivationEmail(email, activationLink, name)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Activation registration error:', error)

    return {
      success: false,
      error: 'Internal server error',
    }
  }
}
