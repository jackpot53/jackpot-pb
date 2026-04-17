import type { NextRequest } from 'next/server'
import { fetchSparklinesForTickers } from '@/lib/price/sparkline'

/**
 * GET /api/sparklines?tickers=AAPL,005930.KS,...
 * Returns a JSON object mapping ticker → number[] (30-day closes).
 * Uses Next.js data cache (revalidate: 3600) inherited from fetchSparklineData.
 * Called client-side after initial render so it never blocks server TTFB.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('tickers') ?? ''
  const tickers = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 50) // safety cap

  if (tickers.length === 0) {
    return Response.json({})
  }

  const map = await fetchSparklinesForTickers(tickers)
  return Response.json(Object.fromEntries(map), {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
