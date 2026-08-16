import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { registerUser } from '@/lib/register'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        try {
          if (!credentials) {
            return null;
          }

          const identifier = credentials.email ?? credentials.username;
          const email = identifier?.toLowerCase().trim();
          const password = credentials.password;

          if (!email || !password) {
            return null;
          }

          // Find customer by email (username field contains email)
          const customer = await prisma.customer.findFirst({
            where: {
              email
            }
          });

          const customerWithRegistrationType = customer as typeof customer & {
            registrationType?: 'GOOGLE' | 'GITHUB' | 'DIRECT'
            forcePasswordChange?: boolean
          }

          if (!customer) {
            throw new Error('EMAIL_NOT_REGISTERED');
          }

          if (
            customerWithRegistrationType.registrationType === 'GOOGLE' ||
            customerWithRegistrationType.registrationType === 'GITHUB'
          ) {
            throw new Error(`SOCIAL_LOGIN_REQUIRED:${customerWithRegistrationType.registrationType}`)
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, customer.password);

          if (!isValidPassword) {
            throw new Error('WRONG_EMAIL_OR_PASSWORD');
          }

          return {
            id: customer.id.toString(),
            name: customer.name,
            username: customer.email,
            email: customer.email,
            company: customer.company,
            role: 'user',
            requiresPasswordChange: Boolean(customerWithRegistrationType.forcePasswordChange),
          };
        } catch (error) {
          console.error('ERROR in authorize:', error);
          if (
            error instanceof Error &&
            (error.message === 'EMAIL_NOT_REGISTERED' ||
              error.message === 'WRONG_EMAIL_OR_PASSWORD' ||
              error.message.startsWith('SOCIAL_LOGIN_REQUIRED:'))
          ) {
            throw error
          }
          console.error('Unexpected credentials auth error:', error)
          return null;
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
    }),

    GitHubProvider({
      clientId: process.env.GITHUB_ID || 'dummy',
      clientSecret: process.env.GITHUB_SECRET || 'dummy',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }: any) {
      console.log('signIn callback triggered for provider:', account?.provider)
      if (account?.provider === 'google' || account?.provider === 'github') {
        try {
          const email = (user?.email || profile?.email)?.toLowerCase().trim()
          const name = user?.name || profile?.name || 'User'
          const cookieStore = await cookies()
          const isRegisterIntent = cookieStore.get('oauth_register_intent')?.value === '1'
          if (isRegisterIntent) {
            cookieStore.set('oauth_register_intent', '', {
              path: '/',
              maxAge: 0,
            })
          }

          if (!email) {
            console.log(`OAuth login denied: missing email from ${account.provider}`)
            return '/login?error=create_account_first'
          }

          console.log(`Processing OAuth user from ${account.provider}: ${email}`)

          // Check if customer already exists
          const existingCustomer = await prisma.customer.findFirst({
            where: { email }
          })

          const existingCustomerWithRegistrationType = existingCustomer as typeof existingCustomer & {
            registrationType?: 'GOOGLE' | 'GITHUB' | 'DIRECT'
          }

          if (!existingCustomer) {
            if (!isRegisterIntent) {
              console.log(`OAuth login denied: customer not found for ${email}`)
              return '/login?error=create_account_first'
            }

            const result = await registerUser({
              name,
              email,
              password: Math.random().toString(36),
              registrationType: account.provider === 'google' ? 'GOOGLE' : 'GITHUB',
            })

            if (!result.success) {
              console.log(`OAuth registration denied: ${result.error || 'unknown error'}`)
              return '/login?error=create_account_first'
            }

            const newCustomer = await prisma.customer.findFirst({
              where: { email }
            })

            if (!newCustomer) {
              console.log(`OAuth registration failed to load customer for ${email}`)
              return '/login?error=create_account_first'
            }

            console.log(`Customer created from register OAuth flow: ${email}`)
            user.company = newCustomer.company
            user.name = newCustomer.name
            user.isNewUser = true
            return true
          }

          const expectedRegistrationType = existingCustomerWithRegistrationType.registrationType
          const currentProviderType = account.provider === 'google' ? 'GOOGLE' : 'GITHUB'

          if (expectedRegistrationType && expectedRegistrationType !== currentProviderType) {
            console.log(
              `OAuth login denied: provider mismatch (expected ${expectedRegistrationType}, got ${currentProviderType})`
            )
            return `/login?error=social_login_mismatch&expected=${expectedRegistrationType}`
          }

          console.log(`Customer found for OAuth email: ${email}`)
          user.company = existingCustomer.company
          user.name = existingCustomer.name
          user.isNewUser = false
          return true
        } catch (error) {
          console.error('Error in signIn callback during OAuth customer lookup:', error)
          return '/login?error=create_account_first'
        }
      }
      return true
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.uid = user.id
        token.role = (user as any).role
        token.company = (user as any).company
        token.isNewUser = (user as any).isNewUser
        token.requiresPasswordChange = (user as any).requiresPasswordChange
      }

      // Fetch fresh customer data on session update or when company is missing
      if (trigger === 'update') {
        try {
          const customer = await prisma.customer.findFirst({
            where: {
              email: token.email as string
            }
          })
          if (customer) {
            token.name = customer.name
            token.company = customer.company
            // Clear isNewUser flag after preferences update
            token.isNewUser = false
            token.requiresPasswordChange = customer.forcePasswordChange
          }
        } catch (error) {
          console.error('Error fetching customer in JWT callback:', error)
        }
      } else if (!token.company) {
        try {
          const customer = await prisma.customer.findFirst({
            where: {
              email: token.email as string
            }
          })
          if (customer) {
            token.name = customer.name
            token.company = customer.company
            token.requiresPasswordChange = customer.forcePasswordChange
          }
        } catch (error) {
          console.error('Error fetching customer in JWT callback:', error)
        }
      }

      return token
    },
    async session({ session, token }: any) {
      if (session?.user && token) {
        session.user.id = token.uid
        session.user.role = token.role
        session.user.name = token.name
        session.user.company = token.company
        session.user.isNewUser = token.isNewUser
        session.user.requiresPasswordChange = token.requiresPasswordChange
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev-only',
}
