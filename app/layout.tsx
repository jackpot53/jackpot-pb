import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600'],
})

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
      <body className={inter.className}>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
