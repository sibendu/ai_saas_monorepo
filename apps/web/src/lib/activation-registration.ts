import bcrypt from 'bcryptjs'

import { generatePasswordResetToken, sendAccountActivationEmail } from './password-reset'
import { prisma } from './prisma'
import { splitDisplayName } from './profile'

interface ActivationRegistrationData {
  name?: string
  firstName?: string
  middleName?: string | null
  lastName?: string
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
    const fallbackName = data.name?.trim()
    const firstName = data.firstName?.trim()
    const middleName = data.middleName?.trim() || null
    const lastName = data.lastName?.trim()
    const name = fallbackName || [firstName, middleName, lastName].filter(Boolean).join(' ')
    const email = data.email?.toLowerCase().trim()

    if (!firstName && !fallbackName) {
      return {
        success: false,
        error: 'First name and email are required',
      }
    }

    if (!lastName && !fallbackName) {
      return {
        success: false,
        error: 'Last name and email are required',
      }
    }

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
    const structuredName =
      firstName && lastName
        ? {
            firstName: firstName.slice(0, 40),
            middleName: middleName?.slice(0, 40) ?? null,
            lastName: lastName.slice(0, 40),
          }
        : splitDisplayName(name)

    await prisma.customer.create({
      data: {
        email,
        firstName: structuredName.firstName,
        middleName: structuredName.middleName,
        lastName: structuredName.lastName,
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
