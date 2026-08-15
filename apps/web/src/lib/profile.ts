export type ProfileAddressType = 'PERMANENT' | 'COMMUNICATION'
export type ProfileContactType = 'MOBILE' | 'OTHER'

export interface ProfileAddressInput {
  type: ProfileAddressType
  addressLine1: string
  addressLine2: string
  addressLine3?: string | null
  city: string
  district: string
  state: string
  country: string
  pin: string
}

export interface ProfileContactInput {
  type: ProfileContactType
  countryCode: string
  contact: string
}

export interface ProfileMutationInput {
  firstName: string
  middleName?: string | null
  lastName: string
  dob?: string | null
  company?: string | null
  addresses: ProfileAddressInput[]
  contacts: ProfileContactInput[]
}

export interface ProfileValidationResult {
  data?: ProfileMutationInput & { displayName: string; dobDate: Date | null }
  error?: string
}

const addressTypes = new Set<ProfileAddressType>(['PERMANENT', 'COMMUNICATION'])
const contactTypes = new Set<ProfileContactType>(['MOBILE', 'OTHER'])

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalCleanString(value: unknown): string | null {
  const cleanedValue = cleanString(value)
  return cleanedValue ? cleanedValue : null
}

function validateLength(value: string, fieldName: string, maxLength: number): string | null {
  return value.length > maxLength ? `${fieldName} must be ${maxLength} characters or less` : null
}

export function buildDisplayName(input: {
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  fallback?: string | null
}): string {
  const structuredName = [input.firstName, input.middleName, input.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ')

  return structuredName || input.fallback?.trim() || 'User'
}

export function splitDisplayName(name: string | null | undefined): {
  firstName: string
  middleName: string | null
  lastName: string
} {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0]?.slice(0, 40) || 'User'
  const lastName = (parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || 'User').slice(0, 40)

  return {
    firstName,
    middleName: null,
    lastName,
  }
}

export function validateProfilePayload(payload: unknown): ProfileValidationResult {
  if (typeof payload !== 'object' || payload === null) {
    return { error: 'Invalid profile payload' }
  }

  const body = payload as Record<string, unknown>
  const firstName = cleanString(body.firstName)
  const middleName = optionalCleanString(body.middleName)
  const lastName = cleanString(body.lastName)
  const company = optionalCleanString(body.company)
  const dob = optionalCleanString(body.dob)

  if (!firstName) {
    return { error: 'First name is required' }
  }

  if (!lastName) {
    return { error: 'Last name is required' }
  }

  for (const [fieldName, value] of [
    ['First name', firstName],
    ['Middle name', middleName ?? ''],
    ['Last name', lastName],
  ] as const) {
    const lengthError = validateLength(value, fieldName, 40)
    if (lengthError) {
      return { error: lengthError }
    }
  }

  let dobDate: Date | null = null
  if (dob) {
    dobDate = new Date(`${dob}T00:00:00.000Z`)
    if (Number.isNaN(dobDate.getTime())) {
      return { error: 'DOB must be a valid date' }
    }
  }

  if (!Array.isArray(body.addresses) || body.addresses.length > 2) {
    return { error: 'Up to 2 addresses are allowed' }
  }

  if (!Array.isArray(body.contacts) || body.contacts.length > 2) {
    return { error: 'Up to 2 contacts are allowed' }
  }

  const addresses: ProfileAddressInput[] = []
  for (const [index, rawAddress] of body.addresses.entries()) {
    if (typeof rawAddress !== 'object' || rawAddress === null) {
      return { error: `Address ${index + 1} is invalid` }
    }

    const address = rawAddress as Record<string, unknown>
    const rawType = address.type
    if (rawType !== 'PERMANENT' && rawType !== 'COMMUNICATION') {
      return { error: `Address ${index + 1} type is invalid` }
    }
    const type: ProfileAddressType = rawType

    const normalizedAddress = {
      type,
      addressLine1: cleanString(address.addressLine1),
      addressLine2: cleanString(address.addressLine2),
      addressLine3: optionalCleanString(address.addressLine3),
      city: cleanString(address.city),
      district: cleanString(address.district),
      state: cleanString(address.state),
      country: cleanString(address.country),
      pin: cleanString(address.pin),
    }

    for (const fieldName of [
      'addressLine1',
      'addressLine2',
      'city',
      'district',
      'state',
      'country',
      'pin',
    ] as const) {
      if (!normalizedAddress[fieldName]) {
        return { error: `Address ${index + 1} ${fieldName} is required` }
      }
    }

    for (const [fieldName, maxLength] of [
      ['addressLine1', 60],
      ['addressLine2', 60],
      ['addressLine3', 60],
      ['city', 40],
      ['district', 40],
      ['state', 40],
      ['country', 40],
      ['pin', 12],
    ] as const) {
      const lengthError = validateLength(normalizedAddress[fieldName] ?? '', fieldName, maxLength)
      if (lengthError) {
        return { error: lengthError }
      }
    }

    addresses.push(normalizedAddress)
  }

  const contacts: ProfileContactInput[] = []
  for (const [index, rawContact] of body.contacts.entries()) {
    if (typeof rawContact !== 'object' || rawContact === null) {
      return { error: `Contact ${index + 1} is invalid` }
    }

    const contact = rawContact as Record<string, unknown>
    const rawType = contact.type
    if (rawType !== 'MOBILE' && rawType !== 'OTHER') {
      return { error: `Contact ${index + 1} type is invalid` }
    }
    const type: ProfileContactType = rawType

    const normalizedContact = {
      type,
      countryCode: cleanString(contact.countryCode) || '+91',
      contact: cleanString(contact.contact),
    }

    if (!normalizedContact.contact) {
      return { error: `Contact ${index + 1} is required` }
    }

    if (type === 'MOBILE' && !/^\d{10}$/.test(normalizedContact.contact)) {
      return { error: `Contact ${index + 1} mobile number must be 10 digits` }
    }

    const contactLengthError = validateLength(normalizedContact.contact, 'Contact', 40)
    if (contactLengthError) {
      return { error: contactLengthError }
    }

    contacts.push(normalizedContact)
  }

  return {
    data: {
      firstName,
      middleName,
      lastName,
      dob,
      dobDate,
      company,
      addresses,
      contacts,
      displayName: buildDisplayName({ firstName, middleName, lastName }),
    },
  }
}

export function isAddressType(value: string): value is ProfileAddressType {
  return addressTypes.has(value as ProfileAddressType)
}

export function isContactType(value: string): value is ProfileContactType {
  return contactTypes.has(value as ProfileContactType)
}
