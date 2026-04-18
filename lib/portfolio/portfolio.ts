/**
 * Portfolio computation library — Phase 3 core math.
 * All functions are pure (no DB calls). They accept pre-fetched data as arguments.
 * All money values are KRW integers (BIGINT convention, Phase 1 D-04).
 */
import { computeCurrentSavingsValueKrw, generateVirtualRecurringBuys, type SavingsDetails, type SavingsBuy } from '@/lib/savings'
import type { InsuranceDetailsRow } from '@/db/schema/insurance-details'

export interface AssetHoldingInput {
  assetId: string
  name: string
  ticker: string | null
  assetType: 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'fund' | 'savings' | 'real_estate' | 'insurance' | 'precious_metal' | 'cma'
  priceType: 'live' | 'manual'
  currency: 'KRW' | 'USD'
  accountType: 'isa' | 'irp' | 'pension' | 'dc' | 'brokerage' | null
  brokerageId: string | null
  owner: string | null
  notes: string | null
  insuranceType: string | null
  totalQuantity: number    // ×10^8 integer
  avgCostPerUnit: number   // KRW per unit
  avgCostPerUnitOriginal: number | null  // USD cents for USD assets, null for KRW
  avgExchangeRateAtTime: number | null   // KRW per USD × 10000, null for KRW assets
  totalCostKrw: number     // total KRW invested (cost basis)
}

export interface AssetPerformance extends AssetHoldingInput {
  currentPriceKrw: number   // price used for valuation (priceCache or manualValuation)
  currentPriceUsd: number | null  // USD price per unit (only for USD-priced assets)
  currentValueKrw: number   // (totalQuantity / 1e8) × currentPriceKrw
  returnPct: number         // (currentValue - totalCostKrw) / totalCostKrw × 100
  /** USD asset only: stock-only return % (USD price change, FX held constant) */
  stockReturnPct: number | null
  /** USD asset only: FX-only return % (KRW/USD rate change, stock price held constant) */
  fxReturnPct: number | null
  /** Current KRW/USD rate (from price cache) used to compute FX breakdown */
  currentFxRate: number | null
  isStale: boolean
  cachedAt: Date | null
  dailyChangeBps: number | null
  /** true when priceType==='manual' but no valuation row exists — UI should flag this asset */
  missingValuation: boolean
  /** savings 전용: 가입일 'YYYY-MM-DD', 없으면 null */
  initialTransactionDate: string | null
  /** savings 전용: 만기일 'YYYY-MM-DD', 없으면 null */
  maturityDate: string | null
  /** savings 전용: 연이자율 bp×100 (e.g. 52500 = 5.25%), 없으면 null */
  interestRateBp: number | null
  /** savings recurring 전용: 월납입 계획액 (KRW), 없으면 null */
  monthlyContributionKrw: number | null
  /** 보험 전용: 계약 메타데이터, 없으면 null */
  insuranceDetails: InsuranceDetailsRow | null
}

export interface PortfolioSummary {
  totalValueKrw: number
  totalValueUsd: number
  totalCostKrw: number
  gainLossKrw: number
  returnPct: number
}

export interface TypeAllocation {
  assetType: AssetHoldingInput['assetType']
  totalValueKrw: number
  sharePct: number
}

/**
 * Computes per-asset performance from holdings data + price info.
 * D-15: currentValueKrw = (totalQuantity / 1e8) × currentPriceKrw (LIVE)
 * D-16: fund(manual)/real_estate: currentValueKrw = (qty/1e8) × latestManualValuationKrw (기준가/단가)
 *        other manual: currentValueKrw = latestManualValuationKrw (총값 그대로)
 *        fund(live): uses priceCache like stocks — (qty/1e8) × currentPriceKrw
 */
