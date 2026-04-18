import type { NextRequest } from 'next/server'
import { fetchSparklinesForTickers } from '@/lib/price/sparkline'

/**
 * GET /api/sparklines?tickers=AAPL,005930.KS&interval=1d&range=1mo
 * Returns a JSON object mapping ticker → OhlcPoint[].
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const raw = params.get('tickers') ?? ''
  const interval = params.get('interval') ?? '1d'
  const range = params.get('range') ?? '1mo'

  const tickers = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 50)

  if (tickers.length === 0) {
    return Response.json({})
  }

  const map = await fetchSparklinesForTickers(tickers, interval, range)
  return Response.json(Object.fromEntries(map), {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
