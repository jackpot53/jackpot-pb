import { Suspense } from 'react'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { getAuthUser } from '@/utils/supabase/server'
import { AnimatedLogo } from '@/components/app/animated-logo'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { getAllSnapshotsWithBreakdowns } from '@/db/queries/portfolio-snapshots'
import { toMonthlyData, toAnnualData, toDailyData, snapshotsForType } from '@/lib/snapshot/aggregation'
import { AssetsPageClient } from '@/components/app/assets-page-client'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

export default async function AssetsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      {/* 히어로 배너 — 정적 콘텐츠, 즉시 스트리밍 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 text-white shadow-xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-cyan-900/40 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

          {/* 펄스 링 */}
          <div className="absolute top-1/2 right-16 -translate-y-1/2">
            <div className="hero-ring-1 absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
            <div className="hero-ring-2 absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
            <div className="hero-ring-3 absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/10" />
          </div>

          {/* AnimatedLogo — 신나게 튀어오르는 애니메이션 */}
          <style>{`
            @keyframes assets-logo-bounce {
              0%,100% { transform: translateY(0) scale(1) rotate(0deg); filter: drop-shadow(0 0 6px rgba(52,211,153,0.3)); }
              30% { transform: translateY(-16px) scale(1.1) rotate(-5deg); filter: drop-shadow(0 0 20px rgba(52,211,153,0.7)); }
              50% { transform: translateY(-10px) scale(1.05) rotate(3deg); }
              70% { transform: translateY(-18px) scale(1.12) rotate(-3deg); filter: drop-shadow(0 0 22px rgba(52,211,153,0.8)); }
            }
          `}</style>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-75 hidden sm:block"
            style={{ animation: 'assets-logo-bounce 2.8s ease-in-out infinite' }}>
            <AnimatedLogo size={108} />
          </div>

          {/* 실시간 바 차트 */}
          <div className="absolute right-6 bottom-0 flex items-end gap-[3px] h-[72px] opacity-20">
            <div className="hero-bar-1 w-2 bg-white rounded-t-sm" style={{ height: '28%' }} />
            <div className="hero-bar-2 w-2 bg-white rounded-t-sm" style={{ height: '55%' }} />
            <div className="hero-bar-3 w-2 bg-white rounded-t-sm" style={{ height: '40%' }} />
            <div className="hero-bar-4 w-2 bg-white rounded-t-sm" style={{ height: '70%' }} />
            <div className="hero-bar-5 w-2 bg-white rounded-t-sm" style={{ height: '35%' }} />
            <div className="hero-bar-6 w-2 bg-white rounded-t-sm" style={{ height: '60%' }} />
            <div className="hero-bar-7 w-2 bg-white rounded-t-sm" style={{ height: '45%' }} />
            <div className="hero-bar-8 w-2 bg-white rounded-t-sm" style={{ height: '80%' }} />
            <div className="hero-bar-9 w-2 bg-white rounded-t-sm" style={{ height: '30%' }} />
          </div>
        </div>
        <div className="relative flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-200 text-xs font-semibold tracking-widest uppercase">
              <Wallet className="h-3.5 w-3.5" />자산 관리
            </div>
            <h1 className="text-3xl font-bold tracking-tight">내 자산</h1>
            <p className="text-emerald-100/70 text-sm">
              보유 자산을 등록하고 <span className="text-emerald-100/90 font-medium">실시간 수익률을 추적</span>합니다
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <style>{`
              @keyframes cta-bounce {
                0%, 100% { transform: translateY(0); opacity: 0.9; }
                50% { transform: translateY(-4px); opacity: 1; }
              }
              @keyframes cta-arrow {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(3px); }
              }
            `}</style>
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 border border-white/40 text-white text-[11px] font-semibold"
              style={{ animation: 'cta-bounce 1.8s ease-in-out infinite' }}
            >
              ✨ 자산을 등록해보세요
            </div>
            <div className="text-white/60 text-xs" style={{ animation: 'cta-arrow 1.8s ease-in-out infinite' }}>↓</div>
            <Link
              href="/assets/new"
              className="group flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-white/90 border-2 border-emerald-700 text-emerald-700 text-sm font-semibold transition-all duration-200 hover:shadow-lg active:scale-95"
            >
              <PlusCircle className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
              자산 추가
            </Link>
          </div>
        </div>
      </div>

      <Suspense fallback={
        <div className="h-96 rounded-2xl bg-muted/40 animate-pulse" />
      }>
        <AssetsContent userId={user.id} />
      </Suspense>
    </div>
  )
}

async function AssetsContent({ userId }: { userId: string }) {
  // Fire-and-forget: refresh prices in the background after response is sent
  after(() => { void refreshAllPricesInternal().catch(() => {}) })

  const [{ performances }, snapshots] = await Promise.all([
    loadPerformances(userId),
    getAllSnapshotsWithBreakdowns(userId),
  ])

  const monthlyData = toMonthlyData(snapshots)
  const annualData = toAnnualData(snapshots)

  const assetTypes = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate', 'insurance', 'precious_metal'] as const
  const monthlyByType: Record<string, ReturnType<typeof toMonthlyData>> = {}
  const annualByType: Record<string, ReturnType<typeof toAnnualData>> = {}
  const dailyByType: Record<string, ReturnType<typeof toDailyData>> = {}
  for (const type of assetTypes) {
    const typeSnaps = snapshotsForType(snapshots, type)
    monthlyByType[type] = toMonthlyData(typeSnaps)
    annualByType[type] = toAnnualData(typeSnaps)
    dailyByType[type] = toDailyData(typeSnaps)
  }

  return (
    <AssetsPageClient
      performances={performances}
      sparklines={{}}
      monthlyData={monthlyData}
      annualData={annualData}
      monthlyByType={monthlyByType}
      annualByType={annualByType}
      dailyByType={dailyByType}
    />
  )
}
