'use client'
import { useState } from 'react'
import { Layers, LayoutGrid, TrendingUp, BarChart2, Bitcoin, Building2, PiggyBank, BookOpen, ChevronDown, HelpCircle, ShieldCheck, Gem } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { cn } from '@/lib/utils'
import { StalePriceBadge } from '@/components/app/stale-price-badge'
import { SparklineChart } from '@/components/app/sparkline-chart'
import { AssetGroupChart } from '@/components/app/asset-group-chart'
import { AssetLogo } from '@/components/app/asset-logo'
import { formatKrw, formatReturn, formatQty } from '@/lib/portfolio'
import type { AssetPerformance } from '@/lib/portfolio'
import type { MonthlyDataPoint, AnnualDataPoint, DailyDataPoint } from '@/lib/snapshot/aggregation'

const ASSET_TYPE_ORDER = [
  'stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate', 'insurance', 'precious_metal',
] as const

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  isa: 'ISA',
  irp: 'IRP',
  pension: '연금저축',
  dc: 'DC',
  brokerage: '위탁',
  spot: '현물',
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock_kr: '주식 (국내)',
  stock_us: '주식 (미국)',
  etf_kr: 'ETF (국내)',
  etf_us: 'ETF (미국)',
  crypto: '코인',
  fund: '펀드',
  savings: '예적금',
  real_estate: '부동산',
  insurance: '보험',
  precious_metal: '금/은',
}

const ASSET_TYPE_ICONS: Record<string, React.ElementType> = {
  stock_kr: TrendingUp,
  stock_us: TrendingUp,
  etf_kr: BarChart2,
  etf_us: BarChart2,
  crypto: Bitcoin,
  fund: BookOpen,
  savings: PiggyBank,
  real_estate: Building2,
  insurance: ShieldCheck,
  precious_metal: Gem,
}

const NO_SPARKLINE_TYPES = new Set(['fund', 'real_estate', 'savings', 'insurance', 'precious_metal'])

type MergedAsset = AssetPerformance & { mergedCount: number }

function mergeAssets(assets: AssetPerformance[]): MergedAsset[] {
  const map = new Map<string, MergedAsset>()
  for (const a of assets) {
    const key = a.ticker ?? a.name
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...a, mergedCount: 1 })
    } else {
      const totalCostKrw = existing.totalCostKrw + a.totalCostKrw
      const totalQuantity = existing.totalQuantity + a.totalQuantity
      const currentValueKrw = existing.currentValueKrw + a.currentValueKrw
      const returnPct = totalCostKrw > 0 ? ((currentValueKrw - totalCostKrw) / totalCostKrw) * 100 : 0
      map.set(key, {
        ...existing,
        totalQuantity,
        totalCostKrw,
        currentValueKrw,
        returnPct,
        isStale: existing.isStale || a.isStale,
        missingValuation: existing.missingValuation || a.missingValuation,
        mergedCount: existing.mergedCount + 1,
      })
    }
  }
  return Array.from(map.values())
}

const CARD_LIST_HEIGHT_PX = 360
const CARD_LIST_PADDING_PX = 16 // p-2 top + bottom
const CARD_HEIGHT_PX = 64 // approximate card height (py-3 + 40px logo)
const CARD_GAP_PX = 6 // space-y-1.5
const CARD_LIST_VISIBLE = Math.floor((CARD_LIST_HEIGHT_PX - CARD_LIST_PADDING_PX + CARD_GAP_PX) / (CARD_HEIGHT_PX + CARD_GAP_PX))

function AssetCardSkeleton({ showSparkline }: { showSparkline?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
      <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-28 bg-muted animate-pulse rounded-md" />
        <div className="h-3 w-44 bg-muted animate-pulse rounded-md" />
      </div>
      {showSparkline && <div className="w-20 h-9 bg-muted animate-pulse rounded-md shrink-0" />}
      <div className="text-right space-y-2 shrink-0">
        <div className="h-3.5 w-20 bg-muted animate-pulse rounded-md ml-auto" />
        <div className="h-3 w-14 bg-muted animate-pulse rounded-md ml-auto" />
      </div>
    </div>
  )
}

