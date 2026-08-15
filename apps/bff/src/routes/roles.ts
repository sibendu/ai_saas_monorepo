import { Router, Request, Response } from 'express';
import { AllowedModule, Role, UserRolesResponse } from '@saas/shared-types';

interface GroupRoleWithAccess {
  role: {
    id: number;
    name: string;
    description: string | null;
    modules: Array<{
      module: {
        id: number;
        parentModuleId: number | null;
        label: string;
        displayOrder: number;
        icon: string | null;
        href: string | null;
        parentModule: {
          id: number;
          parentModuleId: number | null;
          label: string;
          displayOrder: number;
          icon: string | null;
          href: string | null;
        } | null;
      };
      subModule: {
        id: number;
        label: string;
        displayOrder: number;
        icon: string | null;
        href: string;
      } | null;
    }>;
  };
}

interface UserGroupMembershipWithAccess {
  group: {
    roles: GroupRoleWithAccess[];
  };
}

interface ConfiguredModule {
  id: number;
  parentModuleId: number | null;
  label: string;
  displayOrder: number;
  icon: string | null;
  href: string | null;
  childModules: Array<{
    id: number;
    label: string;
    displayOrder: number;
    icon: string | null;
    href: string | null;
  }>;
  subModules: Array<{
    id: number;
    label: string;
    displayOrder: number;
    icon: string | null;
    href: string;
  }>;
}

