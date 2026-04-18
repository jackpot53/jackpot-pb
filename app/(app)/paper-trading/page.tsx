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
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#111111] p-8 text-white shadow-xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <style>{`
            @keyframes pulse-ring-1 {
              0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.6; }
              50% { opacity: 0.3; }
              100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
            }
            @keyframes pulse-ring-2 {
              0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.4; }
              50% { opacity: 0.2; }
              100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
            }
            @keyframes pulse-ring-3 {
              0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0.3; }
              50% { opacity: 0.15; }
              100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
            }
          `}</style>
          <div className="absolute top-1/2 right-16 w-32 h-32">
            <div className="absolute inset-0 rounded-full border-2 border-white/30" style={{ animation: 'pulse-ring-1 2s ease-out infinite' }} />
            <div className="absolute inset-0 rounded-full border-2 border-white/20" style={{ animation: 'pulse-ring-2 2.5s ease-out infinite' }} />
            <div className="absolute inset-0 rounded-full border-2 border-white/10" style={{ animation: 'pulse-ring-3 3s ease-out infinite' }} />
          </div>
        </div>
        <div className="relative">
          <div className="flex items-center gap-1.5 text-blue-400/70 text-xs font-semibold tracking-widest uppercase mb-2">
            <TrendingUp className="h-3.5 w-3.5" />모의투자
          </div>
          <h1 className="text-3xl font-bold tracking-tight leading-tight mb-2" style={{ fontFamily: "'Sunflower', sans-serif" }}>모의투자 백테스팅</h1>
          <p className="text-white/60 text-sm">
            로보어드바이저 포트폴리오의 <span className="text-blue-400 font-medium">역사적 성과를 분석</span>합니다
          </p>
        </div>
      </div>

      <PaperTradingClient positions={positions} />
    </div>
  )
}
