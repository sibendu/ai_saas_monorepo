import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/auth-options'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    // Check if this is a new user who just registered via OAuth
    if ((session.user as any)?.isNewUser) {
      redirect('/preferences')
    } else {
      redirect('/home')
    }
  } else {
    redirect('/login')
  }
}
