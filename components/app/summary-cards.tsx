'use client'
import { useState, useEffect, useRef, useCallback, memo } from 'react'
import dynamic from 'next/dynamic'
import { TrendingUp, BarChart2, PiggyBank } from 'lucide-react'

import { cn } from '@/lib/utils'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { AssetLogo } from '@/components/app/asset-logo'
import { formatKrw, formatReturn } from '@/lib/portfolio'
import type { AssetPerformance } from '@/lib/portfolio'
import type { CandlestickPoint } from '@/components/app/candlestick-chart'
import { ASSET_TYPE_ACCENT } from '@/components/app/assets-page-client'

const CandlestickChart = dynamic(
  () => import('@/components/app/candlestick-chart').then(m => ({ default: m.CandlestickChart })),
  { ssr: false },
)

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) return
    const start = performance.now()
    const from = 0

    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  // target이 0이면 애니메이션 없이 즉시 0 반환 (이전 value 잔상 방지)
  return target === 0 ? 0 : value
}

function ThunderOverlay({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <>
      <style>{`
        @keyframes thunder-flash {
          0%   { opacity: 0 }
          4%   { opacity: 0.85 }
          8%   { opacity: 0 }
          12%  { opacity: 0.6 }
          16%  { opacity: 0 }
          40%  { opacity: 0 }
          42%  { opacity: 0.9 }
          46%  { opacity: 0 }
          48%  { opacity: 0.4 }
          52%  { opacity: 0 }
          100% { opacity: 0 }
        }
        @keyframes bolt-drop {
          0%   { opacity: 0; transform: translateY(-40px) scaleY(0.6) }
          10%  { opacity: 1; transform: translateY(0) scaleY(1) }
          30%  { opacity: 1 }
          50%  { opacity: 0.7 }
          70%  { opacity: 0 }
          100% { opacity: 0 }
        }
        @keyframes bolt-drop2 {
          0%   { opacity: 0 }
          38%  { opacity: 0; transform: translateY(-30px) scaleY(0.7) }
          48%  { opacity: 1; transform: translateY(0) scaleY(1) }
          65%  { opacity: 0.8 }
          80%  { opacity: 0 }
          100% { opacity: 0 }
        }
        @keyframes thunder-shake {
          0%,100% { transform: translate(0,0) }
          10% { transform: translate(-6px, 3px) }
          20% { transform: translate(6px, -3px) }
          30% { transform: translate(-4px, 4px) }
          40% { transform: translate(4px, -2px) }
          42% { transform: translate(-8px, 2px) }
          44% { transform: translate(8px, -4px) }
          46% { transform: translate(-4px, 2px) }
          48% { transform: translate(2px, -2px) }
          50% { transform: translate(0,0) }
        }
      `}</style>

      {/* 화면 흔들림 */}
      <div className="fixed inset-0 pointer-events-none z-[9998]"
        style={{ animation: 'thunder-shake 2.2s ease-out forwards' }} />

      {/* 번개 플래시 */}
      <div className="fixed inset-0 pointer-events-none z-[9999] bg-blue-100/30"
        style={{ animation: 'thunder-flash 2.2s ease-out forwards' }} />

      {/* 번개 볼트 1 — 중앙 */}
      <div className="fixed inset-0 pointer-events-none z-[9999] flex items-start justify-center"
        style={{ animation: 'bolt-drop 2.2s ease-out forwards', paddingTop: '8vh' }}>
        <svg width="80" height="260" viewBox="0 0 80 260" fill="none">
          <path d="M52 0L8 140H38L22 260L78 100H46L52 0Z" fill="white" stroke="#93c5fd" strokeWidth="2" />
          <path d="M52 0L8 140H38L22 260L78 100H46L52 0Z" fill="url(#bolt-glow)" />
          <defs>
            <radialGradient id="bolt-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* 번개 볼트 2 — 좌측 */}
      <div className="fixed inset-0 pointer-events-none z-[9999] flex items-start justify-center"
        style={{ animation: 'bolt-drop2 2.2s ease-out forwards', paddingTop: '12vh', paddingRight: '38vw' }}>
        <svg width="50" height="180" viewBox="0 0 80 260" fill="none">
          <path d="M52 0L8 140H38L22 260L78 100H46L52 0Z" fill="white" stroke="#93c5fd" strokeWidth="2" opacity="0.8" />
        </svg>
      </div>

      {/* 번개 볼트 3 — 우측 */}
      <div className="fixed inset-0 pointer-events-none z-[9999] flex items-start justify-center"
        style={{ animation: 'bolt-drop2 2.2s ease-out forwards', paddingTop: '6vh', paddingLeft: '40vw' }}>
        <svg width="45" height="160" viewBox="0 0 80 260" fill="none">
          <path d="M52 0L8 140H38L22 260L78 100H46L52 0Z" fill="white" stroke="#93c5fd" strokeWidth="2" opacity="0.7" />
        </svg>
      </div>
    </>
  )
}