export function computeAssetPerformance(params: {
  holding: AssetHoldingInput
  currentPriceKrw: number
  currentPriceUsd?: number | null
  currentFxRate?: number | null  // current KRW per USD rate (plain number, e.g. 1350.5)
  isStale: boolean
  cachedAt: Date | null
  latestManualValuationKrw: number | null
  dailyChangeBps?: number | null
  // savings 전용: 자동 이자 계산에 필요한 메타 + 납입 내역
  savingsDetails?: SavingsDetails | null
  savingsBuys?: SavingsBuy[]
  // 보험 전용: 계약 메타데이터
  insuranceDetails?: InsuranceDetailsRow | null
}): AssetPerformance {
  const { holding, currentPriceKrw, currentPriceUsd = null, currentFxRate = null, isStale, cachedAt, latestManualValuationKrw, dailyChangeBps = null, savingsDetails = null, savingsBuys = [], insuranceDetails = null } = params

  // 정기적금(recurring): 가입일 기준 월납입 × 경과월수로 항상 가상 납입 내역 생성
  // 실제 거래 내역 여부와 무관하게 계약 금액 기준으로 평가액 산출
  const effectiveBuys: SavingsBuy[] = (() => {
    if (
      savingsDetails?.kind === 'recurring' &&
      savingsDetails.monthlyContributionKrw != null &&
      savingsDetails.monthlyContributionKrw > 0 &&
      savingsDetails.depositStartDate
    ) {
      return generateVirtualRecurringBuys({
        depositStartDate: savingsDetails.depositStartDate,
        monthlyContributionKrw: savingsDetails.monthlyContributionKrw,
      })
    }
    return savingsBuys
  })()

  // 가상 납입 내역 사용 시 totalCostKrw 재계산
  const effectiveTotalCostKrw =
    effectiveBuys !== savingsBuys && effectiveBuys.length > 0
      ? effectiveBuys.reduce((s, b) => s + b.amountKrw, 0)
      : holding.totalCostKrw

  // savings 자동계산: 이자율 기반으로 경과일수 × 이자를 각 납입건별 합산.
  // latestManualValuationKrw(실지급액 덮어쓰기)가 있으면 자동계산을 무시.
  const isSavingsAuto =
    holding.assetType === 'savings' &&
    savingsDetails != null &&
    savingsDetails.interestRateBp != null &&
    savingsDetails.interestRateBp > 0

  if (isSavingsAuto && savingsDetails) {
    const autoValue = computeCurrentSavingsValueKrw({
      buys: effectiveBuys,
      interestRateBp: savingsDetails.interestRateBp!,
      maturityDate: savingsDetails.maturityDate,
      compoundType: savingsDetails.compoundType,
      taxType: savingsDetails.taxType,
      autoRenew: savingsDetails.autoRenew,
      kind: savingsDetails.kind,
      monthlyContributionKrw: savingsDetails.monthlyContributionKrw,
      depositStartDate: savingsDetails.depositStartDate,
    })
    const currentValueKrw = latestManualValuationKrw ?? autoValue
    // savings 자동계산 자산은 메타가 없거나 이자율이 0일 때만 missingValuation
    const missingValuation = false
    const returnPct =
      effectiveTotalCostKrw > 0
        ? ((currentValueKrw - effectiveTotalCostKrw) / effectiveTotalCostKrw) * 100
        : 0
    return {
      ...holding,
      totalCostKrw: effectiveTotalCostKrw,
      currentPriceKrw: currentValueKrw,
      currentPriceUsd: null,
      currentValueKrw,
      returnPct,
      stockReturnPct: null,
      fxReturnPct: null,
      currentFxRate: null,
      isStale: false,
      cachedAt: null,
      dailyChangeBps: null,
      missingValuation,
      initialTransactionDate: effectiveBuys.length > 0 ? [...effectiveBuys].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))[0].transactionDate : null,
      maturityDate: savingsDetails?.maturityDate ?? null,
      interestRateBp: savingsDetails?.interestRateBp ?? null,
      monthlyContributionKrw: savingsDetails?.monthlyContributionKrw ?? null,
      insuranceDetails: null,
    }
  }

  // D-16: real_estate and fund(no live price) store latestManualValuationKrw as NAV per unit (단가).
  // fund with a live price in cache uses currentPriceKrw like stocks.
  // Other manual assets store latestManualValuationKrw as total value.
  // missingValuation=true when valuation-based but no valuation row exists — caller should surface warning
  // savings without savingsDetails (메타 미입력): missingValuation=true
  const isSavingsWithoutMeta = holding.assetType === 'savings' && !savingsDetails
  const fundHasLivePrice = holding.assetType === 'fund' && currentPriceKrw > 0
  const usesUnitPrice = (!fundHasLivePrice && holding.assetType === 'fund') || holding.assetType === 'real_estate'
  const isOtherManual = !usesUnitPrice && holding.priceType === 'manual'
  const usesManualValuation = usesUnitPrice || isOtherManual
  const missingValuation = isSavingsWithoutMeta
    ? latestManualValuationKrw === null
    : usesManualValuation && latestManualValuationKrw === null

  // fund/real_estate: currentValueKrw = (qty/1e8) × 단가; other manual: 총값 그대로; live: qty × livePrice
  const currentValueKrw = usesUnitPrice
    ? Math.round((holding.totalQuantity / 1e8) * (latestManualValuationKrw ?? 0))
    : isOtherManual
    ? (latestManualValuationKrw ?? 0)
    : Math.round((holding.totalQuantity / 1e8) * currentPriceKrw)

  // T-03-02-T: Avoid divide-by-zero when no cost basis (e.g. gift or initial seed)
  const returnPct =
    holding.totalCostKrw > 0
      ? ((currentValueKrw - holding.totalCostKrw) / holding.totalCostKrw) * 100
      : 0

  // USD asset: separate stock return (USD price change) from FX return (rate change)
  let stockReturnPct: number | null = null
  let fxReturnPct: number | null = null
  if (
    holding.avgCostPerUnitOriginal != null && holding.avgCostPerUnitOriginal > 0 &&
    holding.avgExchangeRateAtTime != null && holding.avgExchangeRateAtTime > 0 &&
    currentPriceUsd != null && currentPriceUsd > 0 &&
    currentFxRate != null && currentFxRate > 0
  ) {
    const avgCostUsd = holding.avgCostPerUnitOriginal / 100
    const avgFxRate = holding.avgExchangeRateAtTime / 10000
    stockReturnPct = ((currentPriceUsd / avgCostUsd) - 1) * 100
    fxReturnPct = ((currentFxRate / avgFxRate) - 1) * 100
  }

  return {
    ...holding,
    currentPriceKrw:
      usesManualValuation && latestManualValuationKrw !== null
        ? latestManualValuationKrw
        : currentPriceKrw,
    currentPriceUsd,
    currentValueKrw,
    returnPct,
    stockReturnPct,
    fxReturnPct,
    currentFxRate,
    isStale,
    cachedAt,
    dailyChangeBps,
    missingValuation,
    initialTransactionDate: savingsBuys.length > 0 ? [...savingsBuys].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))[0].transactionDate : null,
    maturityDate: savingsDetails?.maturityDate ?? null,
    interestRateBp: savingsDetails?.interestRateBp ?? null,
    monthlyContributionKrw: savingsDetails?.monthlyContributionKrw ?? null,
    insuranceDetails: insuranceDetails ?? null,
  }
}

