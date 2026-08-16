'use client'

import { FormEvent, Suspense, useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthPageShell from '@/components/AuthPageShell'

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={null}>
      <ActivateAccountForm />
    </Suspense>
  )
}

function ActivateAccountForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!token) {
      setError('This activation link is invalid or incomplete.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to activate your account')
      }

      const signInResult = await signIn('credentials', {
        email: data.email,
        password,
        redirect: false,
      })
      router.push(signInResult?.ok ? '/home' : '/login')
      if (signInResult?.ok) router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to activate your account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthPageShell
      title="Activate your account"
      subtitle="Create a password to finish setting up your account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
            Create password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            autoComplete="new-password"
            required
          />
        </div>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {isLoading ? 'Activating account…' : 'Activate account'}
        </button>
      </form>
      <p className="mt-5 border-t border-gray-100 pt-5 text-center text-sm text-gray-600">
        Already have access? <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">Sign in</Link>
      </p>
    </AuthPageShell>
  )
}
