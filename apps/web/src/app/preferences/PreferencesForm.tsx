'use client'

import { ChangeEvent, FormEvent, useState } from 'react'
import { useSession } from 'next-auth/react'

import AppShell from '@/components/AppShell'
import PasswordChangeForm from '@/components/PasswordChangeForm'
import { MenuLayout, MenuSectionConfig } from '@/config/navigation'
import {
  ProfileAddressInput,
  ProfileAddressType,
  ProfileContactInput,
  ProfileContactType,
} from '@/lib/profile'

interface PreferencesUser {
  name?: string | null
  email?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  dob?: string | null
  company?: string | null
  addresses?: ProfileAddressInput[]
  contacts?: ProfileContactInput[]
}

interface PreferencesFormProps {
  user: PreferencesUser
  menuSections: MenuSectionConfig[]
  menuLayout: MenuLayout
}

interface ProfileFormState {
  email: string
  firstName: string
  middleName: string
  lastName: string
  dob: string
  company: string
  addresses: ProfileAddressInput[]
  contacts: ProfileContactInput[]
}

const countryCodeOptions = ['+91', '+1', '+44', '+61', '+65', '+971']

function emptyAddress(type: ProfileAddressType = 'PERMANENT'): ProfileAddressInput {
  return {
    type,
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    city: '',
    district: '',
    state: '',
    country: '',
    pin: '',
  }
}

function emptyContact(type: ProfileContactType = 'MOBILE'): ProfileContactInput {
  return {
    type,
    countryCode: '+91',
    contact: '',
  }
}

