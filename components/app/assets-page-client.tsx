'use client'
import { useState, useEffect, useTransition, useRef, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, LayoutGrid, TrendingUp, TrendingDown, BarChart2, Bitcoin, Building2, PiggyBank, BookOpen, ChevronDown, HelpCircle, ShieldCheck, Gem, CreditCard, RefreshCw, Wallet, Wifi, WifiOff } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { cn } from '@/lib/utils'
import { refreshAllPrices } from '@/app/actions/prices'
import { MiniCandleChart } from '@/components/app/mini-candle-chart'
import { LineSparkline } from '@/components/app/line-sparkline'
import type { OhlcPoint } from '@/lib/price/sparkline'
import type { AssetHistoryPoint } from '@/lib/asset-history-types'
import dynamic from 'next/dynamic'
const AssetCandleChart = dynamic(
  () => import('@/components/app/asset-candle-chart').then(m => ({ default: m.AssetCandleChart })),
  { ssr: false, loading: () => <div className="w-full h-full animate-pulse bg-muted/40 rounded-lg" /> }
)
const AssetLineChart = dynamic(
  () => import('@/components/app/asset-line-chart').then(m => ({ default: m.AssetLineChart })),
  { ssr: false, loading: () => <div className="w-full h-full animate-pulse bg-muted/40 rounded-lg" /> }
)
const AssetGroupChart = dynamic(
  () => import('@/components/app/asset-group-chart').then(m => ({ default: m.AssetGroupChart })),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-muted rounded-xl" /> }
)
import { AssetLogo } from '@/components/app/asset-logo'
import { LivePrice } from '@/components/app/live-price'
import { useLivePerformance, useLivePerformances } from '@/lib/ws/live-performance'
import { useKisWsEnabled } from '@/lib/ws/kis-ws-context'
import type { CandlestickPoint } from '@/components/app/candlestick-chart'
const CandlestickChart = dynamic(
  () => import('@/components/app/candlestick-chart').then(m => ({ default: m.CandlestickChart })),
  { ssr: false }
)
import { formatKrw, formatUsd, formatReturn, formatQty } from '@/lib/portfolio'
import type { AssetPerformance } from '@/lib/portfolio'
import { TodayReport } from '@/components/app/today-report'
import type { MonthlyDataPoint, AnnualDataPoint, DailyDataPoint } from '@/lib/snapshot/aggregation'

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

