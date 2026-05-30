'use client'
import { useState, useEffect, useTransition, useRef, useCallback, memo, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Layers, LayoutGrid, TrendingUp, TrendingDown, BarChart2, Bitcoin, Building2, PiggyBank, BookOpen, ChevronDown, HelpCircle, ShieldCheck, Gem, CreditCard, RefreshCw, Wallet, Shield, Heart, Store, Banknote, Coins, Globe, Briefcase, Landmark, Users } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import type { CandlestickPoint } from '@/components/app/candlestick-chart'
const CandlestickChart = dynamic(
  () => import('@/components/app/candlestick-chart').then(m => ({ default: m.CandlestickChart })),
  { ssr: false }
)
import { formatKrwCompact, formatUsd, formatReturn, formatQty } from '@/lib/portfolio'
import type { AssetPerformance } from '@/lib/portfolio'
import { TodayReport } from '@/components/app/today-report'
import { SummaryCards } from '@/components/app/summary-cards'
import type { MonthlyDataPoint, AnnualDataPoint, DailyDataPoint } from '@/lib/snapshot/aggregation'

const ASSET_TYPE_ORDER = [
  'stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate', 'insurance', 'precious_metal', 'cma',
] as const

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  isa: 'ISA', irp: 'IRP', pension: '연금저축', dc: 'DC', brokerage: '위탁', spot: '현물', cma: 'CMA', insurance: '보험',
  upbit: '업비트', bithumb: '빗썸', coinone: '코인원', korbit: '코빗',
  binance: '바이낸스', coinbase: '코인베이스', kraken: '크라켄', okx: 'OKX',
  fund_mirae: '미래에셋', fund_samsung: '삼성', fund_kb: 'KB', fund_shinhan: '신한', fund_hanwha: '한화',
  fund_nh: 'NH아문디', fund_korea: '한국투자', fund_kiwoom: '키움', fund_hana: '하나', fund_woori: '우리',
  fund_ibk: 'IBK', fund_daishin: '대신', fund_timefolio: '타임폴리오', fund_truston: '트러스톤',
  bank_kb: 'KB국민', bank_shinhan: '신한', bank_woori: '우리', bank_hana: '하나', bank_nh: 'NH농협',
  bank_kakao: '카카오', bank_toss: '토스', bank_k: '케이뱅크',
  bank_ibk: 'IBK기업', bank_kdb: 'KDB산업',
  bank_busan: '부산', bank_daegu: '대구', bank_gwangju: '광주', bank_jeonbuk: '전북', bank_jeju: '제주',
  bank_sbi: 'SBI저축', bank_ok: 'OK저축', bank_welcome: '웰컴저축', bank_pepper: '페퍼저축',
  bank_shincom: '신협', bank_saemaul: '새마을금고',
  coop_shincom: '신협', coop_saemaul: '새마을금고', coop_suhyup: '수협', coop_nh: '농협', coop_nfcf: '산림조합',
  ins_samsung_life: '삼성생명', ins_hanwha_life: '한화생명', ins_kyobo: '교보생명',
  ins_shinhan_life: '신한라이프', ins_nh_life: 'NH농협생명', ins_kb_life: 'KB라이프',
  ins_aia: 'AIA생명', ins_metlife: '메트라이프', ins_prudential: '푸르덴셜',
  ins_samsung_fire: '삼성화재', ins_hyundai: '현대해상', ins_db_fire: 'DB손보',
  ins_kb_fire: 'KB손보', ins_meritz: '메리츠화재', ins_hanwha_fire: '한화손보',
  ins_lotte_fire: '롯데손보', ins_im_life: 'IM라이프',
}