export default function PreferencesForm({ user, menuSections, menuLayout }: PreferencesFormProps) {
  const { update } = useSession()
  const [formData, setFormData] = useState<ProfileFormState>({
    email: user.email ?? '',
    firstName: user.firstName ?? '',
    middleName: user.middleName ?? '',
    lastName: user.lastName ?? '',
    dob: user.dob ?? '',
    company: user.company ?? '',
    addresses: user.addresses?.length ? user.addresses : [],
    contacts: user.contacts?.length ? user.contacts : [],
  })
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)

  async function sendResetLink() {
    setResetError('')
    setResetMessage('')
    setIsSendingReset(true)
    try {
      const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: formData.email }) })
      const data = await response.json() as { error?: string; message?: string }
      if (!response.ok) throw new Error(data.error ?? 'Unable to send reset link')
      setResetMessage(data.message ?? 'Password reset link sent')
    } catch (cause) { setResetError(cause instanceof Error ? cause.message : 'Unable to send reset link') } finally { setIsSendingReset(false) }
  }

  function updateField(event: ChangeEvent<HTMLInputElement>) {
    setFormData((current) => ({
      ...current,
      [event.target.id]: event.target.value,
    }))
  }

  function updateAddress(
    index: number,
    field: keyof ProfileAddressInput,
    value: ProfileAddressInput[keyof ProfileAddressInput]
  ) {
    setFormData((current) => ({
      ...current,
      addresses: current.addresses.map((address, addressIndex) =>
        addressIndex === index ? { ...address, [field]: value } : address
      ),
    }))
  }

  function updateContact(
    index: number,
    field: keyof ProfileContactInput,
    value: ProfileContactInput[keyof ProfileContactInput]
  ) {
    setFormData((current) => ({
      ...current,
      contacts: current.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact
      ),
    }))
  }

  function addAddress() {
    setFormData((current) => ({
      ...current,
      addresses: [
        ...current.addresses,
        emptyAddress(current.addresses.length === 0 ? 'PERMANENT' : 'COMMUNICATION'),
      ].slice(0, 2),
    }))
  }

  function addContact() {
    setFormData((current) => ({
      ...current,
      contacts: [...current.contacts, emptyContact()].slice(0, 2),
    }))
  }

  function removeAddress(index: number) {
    setFormData((current) => ({
      ...current,
      addresses: current.addresses.filter((_, addressIndex) => addressIndex !== index),
    }))
  }

  function removeContact(index: number) {
    setFormData((current) => ({
      ...current,
      contacts: current.contacts.filter((_, contactIndex) => contactIndex !== index),
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatusMessage('')

    if (!formData.firstName.trim()) {
      setError('First name is required')
      return
    }

    if (!formData.lastName.trim()) {
      setError('Last name is required')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          dob: formData.dob || null,
          company: formData.company,
          addresses: formData.addresses,
          contacts: formData.contacts,
        }),
      })

      const data = (await response.json()) as { error?: string; message?: string }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      await update()
      setStatusMessage(data.message ?? 'Profile updated successfully')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating profile.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppShell
      user={user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Preferences"
      pageSubtitle="Profile"
    >
      <section className="space-y-5">
        <div className="bg-white rounded-lg shadow p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          <p className="mt-1 text-sm text-gray-500">
            Maintain account details, addresses, and contact information.
          </p>

          {statusMessage && (
            <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              {statusMessage}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="bg-white rounded-lg shadow p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Account details
            </h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <TextInput
                id="email"
                label="Email address"
                value={formData.email}
                disabled
                onChange={updateField}
              />
              <TextInput
                id="firstName"
                label="First name"
                maxLength={40}
                required
                value={formData.firstName}
                onChange={updateField}
              />
              <TextInput
                id="middleName"
                label="Middle name"
                maxLength={40}
                value={formData.middleName}
                onChange={updateField}
              />
              <TextInput
                id="lastName"
                label="Last name"
                maxLength={40}
                required
                value={formData.lastName}
                onChange={updateField}
              />
              <TextInput
                id="dob"
                label="DOB"
                type="date"
                value={formData.dob}
                onChange={updateField}
              />
              <TextInput
                id="company"
                label="Company / Organization"
                value={formData.company}
                onChange={updateField}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Password</h3>
            <p className="mt-1 text-sm text-gray-500">Change your password now, or email yourself a reset link.</p>
            <div className="mt-4 max-w-md"><PasswordChangeForm /></div>
            <div className="mt-5 border-t border-gray-100 pt-4">
              {resetError && <p className="mb-3 text-sm text-red-700">{resetError}</p>}
              {resetMessage && <p className="mb-3 text-sm text-green-700">{resetMessage}</p>}
              <button type="button" onClick={sendResetLink} disabled={isSendingReset} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:text-gray-400">{isSendingReset ? 'Sending...' : 'Email me a reset link'}</button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Addresses
                </h3>
                <p className="mt-1 text-sm text-gray-500">Add up to 2 addresses.</p>
              </div>
              <button
                type="button"
                onClick={addAddress}
                disabled={formData.addresses.length >= 2}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Add address
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {formData.addresses.length === 0 ? (
                <p className="text-sm text-gray-500">No addresses have been added.</p>
              ) : (
                formData.addresses.map((address, index) => (
                  <div key={index} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-gray-900">Address {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeAddress(index)}
                        className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <SelectInput
                        label="Type"
                        value={address.type}
                        options={[
                          { label: 'Permanent', value: 'PERMANENT' },
                          { label: 'Communication', value: 'COMMUNICATION' },
                        ]}
                        onChange={(value) =>
                          updateAddress(index, 'type', value as ProfileAddressType)
                        }
                      />
                      <TextInput
                        id={`addressLine1-${index}`}
                        label="Address line 1"
                        maxLength={60}
                        required
                        value={address.addressLine1}
                        onChange={(event) =>
                          updateAddress(index, 'addressLine1', event.target.value)
                        }
                      />
                      <TextInput
                        id={`addressLine2-${index}`}
                        label="Address line 2"
                        maxLength={60}
                        required
                        value={address.addressLine2}
                        onChange={(event) =>
                          updateAddress(index, 'addressLine2', event.target.value)
                        }
                      />
                      <TextInput
                        id={`addressLine3-${index}`}
                        label="Address line 3"
                        maxLength={60}
                        value={address.addressLine3 ?? ''}
                        onChange={(event) =>
                          updateAddress(index, 'addressLine3', event.target.value)
                        }
                      />
                      <TextInput
                        id={`city-${index}`}
                        label="City"
                        value={address.city}
                        onChange={(event) => updateAddress(index, 'city', event.target.value)}
                      />
                      <TextInput
                        id={`district-${index}`}
                        label="District"
                        value={address.district}
                        onChange={(event) => updateAddress(index, 'district', event.target.value)}
                      />
                      <TextInput
                        id={`state-${index}`}
                        label="State"
                        value={address.state}
                        onChange={(event) => updateAddress(index, 'state', event.target.value)}
                      />
                      <TextInput
                        id={`country-${index}`}
                        label="Country"
                        value={address.country}
                        onChange={(event) => updateAddress(index, 'country', event.target.value)}
                      />
                      <TextInput
                        id={`pin-${index}`}
                        label="PIN"
                        value={address.pin}
                        onChange={(event) => updateAddress(index, 'pin', event.target.value)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Contacts
                </h3>
                <p className="mt-1 text-sm text-gray-500">Add up to 2 contacts.</p>
              </div>
              <button
                type="button"
                onClick={addContact}
                disabled={formData.contacts.length >= 2}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Add contact
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {formData.contacts.length === 0 ? (
                <p className="text-sm text-gray-500">No contacts have been added.</p>
              ) : (
                formData.contacts.map((contact, index) => (
                  <div key={index} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-gray-900">Contact {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_minmax(0,1fr)]">
                      <SelectInput
                        label="Type"
                        value={contact.type}
                        options={[
                          { label: 'Mobile', value: 'MOBILE' },
                          { label: 'Other', value: 'OTHER' },
                        ]}
                        onChange={(value) =>
                          updateContact(index, 'type', value as ProfileContactType)
                        }
                      />
                      <SelectInput
                        label="Country code"
                        value={contact.countryCode}
                        options={countryCodeOptions.map((code) => ({ label: code, value: code }))}
                        onChange={(value) => updateContact(index, 'countryCode', value)}
                      />
                      <TextInput
                        id={`contact-${index}`}
                        label="Contact"
                        inputMode={contact.type === 'MOBILE' ? 'numeric' : 'text'}
                        maxLength={contact.type === 'MOBILE' ? 10 : 40}
                        required
                        value={contact.contact}
                        onChange={(event) => updateContact(index, 'contact', event.target.value)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {isLoading ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  )
}

function TextInput({
  disabled = false,
  id,
  inputMode,
  label,
  maxLength,
  onChange,
  required = false,
  type = 'text',
  value,
}: {
  disabled?: boolean
  id: string
  inputMode?: 'numeric' | 'text'
  label: string
  maxLength?: number
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  type?: string
  value: string
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        onChange={onChange}
        className={`mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm ${
          disabled ? 'bg-gray-100 text-gray-500' : 'text-gray-900'
        }`}
        required={required}
      />
    </div>
  )
}

function SelectInput({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  value: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
