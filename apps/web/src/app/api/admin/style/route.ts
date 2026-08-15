import fs from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import type { ApiResponse } from '@saas/shared-types'

import { getAdminAuthorization } from '@/lib/admin-auth'
import { getConfiguredMenuLayout, isMenuLayout, MenuLayout } from '@/config/navigation'
import {
  availableThemeStyles,
  getConfiguredTheme,
  isAvailableThemeName,
  ThemeName,
} from '@/config/theme'

interface AdminStyleData {
  activeStyle: ThemeName
  activeMenuLayout: MenuLayout
  styles: typeof availableThemeStyles
}

interface AdminStyleMutationRequest {
  style?: ThemeName
  menuLayout?: MenuLayout
}

function findWorkspaceRoot(): string {
  let currentDirectory = process.cwd()

  while (true) {
    const packageJsonPath = path.join(currentDirectory, 'package.json')

    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
          workspaces?: unknown
        }

        if (Array.isArray(packageJson.workspaces)) {
          return currentDirectory
        }
      } catch {
        // Keep walking upward if this package.json is not readable JSON.
      }
    }

    const parentDirectory = path.dirname(currentDirectory)

    if (parentDirectory === currentDirectory) {
      return process.cwd()
    }

    currentDirectory = parentDirectory
  }
}

function getEnvPaths(): string[] {
  const workspaceRoot = findWorkspaceRoot()
  return [path.join(workspaceRoot, '.env.local')]
}

async function readStyleMutationRequest(
  request: Request
): Promise<Partial<AdminStyleMutationRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminStyleMutationRequest>
  } catch {
    return null
  }
}

function upsertEnvValue(envContents: string, key: string, value: string): string {
  const lines = envContents.split(/\r?\n/)
  const lineIndex = lines.findIndex((line) => line.match(new RegExp(`^\\s*${key}\\s*=`)))
  const nextLine = `${key}=${value}`

  if (lineIndex >= 0) {
    lines[lineIndex] = nextLine
    return lines.join('\n')
  }

  const trimmedTrailingLines = [...lines]
  while (trimmedTrailingLines.length > 0 && trimmedTrailingLines.at(-1) === '') {
    trimmedTrailingLines.pop()
  }

  return [...trimmedTrailingLines, '', '# Choose Style', nextLine, ''].join('\n')
}

async function persistValuesToEnv(values: Record<string, string>) {
  const envPaths = getEnvPaths()

  await Promise.all(
    envPaths.map(async (envPath) => {
      let envContents = ''

      try {
        envContents = await fs.readFile(envPath, 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error
        }
      }

      const nextContents = Object.entries(values).reduce(
        (contents, [key, value]) => upsertEnvValue(contents, key, value),
        envContents
      )

      await fs.writeFile(envPath, nextContents, 'utf8')
    })
  )
}

function styleData(): AdminStyleData {
  return {
    activeStyle: getConfiguredTheme(),
    activeMenuLayout: getConfiguredMenuLayout(),
    styles: availableThemeStyles,
  }
}

export async function GET(): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
    )
  }

  return NextResponse.json<ApiResponse<AdminStyleData>>({
    success: true,
    data: styleData(),
  })
}

export async function PUT(request: Request): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
    )
  }

  try {
    const body = await readStyleMutationRequest(request)

    if (!body) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const style = typeof body.style === 'string' ? body.style.trim().toLowerCase() : undefined
    const menuLayout =
      typeof body.menuLayout === 'string' ? body.menuLayout.trim().toLowerCase() : undefined

    if (style === undefined && menuLayout === undefined) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Style or menu layout is required' },
        { status: 400 }
      )
    }

    if (style !== undefined && !isAvailableThemeName(style)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Style is not available' },
        { status: 400 }
      )
    }

    if (menuLayout !== undefined && !isMenuLayout(menuLayout)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Menu disposition is not available' },
        { status: 400 }
      )
    }

    const envUpdates: Record<string, string> = {}

    if (style) {
      process.env.STYLE = style
      envUpdates.STYLE = style
    }

    if (menuLayout) {
      process.env.MENU_LAYOUT = menuLayout
      envUpdates.MENU_LAYOUT = menuLayout
    }

    await persistValuesToEnv(envUpdates)

    return NextResponse.json<ApiResponse<AdminStyleData>>({
      success: true,
      data: styleData(),
      message: 'Display settings applied successfully',
    })
  } catch (error) {
    console.error('Admin style update error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to apply style' },
      { status: 500 }
    )
  }
}