const ACCOUNT_TYPE_ICONS: Record<string, React.ElementType> = {
  isa: Shield, irp: PiggyBank, pension: Heart, dc: Building2, brokerage: Store, spot: Banknote, cma: CreditCard, insurance: ShieldCheck,
  upbit: Coins, bithumb: Coins, coinone: Coins, korbit: Coins,
  binance: Globe, coinbase: Globe, kraken: Globe, okx: Globe,
  fund_mirae: Briefcase, fund_samsung: Briefcase, fund_kb: Briefcase, fund_shinhan: Briefcase, fund_hanwha: Briefcase,
  fund_nh: Briefcase, fund_korea: Briefcase, fund_kiwoom: Briefcase, fund_hana: Briefcase, fund_woori: Briefcase,
  fund_ibk: Briefcase, fund_daishin: Briefcase, fund_timefolio: Briefcase, fund_truston: Briefcase,
  bank_kb: Landmark, bank_shinhan: Landmark, bank_woori: Landmark, bank_hana: Landmark, bank_nh: Landmark,
  bank_kakao: Landmark, bank_toss: Landmark, bank_k: Landmark,
  bank_ibk: Landmark, bank_kdb: Landmark,
  bank_busan: Landmark, bank_daegu: Landmark, bank_gwangju: Landmark, bank_jeonbuk: Landmark, bank_jeju: Landmark,
  bank_sbi: Landmark, bank_ok: Landmark, bank_welcome: Landmark, bank_pepper: Landmark,
  bank_shincom: Landmark, bank_saemaul: Landmark,
  coop_shincom: Users, coop_saemaul: Users, coop_suhyup: Users, coop_nh: Users, coop_nfcf: Users,
  ins_samsung_life: Heart, ins_hanwha_life: Heart, ins_kyobo: Heart,
  ins_shinhan_life: Heart, ins_nh_life: Heart, ins_kb_life: Heart,
  ins_aia: Heart, ins_metlife: Heart, ins_prudential: Heart,
  ins_samsung_fire: ShieldCheck, ins_hyundai: ShieldCheck, ins_db_fire: ShieldCheck,
  ins_kb_fire: ShieldCheck, ins_meritz: ShieldCheck, ins_hanwha_fire: ShieldCheck,
  ins_lotte_fire: ShieldCheck, ins_im_life: Heart,
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
  stock_kr:       'bg-blue-50',
  stock_us:       'bg-sky-50',
  etf_kr:         'bg-indigo-50',
  etf_us:         'bg-violet-50',
  crypto:         'bg-amber-50',
  fund:           'bg-teal-50',
  savings:        'bg-emerald-50',
  real_estate:    'bg-amber-50',
  insurance:      'bg-slate-50',
  precious_metal: 'bg-yellow-50',
  cma:            'bg-rose-50',
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
  fund_mirae: '미래에셋', fund_samsung: '삼성', fund_kb: 'KB', fund_shinhan: '신한', fund_hanwha: '한화',
  fund_nh: 'NH아문디', fund_korea: '한국투자', fund_kiwoom: '키움', fund_hana: '하나', fund_woori: '우리',
  fund_ibk: 'IBK', fund_daishin: '대신', fund_timefolio: '타임폴리오', fund_truston: '트러스톤',
}

const OWNER_ICONS: Record<string, string> = {
  개인: '👤', 엄마: '👩', 아빠: '👨', 동생: '🧒', 누나: '👱‍♀️',
  형: '👱‍♂️', 아내: '👰', 남편: '🤵', 딸: '👧', 아들: '👦',
}
const OWNER_ORDER = ['개인', '엄마', '아빠', '동생', '누나', '형', '아내', '남편', '딸', '아들']

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