const FLOAT_SLOTS = [
  { top: '12%',  left:  '6%',   animClass: 'logo-float-1', delay: '0s',    size: 36 },
  { top: '68%',  left:  '3%',   animClass: 'logo-float-2', delay: '1.8s',  size: 28 },
  { top: '10%',  right: '7%',   animClass: 'logo-float-3', delay: '0.6s',  size: 38 },
  { top: '72%',  right: '5%',   animClass: 'logo-float-4', delay: '2.4s',  size: 30 },
  { top: '42%',  left:  '18%',  animClass: 'logo-float-5', delay: '1.1s',  size: 26 },
  { top: '35%',  right: '18%',  animClass: 'logo-float-6', delay: '3.2s',  size: 32 },
  { top: '80%',  left:  '38%',  animClass: 'logo-float-2', delay: '0.3s',  size: 26 },
  { top: '8%',   left:  '42%',  animClass: 'logo-float-4', delay: '2s',    size: 30 },
]

function FloatingLogos({ performances }: { performances: AssetPerformance[] }) {
  const unique = performances.filter(
    (a, i, arr) => arr.findIndex((b) => (b.ticker ?? b.name) === (a.ticker ?? a.name)) === i
  ).slice(0, FLOAT_SLOTS.length)

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {unique.map((asset, i) => {
        const slot = FLOAT_SLOTS[i]
        return (
          <div
            key={asset.assetId}
            className={`absolute ${slot.animClass} opacity-25`}
            style={{ top: slot.top, left: (slot as { left?: string }).left, right: (slot as { right?: string }).right, animationDelay: slot.delay }}
          >
            <AssetLogo ticker={asset.ticker} name={asset.name} assetType={asset.assetType} size={slot.size} />
          </div>
        )
      })}
    </div>
  )
}

