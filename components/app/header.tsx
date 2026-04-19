import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { Suspense } from 'react'
import Link from 'next/link'
import { TickerBand } from '@/components/app/ticker-band'
import { HamburgerButton } from '@/components/app/hamburger-button'

export async function Header() {
  return (
    <header className="relative z-10 h-14 flex items-center px-4 sm:px-6 shrink-0 bg-background border-b border-border gap-3">
      {/* 햄버거 버튼 — 모바일/태블릿만 표시 */}
      <HamburgerButton />

      {/* 브랜드 — 홈 링크 */}
      <Link href="/" className="shrink-0 select-none hover:opacity-80 transition-opacity">
        <span
          className="text-lg text-foreground"
          style={{ fontFamily: "'Story Script', cursive", letterSpacing: '0.05em' }}
        >
          JACKPOT 77
        </span>
      </Link>

      {/* 종목 티커 — 태블릿(sm) 이상만 표시 */}
      <div className="hidden sm:flex flex-1 min-w-0">
        <Suspense fallback={null}>
          <TickerBand />
        </Suspense>
      </div>

      {/* 우측 액션 */}
      <div className="shrink-0 flex items-center gap-3 ml-auto">
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="text-muted-foreground hover:text-foreground hover:bg-muted border border-border gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">로그아웃</span>
          </Button>
        </form>
      </div>
    </header>
  )
}
