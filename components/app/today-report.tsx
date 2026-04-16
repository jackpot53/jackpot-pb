'use client'
import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, Minus, TriangleAlert, ChevronDown,
  BarChart2, Bitcoin, Building2, PiggyBank, BookOpen, ShieldCheck, Gem, CreditCard,
  Newspaper, ExternalLink,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssetPerformance } from '@/lib/portfolio/portfolio'
import { AssetLogo } from '@/components/app/asset-logo'
import type { NewsItem } from '@/app/api/market-news/route'

// ── helpers ────────────────────────────────────────────────────────────────

const ASSET_TYPE_META: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  stock_kr:      { label: '국내주식', icon: TrendingUp,  color: 'text-blue-700',   bg: 'bg-blue-100' },
  stock_us:      { label: '미국주식', icon: TrendingUp,  color: 'text-indigo-700', bg: 'bg-indigo-100' },
  etf_kr:        { label: '국내ETF',  icon: BarChart2,   color: 'text-emerald-700',bg: 'bg-emerald-100' },
  etf_us:        { label: '미국ETF',  icon: BarChart2,   color: 'text-teal-700',   bg: 'bg-teal-100' },
  crypto:        { label: '코인',     icon: Bitcoin,     color: 'text-orange-700', bg: 'bg-orange-100' },
  fund:          { label: '펀드',     icon: BookOpen,    color: 'text-violet-700', bg: 'bg-violet-100' },
  savings:       { label: '예적금',   icon: PiggyBank,   color: 'text-yellow-700', bg: 'bg-yellow-100' },
  real_estate:   { label: '부동산',   icon: Building2,   color: 'text-rose-700',   bg: 'bg-rose-100' },
  insurance:     { label: '보험',     icon: ShieldCheck, color: 'text-cyan-700',   bg: 'bg-cyan-100' },
  precious_metal:{ label: '금/은',    icon: Gem,         color: 'text-amber-700',  bg: 'bg-amber-100' },
  cma:           { label: 'CMA',      icon: CreditCard,  color: 'text-cyan-800',   bg: 'bg-cyan-100' },
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

function generateInsight(portfolioChangeBps: number, typeStats: TypeStat[], totalDailyChangeKrw: number): string {
  if (typeStats.length === 0) return '오늘 시세 데이터가 없습니다.'

  const sign = portfolioChangeBps > 0 ? '상승' : portfolioChangeBps < 0 ? '하락' : '보합'
  const absPct = Math.abs(portfolioChangeBps / 100).toFixed(2)
  const absKrw = fmtKrw(Math.abs(totalDailyChangeKrw))

  const best = typeStats[0]
  const bestLabel = ASSET_TYPE_LABEL[best.assetType] ?? best.assetType

  if (portfolioChangeBps === 0) return '오늘 포트폴리오 변동이 없습니다.'

  const change = portfolioChangeBps > 0 ? `${absKrw} 증가` : `${absKrw} 감소`
  const driver = Math.abs(best.weightedChangeBps) > 50
    ? ` ${bestLabel}(${fmtPct(best.weightedChangeBps)})이 주도했습니다.`
    : ''

  return `포트폴리오가 ${absPct}% ${sign}하며 ${change}했습니다.${driver}`
}

// ── news hook ────────────────────────────────────────────────────────────────

function useMarketNews(assetTypes: string[]) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = assetTypes.length > 0 ? `?types=${assetTypes.join(',')}` : ''
    fetch(`/api/market-news${params}`)
      .then((r) => r.json())
      .then((data) => { setNews(data); setLoading(false) })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetTypes.join(',')])

  return { news, loading }
}

// ── component ───────────────────────────────────────────────────────────────

