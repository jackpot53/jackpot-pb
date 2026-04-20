'use client'

import { useKisLivePrice } from '@/lib/ws/kis-ws-context'
import { formatKrw, formatUsd } from '@/lib/portfolio'

type Props = {
  ticker: string | null | undefined
  assetType: string
  fallbackPriceKrw: number
  /** Optional original USD price as a float (e.g. 185.43) — used for stock_us / etf_us */
  fallbackPriceUsd?: number | null
  fallbackChangePct: number | null
  className?: string
  changeClassName?: string
  /** When false, always show fallback values (no WS subscription). Default true. */
  enabled?: boolean
}

const KIS_LIVE_TYPES = new Set(['stock_kr', 'etf_kr', 'stock_us', 'etf_us'])

/**
 * Renders current price + today's change %, swapping to live websocket ticks
 * when available, otherwise falling back to SSR-provided cache values.
 *
 * Layout matches the existing inline KRW + (USD)? + change span pattern
 * in assets-page-client / overview-tab so wrapping is a drop-in replacement.
 */
export function LivePrice({
  ticker,
  assetType,
  fallbackPriceKrw,
  fallbackPriceUsd,
  fallbackChangePct,
  className,
  changeClassName,
  enabled = true,
}: Props) {
  const supportsLive = enabled && !!ticker && KIS_LIVE_TYPES.has(assetType)
  const tick = useKisLivePrice(supportsLive ? ticker : null, supportsLive ? assetType : null)

  const isUs = assetType === 'stock_us' || assetType === 'etf_us'
  const isLive = !!tick

  const displayPriceLabel = (() => {
    if (tick && isUs) {
      return formatUsd(tick.price)
    }
    if (tick) {
      return formatKrw(Math.round(tick.price))
    }
    if (isUs && fallbackPriceUsd != null) {
      return formatUsd(fallbackPriceUsd)
    }
    return formatKrw(fallbackPriceKrw)
  })()

  const changePct = tick?.changePercent ?? fallbackChangePct
  const positive = (changePct ?? 0) >= 0

  return (
    <>
      <span data-component="LivePrice" className={className}>
        <span className="text-foreground">{displayPriceLabel}</span>
      </span>
      {changePct !== null && (
        <span className={`tabular-nums font-bold ${positive ? 'text-red-500' : 'text-blue-500'} ${changeClassName ?? ''}`}>
          {positive ? '+' : ''}
          {changePct.toFixed(2)}%
        </span>
      )}
    </>
  )
}
