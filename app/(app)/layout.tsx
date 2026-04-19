import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { Sidebar } from '@/components/app/sidebar'
import { Header } from '@/components/app/header'
import { BackgroundCanvas } from '@/components/app/background-canvas'
import { MobileSidebarProvider } from '@/components/app/mobile-sidebar-context'
import { KisWsProvider } from '@/lib/ws/kis-ws-context'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <MobileSidebarProvider>
      <KisWsProvider>
      <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto px-4 pt-0 pb-4 sm:px-6 sm:pt-0 sm:pb-6 main-bg">
          <BackgroundCanvas />
          <div className="w-full max-w-[1280px] mx-auto">
            {children}
          </div>
          <footer className="w-full max-w-[1280px] mx-auto mt-16 pb-8">
            <div className="h-px bg-border mb-6" />
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-sm font-black tracking-[0.35em] uppercase select-none brand-shimmer">
                JACKPOT
              </span>
              <p className="text-xs tracking-widest text-muted-foreground font-medium">
                부의 미래를 설계하다
              </p>
            </div>
          </footer>
        </main>
      </div>
      </div>
      </KisWsProvider>
    </MobileSidebarProvider>
  )
}
