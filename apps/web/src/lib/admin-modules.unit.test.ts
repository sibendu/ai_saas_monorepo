import { describe, expect, it } from 'vitest'

import {
  mapAdminModule,
  mapAdminModules,
  mapRoleModuleMapping,
  moduleWithSubModulesSelect,
  normalizePositiveIntegerStringIds,
  parsePositiveIntegerString,
} from './admin-modules'

describe('admin module helpers', () => {
  it('selects only public module summary fields with sorted sub-modules', () => {
    expect(moduleWithSubModulesSelect).toEqual({
      id: true,
      label: true,
      icon: true,
      href: true,
      subModules: {
        orderBy: {
          label: 'asc',
        },
        select: {
          id: true,
          moduleId: true,
          label: true,
          icon: true,
          href: true,
        },
      },
    })
  })

  it('maps module summaries without leaking database-only fields', () => {
    const moduleRecord = {
      id: 2,
      label: 'CRM',
      icon: 'Users',
      href: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      roleLinks: [{ id: 99 }],
      subModules: [
        {
          id: 11,
          moduleId: 2,
          label: 'Contacts',
          icon: null,
          href: '/crm/contacts',
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ],
    }

    expect(mapAdminModule(moduleRecord)).toEqual({
      id: '2',
      label: 'CRM',
      icon: 'Users',
      href: null,
      subModules: [
        {
          id: '11',
          moduleId: '2',
          label: 'Contacts',
          icon: null,
          href: '/crm/contacts',
        },
      ],
    })
    expect(mapAdminModule(moduleRecord)).not.toHaveProperty('createdAt')
    expect(mapAdminModule(moduleRecord)).not.toHaveProperty('roleLinks')
    expect(mapAdminModule(moduleRecord).subModules[0]).not.toHaveProperty('updatedAt')
  })

  it('preserves query order when mapping module lists', () => {
    const modules = [
      {
        id: 1,
        label: 'Billing',
        icon: null,
        href: '/billing',
        subModules: [],
      },
      {
        id: 2,
        label: 'CRM',
        icon: null,
        href: '/crm',
        subModules: [],
      },
    ]

    expect(mapAdminModules(modules).map((moduleSummary) => moduleSummary.label)).toEqual([
      'Billing',
      'CRM',
    ])
  })

  it('separates top-level modules from sub-module mappings as string ids', () => {
    expect(
      mapRoleModuleMapping(7, [
        { moduleId: 2, subModuleId: null },
        { moduleId: 3, subModuleId: 12 },
        { moduleId: 3, subModuleId: 13 },
      ])
    ).toEqual({
      roleId: '7',
      moduleIds: ['2'],
      subModuleIds: ['12', '13'],
    })
  })

  it('parses only positive safe integer strings', () => {
    expect(parsePositiveIntegerString('1')).toBe(1)
    expect(parsePositiveIntegerString('9007199254740991')).toBe(Number.MAX_SAFE_INTEGER)

    for (const invalidValue of [
      1,
      '',
      ' ',
      '0',
      '-1',
      '1.5',
      '01',
      '9007199254740992',
    ]) {
      expect(parsePositiveIntegerString(invalidValue)).toBeNull()
    }
  })

  it('normalizes arrays of unique positive integer strings', () => {
    expect(normalizePositiveIntegerStringIds(['1', '2'])).toEqual([1, 2])
    expect(normalizePositiveIntegerStringIds([])).toEqual([])

    for (const invalidIds of [
      '1',
      [1],
      ['1', '1'],
      ['0'],
      ['-1'],
      ['1.5'],
      ['01'],
      ['9007199254740992'],
    ]) {
      expect(normalizePositiveIntegerStringIds(invalidIds)).toBeNull()
    }
  })
})
