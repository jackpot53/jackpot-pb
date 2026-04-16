import Image from 'next/image'
import { getAuthUser } from '@/utils/supabase/server'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export async function Header() {
  const user = await getAuthUser()

  return (
    <header className="relative h-16 flex items-center justify-between px-6 shrink-0 bg-white/60 backdrop-blur-xl border-b border-white/30">
      {/* 하단 골드 그라디언트 라인 */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

      {/* 브랜드 영역 */}
      <div className="flex items-center gap-3 select-none">
        {/* 로고 원형 마스크 */}
        <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-amber-400/60 shadow-md shadow-amber-400/30">
          <Image src="/logo.jpg" alt="Jackpot 로고" fill className="object-cover" />
        </div>

        {/* 텍스트 */}
        <div className="flex flex-col leading-none gap-0.5">
          <span className="brand-shimmer text-[18px] font-black tracking-tight">
            JACKPOT
          </span>
          <span className="text-[9px] font-medium tracking-[0.2em] uppercase text-amber-700/50">
            부의 미래를 설계하다
          </span>
        </div>
      </div>

      {/* 우측 액션 */}
      <div className="flex items-center gap-3">
        {user?.email && (
          <span className="text-xs text-muted-foreground/40 hidden md:block truncate max-w-[180px]">
            {user.email}
          </span>
        )}
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="text-muted-foreground/50 hover:text-foreground hover:bg-white/50 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="text-xs">로그아웃</span>
          </Button>
        </form>
      </div>
    </header>
  )
}
