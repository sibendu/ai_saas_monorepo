const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const { PrismaClient, RegistrationType } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const roles = [
  ['Admin', 'Full access to all modules and settings'],
  ['User', 'Default application user access'],
  ['Sales', 'CRM and reporting access for sales teams'],
  ['CRM', 'Customer relationship workspace access'],
  ['Marketing', 'Campaign reporting and dashboard access'],
]

const modules = [
  {
    label: 'CRM',
    displayOrder: 2,
    icon: 'users',
    href: '/customers',
    subModules: [
      { label: 'CRM Dashboard', displayOrder: 1, icon: 'dashboard', href: '/customers/dashboard' },
      { label: 'Contacts', displayOrder: 2, icon: 'users', href: '/customers' },
      { label: 'Leads', displayOrder: 3, icon: 'workspace', href: '/customers/leads' },
    ],
  },
  {
    label: 'Reporting',
    displayOrder: 3,
    icon: 'chart',
    href: '/reports',
    subModules: [
      { label: 'Reporting Overview', displayOrder: 1, icon: 'dashboard', href: '/reports' },
      { label: 'Charts', displayOrder: 2, icon: 'chart', href: '/reports/charts' },
    ],
  },
  {
    label: 'Settings',
    displayOrder: 4,
    icon: 'settings',
    href: '/preferences',
    subModules: [{ label: 'Preferences', displayOrder: 1, icon: 'profile', href: '/preferences' }],
  },
  {
    label: 'Home',
    displayOrder: 1,
    icon: 'dashboard',
    href: '/home',
    subModules: [],
  },
  {
    label: 'Admin',
    displayOrder: 5,
    icon: 'settings',
    href: '/admin/roles',
    subModules: [
      { label: 'Roles', displayOrder: 1, icon: 'settings', href: '/admin/roles' },
      { label: 'Users', displayOrder: 2, icon: 'users', href: '/admin/users' },
      { label: 'Groups', displayOrder: 3, icon: 'users', href: '/admin/groups' },
      { label: 'Modules', displayOrder: 4, icon: 'workspace', href: '/admin/modules' },
      { label: 'Role-Module', displayOrder: 5, icon: 'workspace', href: '/admin/role-module' },
      { label: 'Style', displayOrder: 6, icon: 'settings', href: '/admin/style' },
      { label: 'Logs', displayOrder: 7, icon: 'workspace', href: '/admin/logs' },
    ],
  },
]

const roleModuleAccess = {
  Admin: {
    CRM: ['CRM Dashboard', 'Contacts', 'Leads'],
    Home: [],
    Reporting: ['Reporting Overview', 'Charts'],
    Settings: ['Preferences'],
    Admin: ['Roles', 'Users', 'Groups', 'Modules', 'Role-Module', 'Style', 'Logs'],
  },
  User: {
    Home: [],
    Settings: ['Preferences'],
  },
  Sales: {
    CRM: ['CRM Dashboard', 'Contacts', 'Leads'],
    Home: [],
    Reporting: ['Reporting Overview'],
  },
  CRM: {
    CRM: ['CRM Dashboard', 'Contacts', 'Leads'],
    Home: [],
  },
  Marketing: {
    Home: [],
    Reporting: ['Reporting Overview', 'Charts'],
  },
}

const testUsers = [
  {
    email: 'admin@example.com',
    name: 'Admin User',
    company: 'SaaS Foundation',
    roles: ['Admin'],
  },
  {
    email: 'sales@example.com',
    name: 'Sales User',
    company: 'SaaS Foundation',
    roles: ['Sales'],
  },
  {
    email: 'crm@example.com',
    name: 'CRM User',
    company: 'SaaS Foundation',
    roles: ['CRM'],
  },
  {
    email: 'marketing@example.com',
    name: 'Marketing User',
    company: 'SaaS Foundation',
    roles: ['Marketing'],
  },
  {
    email: 'user@example.com',
    name: 'Default User',
    company: 'SaaS Foundation',
    roles: ['User'],
  },
]

function splitName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const firstName = (parts[0] || 'User').slice(0, 40)
  const lastName = (parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || 'User').slice(0, 40)

  return {
    firstName,
    middleName: null,
    lastName,
  }
}

async function upsertRoles() {
  for (const [name, description] of roles) {
    await prisma.role.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    })
  }
}

