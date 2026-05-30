import { toKisCode } from '@/lib/kis/symbol'
import { fetchKisOhlc } from '@/lib/kis/chart'

export interface OhlcPoint {
  date: string  // 'YYYY-MM-DD'
  open: number
  high: number
  low: number
  close: number
  volume?: number | null
  tradingValue?: number | null  // 거래대금(KRW) — KIS acml_tr_pbmn; 없으면 close × volume으로 계산
}

export async function fetchSparklineData(
  ticker: string,
  interval = '1d',
  range = '1mo',
): Promise<OhlcPoint[] | null> {
  // 한국 종목(.KS/.KQ)은 KIS 우선, 실패 시 Yahoo로 폴백
  const kisCode = toKisCode(ticker)
  if (kisCode) {
    try {
      const kisData = await fetchKisOhlc(kisCode, interval, range)
      if (kisData && kisData.length >= 2) return kisData
    } catch (err) {
      console.error('[sparkline] KIS fetch error, falling back to Yahoo:', err)
    }
  }

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
    const volumes: (number | null)[] = quote.volume ?? []

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
        const vol = volumes[i]
        points.push({ date, open: o, high: h, low: l, close: c, volume: typeof vol === 'number' && vol > 0 ? vol : null })
      }
    }

    return points.length >= 2 ? points : null
  } catch {
    return null
  }
}

export async function fetchSparklinesForTickers(
  tickers: string[],
  interval = '1d',
  range = '1mo',
): Promise<Map<string, OhlcPoint[]>> {
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => ({
      ticker,
      data: await fetchSparklineData(ticker, interval, range),
    }))
  )

  const map = new Map<string, OhlcPoint[]>()
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.data) {
      map.set(result.value.ticker, result.value.data)
    }
  }
  return map
}
