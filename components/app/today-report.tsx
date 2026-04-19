'use client'
import React, { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, Minus, TriangleAlert, ChevronDown,
  BarChart2, Bitcoin, Building2, PiggyBank, BookOpen, ShieldCheck, Gem, CreditCard,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssetPerformance } from '@/lib/portfolio/portfolio'
import { AssetLogo } from '@/components/app/asset-logo'

// ── helpers ────────────────────────────────────────────────────────────────

const ASSET_TYPE_META: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  stock_kr:      { label: '국내주식', icon: TrendingUp,  color: 'text-blue-600',   bg: 'bg-blue-500/10' },
  stock_us:      { label: '미국주식', icon: TrendingUp,  color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
  etf_kr:        { label: '국내ETF',  icon: BarChart2,   color: 'text-emerald-600',bg: 'bg-emerald-500/10' },
  etf_us:        { label: '미국ETF',  icon: BarChart2,   color: 'text-teal-600',   bg: 'bg-teal-500/10' },
  crypto:        { label: '코인',     icon: Bitcoin,     color: 'text-orange-600', bg: 'bg-orange-500/10' },
  fund:          { label: '펀드',     icon: BookOpen,    color: 'text-violet-600', bg: 'bg-violet-500/10' },
  savings:       { label: '예적금',   icon: PiggyBank,   color: 'text-yellow-700', bg: 'bg-yellow-500/10' },
  real_estate:   { label: '부동산',   icon: Building2,   color: 'text-rose-600',   bg: 'bg-rose-500/10' },
  insurance:     { label: '보험',     icon: ShieldCheck, color: 'text-cyan-700',   bg: 'bg-cyan-500/10' },
  precious_metal:{ label: '금/은',    icon: Gem,         color: 'text-amber-600',  bg: 'bg-amber-500/10' },
  cma:           { label: 'CMA',      icon: CreditCard,  color: 'text-cyan-700',   bg: 'bg-cyan-500/10' },
}

const ASSET_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(ASSET_TYPE_META).map(([k, v]) => [k, v.label])
)

function fmtKrw(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}억원`
  if (abs >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만원`
  return `${n.toLocaleString()}원`
}

