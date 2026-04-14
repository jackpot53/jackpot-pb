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
): Promise<{ price: number; currency: string } | null> {
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

    return { price, currency }
  } catch {
    return null
  }
}