const ASSET_TYPE_LABELS_SHORT: Record<string, string> = {
  stock_kr: '국내주식',
  stock_us: '미국주식',
  etf_kr: '국내ETF',
  etf_us: '미국ETF',
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

export const ASSET_TYPE_ACCENT: Record<string, string> = {
  stock_kr:       'bg-blue-500/[0.04]',
  stock_us:       'bg-sky-500/[0.04]',
  etf_kr:         'bg-indigo-500/[0.04]',
  etf_us:         'bg-violet-500/[0.04]',
  crypto:         'bg-amber-500/[0.04]',
  fund:           'bg-teal-500/[0.04]',
  savings:        'bg-emerald-500/[0.04]',
  real_estate:    'bg-amber-700/[0.04]',
  insurance:      'bg-slate-500/[0.04]',
  precious_metal: 'bg-yellow-500/[0.04]',
  cma:            'bg-rose-500/[0.04]',
}

// 탭 버튼용 — dot 색상 / 활성 배경+텍스트
const ASSET_TYPE_TAB: Record<string, { dot: string; active: string }> = {
  stock_kr:       { dot: 'bg-blue-600',    active: 'data-[state=active]:bg-blue-600    data-[state=active]:text-white data-[state=active]:border-blue-600' },
  stock_us:       { dot: 'bg-cyan-500',    active: 'data-[state=active]:bg-cyan-500    data-[state=active]:text-white data-[state=active]:border-cyan-500' },
  etf_kr:         { dot: 'bg-indigo-600',  active: 'data-[state=active]:bg-indigo-600  data-[state=active]:text-white data-[state=active]:border-indigo-600' },
  etf_us:         { dot: 'bg-violet-600',  active: 'data-[state=active]:bg-violet-600  data-[state=active]:text-white data-[state=active]:border-violet-600' },
  crypto:         { dot: 'bg-orange-600',  active: 'data-[state=active]:bg-orange-600  data-[state=active]:text-white data-[state=active]:border-orange-600' },
  fund:           { dot: 'bg-teal-600',    active: 'data-[state=active]:bg-teal-600    data-[state=active]:text-white data-[state=active]:border-teal-600' },
  savings:        { dot: 'bg-emerald-600', active: 'data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-600' },
  real_estate:    { dot: 'bg-amber-700',   active: 'data-[state=active]:bg-amber-700   data-[state=active]:text-white data-[state=active]:border-amber-700' },
  insurance:      { dot: 'bg-slate-500',   active: 'data-[state=active]:bg-slate-500   data-[state=active]:text-white data-[state=active]:border-slate-500' },
  precious_metal: { dot: 'bg-yellow-500',  active: 'data-[state=active]:bg-yellow-500  data-[state=active]:text-white data-[state=active]:border-yellow-500' },
  cma:            { dot: 'bg-rose-500',    active: 'data-[state=active]:bg-rose-500    data-[state=active]:text-white data-[state=active]:border-rose-500' },
}

const ASSET_TYPE_BG: Record<string, string> = {
  stock_kr:       'bg-gradient-to-r from-blue-500/10    via-blue-500/5    to-transparent',
  stock_us:       'bg-gradient-to-r from-cyan-500/10    via-cyan-500/5    to-transparent',
  etf_kr:         'bg-gradient-to-r from-indigo-500/10  via-indigo-500/5  to-transparent',
  etf_us:         'bg-gradient-to-r from-violet-500/10  via-violet-500/5  to-transparent',
  crypto:         'bg-gradient-to-r from-orange-500/10  via-orange-500/5  to-transparent',
  fund:           'bg-gradient-to-r from-teal-500/10    via-teal-500/5    to-transparent',
  savings:        'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent',
  real_estate:    'bg-gradient-to-r from-amber-500/10   via-amber-500/5   to-transparent',
  insurance:      'bg-gradient-to-r from-slate-500/10   via-slate-500/5   to-transparent',
  precious_metal: 'bg-gradient-to-r from-yellow-500/10  via-yellow-500/5  to-transparent',
  cma:            'bg-gradient-to-r from-rose-500/10    via-rose-500/5    to-transparent',
}

const ASSET_TYPE_NAME_BADGE: Record<string, string> = {
  stock_kr:       'bg-blue-500/15 text-blue-400 ring-blue-500/30',
  stock_us:       'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30',
  etf_kr:         'bg-indigo-500/15 text-indigo-400 ring-indigo-500/30',
  etf_us:         'bg-violet-500/15 text-violet-400 ring-violet-500/30',
  crypto:         'bg-orange-500/15 text-orange-400 ring-orange-500/30',
  fund:           'bg-teal-500/15 text-teal-400 ring-teal-500/30',
  savings:        'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  real_estate:    'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  insurance:      'bg-slate-500/15 text-slate-400 ring-slate-500/30',
  precious_metal: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
  cma:            'bg-rose-500/15 text-rose-400 ring-rose-500/30',
}

const NO_SPARKLINE_TYPES = new Set(['real_estate', 'insurance', 'precious_metal', 'cma'])

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



function AssetCard({ asset, sparklineData, lineData, showSparkline, liveEnabled = false }: {
  asset: AssetPerformance & { mergedCount?: number }
  sparklineData?: OhlcPoint[]
  lineData?: AssetHistoryPoint[]
  showSparkline?: boolean
  liveEnabled?: boolean
}) {
  const live = useLivePerformance(asset, liveEnabled)
  const wsEnabled = useKisWsEnabled()
  // live !== asset means a tick overlay was applied — the reference changes on first tick
  const isLiveEligible = wsEnabled && !!asset.ticker && LIVE_ASSET_TYPES.has(asset.assetType)
  const isLiveActive = isLiveEligible && liveEnabled && live !== asset
  const [chartOpen, setChartOpen] = useState(false)
  const hasHolding = asset.totalQuantity > 0 || (asset.assetType === 'savings' && (asset.totalCostKrw > 0 || asset.monthlyContributionKrw != null))
  const isCrypto = asset.assetType === 'crypto'
  const hasValue = live.currentValueKrw > 0
  const hasCost = live.totalCostKrw > 0
  const profit = live.currentValueKrw - live.totalCostKrw
  const mergedCount = (asset as MergedAsset).mergedCount ?? 1

  // US 자산 여부 (stock_us, etf_us) — currency가 아닌 assetType으로 판단
  const isUsAsset = asset.assetType === 'stock_us' || asset.assetType === 'etf_us'
  // 원화매수: US 자산을 KRW로 환전해 매수 (asset.currency = 'KRW')
  // 달러매수: US 자산을 USD로 직접 매수 (asset.currency = 'USD')
  const isKrwPurchase = isUsAsset && asset.currency === 'KRW'
  const isUsdPurchase = isUsAsset && asset.currency === 'USD'
  const hasFxBreakdown = live.stockReturnPct != null && live.fxReturnPct != null

  // FX 분해: 달러수익 × 현재환율 / 원금 × 환율변동 (유저 멘탈모델 기준)
  // stockGainKrw = qty × (현재USD가 - 매수USD가) × 현재환율  (달러 수익을 현재환율로 환산)
  // fxGainKrw    = qty × 매수USD가 × (현재환율 - 매수환율)   (원금의 환차손익)
  const qty = asset.totalQuantity / 1e8
  const avgCostUsd = asset.avgCostPerUnitOriginal != null ? asset.avgCostPerUnitOriginal / 100 : null
  const avgFxRate = asset.avgExchangeRateAtTime != null ? asset.avgExchangeRateAtTime / 10000 : null
  const stockGainKrw =
    hasFxBreakdown && avgCostUsd != null && live.currentPriceUsd != null && live.currentFxRate != null
      ? Math.round(qty * (live.currentPriceUsd - avgCostUsd) * live.currentFxRate)
      : null
  const fxGainKrw =
    hasFxBreakdown && avgCostUsd != null && avgFxRate != null && live.currentFxRate != null
      ? Math.round(qty * avgCostUsd * (live.currentFxRate - avgFxRate))
      : null

  const dailyChangePct = live.dailyChangeBps !== null && live.dailyChangeBps !== undefined
    ? live.dailyChangeBps / 100
    : null

  const accountBadge = mergedCount > 1 ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground ring-1 ring-border">
      {mergedCount}계좌
    </span>
  ) : asset.accountType && ACCOUNT_TYPE_LABELS[asset.accountType] ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground ring-1 ring-border">
      {ACCOUNT_TYPE_LABELS[asset.accountType]}
    </span>
  ) : null

  const brokerageLabel = asset.brokerageId && BROKERAGE_LABELS[asset.brokerageId]
    ? BROKERAGE_LABELS[asset.brokerageId] : null

  const isSavings = asset.assetType === 'savings'
  const isRealEstate = asset.assetType === 'real_estate'
  const isInsurance = asset.assetType === 'insurance'
  const hideQty = isSavings || isRealEstate

  const maturityBadge = (() => {
    if (!isSavings || !asset.maturityDate) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maturity = new Date(asset.maturityDate)
    maturity.setHours(0, 0, 0, 0)
    const days = Math.round((maturity.getTime() - today.getTime()) / 86400000)
    const isExpired = days < 0
    const isDueSoon = days >= 0 && days <= 30
    const label = isExpired ? '만기 경과' : days === 0 ? 'D-Day' : `D-${days}`
    return (
      <>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          만기일 {asset.maturityDate.replace(/-/g, '.')}
        </span>
        <span className={`shrink-0 inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${isExpired ? 'bg-muted text-muted-foreground' : isDueSoon ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {label}
        </span>
      </>
    )
  })()

  const nameBlock = (
    <div className="flex-1 min-w-0">
      {/* Row1: 이름 + 계좌 badge + 만기 배지 */}
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <span className="text-sm font-semibold text-foreground leading-snug">{asset.name}</span>
        {accountBadge}
        {maturityBadge}
      </div>
      {/* Row2: 수량 · 매수가 · 현재가 · 상승률 */}
      {hasHolding && (
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
          {!hideQty && (
            <span className="tabular-nums"><span className="text-muted-foreground">수량</span> <span className="font-medium text-foreground/90">{formatQty(asset.totalQuantity, isCrypto)}</span></span>
          )}
          {asset.avgCostPerUnit > 0 && !(isSavings && asset.monthlyContributionKrw != null) && (
            <>{(!hideQty) && <span className="text-border/60">|</span>}<span className="tabular-nums"><span className="text-muted-foreground">{isSavings ? '예치원금' : '매수가'}</span> <span className="font-medium text-foreground/90">{asset.avgCostPerUnitOriginal != null ? formatUsd(asset.avgCostPerUnitOriginal / 100) : formatKrw(asset.avgCostPerUnit)}</span></span></>
          )}
          {asset.totalCostKrw > 0 && !isSavings && (
            <><span className="text-border/60">|</span><span className="tabular-nums"><span className="text-muted-foreground">투자금</span> <span className="font-medium text-foreground/90">{formatKrw(asset.totalCostKrw)}</span></span></>
          )}
{isSavings && asset.monthlyContributionKrw != null && asset.monthlyContributionKrw > 0 && (() => {
              const months = asset.initialTransactionDate
                ? (() => {
                    const start = new Date(asset.initialTransactionDate)
                    const today = new Date()
                    return (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth())
                  })()
                : null
              const calculatedTotal = months != null ? asset.monthlyContributionKrw * months : null
              return (
                <>
                  <span className="tabular-nums"><span className="text-muted-foreground">월납입</span> <span className="font-medium text-foreground/90">{formatKrw(asset.monthlyContributionKrw)}</span></span>
                  {calculatedTotal != null && (
                    <><span className="text-border/60">|</span><span className="tabular-nums"><span className="text-muted-foreground">총납입</span> <span className="font-medium text-foreground/90">{formatKrw(calculatedTotal)}</span>{months != null && <span className="text-muted-foreground ml-1">({months}개월)</span>}</span></>
                  )}
                </>
              )
            })()}
          {isSavings && asset.interestRateBp != null && asset.interestRateBp > 0 && (
            <><span className="text-border/60">|</span><span className="tabular-nums font-medium text-emerald-600">연{(asset.interestRateBp / 10000).toFixed(2)}%</span>
            {asset.compoundType && (
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-md font-medium text-white" style={{
                backgroundColor: asset.compoundType === 'simple' ? '#3b82f6' : '#10b981'
              }}>
                {asset.compoundType === 'simple' ? '단리' : '복리'}
              </span>
            )}
            </>
          )}
          {isInsurance && asset.insuranceDetails?.expectedReturnRateBp != null && asset.insuranceDetails.expectedReturnRateBp > 0 && (
            <><span className="text-border/60">|</span><span className="tabular-nums font-medium text-emerald-600">연{(asset.insuranceDetails.expectedReturnRateBp / 10000).toFixed(2)}%</span>
            {asset.insuranceDetails.compoundType && (
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-md font-medium text-white" style={{
                backgroundColor: asset.insuranceDetails.compoundType === 'simple' ? '#3b82f6' : '#10b981'
              }}>
                {asset.insuranceDetails.compoundType === 'simple' ? '단리' : '복리'}
              </span>
            )}
            </>
          )}
          {isSavings && asset.initialTransactionDate && (
            <><span className="text-border/60">|</span><span className="tabular-nums"><span className="text-muted-foreground">가입일</span> <span className="font-medium text-foreground/90">{asset.initialTransactionDate.replace(/-/g, '.')}</span></span></>
          )}
        </div>
      )}
      {/* Row3: 현재가 · 오늘 등락률 (KIS WS live overlay when enabled) */}
      {!isSavings && (asset.currentPriceKrw > 0 || dailyChangePct !== null) && (
        <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-border/30 text-xs flex-wrap">
          {asset.currentPriceKrw > 0 ? (
            <span className="tabular-nums font-bold inline-flex items-center gap-2">
              <span className="font-normal text-muted-foreground">현재가</span>
              <LivePrice
                ticker={asset.ticker}
                assetType={asset.assetType}
                fallbackPriceKrw={asset.currentPriceKrw}
                fallbackPriceUsd={asset.currentPriceUsd}
                fallbackChangePct={dailyChangePct}
                changeClassName="ml-1"
                enabled={liveEnabled}
              />
              {isLiveEligible && (
                isLiveActive
                  ? <Wifi className="h-3 w-3 text-emerald-500 animate-pulse shrink-0" aria-label="실시간 시세" />
                  : <WifiOff className="h-3 w-3 text-amber-400 shrink-0" aria-label="캐시된 시세" />
              )}
            </span>
          ) : dailyChangePct !== null && (
            <span className={`tabular-nums font-bold ${dailyChangePct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
              <span className="font-normal text-muted-foreground">오늘</span>{' '}
              {dailyChangePct >= 0 ? '+' : ''}{dailyChangePct.toFixed(2)}%
            </span>
          )}
        </div>
      )}
      {/* Row4: US 자산 FX 컨텍스트 */}
      {isUsAsset && (
        <div className="flex items-center gap-1.5 mt-1 text-xs flex-wrap">
          <span className={`font-semibold shrink-0 ${isKrwPurchase ? 'text-amber-400' : 'text-sky-400'}`}>
            {isKrwPurchase ? '원화매수' : '달러매수'}
          </span>
          {hasFxBreakdown && stockGainKrw != null && fxGainKrw != null ? (
            <>
              <span className="text-border/60">|</span>
              <span className={stockGainKrw >= 0 ? 'text-red-500' : 'text-blue-500'}>
                주가 {stockGainKrw >= 0 ? '+' : ''}{formatKrw(stockGainKrw)}
              </span>
              <span className="text-border/60">|</span>
              <span className={fxGainKrw >= 0 ? 'text-red-500' : 'text-blue-500'}>
                환차 {fxGainKrw >= 0 ? '+' : ''}{formatKrw(fxGainKrw)}
              </span>
              {avgFxRate != null && live.currentFxRate != null && (
                <>
                  <span className="text-border/60">|</span>
                  <span className="text-muted-foreground">
                    환율 ₩{Math.round(avgFxRate).toLocaleString()} → ₩{Math.round(live.currentFxRate).toLocaleString()}
                  </span>
                  {live.fxReturnPct != null && (
                    <span className={`font-semibold ${live.fxReturnPct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                      ({live.fxReturnPct >= 0 ? '+' : ''}{live.fxReturnPct.toFixed(1)}%)
                    </span>
                  )}
                </>
              )}
            </>
          ) : isUsdPurchase && live.currentFxRate != null ? (
            <>
              <span className="text-border/60">|</span>
              <span className="text-muted-foreground">₩{Math.round(live.currentFxRate).toLocaleString()} 기준</span>
            </>
          ) : isKrwPurchase ? (
            <>
              <span className="text-border/60">|</span>
              <span className="text-muted-foreground">주가+환율 변동 반영</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  )

  const valueFooter = (hasValue || hasCost) && (
    <div className="mt-2.5 pt-2.5 border-t border-border flex items-center gap-2 tabular-nums flex-wrap">
      <span className="text-xs text-muted-foreground">평가금</span>
      <span className="text-sm font-semibold text-foreground">
        {hasValue ? formatKrw(live.currentValueKrw) : '—'}
        {isUsdPurchase && live.currentPriceUsd != null && hasHolding && hasValue && (
          <span className="text-xs text-muted-foreground ml-1">({formatUsd(live.currentPriceUsd * asset.totalQuantity / 1e8)})</span>
        )}
      </span>
      {hasValue && hasCost && (
        <>
          <span className="text-border/60 text-xs">·</span>
          <span className={`text-sm font-bold ${profit >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
            {profit >= 0 ? '+' : ''}{formatKrw(profit)}
          </span>
          <span className={`text-xs font-semibold ${live.returnPct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
            ({formatReturn(live.returnPct)})
          </span>
        </>
      )}
    </div>
  )

  return (
    <div className={cn("relative rounded-xl border border-border hover:shadow-md transition-all", ASSET_TYPE_ACCENT[asset.assetType] ?? 'bg-card')} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 차트 토글 — 우상단 */}
      {((showSparkline && asset.ticker) || lineData !== undefined) && (
        <button
          onClick={() => setChartOpen(v => !v)}
          className="absolute top-2.5 right-2.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded-lg hover:bg-muted/40"
        >
          {live.returnPct >= 0
            ? <TrendingUp className="h-3 w-3 text-red-500" />
            : <TrendingDown className="h-3 w-3 text-blue-500" />}
          차트
          <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', chartOpen && 'rotate-180')} />
        </button>
      )}

      <div className="flex items-stretch gap-3 px-4 py-3.5">
        {/* 로고 */}
        <div className="shrink-0 self-center">
          <AssetLogo ticker={asset.ticker} name={asset.name} assetType={asset.assetType} size={40} />
        </div>

        {/* 종목 정보 */}
        <div className="flex flex-col flex-1 min-w-0">
          {nameBlock}
          {valueFooter}
        </div>
      </div>

      {/* 차트 collapse */}
      {chartOpen && (
        <>
          {lineData !== undefined && (
            <div className="px-4 pb-3">
              <div className="h-[240px] rounded-lg overflow-hidden border border-border/40">
                <AssetLineChart
                  data={lineData}
                  kind={asset.assetType === 'savings' || asset.assetType === 'insurance' ? 'line-projected' : 'line-nav'}
                  positive={live.returnPct >= 0}
                />
              </div>
            </div>
          )}
          {showSparkline && asset.ticker && !lineData && (
            <div className="px-4 pb-3">
              <div className="h-[280px] rounded-lg overflow-hidden border border-border/40 bg-white">
                <AssetCandleChart ticker={asset.ticker} initialData={sparklineData ?? []} assetType={asset.assetType} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AssetGridCard({ asset, sparklineData, lineData }: {
  asset: AssetPerformance & { mergedCount?: number }
  sparklineData?: OhlcPoint[]
  lineData?: AssetHistoryPoint[]
}) {
  const live = useLivePerformance(asset)
  const hasValue = live.currentValueKrw > 0
  const hasCost = live.totalCostKrw > 0
  const profit = live.currentValueKrw - live.totalCostKrw
  const mergedCount = (asset as MergedAsset).mergedCount ?? 1
  const showSpark = !NO_SPARKLINE_TYPES.has(asset.assetType)
  const dailyChangePct = live.dailyChangeBps != null ? live.dailyChangeBps / 100 : null
  const brokerageLabel = asset.brokerageId && BROKERAGE_LABELS[asset.brokerageId] ? BROKERAGE_LABELS[asset.brokerageId] : null
  const accountLabel = mergedCount > 1 ? `${mergedCount}계좌`
    : asset.accountType && ACCOUNT_TYPE_LABELS[asset.accountType] ? ACCOUNT_TYPE_LABELS[asset.accountType] : null

  return (
    <div className={cn("rounded-xl border border-border p-4 flex flex-col gap-2.5 hover:shadow-md transition-all", ASSET_TYPE_ACCENT[asset.assetType] ?? 'bg-card')} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 헤더: 로고 */}
      <div className="flex items-start">
        <AssetLogo ticker={asset.ticker} name={asset.name} assetType={asset.assetType} size={38} />
      </div>

      {/* 종목명 + 티커 */}
      <div className="min-w-0 flex flex-col gap-1">
        <span className="text-sm font-semibold text-foreground leading-snug">{asset.name}</span>
      </div>

      {/* 배지: 증권사 · 계좌 · 소유주 */}
      {(brokerageLabel || accountLabel || asset.owner) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {brokerageLabel && <span className="text-xs text-muted-foreground font-medium">{brokerageLabel}</span>}
          {accountLabel && <span className="text-xs text-muted-foreground font-medium">{accountLabel}</span>}
          {asset.owner && <span className="text-xs text-muted-foreground font-medium">{OWNER_ICONS[asset.owner] ?? '👤'} {asset.owner}</span>}
        </div>
      )}

      {/* 스파크라인 */}
      {showSpark && (
        <div className="rounded-lg border border-border/30 bg-muted/20 overflow-hidden h-36">
          {lineData && lineData.length >= 2
            ? <LineSparkline data={lineData} width={200} height={144} positive={live.returnPct >= 0} />
            : sparklineData
              ? <MiniCandleChart data={sparklineData} width={200} height={144} />
              : <div className="w-full h-full" />
          }
        </div>
      )}

      {/* 평가금 | 수익금 */}
      <div className="mt-auto pt-2.5 border-t border-border flex items-center gap-2 tabular-nums flex-wrap">
        <div className="flex items-baseline gap-1">
          <Wallet className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <span className="text-xs text-muted-foreground">평가금</span>
          <span className="text-sm font-semibold text-foreground">{hasValue ? formatKrw(live.currentValueKrw) : '—'}</span>
        </div>
        {hasValue && hasCost && (
          <>
            <span className="text-border/60 text-xs">|</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-muted-foreground">수익금</span>
              <span className={`text-sm font-bold ${profit >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{profit >= 0 ? '+' : ''}{formatKrw(profit)}</span>
              <span className="text-xs text-muted-foreground ml-1">수익률</span>
              <span className={`text-xs font-semibold ${live.returnPct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatReturn(live.returnPct)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AssetGridCardSkeleton({ assetType }: { assetType?: string } = {}) {
  return (
    <div className={cn("rounded-xl border border-border p-3.5 flex flex-col gap-2", assetType ? (ASSET_TYPE_ACCENT[assetType] ?? 'bg-card') : 'bg-card')}>
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
          <span className={`font-semibold ${totalProfit >= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
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

const LIVE_ASSET_TYPES = new Set(['stock_kr', 'etf_kr', 'stock_us', 'etf_us'])

function AssetCardList({ assets, title, sparklines, lineDataMap, liveEnabled = false, onToggleLive }: {
  assets: AssetPerformance[]
  title?: React.ReactNode
  sparklines?: Record<string, OhlcPoint[]>
  lineDataMap?: Record<string, AssetHistoryPoint[]>
  liveEnabled?: boolean
  onToggleLive?: () => void
}) {
  const [merged, setMerged] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const wsEnabled = useKisWsEnabled()
  const hasLiveAssets = wsEnabled && assets.some(a => LIVE_ASSET_TYPES.has(a.assetType))

  const liveAssets = useLivePerformances(assets, liveEnabled)
  const showSparkline = assets.some((a) => !NO_SPARKLINE_TYPES.has(a.assetType))
  const hasDuplicates = new Set(assets.map((a) => a.ticker ?? a.name)).size < assets.length
  const hasStale = liveAssets.some((a) => a.isStale)
  const displayAssets = merged ? mergeAssets(assets) : assets

  const totalCost = liveAssets.reduce((s, a) => s + a.totalCostKrw, 0)
  const valuedAssets = liveAssets.filter((a) => a.currentValueKrw > 0)
  const totalValue = valuedAssets.reduce((s, a) => s + a.currentValueKrw, 0)
  const valuedCost = valuedAssets.reduce((s, a) => s + a.totalCostKrw, 0)
  const totalProfit = totalValue - valuedCost
  const totalReturnPct = valuedCost > 0 ? (totalProfit / valuedCost) * 100 : null
  const hasAnyValue = totalValue > 0

  function handleRefresh() {
    startTransition(async () => {
      await refreshAllPrices()
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      {(title || hasDuplicates || hasStale || hasLiveAssets) && (
        <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap min-w-0">
            {title && <div className="flex items-center gap-2 flex-wrap">{title}</div>}
            {/* 매수금 · 평가금 · 수익금 인라인 */}
            <div className="flex items-center gap-x-2 gap-y-1 text-xs flex-wrap" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              <span className="text-muted-foreground">매수금</span>
              <span className="font-semibold text-foreground tabular-nums">{totalCost > 0 ? formatKrw(totalCost) : '—'}</span>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-muted-foreground">평가금</span>
              <span className="font-semibold text-foreground tabular-nums">{hasAnyValue ? formatKrw(totalValue) : '—'}</span>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-muted-foreground">수익금</span>
              {hasAnyValue && totalCost > 0 ? (
                <>
                  <span className={`font-semibold tabular-nums ${totalProfit >= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                    {totalProfit >= 0 ? '+' : ''}{formatKrw(totalProfit)}
                  </span>
                  {totalReturnPct !== null && (
                    <>
                      <span className="text-muted-foreground/40">|</span>
                      <span className="text-muted-foreground">수익률</span>
                      <span className={`font-semibold tabular-nums ${totalReturnPct >= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                        {formatReturn(totalReturnPct)}
                      </span>
                    </>
                  )}
                </>
              ) : <span className="text-muted-foreground">—</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasLiveAssets && onToggleLive && (
              <button
                onClick={onToggleLive}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
                  liveEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', liveEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40')} />
                실시간
              </button>
            )}
            {hasStale && (
              <button
                onClick={handleRefresh}
                disabled={isPending}
                className={cn(buttonVariants({ variant: 'default', size: 'sm' }), isPending && 'opacity-50')}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
                갱신하기
              </button>
            )}
            {hasDuplicates && (
              <button
                onClick={() => setMerged((v) => !v)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors', merged ? 'bg-muted border-border text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted')}
              >
                <Layers className="h-3.5 w-3.5" />
                종목 합산
              </button>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 items-start">
        {displayAssets.map((asset) => (
          <AssetCard
            key={'mergedCount' in asset && (asset as MergedAsset).mergedCount > 1
              ? (asset.ticker ?? asset.name)
              : asset.assetId}
            asset={asset}
            sparklineData={asset.ticker ? sparklines?.[asset.ticker] : undefined}
            lineData={lineDataMap?.[asset.assetId]}
            showSparkline={showSparkline}
            liveEnabled={liveEnabled}
          />
        ))}
      </div>
    </div>
  )
}

function CollapsibleChart({ assets, sparklines, monthlyData, annualData, dailyData }: {
  assets: AssetPerformance[]
  sparklines?: Record<string, OhlcPoint[]>
  monthlyData: MonthlyDataPoint[]
  annualData: AnnualDataPoint[]
  dailyData?: DailyDataPoint[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>차트</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground border border-border">
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


interface AssetsPageClientProps {
  performances: AssetPerformance[]
  sparklines?: Record<string, OhlcPoint[]>
  monthlyData?: MonthlyDataPoint[]
  annualData?: AnnualDataPoint[]
  monthlyByType?: Record<string, MonthlyDataPoint[]>
  annualByType?: Record<string, AnnualDataPoint[]>
  dailyByType?: Record<string, DailyDataPoint[]>
}

export function AssetsPageClient({ performances, sparklines: initialSparklines, monthlyData = [], annualData = [], monthlyByType = {}, annualByType = {}, dailyByType = {} }: AssetsPageClientProps) {
  const [sparklines, setSparklines] = useState<Record<string, OhlcPoint[]>>(initialSparklines ?? {})
  const [lineDataMap, setLineDataMap] = useState<Record<string, AssetHistoryPoint[]>>({})

  useEffect(() => {
    const liveTickers = [
      ...new Set(
        performances
          .filter((p) => p.priceType === 'live' && p.ticker)
          .map((p) => p.ticker!)
      ),
    ]
    if (liveTickers.length > 0) {
      fetch(`/api/sparklines?tickers=${liveTickers.join(',')}`)
        .then((r) => r.json())
        .then((data: Record<string, OhlcPoint[]>) => setSparklines(data))
        .catch(() => {})
    }

    const lineAssets = performances.filter((p) => p.assetType === 'fund' || p.assetType === 'savings' || p.assetType === 'insurance')
    if (lineAssets.length === 0) return

    const assetIds = [...new Set(lineAssets.map((p) => p.assetId))]
    fetch(`/api/asset-history?assetIds=${assetIds.join(',')}`)
      .then((r) => r.json())
      .then((data: { results: Array<{ assetId: string; points: AssetHistoryPoint[] }> }) => {
        const map: Record<string, AssetHistoryPoint[]> = {}
        for (const r of data.results ?? []) map[r.assetId] = r.points ?? []
        setLineDataMap(map)
      })
      .catch(() => {})
  }, [performances])

  const grouped = ASSET_TYPE_ORDER.reduce<Record<string, AssetPerformance[]>>((acc, type) => {
    const items = performances.filter((a) => a.assetType === type)
    if (items.length > 0) acc[type] = items
    return acc
  }, {})

  const types = Object.keys(grouped)

  if (performances.length === 0) {
    return (
      <div data-component="AssetsPageClient" className="text-center py-16 space-y-2">
        <p className="text-sm font-semibold text-foreground">등록된 자산이 없습니다</p>
        <p className="text-sm text-muted-foreground">첫 번째 자산을 추가하여 포트폴리오를 시작해보세요.</p>
      </div>
    )
  }

  return (
    <div data-component="AssetsPageClient" className="space-y-6">
      <TodayReport performances={performances} />
      <AssetFilter
        types={types}
        grouped={grouped}
        sparklines={sparklines}
        lineDataMap={lineDataMap}
        monthlyByType={monthlyByType}
        annualByType={annualByType}
        dailyByType={dailyByType}
      />
    </div>
  )
}

function AssetFilter({
  types, grouped, sparklines, lineDataMap, monthlyByType, annualByType, dailyByType,
}: {
  types: string[]
  grouped: Record<string, AssetPerformance[]>
  sparklines: Record<string, OhlcPoint[]>
  lineDataMap: Record<string, AssetHistoryPoint[]>
  monthlyByType: Record<string, MonthlyDataPoint[]>
  annualByType: Record<string, AnnualDataPoint[]>
  dailyByType: Record<string, DailyDataPoint[]>
}) {
  const [active, setActive] = useState<string>('all')
  const [liveEnabled, setLiveEnabled] = useState(false)
  const showAll = types.length > 1
  const visibleTypes = active === 'all' ? types : types.filter((t) => t === active)

  return (
    <div className="space-y-4">
      {/* 필터 pills */}
      {showAll && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActive('all')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              active === 'all'
                ? 'bg-foreground border-foreground text-background shadow-sm'
                : 'bg-muted/60 border-border text-foreground/70 hover:text-foreground hover:bg-muted',
            )}
          >
            <LayoutGrid className="h-3 w-3" />
            전체
            <span className="opacity-60">({types.reduce((s, t) => s + grouped[t].length, 0)})</span>
          </button>
          {types.map((type) => {
            const Icon = ASSET_TYPE_ICONS[type]
            const isActive = active === type
            return (
              <button
                key={type}
                onClick={() => setActive(isActive ? 'all' : type)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                  isActive
                    ? 'bg-foreground border-foreground text-background shadow-sm'
                    : 'bg-muted/60 border-border text-foreground/70 hover:text-foreground hover:bg-muted',
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {ASSET_TYPE_LABELS_SHORT[type] ?? ASSET_TYPE_LABELS[type]}
                <span className="opacity-60">({grouped[type].length})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="space-y-0">
        {visibleTypes.map((type, i) => (
          <div key={type}>
            {i > 0 && <Separator className="my-6 bg-foreground" />}
            <div className="space-y-3">
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
                lineDataMap={lineDataMap}
                liveEnabled={liveEnabled}
                onToggleLive={() => setLiveEnabled(v => !v)}
                title={
                  <>
                    <AssetTypeBadge assetType={type as AssetPerformance['assetType']} />
                    {type === 'fund' && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
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
    </div>
  )
}
