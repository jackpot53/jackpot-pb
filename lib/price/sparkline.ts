/**
 * Fetches 30-day daily closing prices from Yahoo Finance for sparkline rendering.
 * Works for KR stocks (.KS / .KQ), US stocks, and most ETFs.
 * Returns null if the ticker is unsupported (e.g. Finnhub-format crypto) or request fails.
 */
export async function fetchSparklineData(ticker: string): Promise<number[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1mo`
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // cache 1 hour — sparklines don't need real-time refresh
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const closes: (number | null)[] | undefined =
      data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close
    if (!Array.isArray(closes)) return null

    const filtered = closes.filter((v): v is number => typeof v === 'number' && v > 0)
    return filtered.length >= 2 ? filtered : null
  } catch {
    return null
  }
}

/**
 * Fetches sparklines for multiple tickers in parallel.
 * Tickers that fail or are unsupported are silently omitted from the result map.
 */
export async function fetchSparklinesForTickers(
  tickers: string[]
): Promise<Map<string, number[]>> {
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const data = await fetchSparklineData(ticker)
      return { ticker, data }
    })
  )

  const map = new Map<string, number[]>()
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.data) {
      map.set(result.value.ticker, result.value.data)
    }
  }
  return map
}
