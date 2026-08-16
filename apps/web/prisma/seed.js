require('../../../scripts/load-root-env')

const prismaClientPackage = require('@prisma/client')
const { PrismaClient } = prismaClientPackage
const RegistrationType = prismaClientPackage.RegistrationType ?? {
  GOOGLE: 'GOOGLE',
  GITHUB: 'GITHUB',
  DIRECT: 'DIRECT',
}
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const roles = [
  ['Admin', 'Full access to all modules and settings'],
  ['User', 'Default application user access'],
  ['CRM', 'CRM Role'],
  ['Marketing', 'Marketing Role'],
  ['Sales', 'Sales Role'],
]

const modules = [
  {
    label: 'Home',
    displayOrder: 1,
    icon: 'dashboard',
    href: '/dashboard',
    subModules: [],
  },
  {
    label: 'Admin',
    displayOrder: 2,
    icon: 'settings',
    href: '/admin/roles',
    subModules: [
      { label: 'Roles', displayOrder: 1, childDisplayOrder: 5, icon: 'settings', href: '/admin/roles' },
      { label: 'Users', displayOrder: 2, icon: 'users', href: '/admin/users' },
      { label: 'Groups', displayOrder: 3, icon: 'users', href: '/admin/groups' },
      { label: 'Modules', displayOrder: 4, icon: 'workspace', href: '/admin/modules' },
      { label: 'Role-Module', displayOrder: 5, childDisplayOrder: 6, icon: 'workspace', href: '/admin/role-module' },
      { label: 'Style', displayOrder: 6, childDisplayOrder: 7, icon: 'settings', href: '/admin/style' },
      { label: 'Logs', displayOrder: 7, childDisplayOrder: 8, icon: 'workspace', href: '/admin/logs' },
    ],
  },
  {
    label: 'CRM',
    displayOrder: 3,
    icon: 'users',
    href: '/customers',
    subModules: [
      { label: 'CRM Dashboard', displayOrder: 1, childDisplayOrder: 4, icon: 'dashboard', href: '/customers/dashboard' },
      { label: 'Contacts', childLabel: 'Customer', displayOrder: 2, icon: 'users', href: '/customers' },
      { label: 'Leads', displayOrder: 3, icon: 'workspace', href: '/customers/leads' },
    ],
  },
  {
    label: 'Sales',
    displayOrder: 4,
    icon: 'chart',
    href: '/reports',
    subModules: [
      { label: 'Reporting Overview', childLabel: 'Sales Dashboard', displayOrder: 1, icon: 'dashboard', href: '/reports' },
      { label: 'Charts', childLabel: 'Revenue', displayOrder: 2, icon: 'chart', href: '/reports/charts' },
    ],
  },
  {
    label: 'Marketing',
    displayOrder: 5,
    icon: null,
    href: '/marketing',
    subModules: [
      { label: 'Campaign', displayOrder: 1, icon: null, href: '/campaign', createSubModule: false },
    ],
  },
  {
    label: 'Preference',
    displayOrder: 6,
    icon: 'settings',
    href: '/preferences',
    subModules: [
      { label: 'Preferences', childLabel: 'Profile', displayOrder: 1, icon: 'profile', href: '/preferences' },
      { label: 'Reset Password', displayOrder: 2, icon: 'profile', href: '/change-password' },
    ],
  },
]

const roleModuleAccess = {
  Admin: {
    Home: [],
    Admin: ['Roles', 'Users', 'Groups', 'Modules', 'Role-Module', 'Style', 'Logs'],
    Roles: [],
    Users: [],
    Groups: [],
    Modules: [],
    'Role-Module': [],
    Style: [],
    Logs: [],
    CRM: ['CRM Dashboard', 'Contacts', 'Leads'],
    'CRM Dashboard': [],
    Customer: [],
    Leads: [],
    Sales: ['Reporting Overview', 'Charts'],
    'Sales Dashboard': [],
    Revenue: [],
    Marketing: [],
    Campaign: [],
    Preference: ['Preferences', 'Reset Password'],
    Profile: [],
  },
  User: {
    Home: [],
    Profile: [],
    Preference: ['Preferences', 'Reset Password'],
  },
  Sales: {
    Home: [],
    Profile: [],
    Sales: [],
    'Sales Dashboard': [],
    Revenue: [],
    Preference: ['Reset Password'],
  },
  CRM: {
    Home: [],
    Profile: [],
    Customer: [],
    CRM: [],
    Leads: [],
    'CRM Dashboard': [],
    Preference: ['Reset Password'],
  },
  Marketing: {
    Home: [],
    Profile: [],
    Marketing: [],
    Campaign: [],
    Preference: ['Reset Password'],
  },
}

const groupRoleAccess = [
  {
    name: 'Admin Group',
    description: 'Migrated group for Admin role access',
    roles: ['Admin'],
    members: ['admin@example.com', 'sibendu.das@gmail.com'],
  },
  {
    name: 'General',
    description: 'Default group for new users',
    roles: ['User'],
    members: ['user@example.com'],
  },
  {
    name: 'Sales Group',
    description: 'Sales team',
    roles: ['Sales'],
    members: ['sales@example.com'],
  },
  {
    name: 'CRM Group',
    description: 'CRM Team',
    roles: ['CRM'],
    members: ['crm@example.com'],
  },
  {
    name: 'Marketing Group',
    description: 'Marketing Team',
    roles: ['Marketing'],
    members: ['marketing@example.com'],
  },
]

