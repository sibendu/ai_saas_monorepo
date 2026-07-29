import { Router, Request, Response } from 'express';
import { AllowedModule, Role, UserRolesResponse } from '@saas/shared-types';
import { getPrismaClient } from '../lib/prisma';
import type { PrismaClient } from '../lib/prisma';

interface UserRoleWithAccess {
  role: {
    id: number;
    name: string;
    description: string | null;
    modules: Array<{
      module: {
        id: number;
        label: string;
        icon: string | null;
        href: string | null;
      };
      subModule: {
        id: number;
        label: string;
        icon: string | null;
        href: string;
      } | null;
    }>;
  };
}

function toSharedRole(role: UserRoleWithAccess['role']): Role {
  return {
    id: role.id.toString(),
    name: role.name,
    description: role.description,
  };
}

export function resolveAllowedModules(userRoles: UserRoleWithAccess[]): AllowedModule[] {
  const modulesById = new Map<string, AllowedModule>();
  const subModuleIdsByModuleId = new Map<string, Set<string>>();

  for (const userRole of userRoles) {
    for (const roleModule of userRole.role.modules) {
      const moduleId = roleModule.module.id.toString();
      const existingModule = modulesById.get(moduleId);

      if (!existingModule) {
        modulesById.set(moduleId, {
          id: moduleId,
          label: roleModule.module.label,
          icon: roleModule.module.icon,
          href: roleModule.module.href,
          subModules: [],
        });
        subModuleIdsByModuleId.set(moduleId, new Set<string>());
      }

      if (roleModule.subModule) {
        const subModuleId = roleModule.subModule.id.toString();
        const seenSubModules = subModuleIdsByModuleId.get(moduleId);

        if (!seenSubModules?.has(subModuleId)) {
          modulesById.get(moduleId)?.subModules.push({
            id: subModuleId,
            label: roleModule.subModule.label,
            icon: roleModule.subModule.icon,
            href: roleModule.subModule.href,
          });
          seenSubModules?.add(subModuleId);
        }
      }
    }
  }

  return Array.from(modulesById.values()).sort((first, second) =>
    first.label.localeCompare(second.label)
  );
}

export function createRolesRouter(prismaClient?: PrismaClient) {
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

      const client = prismaClient ?? getPrismaClient();
      const userRoles = (await client.userRole.findMany({
        where: {
          customer: {
            email,
          },
        },
        include: {
          role: {
            include: {
              modules: {
                include: {
                  module: true,
                  subModule: true,
                },
              },
            },
          },
        },
      })) as UserRoleWithAccess[];

      res.json({
        success: true,
        roles: userRoles.map((userRole) => toSharedRole(userRole.role)),
        modules: resolveAllowedModules(userRoles),
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