function fmtPct(bps: number): string {
  const pct = bps / 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

function SignIcon({ bps }: { bps: number }) {
  if (bps > 0) return <TrendingUp className="h-3.5 w-3.5" />
  if (bps < 0) return <TrendingDown className="h-3.5 w-3.5" />
  return <Minus className="h-3.5 w-3.5" />
}

// ── computation ─────────────────────────────────────────────────────────────

interface TypeStat {
  assetType: string
  weightedChangeBps: number
  dailyChangeKrw: number
  totalValueKrw: number
}

interface TopMover {
  name: string
  ticker: string | null
  assetType: string
  dailyChangeBps: number
  dailyChangeKrw: number
}

function computeReport(performances: AssetPerformance[]) {
  // Only assets with a live daily change signal
  const live = performances.filter((a) => a.dailyChangeBps !== null && a.currentValueKrw > 0)

  // Portfolio-level daily change (KRW)
  const totalDailyChangeKrw = live.reduce(
    (sum, a) => sum + (a.currentValueKrw * (a.dailyChangeBps! / 10000)),
    0
  )
  const totalValueKrw = performances.reduce((s, a) => s + a.currentValueKrw, 0)
  const portfolioChangeBps = totalValueKrw > 0
    ? Math.round((totalDailyChangeKrw / totalValueKrw) * 10000)
    : 0

  // Per-type stats
  const typeMap = new Map<string, { sumWeighted: number; sumValue: number; sumChangeKrw: number }>()
  for (const a of live) {
    const prev = typeMap.get(a.assetType) ?? { sumWeighted: 0, sumValue: 0, sumChangeKrw: 0 }
    const changeKrw = a.currentValueKrw * (a.dailyChangeBps! / 10000)
    typeMap.set(a.assetType, {
      sumWeighted: prev.sumWeighted + a.dailyChangeBps! * a.currentValueKrw,
      sumValue: prev.sumValue + a.currentValueKrw,
      sumChangeKrw: prev.sumChangeKrw + changeKrw,
    })
  }

  const typeStats: TypeStat[] = Array.from(typeMap.entries())
    .map(([assetType, { sumWeighted, sumValue, sumChangeKrw }]) => ({
      assetType,
      weightedChangeBps: sumValue > 0 ? Math.round(sumWeighted / sumValue) : 0,
      dailyChangeKrw: sumChangeKrw,
      totalValueKrw: sumValue,
    }))
    .sort((a, b) => Math.abs(b.weightedChangeBps) - Math.abs(a.weightedChangeBps))

  // Top movers (individual assets, sorted by abs daily change KRW)
  const topMovers: TopMover[] = live
    .map((a) => ({
      name: a.name,
      ticker: a.ticker,
      assetType: a.assetType,
      dailyChangeBps: a.dailyChangeBps!,
      dailyChangeKrw: a.currentValueKrw * (a.dailyChangeBps! / 10000),
    }))
    .sort((a, b) => Math.abs(b.dailyChangeKrw) - Math.abs(a.dailyChangeKrw))
    .slice(0, 5)

  // Stale warning
  const staleCount = performances.filter((a) => a.isStale && a.priceType === 'live').length

  return { portfolioChangeBps, totalDailyChangeKrw, totalValueKrw, typeStats, topMovers, staleCount, liveCount: live.length }
}

function Num({ children, up, dn }: { children: React.ReactNode; up?: boolean; dn?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-bold border mx-0.5 align-middle',
      up && 'bg-rose-50 text-rose-600 border-rose-200',
      dn && 'bg-blue-50 text-blue-600 border-blue-200',
      !up && !dn && 'bg-muted text-foreground border-border',
    )}>
      {children}
    </span>
  )
}

function generateInsight(portfolioChangeBps: number, typeStats: TypeStat[], totalDailyChangeKrw: number): React.ReactNode {
  if (typeStats.length === 0) return '오늘 시세 데이터가 없습니다.'
  if (portfolioChangeBps === 0) return '오늘 포트폴리오 변동이 없습니다.'

  const sign = portfolioChangeBps > 0 ? '상승' : '하락'
  const up = portfolioChangeBps > 0
  const dn = portfolioChangeBps < 0
  const absPct = Math.abs(portfolioChangeBps / 100).toFixed(2)
  const absKrw = fmtKrw(Math.abs(totalDailyChangeKrw))

  const best = typeStats[0]
  const bestLabel = ASSET_TYPE_LABEL[best.assetType] ?? best.assetType
  const change = up ? '증가' : '감소'

  return (
    <>
      포트폴리오가 <Num up={up} dn={dn}>{absPct}%</Num> {sign}하며 <Num up={up} dn={dn}>{up ? '+' : '-'}{absKrw}</Num> {change}했습니다.
      {Math.abs(best.weightedChangeBps) > 50 && (
        <> {bestLabel} <Num up={best.weightedChangeBps > 0} dn={best.weightedChangeBps < 0}>{fmtPct(best.weightedChangeBps)}</Num>이 주도했습니다.</>
      )}
    </>
  )
}

