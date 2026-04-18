import { cache } from 'react'
import { getAssetsWithHoldings } from '@/db/queries/assets-with-holdings'
import { getPriceCacheByTickers } from '@/db/queries/price-cache'
import { getSavingsDetails, getSavingsBuys } from '@/db/queries/savings'
import { getInsuranceDetails, getInsuranceBuys } from '@/db/queries/insurance'
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

  // Include live assets AND fund assets with a ticker (may have priceType='manual' in legacy data)
  const liveTickers = assetsWithHoldings
    .filter((a) => (a.priceType === 'live' || a.assetType === 'fund') && a.ticker)
    .map((a) => a.ticker!)
  const priceMap = await timed('  getPriceCacheByTickers', () => getPriceCacheByTickers([...liveTickers, 'USD_KRW']))

  // savings 전용: 이자 자동계산에 필요한 메타 + 납입 내역 (savings 자산만 추가 쿼리)
  const savingsIds = assetsWithHoldings
    .filter((a) => a.assetType === 'savings')
    .map((a) => a.assetId)
  const [savingsDetailsMap, savingsBuysMap] = await timed('  savings details+buys', () => Promise.all([
    getSavingsDetails(savingsIds),
    getSavingsBuys(savingsIds),
  ]))

  // insurance 전용: 계약 메타데이터 + 납입 내역 bulk 조회
  const insuranceIds = assetsWithHoldings
    .filter((a) => a.assetType === 'insurance')
    .map((a) => a.assetId)
  const [insuranceDetailsMap, insuranceBuysMap] = await timed('  insurance details+buys', () =>
    Promise.all([
      getInsuranceDetails(insuranceIds),
      getInsuranceBuys(insuranceIds),
    ])
  )

  const fxCacheRow = priceMap.get('USD_KRW')
  const currentFxRate = fxCacheRow ? fxCacheRow.priceKrw / 10000 : null

  const performances = timedSync('  computeAssetPerformance (loop)', () => {
    const out: AssetPerformance[] = []
    for (const asset of assetsWithHoldings.filter(
      (a) => Number(a.totalQuantity ?? 0) > 0 || Number(a.totalCostKrw ?? 0) > 0 || a.latestManualValuationKrw !== null || a.assetType === 'savings'
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
        })
      )
    }
    return out
  })

  return { performances, priceMap }
  })
})
