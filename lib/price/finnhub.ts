/**
 * Fetches the current stock/ETF quote from Finnhub REST API.
 * Returns price in USD cents (integer) or null if unavailable.
 *
 * Critical: Finnhub returns c=0 for unknown/uncovered tickers (including KRX on free tier).
 * Treat c=0 as null — never write 0 to priceCache.priceKrw.
 */
export async function fetchFinnhubQuote(ticker: string): Promise<{ priceUsdCents: number; changePercent: number | null } | null> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${encodeURIComponent(apiKey)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(3_000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    // data.c is the current price in USD. 0 means no data.
    if (!data.c || data.c <= 0) return null
    // Convert to cents (integer) for storage
    return { priceUsdCents: Math.round(data.c * 100), changePercent: typeof data.dp === 'number' ? data.dp : null }
  } catch {
    return null
  }
}