function generateNarrative(
  portfolioChangeBps: number,
  totalDailyChangeKrw: number,
  topMovers: TopMover[],
  typeStats: TypeStat[],
): React.ReactNode {
  if (topMovers.length === 0) return null

  const up = portfolioChangeBps > 0
  const dn = portfolioChangeBps < 0
  const gainers = topMovers.filter((m) => m.dailyChangeBps > 0)
  const losers  = topMovers.filter((m) => m.dailyChangeBps < 0)

  const totalAbsChange = Math.abs(totalDailyChangeKrw)

  function Ticker({ m }: { m: TopMover }) {
    const mu = m.dailyChangeBps > 0
    const md = m.dailyChangeBps < 0
    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold border mx-0.5 align-middle',
        mu && 'bg-rose-50 text-rose-600 border-rose-200',
        md && 'bg-blue-50 text-blue-600 border-blue-200',
        !mu && !md && 'bg-muted text-muted-foreground border-border',
      )}>
        {m.name}
        <span className="opacity-70">{fmtPct(m.dailyChangeBps)}</span>
      </span>
    )
  }

  const sentences: React.ReactNode[] = []

  // 주도 상승 종목
  if (gainers.length > 0) {
    const top = gainers[0]
    const contrib = totalAbsChange > 0 ? Math.round((Math.abs(top.dailyChangeKrw) / totalAbsChange) * 100) : 0
    sentences.push(
      <span key="gainer">
        <Ticker m={top} />
        {gainers.length > 1 && (
          <> 등 {gainers.length}개 종목이</>
        )}
        {gainers.length === 1 && <>이(가)</>}
        {' '}
        <span className="text-rose-600 font-semibold">
          {up ? `+${fmtKrw(top.dailyChangeKrw)}` : fmtKrw(top.dailyChangeKrw)}
        </span>
        {contrib >= 20 && <span className="text-muted-foreground"> (전체 변동의 {contrib}%)</span>}
        {' '}상승을 이끌었습니다.
      </span>
    )
  }

  // 주도 하락 종목
  if (losers.length > 0) {
    const top = losers[0]
    const contrib = totalAbsChange > 0 ? Math.round((Math.abs(top.dailyChangeKrw) / totalAbsChange) * 100) : 0
    sentences.push(
      <span key="loser">
        <Ticker m={top} />
        {losers.length > 1 && (
          <> 등 {losers.length}개 종목은</>
        )}
        {losers.length === 1 && <>은(는)</>}
        {' '}
        <span className="text-blue-600 font-semibold">
          {fmtKrw(top.dailyChangeKrw)}
        </span>
        {contrib >= 20 && <span className="text-muted-foreground"> (전체 변동의 {contrib}%)</span>}
        {' '}하락했습니다.
      </span>
    )
  }

  // 결론
  if (up || dn) {
    const bestType = typeStats[0]
    const bestLabel = ASSET_TYPE_LABEL[bestType?.assetType] ?? bestType?.assetType
    if (bestType && Math.abs(bestType.weightedChangeBps) > 30) {
      sentences.push(
        <span key="type">
          전체적으로 <span className="text-foreground font-semibold">{bestLabel}</span> 섹터가{' '}
          <Num up={bestType.weightedChangeBps > 0} dn={bestType.weightedChangeBps < 0}>
            {fmtPct(bestType.weightedChangeBps)}
          </Num>
          {bestType.weightedChangeBps > 0 ? '로 포트폴리오 상승을 주도했습니다.' : '로 하락 압력을 높였습니다.'}
        </span>
      )
    }
  }

  if (sentences.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      {sentences.map((s, i) => (
        <p key={i} className="text-xs text-muted-foreground leading-relaxed">{s}</p>
      ))}
    </div>
  )
}

// ── component ───────────────────────────────────────────────────────────────

