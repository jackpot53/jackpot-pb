import type { NextRequest } from 'next/server'
import { fetchSparklinesForTickers } from '@/lib/price/sparkline'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { inArray } from 'drizzle-orm'

/**
 * GET /api/sparklines?tickers=AAPL,005930.KS&interval=1d&range=1mo
 * Returns a JSON object mapping ticker → OhlcPoint[].
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const raw = params.get('tickers') ?? ''
  const interval = params.get('interval') ?? '1d'
  const range = params.get('range') ?? '1mo'

  const TICKER_RE = /^[A-Za-z0-9.\-]{1,20}$/
  const tickers = raw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t && TICKER_RE.test(t))
    .slice(0, 50)

  if (tickers.length === 0) {
    return Response.json({})
  }

  // Resolve asset types for requested tickers to route KR/US stocks through KIS
  const assetRows = await db
    .select({ ticker: assets.ticker, assetType: assets.assetType })
    .from(assets)
    .where(inArray(assets.ticker, tickers))

  const assetTypes = new Map(
    assetRows.filter(r => r.ticker !== null).map(r => [r.ticker as string, r.assetType]),
  )

  const map = await fetchSparklinesForTickers(tickers, interval, range, assetTypes)
  return Response.json(Object.fromEntries(map), {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