export function TodayReport({ performances }: { performances: AssetPerformance[] }) {
  const [open, setOpen] = useState(true)
  const { portfolioChangeBps, totalDailyChangeKrw, totalValueKrw, typeStats, topMovers, staleCount, liveCount } = computeReport(performances)
  const assetTypes = [...new Set(performances.map((a) => a.assetType))]
  const { news, loading: newsLoading } = useMarketNews(assetTypes)

  if (liveCount === 0) return null

  const isUp = portfolioChangeBps > 0
  const isDown = portfolioChangeBps < 0

  const insight = generateInsight(portfolioChangeBps, typeStats, totalDailyChangeKrw)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="text-left">
          <h2 className="text-base font-semibold">오늘의 리포트</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{insight}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Portfolio daily change pill */}
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
            isUp && 'bg-emerald-100 text-emerald-700',
            isDown && 'bg-red-100 text-red-700',
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
          <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
            {/* Left: Type breakdown */}
            <div className="px-6 py-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-[11px] font-semibold text-muted-foreground mb-3">
                <BarChart2 className="h-3 w-3" />
                자산별 등락
              </div>
              <div className="space-y-1.5">
                {typeStats.map((t) => {
                  const up = t.weightedChangeBps > 0
                  const dn = t.weightedChangeBps < 0
                  const meta = ASSET_TYPE_META[t.assetType]
                  const Icon = meta?.icon ?? TrendingUp
                  return (
                    <div key={t.assetType} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30">
                      {/* 아이콘 + 라벨 */}
                      <span className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0',
                        meta?.bg ?? 'bg-muted',
                      )}>
                        <Icon className={cn('h-3 w-3', meta?.color ?? 'text-muted-foreground')} />
                      </span>
                      <span className="text-xs font-medium text-foreground shrink-0 w-16">
                        {meta?.label ?? t.assetType}
                      </span>
                      {/* 바 */}
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            up ? 'bg-emerald-400' : dn ? 'bg-red-400' : 'bg-muted-foreground/30',
                          )}
                          style={{ width: `${Math.min(100, Math.abs(t.weightedChangeBps) / 3)}%` }}
                        />
                      </div>
                      {/* 수치 */}
                      <div className="text-right shrink-0">
                        <span className={cn(
                          'text-xs font-mono font-semibold',
                          up && 'text-emerald-600',
                          dn && 'text-red-500',
                          !up && !dn && 'text-muted-foreground',
                        )}>
                          {fmtPct(t.weightedChangeBps)}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">
                          {t.dailyChangeKrw >= 0 ? '+' : ''}{fmtKrw(t.dailyChangeKrw)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: Top movers */}
            <div className="px-6 py-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-[11px] font-semibold text-muted-foreground mb-3">
                <TrendingUp className="h-3 w-3" />
                주요 종목
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
                        <p className="text-xs font-semibold truncate leading-tight">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {m.dailyChangeKrw >= 0 ? '+' : ''}{fmtKrw(m.dailyChangeKrw)}
                        </p>
                      </div>
                      <span className={cn(
                        'text-sm font-mono font-bold shrink-0',
                        up && 'text-emerald-600',
                        dn && 'text-red-500',
                        !up && !dn && 'text-muted-foreground',
                      )}>
                        {fmtPct(m.dailyChangeBps)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: News headlines */}
            <div className="px-6 py-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-[11px] font-semibold text-muted-foreground mb-3">
                <Newspaper className="h-3 w-3" />
                증시 뉴스
              </div>
              {newsLoading ? (
                <div className="space-y-2.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-3.5 bg-muted rounded animate-pulse" style={{ width: `${65 + (i % 3) * 12}%` }} />
                  ))}
                </div>
              ) : news.length > 0 ? (
                <div className="divide-y divide-border">
                  {news.map((item, i) => (
                    <a
                      key={i}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 py-2 group"
                    >
                      <span className="text-[11px] font-medium text-muted-foreground/50 shrink-0 w-4 pt-px">{i + 1}</span>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground leading-relaxed flex-1 transition-colors">
                        {item.title}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground mt-px transition-colors" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">뉴스를 불러올 수 없습니다.</p>
              )}
            </div>
          </div>

          {/* Stale warning footer */}
          {staleCount > 0 && (
            <div className="px-6 py-2 border-t border-border bg-amber-50 flex items-center gap-1.5 text-xs text-amber-700">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              {staleCount}개 종목 시세가 오래됐습니다. 수익률이 부정확할 수 있습니다.
            </div>
          )}
        </>
      )}
    </div>
  )
}
