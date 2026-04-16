import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { Sidebar } from '@/components/app/sidebar'
import { Header } from '@/components/app/header'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 main-bg">
          <div className="w-[1280px] mx-auto">
            {children}
          </div>
          <footer className="w-[1280px] mx-auto mt-12 pb-6 flex items-center justify-between text-[11px] text-muted-foreground/50">
            <span>© {new Date().getFullYear()} Jackpot. All rights reserved.</span>
            <span>Personal asset tracker — for private use only</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
