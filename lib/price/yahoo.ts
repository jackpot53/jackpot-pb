/**
 * Fetches stock/ETF quote from Yahoo Finance (unofficial public API, no key required).
 * Used for Korean stocks and ETFs — tickers must include exchange suffix:
 *   KOSPI:  005930.KS  (Samsung Electronics)
 *   KOSDAQ: 035720.KQ  (Kakao)
 *
 * Returns:
 *   - KRW integer price for KRW-quoted securities (.KS / .KQ)
 *   - USD cents (integer) for USD-quoted securities
 *   - null if ticker is unknown, market is closed with no price, or request fails
 *
 * Yahoo Finance returns regularMarketPrice in the security's native currency.
 * Caller is responsible for currency-aware storage.
 */
export async function fetchYahooQuote(
  ticker: string
): Promise<{ price: number; currency: string; changePercent: number | null } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
      headers: {
        // Yahoo Finance blocks requests without a User-Agent
        'User-Agent': 'Mozilla/5.0',
      },
    })
    if (!res.ok) return null

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta) return null

    const price: number = meta.regularMarketPrice ?? meta.chartPreviousClose
    const currency: string = (meta.currency ?? 'KRW').toUpperCase()

    if (!price || price <= 0) return null

    const prevClose: number | null =
      typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0
        ? meta.chartPreviousClose
        : null
    const changePercent: number | null =
      typeof meta.regularMarketChangePercent === 'number'
        ? meta.regularMarketChangePercent
        : prevClose !== null
        ? ((price - prevClose) / prevClose) * 100
        : null

    return { price, currency, changePercent }
  } catch {
    return null
  }
}

/**
 * Fetches USD/KRW exchange rate from Yahoo Finance (ticker: KRW=X).
 * Returns rate as integer × 10000 for lossless storage (same format as BOK).
 * Example: 1356.5 → 13565000
 */
export async function fetchYahooFxRate(): Promise<number | null> {
  try {
    const result = await fetchYahooQuote('KRW=X')
    if (!result || result.price <= 0) return null
    return Math.round(result.price * 10000)
  } catch {
    return null
  }
}
