import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { Sidebar } from '@/components/app/sidebar'
import { Header } from '@/components/app/header'
import { BackgroundCanvas } from '@/components/app/background-canvas'
import { MobileSidebarProvider } from '@/components/app/mobile-sidebar-context'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <MobileSidebarProvider>
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-4 sm:p-6 main-bg">
          <BackgroundCanvas />
          <div className="w-full max-w-[1280px] mx-auto">
            {children}
          </div>
          <footer className="w-full max-w-[1280px] mx-auto mt-20 pb-10">
            <style>{`
              @keyframes footer-scan {
                0%   { transform: translateX(-100%); }
                100% { transform: translateX(400%); }
              }
              @keyframes footer-dot {
                0%,100% { opacity:.2; transform:scale(1); }
                50%     { opacity:.7; transform:scale(1.5); }
              }
            `}</style>

            {/* 구분선 — 스캔 글로우 */}
            <div className="relative h-px mb-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/25 to-transparent" />
              <div
                className="absolute top-0 h-full w-1/4 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent"
                style={{ animation: 'footer-scan 4s ease-in-out infinite' }}
              />
            </div>

            {/* 중앙 브랜드 블록 */}
            <div className="flex flex-col items-center gap-4 mb-8">
              {/* JACKPOT 대형 shimmer 텍스트 */}
              <div className="relative">
                <span
                  className="text-[28px] font-black tracking-[0.35em] uppercase select-none brand-shimmer"
                  style={{ letterSpacing: '0.35em' }}
                >
                  JACKPOT
                </span>
                {/* 하단 반사 */}
                <span
                  className="absolute top-full left-0 right-0 text-center text-[28px] font-black tracking-[0.35em] uppercase select-none brand-shimmer pointer-events-none"
                  style={{
                    letterSpacing: '0.35em',
                    transform: 'scaleY(-1)',
                    opacity: 0.12,
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
                  }}
                  aria-hidden="true"
                >
                  JACKPOT
                </span>
              </div>

              {/* 장식 구분 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-px bg-gradient-to-r from-transparent to-amber-400/40" />
                <div className="flex items-center gap-1.5">
                  {[0.3, 0.6, 1, 0.6, 0.3].map((scale, i) => (
                    <div
                      key={i}
                      className="rounded-full bg-amber-400/50"
                      style={{
                        width: 3, height: 3,
                        opacity: scale,
                        animation: `footer-dot ${1.5 + i * 0.2}s ease-in-out ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <div className="w-10 h-px bg-gradient-to-l from-transparent to-amber-400/40" />
              </div>

              {/* 한 줄 태그라인 */}
              <p className="text-xs tracking-widest text-white font-medium">
                부의 미래를 설계하다
              </p>
            </div>

            {/* 하단 메타 */}
            <div className="flex items-center justify-between text-xs text-white tracking-wide">
              <span>© {new Date().getFullYear()} Jackpot</span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400/40"
                  style={{ animation: 'footer-dot 3s ease-in-out infinite' }}
                />
                Private use only
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
    </MobileSidebarProvider>
  )
}
