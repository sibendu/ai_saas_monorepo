import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { AppNameProvider } from '@/components/AppNameProvider'
import { getConfiguredThemeHref } from '@/config/theme'
import { getConfiguredAppName } from '@/lib/app-name'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'SaaS Platform',
  description: 'Scalable SaaS platform with Next.js and BFF architecture',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const themeHref = getConfiguredThemeHref()
  const appName = getConfiguredAppName()

  return (
    <html lang="en">
      <head>
        <link id="app-theme-stylesheet" rel="stylesheet" href={themeHref} />
      </head>
      <body className={inter.className}>
        <AppNameProvider appName={appName}>
          <AuthProvider>{children}</AuthProvider>
        </AppNameProvider>
      </body>
    </html>
  )
}
