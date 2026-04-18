import { fetchKisOhlc } from '@/lib/price/kis'

export interface OhlcPoint {
  date: string  // 'YYYY-MM-DD'
  open: number
  high: number
  low: number
  close: number
}

/**
 * Fetches daily OHLC data from Yahoo Finance.
 * Works for KR stocks (.KS / .KQ), US stocks, and most ETFs.
 * Returns null if the ticker is unsupported or request fails.
 */
export async function fetchSparklineData(
  ticker: string,
  interval = '1d',
  range = '1mo',
): Promise<OhlcPoint[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3_000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null

    const quote = result.indicators?.quote?.[0]
    const timestamps: (number | null)[] = result.timestamp ?? []
    if (!quote) return null

    const opens: (number | null)[] = quote.open ?? []
    const highs: (number | null)[] = quote.high ?? []
    const lows: (number | null)[] = quote.low ?? []
    const closes: (number | null)[] = quote.close ?? []

    const points: OhlcPoint[] = []
    const len = Math.min(timestamps.length, opens.length, highs.length, lows.length, closes.length)
    for (let i = 0; i < len; i++) {
      const o = opens[i], h = highs[i], l = lows[i], c = closes[i], ts = timestamps[i]
      if (
        typeof o === 'number' && o > 0 &&
        typeof h === 'number' && h > 0 &&
        typeof l === 'number' && l > 0 &&
        typeof c === 'number' && c > 0 &&
        typeof ts === 'number'
      ) {
        const d = new Date(ts * 1000)
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        points.push({ date, open: o, high: h, low: l, close: c })
      }
    }

    return points.length >= 2 ? points : null
  } catch {
    return null
  }
}

const KIS_ASSET_TYPES = new Set(['stock_kr', 'etf_kr', 'stock_us', 'etf_us'])

const RANGE_DAYS: Record<string, number> = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365 }

// Converts a range string to a KST start date. Materialises "today" in KST first
// to avoid UTC/KST boundary off-by-one when the server is in UTC.
function rangeToStartDate(range: string): string {
  const days = RANGE_DAYS[range] ?? 30
  const nowKst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  nowKst.setDate(nowKst.getDate() - days)
  return nowKst.toLocaleDateString('sv-SE')
}

function todayKst(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
}

/**
 * Fetches OHLC data for multiple tickers in parallel.
 * Routes KR/US stock and ETF tickers through KIS; all others use Yahoo Finance.
 * Tickers that fail or are unsupported are silently omitted from the result map.
 */
export async function fetchSparklinesForTickers(
  tickers: string[],
  interval = '1d',
  range = '1mo',
  assetTypes?: Map<string, string>,
): Promise<Map<string, OhlcPoint[]>> {
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const assetType = assetTypes?.get(ticker)
      let data: OhlcPoint[] | null

      if (assetType && KIS_ASSET_TYPES.has(assetType)) {
        const startDate = rangeToStartDate(range)
        const endDate = todayKst()
        data = await fetchKisOhlc(ticker, assetType, startDate, endDate)
      } else {
        data = await fetchSparklineData(ticker, interval, range)
      }

      return { ticker, data }
    })
  )

  const map = new Map<string, OhlcPoint[]>()
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.data) {
      map.set(result.value.ticker, result.value.data)
    }
  }
  return map
}
