import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma', () => ({
  getPrismaClient: vi.fn(),
}));

import { createRolesRouter, resolveAllConfiguredModules, resolveAllowedModules } from '../../routes/roles';

function createRolesTestApp(prismaClient: unknown) {
  const app = express();
  app.use(express.json());
  app.use('/api', createRolesRouter(prismaClient as never));
  return app;
}

describe('roles route', () => {
  it('returns 400 when email is missing', async () => {
    const app = createRolesTestApp({
      userGroupMember: {
        findMany: vi.fn(),
      },
    });

    const response = await request(app).get('/api/user/roles');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      roles: [],
      modules: [],
      error: 'email is required',
    });
  });

  it('returns role-filtered modules for the requested user email', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        group: {
          roles: [
            {
              role: {
                id: 1,
                name: 'Sales',
                description: 'Sales access',
                modules: [
                  {
                    module: {
                      id: 10,
                      parentModuleId: null,
                      label: 'CRM',
                      displayOrder: 1,
                      icon: 'users',
                      href: null,
                      parentModule: null,
                    },
                    subModule: {
                      id: 20,
                      label: 'Leads',
                      displayOrder: 1,
                      icon: 'users',
                      href: '/leads',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
    const app = createRolesTestApp({
      userGroupMember: {
        findMany,
      },
    });

    const response = await request(app).get('/api/user/roles?email=SALES@example.com');

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customer: {
            email: 'sales@example.com',
          },
        },
      })
    );
    expect(response.body).toMatchObject({
      success: true,
      roles: [
        {
          id: '1',
          name: 'Sales',
          description: 'Sales access',
        },
      ],
      modules: [
        {
          id: '10',
          label: 'CRM',
          icon: 'users',
          href: null,
          subModules: [
            {
              id: '20',
              label: 'Leads',
              icon: 'users',
              href: '/leads',
            },
          ],
        },
      ],
    });
  });

  it('deduplicates modules and sub-modules across multiple roles', () => {
    const modules = resolveAllowedModules([
      {
        role: {
          id: 1,
          name: 'Sales',
          description: null,
          modules: [
            {
              module: {
                id: 10,
                parentModuleId: null,
                label: 'CRM',
                displayOrder: 1,
                icon: 'users',
                href: null,
                parentModule: null,
              },
              subModule: {
                id: 20,
                label: 'Leads',
                displayOrder: 1,
                icon: 'users',
                href: '/leads',
              },
            },
          ],
        },
      },
      {
        role: {
          id: 2,
          name: 'Marketing',
          description: null,
          modules: [
            {
              module: {
                id: 10,
                parentModuleId: null,
                label: 'CRM',
                displayOrder: 1,
                icon: 'users',
                href: null,
                parentModule: null,
              },
              subModule: {
                id: 20,
                label: 'Leads',
                displayOrder: 1,
                icon: 'users',
                href: '/leads',
              },
            },
          ],
        },
      },
    ] as never);

    expect(modules).toHaveLength(1);
    expect(modules[0].subModules).toHaveLength(1);
  });

  it('groups child module rows under their configured parent module in display order', () => {
    const modules = resolveAllowedModules([
      {
        role: {
          id: 1,
          name: 'Admin',
          description: null,
          modules: [
            {
              module: {
                id: 53,
                parentModuleId: 50,
                label: 'Groups',
                displayOrder: 3,
                icon: 'users',
                href: '/admin/groups',
                parentModule: {
                  id: 50,
                  parentModuleId: null,
                  label: 'Admin',
                  displayOrder: 5,
                  icon: 'settings',
                  href: null,
                },
              },
              subModule: null,
            },
            {
              module: {
                id: 51,
                parentModuleId: 50,
                label: 'Roles',
                displayOrder: 1,
                icon: 'settings',
                href: '/admin/roles',
                parentModule: {
                  id: 50,
                  parentModuleId: null,
                  label: 'Admin',
                  displayOrder: 5,
                  icon: 'settings',
                  href: null,
                },
              },
              subModule: null,
            },
          ],
        },
      },
    ]);

    expect(modules).toEqual([
      {
        id: '50',
        label: 'Admin',
        displayOrder: 5,
        icon: 'settings',
        href: null,
        subModules: [
          {
            id: '51',
            label: 'Roles',
            displayOrder: 1,
            icon: 'settings',
            href: '/admin/roles',
          },
          {
            id: '53',
            label: 'Groups',
            displayOrder: 3,
            icon: 'users',
            href: '/admin/groups',
          },
        ],
      },
    ]);
  });

  it('includes unmapped configured modules for admin full access menus', () => {
    const modules = resolveAllConfiguredModules([
      {
        id: 34,
        parentModuleId: null,
        label: 'Marketing',
        displayOrder: 5,
        icon: null,
        href: '/marketing',
        childModules: [
          {
            id: 35,
            label: 'Campaign',
            displayOrder: 1,
            icon: null,
            href: '/campaign',
          },
        ],
        subModules: [],
      },
    ]);

    expect(modules).toEqual([
      {
        id: '34',
        label: 'Marketing',
        displayOrder: 5,
        icon: null,
        href: '/marketing',
        subModules: [
          {
            id: '35',
            label: 'Campaign',
            displayOrder: 1,
            icon: null,
            href: '/campaign',
          },
        ],
      },
    ]);
  });
});
