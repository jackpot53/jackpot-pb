'use client'
import { useState } from 'react'
import { Layers, LayoutGrid, TrendingUp, BarChart2, Bitcoin, Building2, PiggyBank, BookOpen, ChevronDown, HelpCircle, ShieldCheck, Gem, CreditCard, Plus } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { cn } from '@/lib/utils'
import { StalePriceBadge } from '@/components/app/stale-price-badge'
import { SparklineChart } from '@/components/app/sparkline-chart'
import dynamic from 'next/dynamic'
const AssetGroupChart = dynamic(
  () => import('@/components/app/asset-group-chart').then(m => ({ default: m.AssetGroupChart })),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-muted rounded-xl" /> }
)
import { AssetLogo } from '@/components/app/asset-logo'
import type { CandlestickPoint } from '@/components/app/candlestick-chart'
const CandlestickChart = dynamic(
  () => import('@/components/app/candlestick-chart').then(m => ({ default: m.CandlestickChart })),
  { ssr: false }
)
import { formatKrw, formatUsd, formatReturn, formatQty } from '@/lib/portfolio'
import type { AssetPerformance } from '@/lib/portfolio'
import type { MonthlyDataPoint, AnnualDataPoint, DailyDataPoint } from '@/lib/snapshot/aggregation'
import { TodayReport } from '@/components/app/today-report'

const ASSET_TYPE_ORDER = [
  'stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate', 'insurance', 'precious_metal', 'cma',
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
  cma: 'CMA',
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
  cma: CreditCard,
}

const ASSET_TYPE_ACCENT: Record<string, string> = {
  stock_kr: 'border-l-blue-500',
  stock_us: 'border-l-sky-500',
  etf_kr: 'border-l-violet-500',
  etf_us: 'border-l-purple-400',
  crypto: 'border-l-orange-400',
  fund: 'border-l-teal-500',
  savings: 'border-l-emerald-500',
  real_estate: 'border-l-amber-600',
  insurance: 'border-l-slate-400',
  precious_metal: 'border-l-yellow-400',
  cma: 'border-l-pink-400',
}

const ASSET_TYPE_BG: Record<string, string> = {
  stock_kr: 'bg-blue-50/60',
  stock_us: 'bg-sky-50/60',
  etf_kr: 'bg-violet-50/60',
  etf_us: 'bg-purple-50/60',
  crypto: 'bg-orange-50/60',
  fund: 'bg-teal-50/60',
  savings: 'bg-emerald-50/60',
  real_estate: 'bg-amber-50/60',
  insurance: 'bg-slate-50/60',
  precious_metal: 'bg-yellow-50/60',
  cma: 'bg-pink-50/60',
}

const NO_SPARKLINE_TYPES = new Set(['fund', 'real_estate', 'savings', 'insurance', 'precious_metal', 'cma'])

const BROKERAGE_LABELS: Record<string, string> = {
  sec_mirae: '미래에셋', sec_samsung: '삼성', sec_korea: '한국투자',
  sec_kb: 'KB', sec_nh: 'NH투자', sec_shinhan: '신한투자',
  sec_kiwoom: '키움', sec_daishin: '대신', sec_hana: '하나',
  sec_meritz: '메리츠', sec_toss: '토스', sec_kakao: '카카오페이',
  sec_hyundai: '현대차', sec_kyobo: '교보', sec_ibk: 'IBK',
}

const OWNER_ICONS: Record<string, string> = {
  개인: '👤', 엄마: '👩', 아빠: '👨', 동생: '🧒', 누나: '👱‍♀️',
  형: '👱‍♂️', 아내: '👰', 남편: '🤵', 딸: '👧', 아들: '👦',
}

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


