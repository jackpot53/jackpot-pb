import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { LineChart, PieChart } from 'lucide-react'
import { AnimatedLogo } from '@/components/app/animated-logo'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { after } from 'next/server'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { PortfolioRadialChart } from '@/components/app/portfolio-radial-chart'
import type { AllocationItem } from '@/components/app/portfolio-radial-chart'
import { timed } from '@/lib/perf'

const ASSET_TYPE_ORDER = [
  'stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate', 'insurance', 'precious_metal',
] as const

async function ChartsPageContent({ userId }: { userId: string }) {
  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  const { performances } = await timed('ChartsPage data', () => loadPerformances(userId))

  const totalValue = performances.reduce((s, a) => s + (a.currentValueKrw || a.totalCostKrw), 0)
  const allocations: AllocationItem[] = ASSET_TYPE_ORDER
    .map((type) => {
      const items = performances.filter((a) => a.assetType === type)
      const valueKrw = items.reduce((s, a) => s + (a.currentValueKrw || a.totalCostKrw), 0)
      return { type, valueKrw, pct: totalValue > 0 ? (valueKrw / totalValue) * 100 : 0 }
    })
    .filter((a) => a.valueKrw > 0)
    .sort((a, b) => b.pct - a.pct)

  if (allocations.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        <PieChart className="h-4 w-4 text-emerald-500" />자산 배분
      </h2>
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <PortfolioRadialChart allocations={allocations} totalValueKrw={totalValue} />
        </CardContent>
      </Card>
    </div>
  )
}

export default async function ChartsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      {/* 히어로 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4 sm:p-6 text-white shadow-xl min-h-[160px]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <style>{`
            @keyframes charts-bar { 0%,100%{transform:scaleY(1);opacity:.35} 50%{transform:scaleY(1.18);opacity:.6} }
            @keyframes charts-line { 0%{stroke-dashoffset:120} 100%{stroke-dashoffset:0} }
            @keyframes charts-glow { 0%,100%{opacity:.2} 50%{opacity:.55} }
            @keyframes charts-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
          `}</style>
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-indigo-900/40 blur-3xl" />
          <div className="absolute top-6 right-20 w-28 h-28 rounded-full border border-white/10" />
          <div className="absolute top-12 right-28 w-14 h-14 rounded-full border border-white/10" />
          <div className="absolute top-16 right-24 w-6 h-6 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full border border-white/10" />
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden sm:block">
            <svg viewBox="0 0 100 64" className="w-24 h-16" aria-hidden="true">
              <line x1="0" y1="48" x2="100" y2="48" stroke="white" strokeWidth="0.4" opacity="0.15"/>
              <line x1="0" y1="32" x2="100" y2="32" stroke="white" strokeWidth="0.4" opacity="0.1"/>
              <line x1="0" y1="16" x2="100" y2="16" stroke="white" strokeWidth="0.4" opacity="0.1"/>
              <g style={{ transformOrigin:'10px 48px', animation:'charts-bar 2.4s ease-in-out infinite' }}>
                <line x1="10" y1="28" x2="10" y2="52" stroke="white" strokeWidth="0.8" opacity="0.5"/>
                <rect x="7" y="33" width="6" height="14" rx="1" fill="white" opacity="0.5"/>
              </g>
              <g style={{ transformOrigin:'24px 48px', animation:'charts-bar 2.4s ease-in-out infinite', animationDelay:'0.4s' }}>
                <line x1="24" y1="30" x2="24" y2="54" stroke="rgba(255,180,180,0.6)" strokeWidth="0.8"/>
                <rect x="21" y="36" width="6" height="16" rx="1" fill="rgba(255,180,180,0.4)"/>
              </g>
              <g style={{ transformOrigin:'38px 48px', animation:'charts-bar 2.8s ease-in-out infinite', animationDelay:'0.8s' }}>
                <line x1="38" y1="18" x2="38" y2="52" stroke="white" strokeWidth="0.8" opacity="0.55"/>
                <rect x="35" y="22" width="6" height="26" rx="1" fill="white" opacity="0.55"/>
              </g>
              <g style={{ transformOrigin:'52px 48px', animation:'charts-bar 2.4s ease-in-out infinite', animationDelay:'1.2s' }}>
                <line x1="52" y1="32" x2="52" y2="56" stroke="rgba(255,180,180,0.55)" strokeWidth="0.8"/>
                <rect x="49" y="38" width="6" height="14" rx="1" fill="rgba(255,180,180,0.35)"/>
              </g>
              <g style={{ transformOrigin:'66px 48px', animation:'charts-bar 3s ease-in-out infinite', animationDelay:'1.6s' }}>
                <line x1="66" y1="12" x2="66" y2="52" stroke="white" strokeWidth="0.8" opacity="0.65"/>
                <rect x="63" y="16" width="6" height="30" rx="1" fill="white" opacity="0.65"/>
              </g>
              <g style={{ transformOrigin:'80px 48px', animation:'charts-bar 2.6s ease-in-out infinite', animationDelay:'2s' }}>
                <line x1="80" y1="22" x2="80" y2="52" stroke="white" strokeWidth="0.8" opacity="0.5"/>
                <rect x="77" y="26" width="6" height="22" rx="1" fill="white" opacity="0.5"/>
              </g>
              <polyline
                points="10,42 24,44 38,30 52,40 66,20 80,28"
                fill="none" stroke="rgba(200,180,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="120"
                style={{ animation:'charts-line 3s ease-out forwards, charts-glow 3s ease-in-out 3s infinite' }}
              />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden flex items-center" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <div className="flex gap-6 whitespace-nowrap text-[10px] font-mono px-4" style={{ animation: 'charts-ticker 18s linear infinite' }}>
              {['KOSPI +0.8%', 'S&P500 +1.2%', 'BTC +3.4%', 'ETH +2.1%', 'GOLD +0.5%', 'KOSPI +0.8%', 'S&P500 +1.2%', 'BTC +3.4%', 'ETH +2.1%', 'GOLD +0.5%'].map((t, i) => (
                <span key={i} style={{ color: 'rgba(200,220,255,0.5)' }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <style>{`
            @keyframes charts-logo-pulse {
              0%,100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 6px rgba(139,92,246,0.4)); }
              20% { transform: scale(1.15) rotate(-3deg); filter: drop-shadow(0 0 24px rgba(139,92,246,0.9)); }
              35% { transform: scale(0.93) rotate(2deg); filter: drop-shadow(0 0 4px rgba(139,92,246,0.2)); }
              50% { transform: scale(1.1) rotate(-2deg); filter: drop-shadow(0 0 18px rgba(167,139,250,0.7)); }
              65% { transform: scale(0.97) rotate(1deg); }
            }
          `}</style>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-75 hidden sm:block"
            style={{ animation: 'charts-logo-pulse 2.4s ease-in-out infinite' }}>
            <AnimatedLogo size={108} />
          </div>
        </div>
        <div className="relative space-y-2" style={{ fontFamily: "'Sunflower', sans-serif" }}>
          <div className="flex items-center gap-1.5 text-violet-200 text-xs font-semibold tracking-widest uppercase">
            <LineChart className="h-3.5 w-3.5" />수익률 분석
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>머니 대시</h1>
          <p className="text-violet-100/70 text-sm">
            자산 성장 추이와 수익률을 <span className="text-violet-100/90 font-medium">캔들스틱 차트로 시각화</span>합니다
          </p>
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <ChartsPageContent userId={user.id} />
      </Suspense>
    </div>
  )
}
