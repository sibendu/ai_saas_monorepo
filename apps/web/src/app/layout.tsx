import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { getConfiguredThemeHref } from '@/config/theme'

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

  return (
    <html lang="en">
      <head>
        <link id="app-theme-stylesheet" rel="stylesheet" href={themeHref} />
      </head>
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
