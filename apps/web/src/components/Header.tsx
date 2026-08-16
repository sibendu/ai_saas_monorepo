'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAppName } from '@/components/AppNameProvider'

interface HeaderProps {
  user: any
}

export default function Header({ user }: HeaderProps) {
  const appName = useAppName()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login', redirect: false })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{appName}</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Welcome, <span className="font-semibold text-gray-900">
              {user?.name || user?.email}
              {user?.company && <span className="font-normal text-gray-600"> ({user.company})</span>}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
