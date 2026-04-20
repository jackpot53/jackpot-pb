'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useKisLivePrice, subscribeToTick, getTickSnapshot } from '@/lib/ws/kis-ws-context'
import type { AssetPerformance } from '@/lib/portfolio/portfolio'
import type { Tick } from '@/lib/ws/kis-ws-types'

const LIVE_TYPES = new Set(['stock_kr', 'etf_kr', 'stock_us', 'etf_us'])

function isLiveType(assetType: string): boolean {
  return LIVE_TYPES.has(assetType)
}

/**
 * Overlay a live tick onto an AssetPerformance snapshot.
 * Returns the original `p` unchanged when tick is absent or conditions aren't met.
 *
 * FX rate is kept at the SSR-time value (p.currentFxRate) because KIS does not push FX ticks.
 * KR ticks: price is KRW integer. US ticks: price is USD float.
 */
export function applyTickToPerformance(
  p: AssetPerformance,
  tick: Tick | undefined,
): AssetPerformance {
  if (!tick || p.totalQuantity <= 0 || p.totalCostKrw <= 0) return p

  const isUs = p.assetType === 'stock_us' || p.assetType === 'etf_us'
  const qty = p.totalQuantity / 1e8

  const priceKrw = isUs
    ? (p.currentFxRate != null ? tick.price * p.currentFxRate : p.currentPriceKrw)
    : tick.price

  const currentValueKrw = Math.round(qty * priceKrw)
  const returnPct = ((currentValueKrw - p.totalCostKrw) / p.totalCostKrw) * 100
  const dailyChangeBps =
    tick.changePercent != null ? Math.round(tick.changePercent * 100) : p.dailyChangeBps

  // USD asset: recompute stock-only return (USD price change); FX return stays fixed
  let stockReturnPct = p.stockReturnPct
  if (isUs && p.avgCostPerUnitOriginal != null && p.avgCostPerUnitOriginal > 0) {
    const avgCostUsd = p.avgCostPerUnitOriginal / 100
    stockReturnPct = ((tick.price / avgCostUsd) - 1) * 100
  }

  return {
    ...p,
    currentPriceKrw: Math.round(priceKrw),
    currentPriceUsd: isUs ? tick.price : p.currentPriceUsd,
    currentValueKrw,
    returnPct,
    dailyChangeBps,
    stockReturnPct,
    isStale: false,
    cachedAt: new Date(tick.tradedAt),
  }
}

/**
 * Per-(tick, asset) cache: avoids creating a new object on every getSnapshot call
 * when the (asset, tick) pair hasn't changed.
 * Outer key: Tick object (changes each push). Inner key: AssetPerformance snapshot.
 */
const perTickCache = new WeakMap<Tick, WeakMap<AssetPerformance, AssetPerformance>>()

function applyTickCached(p: AssetPerformance, tick: Tick | undefined): AssetPerformance {
  if (!tick) return p
  let inner = perTickCache.get(tick)
  if (!inner) {
    inner = new WeakMap()
    perTickCache.set(tick, inner)
  }
  const cached = inner.get(p)
  if (cached) return cached
  const result = applyTickToPerformance(p, tick)
  inner.set(p, result)
  return result
}

/**
 * Array-level reference cache: avoids returning a new array when all element
 * references are unchanged (same assets + same ticks).
 * Keyed by the assets array reference; cleaned up when the array is GC'd.
 */
const arrayCache = new WeakMap<AssetPerformance[], AssetPerformance[]>()

function computeOverlayArray(assets: AssetPerformance[]): AssetPerformance[] {
  const next = assets.map(a => {
    const tick = a.ticker ? getTickSnapshot(a.ticker) : undefined
    return applyTickCached(a, tick)
  })
  const prev = arrayCache.get(assets)
  if (prev && prev.length === next.length && next.every((p, i) => p === prev[i])) {
    return prev
  }
  arrayCache.set(assets, next)
  return next
}

/**
 * Subscribe a single AssetPerformance to its live KIS tick.
 * Returns a new AssetPerformance with updated prices/returns when a tick arrives.
 * Falls back to the original `asset` when WS is disabled or no tick has arrived.
 */
export function useLivePerformance(asset: AssetPerformance): AssetPerformance {
  const eligible = !!asset.ticker && isLiveType(asset.assetType)
  const tick = useKisLivePrice(eligible ? asset.ticker : null, eligible ? asset.assetType : null)
  return applyTickCached(asset, tick)
}

/**
 * Subscribe an array of AssetPerformances to live KIS ticks.
 * Returns a stable array reference that only changes when a tick actually updates a value.
 * Used for aggregate computations (list summaries, TodayReport).
 *
 * Note: this only listens to the tick store — KIS WS subscriptions are managed
 * by the individual <AssetCard> components via useLivePerformance.
 */
export function useLivePerformances(assets: AssetPerformance[]): AssetPerformance[] {
  // Stable key derived from the live ticker set — re-subscribes only when tickers change
  const tickerKey = assets
    .filter(a => isLiveType(a.assetType) && !!a.ticker)
    .map(a => a.ticker!)
    .join('\x00')

  const subscribe = useCallback(
    (onChange: () => void) => {
      const tickers = [...new Set(tickerKey.split('\x00').filter(Boolean))]
      const cleanups = tickers.map(ticker => subscribeToTick(ticker, onChange))
      return () => cleanups.forEach(fn => fn())
    },
    [tickerKey],
  )

  const getSnapshot = useCallback(
    () => computeOverlayArray(assets),
    [assets],
  )

  return useSyncExternalStore(subscribe, getSnapshot, () => assets)
}
