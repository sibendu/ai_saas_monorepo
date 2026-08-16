import { getCurrentSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PasswordChangeForm from '@/components/PasswordChangeForm'

export default async function ChangePasswordPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/login')
  const forced = Boolean((session.user as { requiresPasswordChange?: boolean } | undefined)?.requiresPasswordChange)
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4"><section className="w-full max-w-md rounded-lg bg-white p-6 shadow"><h1 className="text-xl font-semibold text-gray-900">{forced ? 'Change your temporary password' : 'Change password'}</h1><p className="mt-2 text-sm text-gray-600">{forced ? 'For security, you must create a new password before continuing.' : 'Use your current password to set a new one.'}</p><div className="mt-6"><PasswordChangeForm forced={forced} /></div></section></main>
}