function AssetCard({ asset, sparklineData, showSparkline }: {
  asset: AssetPerformance & { mergedCount?: number }
  sparklineData?: number[]
  showSparkline?: boolean
}) {
  const hasHolding = asset.totalQuantity > 0
  const isCrypto = asset.assetType === 'crypto'
  const hasValue = asset.currentValueKrw > 0
  const hasCost = asset.totalCostKrw > 0
  const profit = asset.currentValueKrw - asset.totalCostKrw
  const mergedCount = (asset as MergedAsset).mergedCount ?? 1

  const RETURN_BADGE_TYPES = new Set(['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund'])
  const dailyChangePct = asset.dailyChangeBps !== null && asset.dailyChangeBps !== undefined
    ? asset.dailyChangeBps / 100
    : null
  const showReturnBadge = RETURN_BADGE_TYPES.has(asset.assetType) && dailyChangePct !== null
  const returnBadge = showReturnBadge ? (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 tabular-nums ${
      dailyChangePct! >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
    }`}>
      {dailyChangePct! >= 0 ? '+' : ''}{dailyChangePct!.toFixed(2)}%
    </span>
  ) : null

  const badge = mergedCount > 1 ? (
    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
      {mergedCount}계좌
    </span>
  ) : asset.accountType ? (
    <span className="text-xs rounded-full px-2 py-0.5 bg-secondary text-secondary-foreground font-medium shrink-0">
      {ACCOUNT_TYPE_LABELS[asset.accountType]}
    </span>
  ) : null

  const nameBlock = (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-sm leading-tight truncate">{asset.name}</span>
        {returnBadge}
        {badge}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
        {hasHolding && <span>수량 {formatQty(asset.totalQuantity, isCrypto)}</span>}
        {asset.avgCostPerUnit > 0 && (
          <><span className="opacity-30">·</span><span>매수 {formatKrw(asset.avgCostPerUnit)}</span></>
        )}
        {asset.currentPriceKrw > 0 && (asset.priceType === 'live' || asset.assetType === 'fund') && (
          <><span className="opacity-30">·</span>
          <span className="flex items-center gap-1">
            현재 {formatKrw(asset.currentPriceKrw)}
            {asset.isStale && asset.cachedAt && <StalePriceBadge cachedAt={asset.cachedAt} />}
          </span></>
        )}
      </div>
    </div>
  )

  const valueBlock = (
    <div className="text-right shrink-0">
      <div className="text-sm font-semibold tabular-nums">
        {hasValue ? formatKrw(asset.currentValueKrw) : hasCost ? formatKrw(asset.totalCostKrw) : '—'}
      </div>
      {hasValue && hasCost && (
        <div className={`text-xs font-medium tabular-nums ${asset.returnPct >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
          {profit >= 0 ? '+' : ''}{formatKrw(profit)}
          <span className="ml-1 opacity-75">{formatReturn(asset.returnPct)}</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <AssetLogo ticker={asset.ticker} name={asset.name} assetType={asset.assetType} size={40} />
        {nameBlock}
      </div>
      {showSparkline && (
        <div className="shrink-0 w-20 flex items-center justify-center">
          {sparklineData && (
            <SparklineChart data={sparklineData} positive={asset.returnPct >= 0} width={80} height={36} />
          )}
        </div>
      )}
      {valueBlock}
    </div>
  )
}

function SummaryBar({ assets }: { assets: AssetPerformance[] }) {
  const totalCost = assets.reduce((s, a) => s + a.totalCostKrw, 0)
  const valuedAssets = assets.filter((a) => a.currentValueKrw > 0)
  const totalValue = valuedAssets.reduce((s, a) => s + a.currentValueKrw, 0)
  const valuedCost = valuedAssets.reduce((s, a) => s + a.totalCostKrw, 0)
  const totalProfit = totalValue - valuedCost
  const totalReturnPct = valuedCost > 0 ? (totalProfit / valuedCost) * 100 : null
  const hasAnyValue = totalValue > 0

  return (
    <div className="flex items-center gap-3 text-sm px-1">
      <div className="flex items-baseline gap-1">
        <span className="text-xs text-muted-foreground">투자</span>
        <span className="font-semibold">{totalCost > 0 ? formatKrw(totalCost) : '—'}</span>
      </div>
      <div className="h-4 w-px bg-border shrink-0" />
      <div className="flex items-baseline gap-1">
        <span className="text-xs text-muted-foreground">평가</span>
        <span className="font-semibold">{hasAnyValue ? formatKrw(totalValue) : '—'}</span>
      </div>
      <div className="h-4 w-px bg-border shrink-0" />
      <div className="flex items-baseline gap-1">
        <span className="text-xs text-muted-foreground">손익</span>
        {hasAnyValue && totalCost > 0 ? (
          <span className={`font-semibold ${totalProfit >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
            {totalProfit >= 0 ? '+' : ''}{formatKrw(totalProfit)}
            {totalReturnPct !== null && (
              <span className="text-xs ml-1 opacity-80">{formatReturn(totalReturnPct)}</span>
            )}
          </span>
        ) : <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  )
}

function AssetCardList({ assets, title, sparklines }: {
  assets: AssetPerformance[]
  title?: React.ReactNode
  sparklines?: Record<string, number[]>
}) {
  const [merged, setMerged] = useState(true)

  const showSparkline = assets.some((a) => !NO_SPARKLINE_TYPES.has(a.assetType))
  const hasDuplicates = new Set(assets.map((a) => a.ticker ?? a.name)).size < assets.length
  const displayAssets = merged ? mergeAssets(assets) : assets

  return (
    <div className="space-y-2">
      {(title || hasDuplicates) && (
        <div className="flex items-center justify-between px-1">
          {title && <div className="flex items-center gap-2">{title}</div>}
          {hasDuplicates && (
            <button
              onClick={() => setMerged((v) => !v)}
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), !merged && 'opacity-50')}
            >
              <Layers className="h-3.5 w-3.5" />
              종목 합산
            </button>
          )}
        </div>
      )}
      <div className="space-y-1.5 h-[360px] overflow-y-auto pr-1 rounded-xl border border-border bg-muted/20 p-2">
        {displayAssets.map((asset) => (
          <AssetCard
            key={'mergedCount' in asset && (asset as MergedAsset).mergedCount > 1
              ? (asset.ticker ?? asset.name)
              : asset.assetId}
            asset={asset}
            sparklineData={asset.ticker ? sparklines?.[asset.ticker] : undefined}
            showSparkline={showSparkline}
          />
        ))}
        {Array.from({ length: Math.max(0, CARD_LIST_VISIBLE - displayAssets.length) }).map((_, i) => (
          <AssetCardSkeleton key={`skeleton-${i}`} showSparkline={showSparkline} />
        ))}
      </div>
    </div>
  )
}

function CollapsibleChart({ assets, sparklines, monthlyData, annualData }: {
  assets: AssetPerformance[]
  sparklines?: Record<string, number[]>
  monthlyData: MonthlyDataPoint[]
  annualData: AnnualDataPoint[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        <span>차트</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="h-[360px] px-4 pb-4">
          <AssetGroupChart assets={assets} sparklines={sparklines} monthlyData={monthlyData} annualData={annualData} />
        </div>
      )}
    </div>
  )
}

function SummaryCards({ grouped, performances }: { grouped: Record<string, AssetPerformance[]>; performances: AssetPerformance[] }) {
  const types = Object.keys(grouped)

  const grandTotalCost = performances.reduce((s, a) => s + Number(a.totalCostKrw), 0)
  const valuedAssets = performances.filter((a) => a.currentValueKrw > 0)
  const grandTotalValue = valuedAssets.reduce((s, a) => s + Number(a.currentValueKrw), 0)
  const valuedCost = valuedAssets.reduce((s, a) => s + Number(a.totalCostKrw), 0)
  const grandProfit = grandTotalValue - valuedCost
  const grandReturnPct = valuedCost > 0 ? (grandProfit / valuedCost) * 100 : null
  const grandHasValue = grandTotalValue > 0

  return (
    <div className="space-y-3">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-zinc-100 via-white to-zinc-100 text-zinc-900 px-8 py-6 relative overflow-hidden border border-border">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-zinc-200/40" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-zinc-200/30" />
        <div className="relative flex items-stretch gap-10 flex-wrap">
          <div>
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-2">총 투자</p>
            <p className="text-3xl font-bold tabular-nums">{grandTotalCost > 0 ? formatKrw(grandTotalCost) : '—'}</p>
            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-xs">
              <PiggyBank className="h-3 w-3" />투자한 원금 합계
            </span>
          </div>
          {grandHasValue && (
            <>
              <div className="w-px bg-zinc-200 self-stretch" />
              <div>
                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-2">평가금액</p>
                <p className="text-3xl font-bold tabular-nums">{formatKrw(grandTotalValue)}</p>
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-xs">
                  <BarChart2 className="h-3 w-3" />현재 시세 기준 총 자산
                </span>
              </div>
              <div className="w-px bg-zinc-200 self-stretch" />
              <div className="ml-auto text-right">
                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-2">평가손익</p>
                <p className={`text-3xl font-bold tabular-nums ${grandProfit >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                  {grandProfit >= 0 ? '+' : ''}{formatKrw(grandProfit)}
                </p>
                {grandReturnPct !== null && (
                  <p className={`text-sm font-semibold mt-1 ${grandProfit >= 0 ? 'text-red-400' : 'text-blue-500'}`}>
                    {formatReturn(grandReturnPct)}
                  </p>
                )}
                <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-xs">
                  <TrendingUp className="h-3 w-3" />원금 대비 수익금
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Per-type strip */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${types.length}, 1fr)` }}>
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
            <div key={type} className="rounded-xl bg-card border border-border px-4 py-3 flex flex-col gap-1">
              <div className="flex items-center justify-between mb-0.5">
                <AssetTypeBadge assetType={type as AssetPerformance['assetType']} />
                <span className="text-xs text-muted-foreground">{assets.length}종목</span>
              </div>
              <p className="text-base font-bold tabular-nums">{totalCost > 0 ? formatKrw(totalCost) : '—'}</p>
              {hasValue && valuedCostInType > 0 ? (
                <p className={`text-xs font-semibold tabular-nums ${profit >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                  {profit >= 0 ? '+' : ''}{formatKrw(profit)}
                  {returnPct !== null && <span className="ml-1 opacity-70">{formatReturn(returnPct)}</span>}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface AssetsPageClientProps {
  performances: AssetPerformance[]
  sparklines?: Record<string, number[]>
  monthlyData?: MonthlyDataPoint[]
  annualData?: AnnualDataPoint[]
  monthlyByType?: Record<string, MonthlyDataPoint[]>
  annualByType?: Record<string, AnnualDataPoint[]>
  dailyByType?: Record<string, DailyDataPoint[]>
}

export function AssetsPageClient({ performances, sparklines, monthlyData = [], annualData = [], monthlyByType = {}, annualByType = {}, dailyByType = {} }: AssetsPageClientProps) {
  const grouped = ASSET_TYPE_ORDER.reduce<Record<string, AssetPerformance[]>>((acc, type) => {
    const items = performances.filter((a) => a.assetType === type)
    if (items.length > 0) acc[type] = items
    return acc
  }, {})

  const types = Object.keys(grouped)
  const defaultTab = types[0] ?? 'all'

  if (performances.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-sm font-semibold text-foreground">등록된 자산이 없습니다</p>
        <p className="text-sm text-muted-foreground">첫 번째 자산을 추가하여 포트폴리오를 시작해보세요.</p>
      </div>
    )
  }

  const showAll = types.length > 1

  return (
    <div className="space-y-6">
      <SummaryCards grouped={grouped} performances={performances} />
      <Separator className="bg-foreground" />
      <Tabs defaultValue={showAll ? 'all' : defaultTab}>
        <TabsList className="w-full">
          {showAll && (
            <TabsTrigger value="all" className="flex-1">
              <LayoutGrid className="h-3.5 w-3.5" />
              전체
            </TabsTrigger>
          )}
          {types.map((type) => {
            const Icon = ASSET_TYPE_ICONS[type]
            return (
              <TabsTrigger key={type} value={type} className="flex-1">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {ASSET_TYPE_LABELS[type]}
                <span className="ml-1 text-xs opacity-60">({grouped[type].length})</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {showAll && (
          <TabsContent value="all" className="mt-4">
            <div className="space-y-0">
              {types.map((type, i) => (
                <div key={type}>
                  {i > 0 && <Separator className="my-6 bg-foreground" />}
                  <div className="flex gap-4 items-start">
                    <div className="w-[640px] shrink-0">
                      <AssetCardList
                        assets={grouped[type]}
                        sparklines={sparklines}
                        title={
                          <>
                            <AssetTypeBadge assetType={type as AssetPerformance['assetType']} />
                            {type === 'fund' && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <HelpCircle className="h-3 w-3" />
                                1일 1회 기준가 갱신
                              </span>
                            )}
                          </>
                        }
                      />
                    </div>
                    <div className="self-stretch w-px bg-foreground shrink-0" />
                    <div className="space-y-3 flex-1 min-w-0">
                      <SummaryBar assets={grouped[type]} />
                      <div className="h-[360px] bg-card rounded-2xl border border-border p-4">
                        <AssetGroupChart assets={grouped[type]} sparklines={sparklines} monthlyData={monthlyByType[type] ?? []} annualData={annualByType[type] ?? []} dailyData={dailyByType[type] ?? []} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {types.map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            <div className="flex gap-4 items-start">
              <div className="w-[640px] shrink-0">
                <AssetCardList assets={grouped[type]} sparklines={sparklines} />
              </div>
              <div className="self-stretch w-px bg-border shrink-0" />
              <div className="space-y-3 flex-1 min-w-0">
                <SummaryBar assets={grouped[type]} />
                <div className="h-[360px] bg-card rounded-2xl border border-border p-4">
                  <AssetGroupChart
                    assets={grouped[type]}
                    sparklines={sparklines}
                    monthlyData={monthlyByType[type] ?? []}
                    annualData={annualByType[type] ?? []}
                    dailyData={dailyByType[type] ?? []}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
