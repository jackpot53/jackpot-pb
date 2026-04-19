import { cache } from 'react'
import { getAssetsWithHoldings } from '@/db/queries/assets-with-holdings'
import { getPriceCacheByTickers } from '@/db/queries/price-cache'
import { getSavingsDetails, getSavingsBuys } from '@/db/queries/savings'
import { getInsuranceDetails, getInsuranceBuys } from '@/db/queries/insurance'
import { getContributionDividendRates } from '@/db/queries/contribution'
import { computeAssetPerformance, type AssetPerformance } from '@/lib/portfolio'
import { timed, timedSync } from '@/lib/perf'

// Stale threshold: prices older than 5 minutes show a stale badge in the performance table
const PRICE_TTL_MS = 5 * 60 * 1000

function isStalePrice(cachedAt: Date | null): boolean {
  if (!cachedAt) return true
  return Date.now() - cachedAt.getTime() > PRICE_TTL_MS
}

export const loadPerformances = cache(async (userId: string): Promise<{
  performances: AssetPerformance[]
  priceMap: Map<string, { priceKrw: number; cachedAt: Date | null }>
}> => {
  return timed('loadPerformances', async () => {
  const assetsWithHoldings = await timed('  getAssetsWithHoldings', () => getAssetsWithHoldings(userId))

  const liveTickers = assetsWithHoldings
    .filter((a) => (a.priceType === 'live' || a.assetType === 'fund') && a.ticker)
    .map((a) => a.ticker!)
  const savingsIds = assetsWithHoldings.filter((a) => a.assetType === 'savings').map((a) => a.assetId)
  const insuranceIds = assetsWithHoldings.filter((a) => a.assetType === 'insurance').map((a) => a.assetId)
  const contributionIds = assetsWithHoldings.filter((a) => a.assetType === 'contribution').map((a) => a.assetId)

  // All secondary queries run in parallel after we have asset IDs
  const [
    priceMap,
    [savingsDetailsMap, savingsBuysMap],
    [insuranceDetailsMap, insuranceBuysMap],
    contributionDividendRatesMap,
  ] = await timed('  parallel secondary queries', () => Promise.all([
    getPriceCacheByTickers([...liveTickers, 'USD_KRW']),
    Promise.all([getSavingsDetails(savingsIds), getSavingsBuys(savingsIds)]),
    Promise.all([getInsuranceDetails(insuranceIds), getInsuranceBuys(insuranceIds)]),
    getContributionDividendRates(contributionIds),
  ]))

  const fxCacheRow = priceMap.get('USD_KRW')
  const currentFxRate = fxCacheRow ? fxCacheRow.priceKrw / 10000 : null

  const performances = timedSync('  computeAssetPerformance (loop)', () => {
    const out: AssetPerformance[] = []
    for (const asset of assetsWithHoldings.filter(
      (a) => Number(a.totalQuantity ?? 0) > 0 || Number(a.totalCostKrw ?? 0) > 0 || a.latestManualValuationKrw !== null || a.assetType === 'savings' || a.assetType === 'contribution'
    )) {
      let currentPriceKrw = 0
      let cachedAt: Date | null = null
      let stale = false

      let dailyChangeBps: number | null = null
      let currentPriceUsd: number | null = null
      if ((asset.priceType === 'live' || asset.assetType === 'fund') && asset.ticker) {
        const priceRow = priceMap.get(asset.ticker)
        currentPriceKrw = priceRow?.priceKrw ?? 0
        cachedAt = priceRow?.cachedAt ?? null
        stale = isStalePrice(cachedAt)
        dailyChangeBps = priceRow?.changeBps ?? null
        if (priceRow?.currency === 'USD' && priceRow.priceOriginal > 0) {
          currentPriceUsd = priceRow.priceOriginal / 100
        }
      }

      // DB bigint columns returned as strings when coming from raw SQL subqueries —
      // explicitly coerce to number to prevent string concatenation in reduce().
      out.push(
        computeAssetPerformance({
          holding: {
            ...asset,
            totalQuantity: Number(asset.totalQuantity ?? 0),
            avgCostPerUnit: Number(asset.avgCostPerUnit ?? 0),
            avgCostPerUnitOriginal: asset.avgCostPerUnitOriginal != null ? Number(asset.avgCostPerUnitOriginal) : null,
            avgExchangeRateAtTime: asset.avgExchangeRateAtTime != null ? Number(asset.avgExchangeRateAtTime) : null,
            totalCostKrw: Number(asset.totalCostKrw ?? 0),
          },
          currentPriceKrw,
          currentPriceUsd,
          currentFxRate,
          isStale: stale,
          cachedAt,
          dailyChangeBps,
          latestManualValuationKrw: asset.latestManualValuationKrw !== null
            ? Number(asset.latestManualValuationKrw)
            : null,
          savingsDetails: savingsDetailsMap.get(asset.assetId) ?? null,
          savingsBuys: savingsBuysMap.get(asset.assetId) ?? [],
          insuranceDetails: insuranceDetailsMap.get(asset.assetId) ?? null,
          insuranceBuys: insuranceBuysMap.get(asset.assetId) ?? [],
          contributionDividendRates: contributionDividendRatesMap.get(asset.assetId) ?? null,
        })
      )
    }
    return out
  })

  return { performances, priceMap }
  })
})
