import fs from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import type { ApiResponse } from '@saas/shared-types'

import { getAdminAuthorization } from '@/lib/admin-auth'
import {
  availableThemeStyles,
  getConfiguredTheme,
  isAvailableThemeName,
  ThemeName,
} from '@/config/theme'

interface AdminStyleData {
  activeStyle: ThemeName
  styles: typeof availableThemeStyles
}

interface AdminStyleMutationRequest {
  style: ThemeName
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
  const candidates = [
    path.join(workspaceRoot, '.env'),
    path.join(workspaceRoot, 'apps', 'web', '.env'),
  ]

  return candidates.filter((candidate, index) => {
    if (candidates.indexOf(candidate) !== index) {
      return false
    }

    if (index === 0) {
      return true
    }

    try {
      return existsSync(candidate)
    } catch {
      return false
    }
  })
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

async function persistStyleToEnv(style: ThemeName) {
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

      await fs.writeFile(envPath, upsertEnvValue(envContents, 'STYLE', style), 'utf8')
    })
  )
}

function styleData(): AdminStyleData {
  return {
    activeStyle: getConfiguredTheme(),
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

    const style = typeof body.style === 'string' ? body.style.trim().toLowerCase() : ''

    if (!isAvailableThemeName(style)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Style is not available' },
        { status: 400 }
      )
    }

    process.env.STYLE = style
    await persistStyleToEnv(style)

    return NextResponse.json<ApiResponse<AdminStyleData>>({
      success: true,
      data: styleData(),
      message: 'Style applied successfully',
    })
  } catch (error) {
    console.error('Admin style update error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to apply style' },
      { status: 500 }
    )
  }
}
