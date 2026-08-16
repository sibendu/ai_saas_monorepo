import { AdminUserSummary } from '@saas/shared-types'

export const adminUserSelect = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  middleName: true,
  lastName: true,
  company: true,
  passwordResetToken: true,
  passwordResetExpiresAt: true,
  activationPending: true,
  userGroupMemberships: {
    select: {
      group: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  },
} as const

interface AdminUserWithRoles {
  id: number
  email: string
  name: string
  firstName: string
  middleName: string | null
  lastName: string
  company: string | null
  passwordResetToken: string | null
  passwordResetExpiresAt: Date | null
  activationPending: boolean
  userGroupMemberships: {
    group: {
      id: number
      name: string
      description: string | null
    }
  }[]
}

export function mapAdminUser(user: AdminUserWithRoles): AdminUserSummary {
  return {
    id: user.id.toString(),
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    company: user.company,
    activationStatus:
      user.activationPending ||
      (user.passwordResetToken !== null &&
        user.passwordResetExpiresAt !== null &&
        user.passwordResetExpiresAt > new Date())
        ? 'PENDING'
        : 'ACTIVE',
    groups: user.userGroupMemberships.map((membership) => ({
      id: membership.group.id.toString(),
      name: membership.group.name,
      description: membership.group.description,
    })),
  }
}
