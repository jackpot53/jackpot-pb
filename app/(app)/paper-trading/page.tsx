// app/(app)/paper-trading/page.tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { getAuthUser } from '@/utils/supabase/server'
import { getPaperTradingPositions } from '@/db/queries/paper-trading'
import { PaperTradingClient } from '@/components/app/paper-trading-client'
import { PageHeader } from '@/components/app/page-header'

export const metadata: Metadata = {
  title: '모의투자 백테스팅',
}

export default async function PaperTradingPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const positions = await getPaperTradingPositions(user.id)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="모의투자 백테스팅"
        description="로보어드바이저 포트폴리오의 역사적 성과를 분석합니다"
      />

      <PaperTradingClient positions={positions} />
    </div>
  )
}
