import { prisma } from './prisma'

export const DEFAULT_USER_GROUP_NAME = 'General'

/**
 * Adds a newly created user to the supplied groups, or to the built-in General
 * group when no group was chosen. General also carries the baseline User role.
 */
export async function assignNewUserToGroups(
  customerId: number,
  groupIds: number[] = [],
): Promise<void> {
  const resolvedGroupIds = groupIds.length > 0 ? groupIds : [await ensureGeneralGroup()]

  await prisma.userGroupMember.createMany({
    data: resolvedGroupIds.map((groupId) => ({ customerId, groupId })),
  })
}

async function ensureGeneralGroup(): Promise<number> {
  const generalGroup = await prisma.userGroup.upsert({
    where: { name: DEFAULT_USER_GROUP_NAME },
    update: {},
    create: {
      name: DEFAULT_USER_GROUP_NAME,
      description: 'Default group for new users',
    },
  })

  const userRole = await prisma.role.findUnique({
    where: { name: 'User' },
    select: { id: true },
  })
  if (userRole) {
    await prisma.groupRole.upsert({
      where: {
        groupId_roleId: { groupId: generalGroup.id, roleId: userRole.id },
      },
      update: {},
      create: { groupId: generalGroup.id, roleId: userRole.id },
    })
  }

  return generalGroup.id
}
