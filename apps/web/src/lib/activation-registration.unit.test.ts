import { beforeEach, describe, expect, it, vi } from 'vitest'

import { startEmailActivationRegistration } from './activation-registration'
import { prisma } from './prisma'
import { sendAccountActivationEmail } from './password-reset'

vi.mock('./prisma', () => ({
  prisma: {
    customer: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('./password-reset', async () => {
  const actual = await vi.importActual<typeof import('./password-reset')>('./password-reset')

  return {
    ...actual,
    sendAccountActivationEmail: vi.fn(),
  }
})

const customerMock = vi.mocked(prisma.customer)
const sendAccountActivationEmailMock = vi.mocked(sendAccountActivationEmail)

describe('activation registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })

  it('creates a direct customer with an activation token and sends activation email', async () => {
    customerMock.findFirst.mockResolvedValue(null)
    customerMock.create.mockResolvedValue({
      id: 1,
      email: 'person@example.com',
      password: 'placeholder-hash',
      name: 'Person Example',
      firstName: 'Person',
      middleName: null,
      lastName: 'Example',
      dob: null,
      company: null,
      registrationType: 'DIRECT',
      passwordResetToken: 'hashed-token',
      passwordResetExpiresAt: new Date(),
    })

    const result = await startEmailActivationRegistration({
      name: 'Person Example',
      email: ' PERSON@EXAMPLE.COM ',
    })

    expect(result.success).toBe(true)
    expect(customerMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'person@example.com',
          firstName: 'Person',
          middleName: null,
          lastName: 'Example',
          name: 'Person Example',
          company: null,
          registrationType: 'DIRECT',
          passwordResetToken: expect.any(String),
          passwordResetExpiresAt: expect.any(Date),
        }),
      })
    )
    expect(sendAccountActivationEmailMock).toHaveBeenCalledWith(
      'person@example.com',
      expect.stringMatching(/^http:\/\/localhost:3000\/reset-password\?token=/),
      'Person Example'
    )
  })

  it('rejects duplicate emails without sending a new activation email', async () => {
    customerMock.findFirst.mockResolvedValue({
      id: 1,
      email: 'person@example.com',
      password: 'existing-hash',
      name: 'Person Example',
      firstName: 'Person',
      middleName: null,
      lastName: 'Example',
      dob: null,
      company: null,
      registrationType: 'DIRECT',
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    })

    const result = await startEmailActivationRegistration({
      name: 'Person Example',
      email: 'person@example.com',
    })

    expect(result).toEqual({
      success: false,
      error: 'An account with Email already exists',
    })
    expect(customerMock.create).not.toHaveBeenCalled()
    expect(sendAccountActivationEmailMock).not.toHaveBeenCalled()
  })
})
