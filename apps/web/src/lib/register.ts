import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { splitDisplayName } from './profile'

export interface RegisterUserData {
    name?: string
    email: string
    password?: string
    registrationType?: 'GOOGLE' | 'GITHUB' | 'DIRECT'
}

export interface RegisterResult {
    success: boolean
    error?: string
}

/**
 * Shared registration logic used by both:
 * - /api/register route (form-based registration)
 * - OAuth signIn callback (Google/GitHub registration)
 */
export async function registerUser(data: RegisterUserData): Promise<RegisterResult> {
    try {
        const { name, password } = data
        const email = data.email?.toLowerCase().trim()
        const registrationType = data.registrationType || 'DIRECT'

        // Validate input (basic check)
        if (!name || !email || !password) {
            return {
                success: false,
                error: 'Missing required fields'
            }
        }

        // Check if customer already exists
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                email
            }
        })

        if (existingCustomer) {
            return {
                success: false,
                error: 'An account with Email already exists'
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)
        const structuredName = splitDisplayName(name)

        // Create customer in database
        const customer = await prisma.customer.create({
            data: {
                email,
                firstName: structuredName.firstName,
                middleName: structuredName.middleName,
                lastName: structuredName.lastName,
                password: hashedPassword,
                name,
                company: null,
                registrationType
            }
        })

        console.log('--- NEW CUSTOMER REGISTERED ---')
        console.log('ID:', customer.id)
        console.log('Email:', customer.email)
        console.log('Name:', customer.name)
        console.log('Registration Type:', customer.registrationType)
        if (customer.company) console.log('Company:', customer.company)
        console.log('-------------------------------')

        return {
            success: true
        }
    } catch (error) {
        console.error('Registration error:', error)
        return {
            success: false,
            error: 'Internal server error'
        }
    }
}
