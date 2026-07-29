const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const { PrismaClient, RegistrationType } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const roles = [
  ['Admin', 'Full access to all modules and settings'],
  ['User', 'Default application user access'],
  ['Sales', 'CRM and reporting access for sales teams'],
  ['Marketing', 'Campaign reporting and dashboard access'],
]

const modules = [
  {
    label: 'CRM',
    icon: 'users',
    href: '/customers',
    subModules: [
      { label: 'CRM Dashboard', icon: 'dashboard', href: '/customers/dashboard' },
      { label: 'Contacts', icon: 'users', href: '/customers' },
      { label: 'Leads', icon: 'workspace', href: '/customers/leads' },
    ],
  },
  {
    label: 'Reporting',
    icon: 'chart',
    href: '/reports',
    subModules: [
      { label: 'Reporting Overview', icon: 'dashboard', href: '/reports' },
      { label: 'Charts', icon: 'chart', href: '/reports/charts' },
    ],
  },
  {
    label: 'Settings',
    icon: 'settings',
    href: '/preferences',
    subModules: [{ label: 'Preferences', icon: 'profile', href: '/preferences' }],
  },
  {
    label: 'Dashboard',
    icon: 'dashboard',
    href: '/dashboard',
    subModules: [],
  },
]

const roleModuleAccess = {
  Admin: {
    CRM: ['CRM Dashboard', 'Contacts', 'Leads'],
    Dashboard: [],
    Reporting: ['Reporting Overview', 'Charts'],
    Settings: ['Preferences'],
  },
  User: {
    Dashboard: [],
    Settings: ['Preferences'],
  },
  Sales: {
    CRM: ['CRM Dashboard', 'Contacts', 'Leads'],
    Dashboard: [],
    Reporting: ['Reporting Overview'],
  },
  Marketing: {
    Dashboard: [],
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
        href: moduleData.href,
        icon: moduleData.icon,
      },
      create: {
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
          href: subModule.href,
          icon: subModule.icon,
        },
        create: {
          href: subModule.href,
          icon: subModule.icon,
          label: subModule.label,
          moduleId: moduleRecord.id,
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
    const existingCustomer = await prisma.customer.findFirst({
      where: { email: user.email },
    })
    const customer = existingCustomer
      ? await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            company: user.company,
            name: user.name,
          },
        })
      : await prisma.customer.create({
          data: {
            company: user.company,
            email: user.email,
            name: user.name,
            password,
            registrationType: RegistrationType.DIRECT,
          },
        })

    for (const roleName of user.roles) {
      const role = await findRole(roleName)

      await prisma.userRole.upsert({
        where: {
          customerId_roleId: {
            customerId: customer.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          customerId: customer.id,
          roleId: role.id,
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
