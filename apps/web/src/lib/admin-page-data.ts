import {
  mapAdminModules,
  moduleWithSubModulesSelect,
} from "@/lib/admin-modules";
import { mapAdminUserGroup } from "@/lib/admin-user-groups";
import { adminUserSelect, mapAdminUser } from "@/lib/admin-users";
import { prisma } from "@/lib/prisma";
import {
  AdminModuleSummary,
  AdminRoleSummary,
  AdminUserSearchFilters,
  AdminUserGroupSummary,
  AdminUserSummary,
  AdminUsersData,
} from "@saas/shared-types";

interface AdminRoleWithCounts {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    groups: number;
    modules: number;
  };
}

export async function getAdminRoles(): Promise<AdminRoleSummary[]> {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          groups: true,
          modules: true,
        },
      },
    },
  });

  return roles.map((role: AdminRoleWithCounts) => ({
    id: role.id.toString(),
    name: role.name,
    description: role.description,
    groupCount: role._count.groups,
    moduleCount: role._count.modules,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  }));
}

export interface AdminUserListOptions extends AdminUserSearchFilters {
  page?: number;
  pageSize?: number;
}

function normalizePage(value: number | undefined): number {
  return Number.isInteger(value) && value && value > 0 ? value : 1;
}

function normalizePageSize(value: number | undefined): number {
  return value === 5 || value === 10 || value === 25 ? value : 10;
}

export async function getAdminUsers(
  options: AdminUserListOptions = {
    name: "",
    email: "",
    company: "",
  },
): Promise<AdminUsersData> {
  const users = await prisma.customer.findMany({
    orderBy: { email: "asc" },
    select: adminUserSelect,
  });

  const filters = {
    name: options.name.trim(),
    email: options.email.trim(),
    company: options.company.trim(),
  };
  const filteredUsers = users
    .map(mapAdminUser)
    .filter(
      (user) =>
        (!filters.name ||
          user.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.email ||
          user.email.toLowerCase().includes(filters.email.toLowerCase())) &&
        (!filters.company ||
          (user.company ?? "")
            .toLowerCase()
            .includes(filters.company.toLowerCase())),
    );
  const pageSize = normalizePageSize(options.pageSize);
  const total = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(normalizePage(options.page), totalPages);

  return {
    users: filteredUsers.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
    totalPages,
    filters,
  };
}

export async function getAdminUserGroups(): Promise<AdminUserGroupSummary[]> {
  const userGroups = await prisma.userGroup.findMany({
    orderBy: { name: "asc" },
    include: {
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: {
          role: {
            name: "asc",
          },
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  return userGroups.map(mapAdminUserGroup);
}

export async function getAdminModules(): Promise<AdminModuleSummary[]> {
  const modules = await prisma.module.findMany({
    orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    select: moduleWithSubModulesSelect,
  });

  return mapAdminModules(modules);
}
