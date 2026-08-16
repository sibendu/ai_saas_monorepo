export const DEFAULT_APP_NAME = 'SaaS Platform'

export function resolveAppName(appName: string | undefined): string {
  return appName?.trim() || DEFAULT_APP_NAME
}

export function getConfiguredAppName(): string {
  return resolveAppName(process.env.APP_NAME)
}
