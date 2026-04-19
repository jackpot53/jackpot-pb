// app/(app)/paper-trading/page.tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { getAuthUser } from '@/utils/supabase/server'
import { getPaperTradingPositions } from '@/db/queries/paper-trading'
import { PaperTradingClient } from '@/components/app/paper-trading-client'

export const metadata: Metadata = {
  title: '모의투자 백테스팅',
}

export default async function PaperTradingPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const positions = await getPaperTradingPositions(user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 py-2">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10">
          <TrendingUp className="h-4.5 w-4.5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">모의투자 백테스팅</h1>
          <p className="text-xs text-muted-foreground mt-0.5">로보어드바이저 포트폴리오의 역사적 성과를 분석합니다</p>
        </div>
      </div>

      <PaperTradingClient positions={positions} />
    </div>
  )
}