export const SummaryCards = memo(function SummaryCards({ grouped, performances, valueCandles, showTypeStrip = true }: { grouped: Record<string, AssetPerformance[]>; performances: AssetPerformance[]; valueCandles?: CandlestickPoint[]; showTypeStrip?: boolean }) {
  const types = Object.keys(grouped)

  const grandTotalCost = performances.reduce((s, a) => s + Number(a.totalCostKrw), 0)
  const valuedAssets = performances.filter((a) => a.currentValueKrw > 0)
  const grandTotalValue = valuedAssets.reduce((s, a) => s + Number(a.currentValueKrw), 0)
  const valuedCost = valuedAssets.reduce((s, a) => s + Number(a.totalCostKrw), 0)
  const grandProfit = grandTotalValue - valuedCost
  const grandReturnPct = valuedCost > 0 ? (grandProfit / valuedCost) * 100 : null
  const grandHasValue = grandTotalValue > 0

  const animatedCost = useCountUp(grandTotalCost)
  const animatedValue = useCountUp(grandTotalValue, 1400)
  const animatedProfit = useCountUp(Math.abs(grandProfit), 1600)

  const totalDailyChangeKrw = performances
    .filter((a) => a.dailyChangeBps !== null && a.currentValueKrw > 0)
    .reduce((sum, a) => sum + a.currentValueKrw * (a.dailyChangeBps! / 10000), 0)

  const fireworks = useCallback(() => {
    const burst = (x: number, y: number, delay: number) => setTimeout(() => {
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 120, spread: 80, startVelocity: 55, origin: { x, y }, colors: ['#ff6b6b', '#a78bfa', '#34d399', '#60a5fa', '#f97316', '#facc15'] })
      })
    }, delay)
    burst(0.5, 0.4, 0)
    burst(0.3, 0.5, 200)
    burst(0.7, 0.5, 200)
    burst(0.5, 0.35, 500)
    burst(0.2, 0.4, 700)
    burst(0.8, 0.4, 700)
  }, [])

  useEffect(() => {
    if (totalDailyChangeKrw >= 10_000_000) {
      const t = setTimeout(fireworks, 1700)
      return () => clearTimeout(t)
    }
  }, [totalDailyChangeKrw, fireworks])

  const [thunder, setThunder] = useState(false)
  useEffect(() => {
    if (totalDailyChangeKrw <= -5_000_000) {
      const t = setTimeout(() => {
        setThunder(true)
        setTimeout(() => setThunder(false), 2400)
      }, 1700)
      return () => clearTimeout(t)
    }
  }, [totalDailyChangeKrw])

  return (
    <div data-component="SummaryCards" className="space-y-3">
      <ThunderOverlay active={thunder} />
      {/* Hero */}
      <div className="rounded-2xl bg-card border border-border px-8 py-6 relative overflow-hidden" style={{ fontFamily: 'var(--font-sunflower)' }}>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-violet-500/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl" />
        <FloatingLogos performances={performances} />
        <div className="relative flex items-stretch gap-10 flex-wrap">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">총 투자</p>
            <p className="text-2xl font-bold tabular-nums">{grandTotalCost > 0 ? formatKrw(animatedCost) : '—'}</p>
            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
              <PiggyBank className="h-3 w-3" />투자한 원금 합계
            </span>
          </div>
          {grandHasValue && (
            <>
              <div className="w-px bg-border self-stretch" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">평가금액</p>
                <p className="text-2xl font-bold tabular-nums">{formatKrw(animatedValue)}</p>
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                  <BarChart2 className="h-3 w-3" />현재 시세 기준 총 자산
                </span>
              </div>
              <div className="w-px bg-border self-stretch" />
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">평가손익</p>
                <p className={`text-2xl font-bold tabular-nums ${grandProfit >= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                  {grandProfit >= 0 ? '+' : '-'}{formatKrw(animatedProfit)}
                </p>
                {grandReturnPct !== null && (
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                      <TrendingUp className="h-3 w-3" />원금 대비 수익금
                    </span>
                    <p className={`text-sm font-semibold ${grandProfit >= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                      {formatReturn(grandReturnPct)}
                    </p>
                  </div>
                )}
              </div>
              {valueCandles && valueCandles.length > 0 && (
                <>
                  <div className="w-px bg-border self-stretch" />
                  <div className="ml-auto flex flex-col justify-between min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">총 자산 추이</p>
                    <div className="w-[220px] h-[100px]">
                      <CandlestickChart data={valueCandles} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Per-type strip */}
      {showTypeStrip && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {types.map((type) => {
          const assets = grouped[type]
          const totalCost = assets.reduce((s, a) => s + a.totalCostKrw, 0)
          const valuedInType = assets.filter((a) => a.currentValueKrw > 0)
          const totalValue = valuedInType.reduce((s, a) => s + a.currentValueKrw, 0)
          const valuedCostInType = valuedInType.reduce((s, a) => s + a.totalCostKrw, 0)
          const profit = totalValue - valuedCostInType
          const returnPct = valuedCostInType > 0 ? (profit / valuedCostInType) * 100 : null
          const hasValue = totalValue > 0

          return (
            <div key={type} className={cn("rounded-xl border border-border px-4 py-3 flex flex-col gap-1.5 shadow-sm", ASSET_TYPE_ACCENT[type] ?? 'bg-card')}>
              <div className="flex items-center justify-between mb-0.5">
                <AssetTypeBadge assetType={type as AssetPerformance['assetType']} />
                <span className="text-xs text-muted-foreground">{assets.length}종목</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-muted-foreground shrink-0">평가금</span>
                <span className="text-base font-bold tabular-nums text-foreground">{hasValue ? formatKrw(totalValue) : totalCost > 0 ? formatKrw(totalCost) : '—'}</span>
              </div>
              {hasValue && valuedCostInType > 0 ? (
                <div className={`text-xs font-semibold tabular-nums flex items-center gap-1 ${profit >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                  <span className="text-xs font-medium text-muted-foreground">수익금</span>
                  <span>{profit >= 0 ? '+' : ''}{formatKrw(profit)}</span>
                  {returnPct !== null && (
                    <>
                      <span className="text-border/60">|</span>
                      <span className="text-xs font-medium text-muted-foreground">수익률</span>
                      <span>{formatReturn(returnPct)}</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
          )
        })}
      </div>}
    </div>
  )
})