interface RolesPrismaClient {
  module: {
    findMany(args: {
      orderBy: Array<{
        displayOrder?: 'asc' | 'desc';
        label?: 'asc' | 'desc';
      }>;
      include: {
        childModules: {
          orderBy: Array<{
            displayOrder?: 'asc' | 'desc';
            label?: 'asc' | 'desc';
          }>;
        };
        subModules: {
          orderBy: Array<{
            displayOrder?: 'asc' | 'desc';
            label?: 'asc' | 'desc';
          }>;
        };
      };
    }): Promise<unknown[]>;
  };
  userGroupMember: {
    findMany(args: {
      where: {
        customer: {
          email: string;
        };
      };
      include: {
        group: {
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    modules: {
                      orderBy: Array<{
                        moduleId?: 'asc' | 'desc';
                        subModuleId?: 'asc' | 'desc';
                      }>;
                      include: {
                        module: {
                          include: {
                            parentModule: true;
                          };
                        };
                        subModule: true;
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    }): Promise<unknown[]>;
  };
}

async function getRolesPrismaClient(): Promise<RolesPrismaClient> {
  const { getPrismaClient } = await import('../lib/prisma');
  return getPrismaClient();
}

function toSharedRole(role: GroupRoleWithAccess['role']): Role {
  return {
    id: role.id.toString(),
    name: role.name,
    description: role.description,
  };
}

function compareByDisplayOrder(
  first: { displayOrder?: number; label: string },
  second: { displayOrder?: number; label: string }
): number {
  const firstOrder = first.displayOrder ?? Number.MAX_SAFE_INTEGER;
  const secondOrder = second.displayOrder ?? Number.MAX_SAFE_INTEGER;

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return first.label.localeCompare(second.label);
}

function sortAllowedModules(modules: AllowedModule[]): AllowedModule[] {
  const sortedModules = [...modules].sort(compareByDisplayOrder);

  for (const module of sortedModules) {
    module.subModules.sort(compareByDisplayOrder);
  }

  return sortedModules;
}

export function resolveAllConfiguredModules(configuredModules: ConfiguredModule[]): AllowedModule[] {
  return sortAllowedModules(
    configuredModules
      .filter((module) => module.parentModuleId === null)
      .map((module) => {
        const childModules =
          module.childModules.length > 0
            ? module.childModules
                .filter((childModule) => childModule.href)
                .map((childModule) => ({
                  id: childModule.id.toString(),
                  label: childModule.label,
                  displayOrder: childModule.displayOrder,
                  icon: childModule.icon,
                  href: childModule.href ?? '',
                }))
            : module.subModules.map((subModule) => ({
                id: subModule.id.toString(),
                label: subModule.label,
                displayOrder: subModule.displayOrder,
                icon: subModule.icon,
                href: subModule.href,
              }));

        return {
          id: module.id.toString(),
          label: module.label,
          displayOrder: module.displayOrder,
          icon: module.icon,
          href: module.href,
          subModules: childModules,
        };
      })
  );
}

export function resolveAllowedModules(userRoles: GroupRoleWithAccess[]): AllowedModule[] {
  const modulesById = new Map<string, AllowedModule>();
  const subModuleIdsByModuleId = new Map<string, Set<string>>();

  for (const userRole of userRoles) {
    for (const roleModule of userRole.role.modules) {
      const parentModule = roleModule.module.parentModule;
      const isChildModule = roleModule.module.parentModuleId !== null && parentModule;
      const menuModule = isChildModule ? parentModule : roleModule.module;
      const moduleId = menuModule.id.toString();
      const existingModule = modulesById.get(moduleId);

      if (!existingModule) {
        modulesById.set(moduleId, {
          id: moduleId,
          label: menuModule.label,
          displayOrder: menuModule.displayOrder,
          icon: menuModule.icon,
          href: menuModule.href,
          subModules: [],
        });
        subModuleIdsByModuleId.set(moduleId, new Set<string>());
      }

      if (isChildModule) {
        const childModuleId = roleModule.module.id.toString();
        const seenSubModules = subModuleIdsByModuleId.get(moduleId);

        if (!seenSubModules?.has(childModuleId) && roleModule.module.href) {
          modulesById.get(moduleId)?.subModules.push({
            id: childModuleId,
            label: roleModule.module.label,
            displayOrder: roleModule.module.displayOrder,
            icon: roleModule.module.icon,
            href: roleModule.module.href,
          });
          seenSubModules?.add(childModuleId);
        }
      } else if (roleModule.subModule) {
        const subModuleId = roleModule.subModule.id.toString();
        const seenSubModules = subModuleIdsByModuleId.get(moduleId);

        if (!seenSubModules?.has(subModuleId)) {
          modulesById.get(moduleId)?.subModules.push({
            id: subModuleId,
            label: roleModule.subModule.label,
            displayOrder: roleModule.subModule.displayOrder,
            icon: roleModule.subModule.icon,
            href: roleModule.subModule.href,
          });
          seenSubModules?.add(subModuleId);
        }
      }
    }
  }

  return sortAllowedModules(Array.from(modulesById.values()));
}

export function createRolesRouter(prismaClient?: RolesPrismaClient) {
  const router = Router();

  router.get('/user/roles', async (req: Request, res: Response) => {
    try {
      const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : '';

      if (!email) {
        return res.status(400).json({
          success: false,
          roles: [],
          modules: [],
          error: 'email is required',
        } satisfies UserRolesResponse);
      }

      const client = prismaClient ?? (await getRolesPrismaClient());
      const userGroupMemberships = (await client.userGroupMember.findMany({
        where: {
          customer: {
            email,
          },
        },
        include: {
          group: {
            include: {
              roles: {
                include: {
                  role: {
                    include: {
                      modules: {
                        orderBy: [{ moduleId: 'asc' }, { subModuleId: 'asc' }],
                        include: {
                          module: {
                            include: {
                              parentModule: true,
                            },
                          },
                          subModule: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })) as UserGroupMembershipWithAccess[];
      const uniqueRoleIds = new Set<number>();
      const userRoles = userGroupMemberships.flatMap((membership) => membership.group.roles);
      const uniqueUserRoles = userRoles.filter((groupRole) => {
        if (uniqueRoleIds.has(groupRole.role.id)) {
          return false;
        }

        uniqueRoleIds.add(groupRole.role.id);
        return true;
      });
      const roles = uniqueUserRoles.map((userRole) => toSharedRole(userRole.role));
      const hasAdminRole = roles.some((role) => role.name.toLowerCase() === 'admin');
      const modules = hasAdminRole
        ? resolveAllConfiguredModules(
            (await client.module.findMany({
              orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
              include: {
                childModules: {
                  orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
                },
                subModules: {
                  orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
                },
              },
            })) as ConfiguredModule[]
          )
        : resolveAllowedModules(uniqueUserRoles);

      res.json({
        success: true,
        roles,
        modules,
      } satisfies UserRolesResponse);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      res.status(500).json({
        success: false,
        roles: [],
        modules: [],
        error: 'Failed to fetch user roles',
      } satisfies UserRolesResponse);
    }
  });

  return router;
}

export default createRolesRouter();
