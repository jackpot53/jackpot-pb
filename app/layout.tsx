import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ComponentInspector } from '@/components/dev/component-inspector'

export const metadata: Metadata = {
  title: 'jackpot',
  description: 'Personal asset management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>
        {children}
        <Toaster position="bottom-right" />
        {process.env.NODE_ENV === 'development' && <ComponentInspector />}
      </body>
    </html>
  )
}
