import { getAuthUser } from '@/utils/supabase/server'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { Suspense } from 'react'
import { TickerBand } from '@/components/app/ticker-band'

export async function Header() {
  const user = await getAuthUser()

  return (
    <header className="relative z-10 h-14 flex items-center px-6 shrink-0 bg-black/60 border-b border-white backdrop-blur-md gap-4">
      {/* 브랜드 */}
      <div className="shrink-0 select-none">
        <span
          className="text-lg text-foreground"
          style={{ fontFamily: "'Story Script', cursive", letterSpacing: '0.05em' }}
        >
          JACKPOT 77
        </span>
      </div>

      {/* 종목 티커 */}
      <Suspense fallback={null}>
        <TickerBand />
      </Suspense>

      {/* 우측 액션 */}
      <div className="shrink-0 flex items-center gap-3 ml-auto">
        {user?.email && (
          <span className="text-xs text-white/80 hidden md:block truncate max-w-[200px] bg-white/10 border border-white/20 px-2.5 py-1 rounded-full">
            {user.email}
          </span>
        )}
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="text-white/80 hover:text-white hover:bg-white/15 border border-white/20 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="text-xs">로그아웃</span>
          </Button>
        </form>
      </div>
    </header>
  )
}