const staleSeedModuleLabels = [
  'Contacts',
  'Reporting Overview',
  'Charts',
  'Preferences',
  'Reporting',
  'Settings',
]

const testUsers = [
  {
    email: 'sibendu.das@gmail.com',
    name: 'Sib Das',
    firstName: 'Sib',
    middleName: null,
    lastName: 'Das',
    company: null,
    roles: [],
  },
  {
    email: 'admin@example.com',
    name: 'Admin User',
    firstName: 'Admin',
    middleName: null,
    lastName: 'User',
    company: 'SaaS Foundation',
    roles: [],
  },
  {
    email: 'sales@example.com',
    name: 'Sales User',
    firstName: 'Sales',
    middleName: null,
    lastName: 'User',
    company: 'SaaS Foundation',
    roles: [],
  },
  {
    email: 'crm@example.com',
    name: 'CRM User',
    firstName: 'CRM',
    middleName: null,
    lastName: 'User',
    company: 'SaaS Foundation',
    roles: [],
  },
  {
    email: 'marketing@example.com',
    name: 'Marketing User',
    firstName: 'Marketing',
    middleName: null,
    lastName: 'User',
    company: 'SaaS Foundation',
    roles: [],
  },
  {
    email: 'user@example.com',
    name: 'General User',
    firstName: 'Ram',
    middleName: null,
    lastName: 'Mukherjee',
    company: 'General Company',
    roles: [],
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
  const configuredLabels = new Set(
    modules.flatMap((moduleData) => [
      moduleData.label,
      ...moduleData.subModules.map((subModule) => subModule.childLabel ?? subModule.label),
    ])
  )

  await prisma.module.updateMany({
    where: {
      label: {
        notIn: [...configuredLabels],
      },
    },
    data: {
      parentModuleId: null,
    },
  })

  for (const moduleData of modules) {
    const moduleRecord = await prisma.module.upsert({
      where: { label: moduleData.label },
      update: {
        displayOrder: moduleData.displayOrder,
        href: moduleData.href,
        icon: moduleData.icon,
        parentModuleId: null,
      },
      create: {
        displayOrder: moduleData.displayOrder,
        href: moduleData.href,
        icon: moduleData.icon,
        label: moduleData.label,
      },
    })

    for (const subModule of moduleData.subModules) {
      if (subModule.createSubModule === false) {
        await prisma.subModule.deleteMany({
          where: {
            label: subModule.label,
            moduleId: moduleRecord.id,
          },
        })
      } else {
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
      }

      const childModuleLabel = subModule.childLabel ?? subModule.label
      const childDisplayOrder = subModule.childDisplayOrder ?? subModule.displayOrder

      await prisma.module.upsert({
        where: { label: childModuleLabel },
        update: {
          href: subModule.href,
          displayOrder: childDisplayOrder,
          icon: subModule.icon,
          parentModuleId: moduleRecord.id,
        },
        create: {
          href: subModule.href,
          displayOrder: childDisplayOrder,
          icon: subModule.icon,
          label: childModuleLabel,
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
    await prisma.roleModule.deleteMany({
      where: {
        roleId: role.id,
      },
    })

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

async function deleteStaleSeedModules() {
  for (const label of staleSeedModuleLabels) {
    await prisma.module.deleteMany({
      where: {
        label,
        childModules: {
          none: {},
        },
        roleLinks: {
          none: {},
        },
      },
    })
  }
}

async function seedUsers() {
  const password = await bcrypt.hash('abc', 12)

  for (const user of testUsers) {
    const structuredName = {
      ...splitName(user.name),
      firstName: user.firstName ?? splitName(user.name).firstName,
      middleName: user.middleName ?? null,
      lastName: user.lastName ?? splitName(user.name).lastName,
    }
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
            password,
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

    void customer
  }
}

async function seedGroupAccess() {
  for (const groupData of groupRoleAccess) {
    const group = await prisma.userGroup.upsert({
      where: { name: groupData.name },
      update: {
        description: groupData.description,
      },
      create: {
        name: groupData.name,
        description: groupData.description,
      },
    })

    await prisma.groupRole.deleteMany({
      where: {
        groupId: group.id,
      },
    })
    await prisma.userGroupMember.deleteMany({
      where: {
        groupId: group.id,
      },
    })

    for (const roleName of groupData.roles) {
      const role = await findRole(roleName)

      await prisma.groupRole.create({
        data: {
          groupId: group.id,
          roleId: role.id,
        },
      })
    }

    for (const email of groupData.members) {
      const customer = await prisma.customer.findFirst({
        where: { email },
        select: { id: true },
      })

      if (!customer) {
        throw new Error(`Missing seeded customer for group membership: ${email}`)
      }

      await prisma.userGroupMember.create({
        data: {
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
  await deleteStaleSeedModules()
  await seedUsers()
  await seedGroupAccess()
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
