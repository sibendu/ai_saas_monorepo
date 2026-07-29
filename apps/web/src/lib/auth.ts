import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'

export async function getCurrentSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}

export async function requireAuthenticatedSession(): Promise<Session> {
  const session = await getCurrentSession()

  if (!session) {
    redirect('/login')
  }

  return session
}
