'use client'

import { createContext, ReactNode, useContext } from 'react'
import { DEFAULT_APP_NAME, resolveAppName } from '@/lib/app-name'

const AppNameContext = createContext(DEFAULT_APP_NAME)

interface AppNameProviderProps {
  appName: string
  children: ReactNode
}

export function AppNameProvider({ appName, children }: AppNameProviderProps) {
  return <AppNameContext.Provider value={resolveAppName(appName)}>{children}</AppNameContext.Provider>
}

export function useAppName(): string {
  return useContext(AppNameContext)
}
