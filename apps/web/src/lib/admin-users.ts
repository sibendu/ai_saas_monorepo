import { AdminUserSummary } from '@saas/shared-types'

export const adminUserSelect = {
  id: true,
  email: true,
  name: true,
  company: true,
  userRoles: {
    select: {
      role: {
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
  company: string | null
  userRoles: {
    role: {
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
    company: user.company,
    roles: user.userRoles.map((userRole) => ({
      id: userRole.role.id.toString(),
      name: userRole.role.name,
      description: userRole.role.description,
    })),
  }
}
