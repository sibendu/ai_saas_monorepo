import Link from 'next/link'
import { ReactNode } from 'react'

interface AuthPageShellProps {
  title: string
  subtitle: string
  children: ReactNode
}

export default function AuthPageShell({ title, subtitle, children }: AuthPageShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6">
        <Link href="/login" className="text-lg font-bold text-indigo-700">
          SaaS Platform
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-gray-100"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            Register
          </Link>
        </div>
      </header>

      <main className="p-4 md:p-6">
        <section className="mx-auto max-w-md">
          <div className="mb-5 bg-white rounded-lg shadow p-4 sm:p-5">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-5">
            {children}
          </div>
        </section>
      </main>
    </div>
  )
}
