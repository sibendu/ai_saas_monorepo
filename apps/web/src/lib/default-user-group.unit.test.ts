import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  groupUpsert: vi.fn(),
  roleFindUnique: vi.fn(),
  groupRoleUpsert: vi.fn(),
  membershipCreateMany: vi.fn(),
}))

vi.mock('./prisma', () => ({
  prisma: {
    userGroup: { upsert: mocks.groupUpsert },
    role: { findUnique: mocks.roleFindUnique },
    groupRole: { upsert: mocks.groupRoleUpsert },
    userGroupMember: { createMany: mocks.membershipCreateMany },
  },
}))

import { assignNewUserToGroups } from './default-user-group'

describe('default user group', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates the General group membership and baseline role when no group is selected', async () => {
    mocks.groupUpsert.mockResolvedValue({ id: 11 })
    mocks.roleFindUnique.mockResolvedValue({ id: 4 })

    await assignNewUserToGroups(8)

    expect(mocks.groupUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { name: 'General' },
    }))
    expect(mocks.groupRoleUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { groupId_roleId: { groupId: 11, roleId: 4 } },
    }))
    expect(mocks.membershipCreateMany).toHaveBeenCalledWith({
      data: [{ customerId: 8, groupId: 11 }],
    })
  })

  it('uses selected groups without adding General', async () => {
    await assignNewUserToGroups(8, [3, 7])

    expect(mocks.groupUpsert).not.toHaveBeenCalled()
    expect(mocks.membershipCreateMany).toHaveBeenCalledWith({
      data: [
        { customerId: 8, groupId: 3 },
        { customerId: 8, groupId: 7 },
      ],
    })
  })
})