function AssetCardSkeleton({ showSparkline, assetType }: { showSparkline?: boolean; assetType?: string }) {
  const label = assetType ? ASSET_TYPE_LABELS[assetType] : '종목'
  return (
    <div className="flex items-stretch gap-2">
      <a
        href="/assets/new"
        className="flex flex-col flex-1 min-w-0 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-white/60 px-3 py-3 items-center justify-center gap-2 hover:border-muted-foreground/40 hover:bg-white/80 transition-colors cursor-pointer"
      >
        <div className="w-9 h-9 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
          <Plus className="h-4 w-4 text-muted-foreground/40" />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-muted-foreground/60">{label} 추가 시</p>
          <p className="text-[11px] text-muted-foreground/40 mt-0.5">이 자리에 표시됩니다</p>
        </div>
      </a>
      {showSparkline && (
        <div className="w-[100px] shrink-0 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-white/60" />
      )}
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

  // US 자산 여부 (stock_us, etf_us) — currency가 아닌 assetType으로 판단
  const isUsAsset = asset.assetType === 'stock_us' || asset.assetType === 'etf_us'
  // 원화매수: US 자산을 KRW로 환전해 매수 (asset.currency = 'KRW')
  // 달러매수: US 자산을 USD로 직접 매수 (asset.currency = 'USD')
  const isKrwPurchase = isUsAsset && asset.currency === 'KRW'
  const isUsdPurchase = isUsAsset && asset.currency === 'USD'
  const hasFxBreakdown = asset.stockReturnPct != null && asset.fxReturnPct != null

  // FX 분해: 달러수익 × 현재환율 / 원금 × 환율변동 (유저 멘탈모델 기준)
  // stockGainKrw = qty × (현재USD가 - 매수USD가) × 현재환율  (달러 수익을 현재환율로 환산)
  // fxGainKrw    = qty × 매수USD가 × (현재환율 - 매수환율)   (원금의 환차손익)
  const qty = asset.totalQuantity / 1e8
  const avgCostUsd = asset.avgCostPerUnitOriginal != null ? asset.avgCostPerUnitOriginal / 100 : null
  const avgFxRate = asset.avgExchangeRateAtTime != null ? asset.avgExchangeRateAtTime / 10000 : null
  const stockGainKrw =
    hasFxBreakdown && avgCostUsd != null && asset.currentPriceUsd != null && asset.currentFxRate != null
      ? Math.round(qty * (asset.currentPriceUsd - avgCostUsd) * asset.currentFxRate)
      : null
  const fxGainKrw =
    hasFxBreakdown && avgCostUsd != null && avgFxRate != null && asset.currentFxRate != null
      ? Math.round(qty * avgCostUsd * (asset.currentFxRate - avgFxRate))
      : null

  const dailyChangePct = asset.dailyChangeBps !== null && asset.dailyChangeBps !== undefined
    ? asset.dailyChangeBps / 100
    : null

  const accountBadge = mergedCount > 1 ? (
    <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
      {mergedCount}계좌
    </span>
  ) : asset.accountType && ACCOUNT_TYPE_LABELS[asset.accountType] ? (
    <span className="text-[11px] rounded px-1.5 py-0.5 bg-muted text-muted-foreground font-medium shrink-0">
      {ACCOUNT_TYPE_LABELS[asset.accountType]}
    </span>
  ) : null

  const brokerageLabel = asset.brokerageId && BROKERAGE_LABELS[asset.brokerageId]
    ? BROKERAGE_LABELS[asset.brokerageId] : null

  const nameBlock = (
    <div className="flex-1 min-w-0">
      {/* Row1: 이름 (짤림 없이) */}
      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
        <span className="font-semibold text-sm leading-snug break-all">{asset.name}</span>
        {asset.ticker && (
          <span className="font-mono text-[11px] text-muted-foreground/70 shrink-0 bg-muted px-1 rounded">{asset.ticker}</span>
        )}
        {dailyChangePct !== null && (
          <span className={`text-[11px] font-semibold tabular-nums shrink-0 px-1.5 py-0.5 rounded ${dailyChangePct >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
            오늘 {dailyChangePct >= 0 ? '+' : ''}{dailyChangePct.toFixed(2)}%
          </span>
        )}
      </div>
      {/* Row2: 금융기관 · 계좌 · 소유주 배지 */}
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {brokerageLabel && (
          <span className="text-[11px] rounded px-1.5 py-0.5 bg-muted text-muted-foreground font-medium">{brokerageLabel}</span>
        )}
        {accountBadge}
        {asset.owner && (
          <span className="text-[11px] text-muted-foreground">
            {OWNER_ICONS[asset.owner] ?? '👤'} {asset.owner}
          </span>
        )}
      </div>
      {/* Row3: 수량 · 매수가 · 현재가 */}
      {hasHolding && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
          <span className="tabular-nums"><span className="opacity-60">수량</span> <span className="font-medium">{formatQty(asset.totalQuantity, isCrypto)}</span></span>
          {asset.avgCostPerUnit > 0 && (
            <><span className="opacity-30">|</span><span className="tabular-nums"><span className="opacity-60">매수</span> <span className="font-medium">{asset.avgCostPerUnitOriginal != null ? formatUsd(asset.avgCostPerUnitOriginal / 100) : formatKrw(asset.avgCostPerUnit)}</span></span></>
          )}
          {asset.currentPriceKrw > 0 && (asset.priceType === 'live' || asset.assetType === 'fund') && (
            <><span className="opacity-30">|</span><span className="inline-flex items-center gap-1 tabular-nums"><span className="opacity-60">현재</span> <span className="font-medium">{asset.currentPriceUsd != null ? formatUsd(asset.currentPriceUsd) : formatKrw(asset.currentPriceKrw)}</span>{asset.isStale && asset.cachedAt && <StalePriceBadge cachedAt={asset.cachedAt} />}</span></>
          )}
        </div>
      )}
      {/* Row4: US 자산 FX 컨텍스트 */}
      {isUsAsset && (
        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] flex-wrap">
          <span className={`font-medium shrink-0 ${isKrwPurchase ? 'text-amber-600' : 'text-sky-600'}`}>
            {isKrwPurchase ? '원화매수' : '달러매수'}
          </span>
          {hasFxBreakdown && stockGainKrw != null && fxGainKrw != null ? (
            <>
              <span className="opacity-30">·</span>
              <span className={stockGainKrw >= 0 ? 'text-red-500' : 'text-blue-600'}>
                주가 {stockGainKrw >= 0 ? '+' : ''}{formatKrw(stockGainKrw)}
              </span>
              <span className="opacity-30">·</span>
              <span className={fxGainKrw >= 0 ? 'text-red-500' : 'text-blue-600'}>
                환차 {fxGainKrw >= 0 ? '+' : ''}{formatKrw(fxGainKrw)}
              </span>
              {avgFxRate != null && asset.currentFxRate != null && (
                <>
                  <span className="opacity-30">·</span>
                  <span className="text-muted-foreground/60">
                    환율 ₩{Math.round(avgFxRate).toLocaleString()} → ₩{Math.round(asset.currentFxRate).toLocaleString()}
                  </span>
                  {asset.fxReturnPct != null && (
                    <span className={`font-medium ${asset.fxReturnPct >= 0 ? 'text-red-400' : 'text-blue-500'}`}>
                      ({asset.fxReturnPct >= 0 ? '+' : ''}{asset.fxReturnPct.toFixed(1)}%)
                    </span>
                  )}
                </>
              )}
            </>
          ) : isUsdPurchase && asset.currentFxRate != null ? (
            <>
              <span className="opacity-30">·</span>
              <span className="text-muted-foreground/60">₩{Math.round(asset.currentFxRate).toLocaleString()} 기준</span>
            </>
          ) : isKrwPurchase ? (
            <>
              <span className="opacity-30">·</span>
              <span className="text-muted-foreground/60">주가+환율 변동 반영</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  )

  const valueFooter = (hasValue || hasCost) && (
    <div className="mt-2 pt-2 border-t border-border/50 flex items-baseline gap-2 text-sm tabular-nums flex-wrap">
      <span className="text-[10px] text-muted-foreground/60">평가</span>
      <span className="font-bold">{hasValue ? formatKrw(asset.currentValueKrw) : formatKrw(asset.totalCostKrw)}</span>
      {isUsdPurchase && asset.currentPriceUsd != null && hasHolding && hasValue && (
        <span className="text-[10px] text-muted-foreground/60">({formatUsd(asset.currentPriceUsd * asset.totalQuantity / 1e8)})</span>
      )}
      {hasValue && hasCost && (
        <>
          <span className="text-border/60">|</span>
          <span className="text-[10px] text-muted-foreground/60">손익</span>
          <span className={`font-bold ${profit >= 0 ? 'text-red-500' : 'text-blue-600'}`}>{profit >= 0 ? '+' : ''}{formatKrw(profit)}</span>
          <span className="text-border/60">|</span>
          <span className={`font-bold ${asset.returnPct >= 0 ? 'text-red-500' : 'text-blue-600'}`}>{formatReturn(asset.returnPct)}</span>
        </>
      )}
    </div>
  )

  return (
    <div className="flex items-stretch gap-2">
      {/* 종목 카드 */}
      <div className={cn("flex items-center gap-3 flex-1 min-w-0 rounded-lg border border-border px-3 py-3 border-l-4", ASSET_TYPE_ACCENT[asset.assetType] ?? 'border-l-border', ASSET_TYPE_BG[asset.assetType] ?? 'bg-card')}>
        <div className="shrink-0">
          <AssetLogo ticker={asset.ticker} name={asset.name} assetType={asset.assetType} size={38} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          {nameBlock}
          {valueFooter}
        </div>
      </div>

      {/* 스파크라인 카드 */}
      {showSparkline && (
        <div className="w-[100px] shrink-0 rounded-lg border border-border bg-card flex items-center justify-center overflow-hidden">
          {sparklineData
            ? <SparklineChart data={sparklineData} positive={asset.returnPct >= 0} width={100} height={50} />
            : <div className="w-full h-full" />
          }
        </div>
      )}
    </div>
  )
}

function AssetGridCard({ asset, sparklineData }: {
  asset: AssetPerformance & { mergedCount?: number }
  sparklineData?: number[]
}) {
  const hasValue = asset.currentValueKrw > 0
  const hasCost = asset.totalCostKrw > 0
  const profit = asset.currentValueKrw - asset.totalCostKrw
  const mergedCount = (asset as MergedAsset).mergedCount ?? 1
  const showSpark = !NO_SPARKLINE_TYPES.has(asset.assetType)
  const dailyChangePct = asset.dailyChangeBps != null ? asset.dailyChangeBps / 100 : null
  const brokerageLabel = asset.brokerageId && BROKERAGE_LABELS[asset.brokerageId] ? BROKERAGE_LABELS[asset.brokerageId] : null
  const accountLabel = mergedCount > 1 ? `${mergedCount}계좌`
    : asset.accountType && ACCOUNT_TYPE_LABELS[asset.accountType] ? ACCOUNT_TYPE_LABELS[asset.accountType] : null

  return (
    <div className={cn("rounded-xl border border-border p-3.5 flex flex-col gap-2 hover:brightness-95 transition-all border-l-4", ASSET_TYPE_ACCENT[asset.assetType] ?? 'border-l-border', ASSET_TYPE_BG[asset.assetType] ?? 'bg-card')}>
      {/* 헤더: 로고 + 오늘 변동 */}
      <div className="flex items-start justify-between gap-2">
        <AssetLogo ticker={asset.ticker} name={asset.name} assetType={asset.assetType} size={36} />
        {dailyChangePct !== null && (
          <span className={`text-[11px] font-semibold tabular-nums shrink-0 px-1.5 py-0.5 rounded ${dailyChangePct >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
            {dailyChangePct >= 0 ? '+' : ''}{dailyChangePct.toFixed(2)}%
          </span>
        )}
      </div>

      {/* 종목명 + 티커 */}
      <div className="min-w-0">
        <div className="font-semibold text-sm leading-snug">{asset.name}</div>
        {asset.ticker && (
          <span className="font-mono text-[11px] text-muted-foreground/70 bg-muted px-1 rounded mt-0.5 inline-block">{asset.ticker}</span>
        )}
      </div>

      {/* 배지: 증권사 · 계좌 · 소유주 */}
      {(brokerageLabel || accountLabel || asset.owner) && (
        <div className="flex items-center gap-1 flex-wrap">
          {brokerageLabel && <span className="text-[11px] rounded px-1.5 py-0.5 bg-muted text-muted-foreground font-medium">{brokerageLabel}</span>}
          {accountLabel && <span className="text-[11px] rounded px-1.5 py-0.5 bg-muted text-muted-foreground font-medium">{accountLabel}</span>}
          {asset.owner && <span className="text-[11px] text-muted-foreground">{OWNER_ICONS[asset.owner] ?? '👤'} {asset.owner}</span>}
        </div>
      )}

      {/* 스파크라인 */}
      {showSpark && (
        <div className="rounded-md border border-border bg-muted/20 overflow-hidden h-10">
          {sparklineData
            ? <SparklineChart data={sparklineData} positive={asset.returnPct >= 0} width={200} height={40} />
            : <div className="w-full h-full" />
          }
        </div>
      )}

      {/* 평가금액 + 손익 */}
      <div className="mt-auto pt-2 border-t border-border/50 flex items-end justify-between gap-2">
        <div className="text-sm font-bold tabular-nums">
          {hasValue ? formatKrw(asset.currentValueKrw) : hasCost ? formatKrw(asset.totalCostKrw) : '—'}
        </div>
        {hasValue && hasCost && (
          <div className={`text-right shrink-0 ${asset.returnPct >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
            <div className="text-xs font-semibold tabular-nums">{profit >= 0 ? '+' : ''}{formatKrw(profit)}</div>
            <div className={`text-[11px] tabular-nums ${asset.returnPct >= 0 ? 'text-red-400' : 'text-blue-500'}`}>{formatReturn(asset.returnPct)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function AssetGridCardSkeleton({ assetType }: { assetType?: string } = {}) {
  return (
    <div className={cn("rounded-xl bg-card border border-border p-3.5 flex flex-col gap-2 border-l-4", assetType ? (ASSET_TYPE_ACCENT[assetType] ?? 'border-l-border') : 'border-l-border')}>
      <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
      <div className="h-3.5 w-3/4 bg-muted animate-pulse rounded" />
      <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
      <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
      <div className="h-px w-full bg-border mt-auto" />
      <div className="flex justify-between">
        <div className="h-3.5 w-20 bg-muted animate-pulse rounded" />
        <div className="h-3.5 w-12 bg-muted animate-pulse rounded" />
      </div>
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
      <div className="grid grid-cols-2 gap-1.5">
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
        {displayAssets.length % 2 === 1 && (
          <AssetCardSkeleton showSparkline={showSparkline} assetType={assets[0]?.assetType} />
        )}
      </div>
    </div>
  )
}

function CollapsibleChart({ assets, sparklines, monthlyData, annualData, dailyData }: {
  assets: AssetPerformance[]
  sparklines?: Record<string, number[]>
  monthlyData: MonthlyDataPoint[]
  annualData: AnnualDataPoint[]
  dailyData?: DailyDataPoint[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>차트</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground border border-border">
            <HelpCircle className="h-2.5 w-2.5 shrink-0" />
            일간 · 월간 · 연간 총 수익 현황
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="h-[360px] px-4 pb-4">
          <AssetGroupChart assets={assets} sparklines={sparklines} monthlyData={monthlyData} annualData={annualData} dailyData={dailyData ?? []} />
        </div>
      )}
    </div>
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

export function SummaryCards({ grouped, performances, valueCandles }: { grouped: Record<string, AssetPerformance[]>; performances: AssetPerformance[]; valueCandles?: CandlestickPoint[] }) {
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
        <FloatingLogos performances={performances} />
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
              <div className="text-right">
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
              {valueCandles && valueCandles.length > 0 && (
                <>
                  <div className="w-px bg-zinc-200 self-stretch" />
                  <div className="ml-auto flex flex-col justify-between min-w-0">
                    <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-1">총 자산 추이</p>
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
            <div key={type} className={cn("rounded-xl border border-border px-4 py-3 flex flex-col gap-1 border-l-4", ASSET_TYPE_ACCENT[type] ?? 'border-l-border', ASSET_TYPE_BG[type] ?? 'bg-card')}>
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
      <TodayReport performances={performances} />
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
                  <div className="space-y-3">
                    <SummaryBar assets={grouped[type]} />
                    <CollapsibleChart
                      assets={grouped[type]}
                      sparklines={sparklines}
                      monthlyData={monthlyByType[type] ?? []}
                      annualData={annualByType[type] ?? []}
                      dailyData={dailyByType[type] ?? []}
                    />
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
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {types.map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            <div className="space-y-3">
              <SummaryBar assets={grouped[type]} />
              <CollapsibleChart
                assets={grouped[type]}
                sparklines={sparklines}
                monthlyData={monthlyByType[type] ?? []}
                annualData={annualByType[type] ?? []}
                dailyData={dailyByType[type] ?? []}
              />
              <AssetCardList assets={grouped[type]} sparklines={sparklines} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
