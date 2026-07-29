import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createRolesRouter, resolveAllowedModules } from '../../routes/roles';

function createRolesTestApp(prismaClient: unknown) {
  const app = express();
  app.use(express.json());
  app.use('/api', createRolesRouter(prismaClient as never));
  return app;
}

describe('roles route', () => {
  it('returns 400 when email is missing', async () => {
    const app = createRolesTestApp({
      userRole: {
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
        role: {
          id: 1,
          name: 'Sales',
          description: 'Sales access',
          modules: [
            {
              module: {
                id: 10,
                label: 'CRM',
                icon: 'users',
                href: null,
              },
              subModule: {
                id: 20,
                label: 'Leads',
                icon: 'users',
                href: '/leads',
              },
            },
          ],
        },
      },
    ]);
    const app = createRolesTestApp({
      userRole: {
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
                label: 'CRM',
                icon: 'users',
                href: null,
              },
              subModule: {
                id: 20,
                label: 'Leads',
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
                label: 'CRM',
                icon: 'users',
                href: null,
              },
              subModule: {
                id: 20,
                label: 'Leads',
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
});
