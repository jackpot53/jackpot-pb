/**
 * Portfolio computation library — Phase 3 core math.
 * All functions are pure (no DB calls). They accept pre-fetched data as arguments.
 * All money values are KRW integers (BIGINT convention, Phase 1 D-04).
 */

export interface AssetHoldingInput {
  assetId: string
  name: string
  ticker: string | null
  assetType: 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'fund' | 'savings' | 'real_estate'
  priceType: 'live' | 'manual'
  totalQuantity: number    // ×10^8 integer
  avgCostPerUnit: number   // KRW per unit
  totalCostKrw: number     // total KRW invested (cost basis)
}

export interface AssetPerformance extends AssetHoldingInput {
  currentPriceKrw: number   // price used for valuation (priceCache or manualValuation)
  currentValueKrw: number   // (totalQuantity / 1e8) × currentPriceKrw
  returnPct: number         // (currentValue - totalCostKrw) / totalCostKrw × 100
  isStale: boolean
  cachedAt: Date | null
  /** true when priceType==='manual' but no valuation row exists — UI should flag this asset */
  missingValuation: boolean
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
 * D-16: MANUAL assets use latestManualValuationKrw directly
 */
export function computeAssetPerformance(params: {
  holding: AssetHoldingInput
  currentPriceKrw: number
  isStale: boolean
  cachedAt: Date | null
  latestManualValuationKrw: number | null
}): AssetPerformance {
  const { holding, currentPriceKrw, isStale, cachedAt, latestManualValuationKrw } = params

  // D-16: MANUAL assets and fund assets use the latest manual valuation, not priceCache
  // Fund assets have no real-time ticker — NAV is entered manually like manual assets.
  // missingValuation=true when valuation-based but no valuation row exists — caller should surface warning
  const usesManualValuation = holding.priceType === 'manual' || holding.assetType === 'fund'
  const missingValuation = usesManualValuation && latestManualValuationKrw === null
  const currentValueKrw = usesManualValuation
    ? (latestManualValuationKrw ?? 0)
    : Math.round((holding.totalQuantity / 1e8) * currentPriceKrw)

  // T-03-02-T: Avoid divide-by-zero when no cost basis (e.g. gift or initial seed)
  const returnPct =
    holding.totalCostKrw > 0
      ? ((currentValueKrw - holding.totalCostKrw) / holding.totalCostKrw) * 100
      : 0

  // For fund assets: derive per-unit price from total valuation ÷ quantity
  const fundUnitPrice =
    holding.assetType === 'fund' && latestManualValuationKrw !== null && holding.totalQuantity > 0
      ? Math.round(latestManualValuationKrw / (holding.totalQuantity / 1e8))
      : null

  return {
    ...holding,
    currentPriceKrw:
      fundUnitPrice !== null
        ? fundUnitPrice
        : usesManualValuation && latestManualValuationKrw !== null
        ? latestManualValuationKrw
        : currentPriceKrw,
    currentValueKrw,
    returnPct,
    isStale,
    cachedAt,
    missingValuation,
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