async function upsertModules() {
  for (const moduleData of modules) {
    const moduleRecord = await prisma.module.upsert({
      where: { label: moduleData.label },
      update: {
        displayOrder: moduleData.displayOrder,
        href: moduleData.href,
        icon: moduleData.icon,
      },
      create: {
        displayOrder: moduleData.displayOrder,
        href: moduleData.href,
        icon: moduleData.icon,
        label: moduleData.label,
      },
    })

    for (const subModule of moduleData.subModules) {
      await prisma.subModule.upsert({
        where: {
          moduleId_label: {
            label: subModule.label,
            moduleId: moduleRecord.id,
          },
        },
        update: {
          displayOrder: subModule.displayOrder,
          href: subModule.href,
          icon: subModule.icon,
        },
        create: {
          href: subModule.href,
          displayOrder: subModule.displayOrder,
          icon: subModule.icon,
          label: subModule.label,
          moduleId: moduleRecord.id,
        },
      })

      await prisma.module.upsert({
        where: { label: subModule.label },
        update: {
          href: subModule.href,
          displayOrder: subModule.displayOrder,
          icon: subModule.icon,
          parentModuleId: moduleRecord.id,
        },
        create: {
          href: subModule.href,
          displayOrder: subModule.displayOrder,
          icon: subModule.icon,
          label: subModule.label,
          parentModuleId: moduleRecord.id,
        },
      })
    }
  }
}

async function findModule(label) {
  const moduleRecord = await prisma.module.findUnique({
    where: { label },
    include: { subModules: true },
  })

  if (!moduleRecord) {
    throw new Error(`Missing seeded module: ${label}`)
  }

  return moduleRecord
}

async function findRole(name) {
  const role = await prisma.role.findUnique({ where: { name } })

  if (!role) {
    throw new Error(`Missing seeded role: ${name}`)
  }

  return role
}

async function ensureRoleModule(roleId, moduleId, subModuleId = null) {
  const existingLink = await prisma.roleModule.findFirst({
    where: {
      moduleId,
      roleId,
      subModuleId,
    },
  })

  if (existingLink) {
    return existingLink
  }

  return prisma.roleModule.create({
    data: {
      moduleId,
      roleId,
      subModuleId,
    },
  })
}

async function seedRoleModuleAccess() {
  for (const [roleName, moduleAccess] of Object.entries(roleModuleAccess)) {
    const role = await findRole(roleName)

    for (const [moduleLabel, subModuleLabels] of Object.entries(moduleAccess)) {
      const moduleRecord = await findModule(moduleLabel)
      await ensureRoleModule(role.id, moduleRecord.id)

      for (const subModuleLabel of subModuleLabels) {
        const subModule = moduleRecord.subModules.find((item) => item.label === subModuleLabel)

        if (!subModule) {
          throw new Error(`Missing seeded sub-module: ${moduleLabel} / ${subModuleLabel}`)
        }

        await ensureRoleModule(role.id, moduleRecord.id, subModule.id)
      }
    }
  }
}

async function seedUsers() {
  const password = await bcrypt.hash('Password123!', 12)

  for (const user of testUsers) {
    const structuredName = splitName(user.name)
    const existingCustomer = await prisma.customer.findFirst({
      where: { email: user.email },
    })
    const customer = existingCustomer
      ? await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            company: user.company,
            firstName: structuredName.firstName,
            middleName: structuredName.middleName,
            lastName: structuredName.lastName,
            name: user.name,
          },
        })
      : await prisma.customer.create({
          data: {
            company: user.company,
            email: user.email,
            firstName: structuredName.firstName,
            middleName: structuredName.middleName,
            lastName: structuredName.lastName,
            name: user.name,
            password,
            registrationType: RegistrationType.DIRECT,
          },
        })

    for (const roleName of user.roles) {
      const role = await findRole(roleName)
      const group = await prisma.userGroup.upsert({
        where: { name: `${roleName} Group` },
        update: {
          description: `Default group for ${roleName} role access`,
        },
        create: {
          name: `${roleName} Group`,
          description: `Default group for ${roleName} role access`,
        },
      })

      await prisma.groupRole.upsert({
        where: {
          groupId_roleId: {
            groupId: group.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          groupId: group.id,
          roleId: role.id,
        },
      })

      await prisma.userGroupMember.upsert({
        where: {
          groupId_customerId: {
            groupId: group.id,
            customerId: customer.id,
          },
        },
        update: {},
        create: {
          groupId: group.id,
          customerId: customer.id,
        },
      })
    }
  }
}

async function main() {
  await upsertRoles()
  await upsertModules()
  await seedRoleModuleAccess()
  await seedUsers()
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
