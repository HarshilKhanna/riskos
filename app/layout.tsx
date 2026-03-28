import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import { ClerkUserSync } from '@/components/auth/ClerkUserSync'
import { FinnhubSocketBootstrap } from '@/components/market/FinnhubSocketBootstrap'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'RiskOS - Portfolio Risk Management',
  description: 'Premium fintech dashboard for portfolio risk analysis and management',
  generator: 'v0.app',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}>
        <ClerkProvider>
          <ClerkUserSync />
          <FinnhubSocketBootstrap />
          {children}
          <Toaster richColors position="top-right" />
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  )
}