function AssetCard({ asset, sparklineData, lineData, showSparkline }: {
  asset: AssetPerformance & { mergedCount?: number }
  sparklineData?: OhlcPoint[]
  lineData?: AssetHistoryPoint[]
  showSparkline?: boolean
}) {
  const [chartOpen, setChartOpen] = useState(false)
  const hasHolding = asset.totalQuantity > 0 || (asset.assetType === 'savings' && (asset.totalCostKrw > 0 || asset.monthlyContributionKrw != null))
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

  const accountBadge = (asset.assetType === 'insurance' || asset.assetType === 'real_estate') ? null : mergedCount > 1 ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-none text-xs font-normal bg-white text-black ring-1 ring-black">
      {mergedCount}계좌
    </span>
  ) : asset.accountType && ACCOUNT_TYPE_LABELS[asset.accountType] ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-none text-xs font-normal bg-white text-black ring-1 ring-black">
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
        <span className={`shrink-0 inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-xl tabular-nums ${isExpired ? 'bg-muted text-muted-foreground' : isDueSoon ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {label}
        </span>
      </>
    )
  })()

  const hasChartToggle = (showSparkline && asset.ticker) || lineData !== undefined

  const leftStripeColor = (() => {
    if (dailyChangePct === null) return 'bg-border'
    if (dailyChangePct >= 3)  return 'bg-red-500'
    if (dailyChangePct >= 1)  return 'bg-red-400'
    if (dailyChangePct > 0)   return 'bg-red-300'
    if (dailyChangePct === 0) return 'bg-border'
    if (dailyChangePct <= -3) return 'bg-blue-500'
    if (dailyChangePct <= -1) return 'bg-blue-400'
    return 'bg-blue-300'
  })()

  const dividerColor = (() => {
    if (dailyChangePct === null) return 'border-black'
    if (dailyChangePct >= 3)  return 'border-red-500'
    if (dailyChangePct >= 1)  return 'border-red-400'
    if (dailyChangePct > 0)   return 'border-red-300'
    if (dailyChangePct === 0) return 'border-black'
    if (dailyChangePct <= -3) return 'border-blue-500'
    if (dailyChangePct <= -1) return 'border-blue-400'
    return 'border-blue-300'
  })()

  return (
    <div className="relative rounded-sm border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden flex" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div className={cn("w-1 shrink-0", leftStripeColor)} />
      <div className="flex flex-col gap-2 px-4 py-3.5 flex-1 min-w-0">
        {/* row1: 로고 + 종목명 + 계좌유형 배지 + 차트 토글 */}
        <div className="flex items-center gap-2 min-w-0">
          <AssetLogo ticker={asset.ticker} name={asset.name} assetType={asset.assetType} size={32} />
          <Link href={`/assets/${asset.assetId}`} className="text-sm font-semibold text-foreground leading-snug hover:underline truncate">{asset.name}</Link>
          {accountBadge}
          {maturityBadge}
          {hasChartToggle && (
            <button
              onClick={() => setChartOpen(v => !v)}
              className="ml-auto shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded-lg hover:bg-muted/40"
            >
              {asset.returnPct >= 0
                ? <TrendingUp className="h-3 w-3 text-red-500" />
                : <TrendingDown className="h-3 w-3 text-blue-500" />}
              차트
              <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', chartOpen && 'rotate-180')} />
            </button>
          )}
        </div>
        <div className={cn("border-t-2", dividerColor)} />

        {/* row3: 현재가 · 오늘 등락률 */}
        {!isSavings && (asset.currentPriceKrw > 0 || dailyChangePct !== null) && (
          <div className="flex items-center gap-2 text-xs -mx-4 px-4 py-1.5 bg-black/[0.03]">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {asset.currentPriceKrw > 0 ? (
              <span className="tabular-nums inline-flex items-center gap-2">
                <span className="text-muted-foreground">현재가</span>
                <span className={`font-bold ${dailyChangePct === null ? 'text-foreground' : dailyChangePct > 0 ? 'text-red-500' : dailyChangePct < 0 ? 'text-blue-500' : 'text-foreground'}`}>
                  {(asset.assetType === 'stock_us' || asset.assetType === 'etf_us') && asset.currentPriceUsd != null
                    ? formatUsd(asset.currentPriceUsd)
                    : formatKrwCompact(asset.currentPriceKrw)}
                </span>
                {dailyChangePct !== null && (
                  <span className={`tabular-nums font-bold ${(dailyChangePct ?? 0) >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {(dailyChangePct ?? 0) >= 0 ? '+' : ''}{dailyChangePct.toFixed(2)}%
                  </span>
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

        {/* row4: 평가금 · 수익금 · 수익률 */}
        {(hasValue || hasCost) && (
          <div className="flex items-center gap-2 tabular-nums flex-wrap text-xs pt-1.5 border-t border-black/25">
            <span className="text-muted-foreground">평가금</span>
            <span className="font-semibold text-foreground">
              {hasValue ? formatKrwCompact(asset.currentValueKrw) : '—'}
              {isUsdPurchase && asset.currentPriceUsd != null && hasHolding && hasValue && (
                <span className="text-muted-foreground ml-1">({formatUsd(asset.currentPriceUsd * asset.totalQuantity / 1e8)})</span>
              )}
            </span>
            {hasValue && hasCost && (
              <>
                <span className="text-black">·</span>
                <span className={`font-bold ${profit >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                  {profit >= 0 ? '+' : ''}{formatKrwCompact(profit)}
                </span>
                <span className={`font-semibold ${asset.returnPct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                  ({formatReturn(asset.returnPct)})
                </span>
              </>
            )}
          </div>
        )}

        {/* row2: 수량 · 매수가 · 투자금 (savings/insurance 전용 필드 치환) */}
        {hasHolding && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap pt-1.5 border-t border-black/25">
            {!hideQty && (
              <span className="tabular-nums"><span className="text-muted-foreground">수량</span> <span className="font-medium text-foreground/90">{formatQty(asset.totalQuantity, isCrypto)}</span></span>
            )}
            {asset.avgCostPerUnit > 0 && !(isSavings && asset.monthlyContributionKrw != null) && (
              <>{(!hideQty) && <span className="text-black">|</span>}<span className="tabular-nums"><span className="text-muted-foreground">{isSavings ? '예치원금' : '매수가'}</span> <span className="font-medium text-foreground/90">{asset.avgCostPerUnitOriginal != null ? formatUsd(asset.avgCostPerUnitOriginal / 100) : formatKrwCompact(asset.avgCostPerUnit)}</span></span></>
            )}
            {asset.totalCostKrw > 0 && !isSavings && (
              <><span className="text-black">|</span><span className="tabular-nums"><span className="text-muted-foreground">투자금</span> <span className="font-medium text-foreground/90">{formatKrwCompact(asset.totalCostKrw)}</span></span></>
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
                  <span className="tabular-nums"><span className="text-muted-foreground">월납입</span> <span className="font-medium text-foreground/90">{formatKrwCompact(asset.monthlyContributionKrw)}</span></span>
                  {calculatedTotal != null && (
                    <><span className="text-black">|</span><span className="tabular-nums"><span className="text-muted-foreground">총납입</span> <span className="font-medium text-foreground/90">{formatKrwCompact(calculatedTotal)}</span>{months != null && <span className="text-muted-foreground ml-1">({months}개월)</span>}</span></>
                  )}
                </>
              )
            })()}
            {isSavings && asset.interestRateBp != null && asset.interestRateBp > 0 && (
              <><span className="text-black">|</span><span className="tabular-nums font-medium text-emerald-600">연{(asset.interestRateBp / 10000).toFixed(2)}%</span>
              {asset.compoundType && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-xl font-medium text-white" style={{
                  backgroundColor: asset.compoundType === 'simple' ? '#3b82f6' : '#10b981'
                }}>
                  {asset.compoundType === 'simple' ? '단리' : '복리'}
                </span>
              )}
              </>
            )}
            {isInsurance && asset.insuranceDetails?.expectedReturnRateBp != null && asset.insuranceDetails.expectedReturnRateBp > 0 && (
              <><span className="text-black">|</span><span className="tabular-nums font-medium text-emerald-600">연{(asset.insuranceDetails.expectedReturnRateBp / 10000).toFixed(2)}%</span>
              {asset.insuranceDetails.compoundType && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-xl font-medium text-white" style={{
                  backgroundColor: asset.insuranceDetails.compoundType === 'simple' ? '#3b82f6' : '#10b981'
                }}>
                  {asset.insuranceDetails.compoundType === 'simple' ? '단리' : '복리'}
                </span>
              )}
              </>
            )}
            {isSavings && asset.initialTransactionDate && (
              <><span className="text-black">|</span><span className="tabular-nums"><span className="text-muted-foreground">가입일</span> <span className="font-medium text-foreground/90">{asset.initialTransactionDate.replace(/-/g, '.')}</span></span></>
            )}
          </div>
        )}

        {/* FX 행: 미국 자산일 때만 row3 아래 조건부 */}
        {isUsAsset && (
          <div className="flex items-center gap-1.5 text-xs flex-wrap pt-1.5 border-t border-black/25">
            <span className={`font-semibold shrink-0 ${isKrwPurchase ? 'text-amber-400' : 'text-sky-400'}`}>
              {isKrwPurchase ? '원화매수' : '달러매수'}
            </span>
            {hasFxBreakdown && stockGainKrw != null && fxGainKrw != null ? (
              <>
                <span className="text-black">|</span>
                <span className={stockGainKrw >= 0 ? 'text-red-500' : 'text-blue-500'}>
                  주가 {stockGainKrw >= 0 ? '+' : ''}{formatKrwCompact(stockGainKrw)}
                </span>
                <span className="text-black">|</span>
                <span className={fxGainKrw >= 0 ? 'text-red-500' : 'text-blue-500'}>
                  환차 {fxGainKrw >= 0 ? '+' : ''}{formatKrwCompact(fxGainKrw)}
                </span>
                {avgFxRate != null && asset.currentFxRate != null && (
                  <>
                    <span className="text-black">|</span>
                    <span className="text-muted-foreground">
                      환율 ₩{Math.round(avgFxRate).toLocaleString()} → ₩{Math.round(asset.currentFxRate).toLocaleString()}
                    </span>
                    {asset.fxReturnPct != null && (
                      <span className={`font-semibold ${asset.fxReturnPct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        ({asset.fxReturnPct >= 0 ? '+' : ''}{asset.fxReturnPct.toFixed(1)}%)
                      </span>
                    )}
                  </>
                )}
              </>
            ) : isUsdPurchase && asset.currentFxRate != null ? (
              <>
                <span className="text-black">|</span>
                <span className="text-muted-foreground">₩{Math.round(asset.currentFxRate).toLocaleString()} 기준</span>
              </>
            ) : isKrwPurchase ? (
              <>
                <span className="text-black">|</span>
                <span className="text-muted-foreground">주가+환율 변동 반영</span>
              </>
            ) : null}
          </div>
        )}

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
                  positive={asset.returnPct >= 0}
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
    <div className={cn("rounded-sm border border-border p-4 flex flex-col gap-2.5 hover:shadow-md transition-all", ASSET_TYPE_ACCENT[asset.assetType] ?? 'bg-card')} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 헤더: 로고 */}
      <div className="flex items-start">
        <AssetLogo ticker={asset.ticker} name={asset.name} assetType={asset.assetType} size={38} />
      </div>

      {/* 종목명 + 티커 */}
      <div className="min-w-0 flex flex-col gap-1">
        <Link href={`/assets/${asset.assetId}`} className="text-sm font-semibold text-foreground leading-snug hover:underline">{asset.name}</Link>
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
            ? <LineSparkline data={lineData} width={200} height={144} positive={asset.returnPct >= 0} />
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
          <span className="text-sm font-semibold text-foreground">{hasValue ? formatKrwCompact(asset.currentValueKrw) : '—'}</span>
        </div>
        {hasValue && hasCost && (
          <>
            <span className="text-black text-xs">|</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-muted-foreground">수익금</span>
              <span className={`text-sm font-bold ${profit >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{profit >= 0 ? '+' : ''}{formatKrwCompact(profit)}</span>
              <span className="text-xs text-muted-foreground ml-1">수익률</span>
              <span className={`text-xs font-semibold ${asset.returnPct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatReturn(asset.returnPct)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AssetGridCardSkeleton({ assetType }: { assetType?: string } = {}) {
  return (
    <div className={cn("rounded-sm border border-border p-3.5 flex flex-col gap-2", assetType ? (ASSET_TYPE_ACCENT[assetType] ?? 'bg-card') : 'bg-card')}>
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
        <span className="font-semibold">{totalCost > 0 ? formatKrwCompact(totalCost) : '—'}</span>
      </div>
      <div className="h-4 w-px bg-border shrink-0" />
      <div className="flex items-baseline gap-1">
        <span className="text-xs text-muted-foreground">평가</span>
        <span className="font-semibold">{hasAnyValue ? formatKrwCompact(totalValue) : '—'}</span>
      </div>
      <div className="h-4 w-px bg-border shrink-0" />
      <div className="flex items-baseline gap-1">
        <span className="text-xs text-muted-foreground">손익</span>
        {hasAnyValue && totalCost > 0 ? (
          <span className={`font-semibold ${totalProfit >= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
            {totalProfit >= 0 ? '+' : ''}{formatKrwCompact(totalProfit)}
            {totalReturnPct !== null && (
              <span className="text-xs ml-1 opacity-80">{formatReturn(totalReturnPct)}</span>
            )}
          </span>
        ) : <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  )
}

function AssetCardList({ assets, title, sparklines, lineDataMap }: {
  assets: AssetPerformance[]
  title?: React.ReactNode
  sparklines?: Record<string, OhlcPoint[]>
  lineDataMap?: Record<string, AssetHistoryPoint[]>
}) {
  const [merged, setMerged] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const showSparkline = assets.some((a) => !NO_SPARKLINE_TYPES.has(a.assetType))
  const hasDuplicates = new Set(assets.map((a) => a.ticker ?? a.name)).size < assets.length
  const hasStale = assets.some((a) => a.isStale)
  const displayAssets = merged ? mergeAssets(assets) : assets

  const totalCost = assets.reduce((s, a) => s + a.totalCostKrw, 0)
  const valuedAssets = assets.filter((a) => a.currentValueKrw > 0)
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
      {(title || hasDuplicates || hasStale) && (
        <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap min-w-0">
            {title && <div className="flex items-center gap-2 flex-wrap">{title}</div>}
            {/* 매수금 · 평가금 · 수익금 인라인 */}
            <div className="flex items-center gap-x-2 gap-y-1 text-xs flex-wrap" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              <span className="text-muted-foreground">매수금</span>
              <span className="font-semibold text-foreground tabular-nums">{totalCost > 0 ? formatKrwCompact(totalCost) : '—'}</span>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-muted-foreground">평가금</span>
              <span className="font-semibold text-foreground tabular-nums">{hasAnyValue ? formatKrwCompact(totalValue) : '—'}</span>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-muted-foreground">수익금</span>
              {hasAnyValue && totalCost > 0 ? (
                <>
                  <span className={`font-semibold tabular-nums ${totalProfit >= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                    {totalProfit >= 0 ? '+' : ''}{formatKrwCompact(totalProfit)}
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
  realizedProfitKrw?: number
  sparklines?: Record<string, OhlcPoint[]>
  monthlyData?: MonthlyDataPoint[]
  annualData?: AnnualDataPoint[]
  monthlyByType?: Record<string, MonthlyDataPoint[]>
  annualByType?: Record<string, AnnualDataPoint[]>
  dailyByType?: Record<string, DailyDataPoint[]>
}

export function AssetsPageClient({ performances, realizedProfitKrw = 0, sparklines: initialSparklines, monthlyData = [], annualData = [], monthlyByType = {}, annualByType = {}, dailyByType = {} }: AssetsPageClientProps) {
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

  const [active, setActive] = useState<string>('all')
  const [activeAccount, setActiveAccount] = useState<'all' | 'personal' | 'pension' | 'direct'>('all')
  const [activeOwner, setActiveOwner] = useState<string>('all')

  // grouped은 AssetFilter 내부의 showAccountFilter/showOwnerFilter 계산에 쓰이므로 전체 기준 유지
  const grouped = useMemo(() => {
    return ASSET_TYPE_ORDER.reduce<Record<string, AssetPerformance[]>>((acc, type) => {
      const items = performances.filter((a) => a.assetType === type)
      if (items.length > 0) acc[type] = items
      return acc
    }, {})
  }, [performances])

  const preTypeFiltered = useMemo(() => {
    let result = performances
    const PENSION_TYPES = ['isa', 'irp', 'pension', 'dc']
    if (activeAccount === 'personal') result = result.filter((a) => a.accountType === 'brokerage')
    else if (activeAccount === 'pension') result = result.filter((a) => !!a.accountType && PENSION_TYPES.includes(a.accountType))
    else if (activeAccount === 'direct') result = result.filter((a) => a.assetType !== 'fund' && (!a.accountType || (!PENSION_TYPES.includes(a.accountType) && a.accountType !== 'brokerage')))
    if (activeOwner !== 'all') result = result.filter((a) => a.owner === activeOwner)
    return result
  }, [performances, activeAccount, activeOwner])

  // 종목 select 옵션은 계좌/소유주 필터 결과 기준으로 좁힘
  const types = useMemo(() => {
    const seen = new Set(preTypeFiltered.map((a) => a.assetType))
    return ASSET_TYPE_ORDER.filter((t) => seen.has(t))
  }, [preTypeFiltered])

  const filteredPerformances = useMemo(() => {
    if (active !== 'all') return preTypeFiltered.filter((a) => a.assetType === active)
    return preTypeFiltered
  }, [preTypeFiltered, active])

  const filteredGroupedForSummary = useMemo(() =>
    filteredPerformances.reduce<Record<string, AssetPerformance[]>>((acc, a) => {
      if (!acc[a.assetType]) acc[a.assetType] = []
      acc[a.assetType].push(a)
      return acc
    }, {})
  , [filteredPerformances])

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
      <SummaryCards
        grouped={filteredGroupedForSummary}
        performances={filteredPerformances}
        realizedProfitKrw={realizedProfitKrw}
        showTypeStrip={false}
      />
      <TodayReport performances={performances} />
      <AssetFilter
        types={types}
        grouped={grouped}
        active={active}
        setActive={setActive}
        activeAccount={activeAccount}
        setActiveAccount={setActiveAccount}
        activeOwner={activeOwner}
        setActiveOwner={setActiveOwner}
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
  types, grouped, active, setActive, activeAccount, setActiveAccount,
  activeOwner, setActiveOwner,
  sparklines, lineDataMap, monthlyByType, annualByType, dailyByType,
}: {
  types: string[]
  grouped: Record<string, AssetPerformance[]>
  active: string
  setActive: (v: string) => void
  activeAccount: 'all' | 'personal' | 'pension' | 'direct'
  setActiveAccount: (v: 'all' | 'personal' | 'pension' | 'direct') => void
  activeOwner: string
  setActiveOwner: (v: string) => void
  sparklines: Record<string, OhlcPoint[]>
  lineDataMap: Record<string, AssetHistoryPoint[]>
  monthlyByType: Record<string, MonthlyDataPoint[]>
  annualByType: Record<string, AnnualDataPoint[]>
  dailyByType: Record<string, DailyDataPoint[]>
}) {

  const allAssets = useMemo(() => Object.values(grouped).flat(), [grouped])

  const PENSION_TYPES = ['isa', 'irp', 'pension', 'dc']
  const isPersonal = (a: AssetPerformance) => a.accountType === 'brokerage'
  const isPension  = (a: AssetPerformance) => !!a.accountType && PENSION_TYPES.includes(a.accountType)
  const isDirect   = (a: AssetPerformance) => !isPersonal(a) && !isPension(a) && a.assetType !== 'fund'

  const personalCount = useMemo(() => allAssets.filter(isPersonal).length, [allAssets])
  const pensionCount  = useMemo(() => allAssets.filter(isPension).length,  [allAssets])
  const directCount   = useMemo(() => allAssets.filter(isDirect).length,   [allAssets])

  const ownerCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of allAssets) {
      if (!a.owner) continue
      map.set(a.owner, (map.get(a.owner) ?? 0) + 1)
    }
    return map
  }, [allAssets])

  const ownersInData = useMemo(
    () => OWNER_ORDER.filter((o) => (ownerCounts.get(o) ?? 0) > 0),
    [ownerCounts],
  )

  const filteredGrouped = useMemo(() => {
    if (activeAccount === 'all' && activeOwner === 'all') return grouped
    const accountPred = activeAccount === 'all'
      ? () => true
      : activeAccount === 'personal' ? isPersonal
      : activeAccount === 'pension' ? isPension
      : isDirect
    const ownerPred = activeOwner === 'all'
      ? () => true
      : (a: AssetPerformance) => a.owner === activeOwner
    const result: Record<string, AssetPerformance[]> = {}
    for (const type of types) {
      const filtered = (grouped[type] ?? []).filter((a) => accountPred(a) && ownerPred(a))
      if (filtered.length > 0) result[type] = filtered
    }
    return result
  }, [grouped, types, activeAccount, activeOwner])

  const showAll = types.length > 1
  const showAccountFilter = [personalCount, pensionCount, directCount].filter(Boolean).length >= 2
  const showOwnerFilter = ownersInData.length >= 2
  const visibleTypes = (active === 'all' ? types : types.filter((t) => t === active))
    .filter((t) => (filteredGrouped[t]?.length ?? 0) > 0)

  return (
    <div className="space-y-3">
      {/* 필터 셀렉트 행 */}
      <div className="flex gap-2 justify-center">
        {showOwnerFilter && (
          <div className="flex-1 min-w-0 max-w-36">
            <Select value={activeOwner === 'all' ? '' : activeOwner} onValueChange={(v) => setActiveOwner(v || 'all')}>
              <SelectTrigger className="h-8 w-full text-xs justify-center">
                <SelectValue placeholder="전체 소유주">
                  {activeOwner === 'all' ? '전체 소유주' : `${OWNER_ICONS[activeOwner] ?? '👤'} ${activeOwner}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체 소유주</SelectItem>
                {ownersInData.map((owner) => (
                  <SelectItem key={owner} value={owner}>
                    {OWNER_ICONS[owner]} {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {showAccountFilter && (
          <div className="flex-1 min-w-0 max-w-36">
            <Select value={activeAccount === 'all' ? '' : activeAccount} onValueChange={(v) => setActiveAccount((v || 'all') as 'all' | 'personal' | 'pension' | 'direct')}>
              <SelectTrigger className="h-8 w-full text-xs justify-center">
                <SelectValue placeholder="투자 방식">
                  {activeAccount === 'all' ? '투자 방식' : activeAccount === 'personal' ? '증권계좌' : activeAccount === 'pension' ? '연금계좌' : '직접보유'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                {personalCount > 0 && <SelectItem value="personal">증권계좌</SelectItem>}
                {pensionCount > 0  && <SelectItem value="pension">연금계좌</SelectItem>}
                {directCount > 0   && <SelectItem value="direct">직접보유</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        )}
        {showAll && (
          <div className="flex-1 min-w-0 max-w-36">
            <Select value={active === 'all' ? '' : active} onValueChange={(v) => setActive(v || 'all')}>
              <SelectTrigger className="h-8 w-full text-xs justify-center">
                <SelectValue placeholder="전체 자산">
                  {active === 'all' ? '전체 자산' : (ASSET_TYPE_LABELS_SHORT[active] ?? ASSET_TYPE_LABELS[active])}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체 자산</SelectItem>
                {types.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ASSET_TYPE_LABELS_SHORT[type] ?? ASSET_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 콘텐츠 */}
      {visibleTypes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">선택한 조건에 해당하는 자산이 없습니다.</p>
          <button
            onClick={() => { setActive('all'); setActiveAccount('all'); setActiveOwner('all') }}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            전체 보기
          </button>
        </div>
      ) : (
        <div className="space-y-0">
          {visibleTypes.map((type, i) => (
            <div key={type}>
              {i > 0 && <Separator className="my-6 bg-foreground" />}
              <div className="space-y-3">
                <CollapsibleChart
                  assets={filteredGrouped[type]}
                  sparklines={sparklines}
                  monthlyData={monthlyByType[type] ?? []}
                  annualData={annualByType[type] ?? []}
                  dailyData={dailyByType[type] ?? []}
                />
                <AssetCardList
                  assets={filteredGrouped[type]}
                  sparklines={sparklines}
                  lineDataMap={lineDataMap}
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
      )}
    </div>
  )
}
