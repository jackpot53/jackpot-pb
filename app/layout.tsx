import type { Metadata } from 'next'
import { Gaegu, Nanum_Pen_Script, Story_Script, Sunflower, Faster_One } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ComponentInspector } from '@/components/dev/component-inspector'

const gaegu = Gaegu({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-gaegu',
})
const nanumPenScript = Nanum_Pen_Script({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nanum-pen',
})
const storyScript = Story_Script({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-story-script',
})
const sunflower = Sunflower({
  weight: ['300', '500', '700'],
  display: 'swap',
  variable: '--font-sunflower',
})
const fasterOne = Faster_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-faster-one',
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
    <html
      lang="ko"
      className={`${gaegu.variable} ${nanumPenScript.variable} ${storyScript.variable} ${sunflower.variable} ${fasterOne.variable}`}
    >
      <body suppressHydrationWarning>
        {children}
        <Toaster position="bottom-right" />
        {process.env.NODE_ENV === 'development' && <ComponentInspector />}
      </body>
    </html>
  )
}