export function TodayReport({ performances }: { performances: AssetPerformance[] }) {
  const [open, setOpen] = useState(true)
  const { portfolioChangeBps, totalDailyChangeKrw, totalValueKrw, typeStats, topMovers, staleCount, liveCount } = useMemo(() => computeReport(performances), [performances])

  if (liveCount === 0) return null

  const isUp = portfolioChangeBps > 0
  const isDown = portfolioChangeBps < 0

  const insight = generateInsight(portfolioChangeBps, typeStats, totalDailyChangeKrw)
  const narrative = generateNarrative(portfolioChangeBps, totalDailyChangeKrw, topMovers, typeStats)

  return (
    <div data-component="TodayReport" className="rounded-2xl border border-border bg-card overflow-hidden" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold">오늘의 리포트</h2>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-1">{insight}</p>
          {narrative && (
            <div className="mt-1.5 space-y-0.5">{narrative}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
            isUp && 'bg-rose-50 text-rose-600',
            isDown && 'bg-blue-50 text-blue-600',
            !isUp && !isDown && 'bg-muted text-muted-foreground',
          )}>
            <SignIcon bps={portfolioChangeBps} />
            <span>{fmtPct(portfolioChangeBps)}</span>
            <span className="text-xs font-normal opacity-70">
              {totalDailyChangeKrw >= 0 ? '+' : ''}{fmtKrw(totalDailyChangeKrw)}
            </span>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <>
          <div className="border-t border-border grid grid-cols-1 sm:grid-cols-2">
            {/* 자산별 등락 */}
            <div className="px-4 sm:px-6 py-4 border-b sm:border-b-0 sm:border-r border-border">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-xs font-semibold text-muted-foreground mb-3">
                <BarChart2 className="h-3 w-3" />
                <span className="font-bold">자산별 등락</span>
              </div>
              <div className="space-y-1.5">
                {typeStats.map((t) => {
                  const up = t.weightedChangeBps > 0
                  const dn = t.weightedChangeBps < 0
                  const meta = ASSET_TYPE_META[t.assetType]
                  const Icon = meta?.icon ?? TrendingUp
                  return (
                    <div key={t.assetType} className="flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl bg-muted/50 border border-border">
                      <span className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0',
                        meta?.bg ?? 'bg-muted',
                      )}>
                        <Icon className={cn('h-3 w-3', meta?.color ?? 'text-muted-foreground')} />
                      </span>
                      <span className="text-xs font-medium text-foreground shrink-0 w-14 sm:w-16">
                        {meta?.label ?? t.assetType}
                      </span>
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            up ? 'bg-rose-500' : dn ? 'bg-blue-500' : 'bg-muted-foreground/30',
                          )}
                          style={{ width: `${Math.min(100, Math.abs(t.weightedChangeBps) / 3)}%` }}
                        />
                      </div>
                      <div className="text-right shrink-0">
                        <span className={cn(
                          'text-xs font-semibold',
                          up && 'text-rose-600',
                          dn && 'text-blue-600',
                          !up && !dn && 'text-muted-foreground',
                        )}>
                          {fmtPct(t.weightedChangeBps)}
                        </span>
                        <span className="hidden sm:inline text-xs text-muted-foreground ml-1.5">
                          {t.dailyChangeKrw >= 0 ? '+' : ''}{fmtKrw(t.dailyChangeKrw)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 주요 종목 */}
            <div className="px-4 sm:px-6 py-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-xs font-semibold text-muted-foreground mb-3">
                <TrendingUp className="h-3 w-3" />
                <span className="font-bold">주요 종목</span>
              </div>
              <div className="space-y-1.5">
                {topMovers.map((m) => {
                  const up = m.dailyChangeBps > 0
                  const dn = m.dailyChangeBps < 0
                  return (
                    <div key={m.name} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors">
                      <AssetLogo
                        ticker={m.ticker}
                        name={m.name}
                        assetType={m.assetType as any}
                        size={36}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate leading-tight font-bold">{m.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m.dailyChangeKrw >= 0 ? '+' : ''}{fmtKrw(m.dailyChangeKrw)}
                        </p>
                      </div>
                      <span className={cn(
                        'text-sm font-bold shrink-0',
                        up && 'text-rose-600',
                        dn && 'text-blue-600',
                        !up && !dn && 'text-muted-foreground',
                      )}>
                        {fmtPct(m.dailyChangeBps)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {staleCount > 0 && (
            <div className="px-4 sm:px-6 py-2 border-t border-border bg-amber-50 flex items-center gap-1.5 text-xs text-amber-700">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              {staleCount}개 종목 시세가 오래됐습니다. 수익률이 부정확할 수 있습니다.
            </div>
          )}
        </>
      )}
    </div>
  )
}