/**
 * Aggregates per-asset performance into portfolio-level totals.
 * D-17: USD display = totalValueKrw / (fxRateInt / 10000)
 */
export function computePortfolio(
  assets: AssetPerformance[],
  fxRateInt: number   // USD/KRW stored as integer × 10000 (e.g. 13565000 = 1356.5)
): PortfolioSummary {
  const totalValueKrw = assets.reduce((sum, a) => sum + a.currentValueKrw, 0)
  const totalCostKrw = assets.reduce((sum, a) => sum + a.totalCostKrw, 0)
  const gainLossKrw = totalValueKrw - totalCostKrw
  const returnPct = totalCostKrw > 0 ? (gainLossKrw / totalCostKrw) * 100 : 0

  // T-03-02-T2: fxRateInt = 13565000 → fxRate = 1356.5 KRW per 1 USD
  const fxRate = fxRateInt / 10000
  const totalValueUsd = fxRate > 0 ? totalValueKrw / fxRate : 0

  return { totalValueKrw, totalValueUsd, totalCostKrw, gainLossKrw, returnPct }
}

/**
 * Groups assets by type and computes share % of portfolio.
 * Used for pie chart + breakdown list (DASH-02).
 */
export function aggregateByType(assets: AssetPerformance[]): TypeAllocation[] {
  const totalValueKrw = assets.reduce((sum, a) => sum + a.currentValueKrw, 0)
  const grouped = new Map<string, number>()

  for (const asset of assets) {
    grouped.set(asset.assetType, (grouped.get(asset.assetType) ?? 0) + asset.currentValueKrw)
  }

  return Array.from(grouped.entries()).map(([assetType, totalValue]) => ({
    assetType: assetType as AssetHoldingInput['assetType'],
    totalValueKrw: totalValue,
    sharePct: totalValueKrw > 0 ? (totalValue / totalValueKrw) * 100 : 0,
  }))
}

// ─── Number Formatting Utilities ───────────────────────────────────────────
// Source: 03-UI-SPEC.md Number Formatting Contract

/** Formats KRW integer as '₩N,NNN,NNN' (ko-KR locale, 0 decimals) */
export function formatKrw(n: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(n)
}

/** Formats USD float as '$N,NNN.NN' (en-US locale, 2 decimals) */
export function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/**
 * Formats return % with mandatory sign and 1 decimal place.
 * '+20.0%' / '-3.2%' / '0.0%'
 */
export function formatReturn(n: number): string {
  const fixed = Math.abs(n).toFixed(1)
  if (n > 0) return `+${fixed}%`
  if (n < 0) return `-${fixed}%`
  return `${fixed}%`
}

/**
 * Formats quantity stored as integer ×10^8.
 * Non-crypto: 0 decimal places. Crypto: up to 8, trailing zeros stripped.
 */
export function formatQty(quantityInt: number, isCrypto: boolean): string {
  const value = quantityInt / 1e8
  if (!isCrypto) {
    return new Intl.NumberFormat('ko-KR').format(Math.round(value))
  }
  // Crypto: format integer part with commas, keep up to 8 decimal places
  const intPart = Math.floor(value)
  const fracPart = value - intPart
  const fracStr = fracPart.toFixed(8).slice(1).replace(/0+$/, '')
  return new Intl.NumberFormat('ko-KR').format(intPart) + (fracStr === '.' ? '' : fracStr)
}
