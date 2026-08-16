'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function PasswordChangeForm({ forced = false }: { forced?: boolean }) {
  const router = useRouter()
  const { update } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const data = await response.json() as { error?: string; message?: string }
      if (!response.ok) throw new Error(data.error ?? 'Unable to change password')
      await update()
      setMessage(data.message ?? 'Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (forced) router.replace('/home')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to change password')
    } finally { setSaving(false) }
  }

  return <form onSubmit={submit} className="space-y-4" noValidate>
    {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    {message && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
    <PasswordInput id="currentPassword" label="Current password" value={currentPassword} onChange={setCurrentPassword} />
    <PasswordInput id="newPassword" label="New password" value={newPassword} onChange={setNewPassword} hint="At least 8 characters." />
    <PasswordInput id="confirmPassword" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} />
    <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300">
      {saving ? 'Updating...' : 'Update password'}
    </button>
  </form>
}

function PasswordInput({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return <div><label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label><input id={id} type="password" autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'} value={value} onChange={(event) => onChange(event.target.value)} required minLength={id === 'currentPassword' ? undefined : 8} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900" />{hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}</div>
}
