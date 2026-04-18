import type { OhlcPoint } from '@/lib/price/sparkline'
import { getToken, KisTokenError } from '@/lib/price/kis-token'
import { parseKrTicker, resolveUsTicker } from '@/lib/price/kis-ticker'

const KIS_BASE = 'https://openapi.koreainvestment.com:9443'

function getCredentials(): { appKey: string; appSecret: string } {
  const appKey = process.env.KIS_APP_KEY
  const appSecret = process.env.KIS_APP_SECRET
  if (!appKey) throw new KisTokenError('KIS_APP_KEY is not set')
  if (!appSecret) throw new KisTokenError('KIS_APP_SECRET is not set')
  return { appKey, appSecret }
}

async function kisGet(
  path: string,
  trId: string,
  params: Record<string, string>,
): Promise<Response> {
  const { appKey, appSecret } = getCredentials()
  const token = await getToken()
  const url = `${KIS_BASE}${path}?${new URLSearchParams(params)}`

  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: trId,
      custtype: 'P',
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(3_000),
  })
}

export async function fetchKisQuote(
  ticker: string,
  assetType: string,
): Promise<{ price: number; currency: string; changePercent: number | null } | null> {
  try {
    if (assetType === 'stock_kr' || assetType === 'etf_kr') {
      const parsed = parseKrTicker(ticker)
      if (!parsed) return null

      const res = await kisGet(
        '/uapi/domestic-stock/v1/quotations/inquire-price',
        'FHKST01010100',
        {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: parsed.code,
        },
      )
      if (!res.ok) return null

      const data = await res.json()
      const price = parseInt(data?.output?.stck_prpr ?? '0', 10)
      if (price <= 0) return null

      const changePercent = data?.output?.prdy_ctrt != null
        ? parseFloat(data.output.prdy_ctrt)
        : null

      return { price, currency: 'KRW', changePercent }
    }

    if (assetType === 'stock_us' || assetType === 'etf_us') {
      const { appKey, appSecret } = getCredentials()
      const { excd, symb } = await resolveUsTicker(ticker, getToken, appKey, appSecret)

      const res = await kisGet(
        '/uapi/overseas-price/v1/quotations/price',
        'HHDFS00000300',
        { EXCD: excd, SYMB: symb },
      )
      if (!res.ok) return null

      const data = await res.json()
      const price = parseFloat(data?.output?.last ?? '0')
      if (price <= 0) return null

      const rawRate = data?.output?.diff_rate ?? data?.output?.rate
      const changePercent = rawRate != null ? parseFloat(rawRate) : null

      return { price, currency: 'USD', changePercent }
    }

    return null
  } catch (err) {
    console.warn('[kis] fetchKisQuote failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

// Converts YYYYMMDD string to YYYY-MM-DD
function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return ''
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

async function fetchKisOhlcKr(
  ticker: string,
  startDate: string,
  endDate: string,
): Promise<OhlcPoint[] | null> {
  const parsed = parseKrTicker(ticker)
  if (!parsed) return null

  const res = await kisGet(
    '/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice',
    'FHKST03010100',
    {
      FID_COND_MRKT_DIV_CODE: 'J',
      FID_INPUT_ISCD: parsed.code,
      FID_INPUT_DATE_1: startDate.replace(/-/g, ''),
      FID_INPUT_DATE_2: endDate.replace(/-/g, ''),
      FID_PERIOD_DIV_CODE: 'D',
      FID_ORG_ADJ_PRC: '0',
    },
  )
  if (!res.ok) return null

  const data = await res.json()
  const output2: Array<Record<string, string>> = data?.output2 ?? []

  const points: OhlcPoint[] = []
  for (const item of output2) {
    const open = parseInt(item.stck_oprc ?? '0', 10)
    const high = parseInt(item.stck_hgpr ?? '0', 10)
    const low = parseInt(item.stck_lwpr ?? '0', 10)
    const close = parseInt(item.stck_clpr ?? '0', 10)
    if (open === 0 || high === 0 || low === 0 || close === 0) continue
    const date = formatDate(item.stck_bsop_date)
    if (!date) continue
    points.push({ date, open, high, low, close })
  }

  // KIS returns reverse chronological order — sort ascending
  points.sort((a, b) => a.date.localeCompare(b.date))

  return points.length >= 2 ? points : null
}

async function fetchKisOhlcChunked(
  ticker: string,
  assetType: string,
  startDate: string,
  endDate: string,
): Promise<OhlcPoint[] | null> {
  const CHUNK_DAYS = 100
  const MS_PER_DAY = 86_400_000

  const start = new Date(startDate)
  const end = new Date(endDate)
  const allPoints: OhlcPoint[] = []

  let chunkStart = start
  let first = true

  while (chunkStart <= end) {
    if (!first) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    first = false

    const chunkEnd = new Date(Math.min(
      chunkStart.getTime() + (CHUNK_DAYS - 1) * MS_PER_DAY,
      end.getTime(),
    ))

    const chunkStartStr = chunkStart.toISOString().slice(0, 10)
    const chunkEndStr = chunkEnd.toISOString().slice(0, 10)

    const points = await fetchKisOhlcKr(ticker, chunkStartStr, chunkEndStr)
    if (points) allPoints.push(...points)

    chunkStart = new Date(chunkEnd.getTime() + MS_PER_DAY)
  }

  if (allPoints.length < 2) return null

  // Deduplicate by date after merging chunks
  const seen = new Set<string>()
  const deduped: OhlcPoint[] = []
  for (const point of allPoints) {
    if (!seen.has(point.date)) {
      seen.add(point.date)
      deduped.push(point)
    }
  }

  deduped.sort((a, b) => a.date.localeCompare(b.date))
  return deduped.length >= 2 ? deduped : null
}

export async function fetchKisOhlc(
  ticker: string,
  assetType: string,
  startDate: string,
  endDate: string,
): Promise<OhlcPoint[] | null> {
  try {
    if (assetType === 'stock_kr' || assetType === 'etf_kr') {
      const diffDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000

      if (diffDays > 100) {
        return fetchKisOhlcChunked(ticker, assetType, startDate, endDate)
      }

      return fetchKisOhlcKr(ticker, startDate, endDate)
    }

    if (assetType === 'stock_us' || assetType === 'etf_us') {
      const { appKey, appSecret } = getCredentials()
      const { excd, symb } = await resolveUsTicker(ticker, getToken, appKey, appSecret)

      // KIS dailyprice returns up to ~100 most recent trading days (no server-side date filter).
      // Results are filtered client-side to the requested range.
      const res = await kisGet(
        '/uapi/overseas-price/v1/quotations/dailyprice',
        'HHDFS76950200',
        {
          EXCD: excd,
          SYMB: symb,
          GUBN: '0',
          MODP: '1',
          BYMD: '',
          KEYB: '',
        },
      )
      if (!res.ok) return null

      const data = await res.json()
      const output2: Array<Record<string, string>> = data?.output2 ?? []

      const points: OhlcPoint[] = []
      for (const item of output2) {
        const open = parseFloat(item.open ?? '0')
        const high = parseFloat(item.high ?? '0')
        const low = parseFloat(item.low ?? '0')
        const close = parseFloat(item.clos ?? '0')
        // KR skips all-zero candles; US only checks close (thin-volume days may have 0 open/high/low)
        if (close === 0) continue
        const date = formatDate(item.xymd)
        if (!date) continue
        if (date < startDate || date > endDate) continue
        points.push({ date, open, high, low, close })
      }

      points.sort((a, b) => a.date.localeCompare(b.date))
      return points.length >= 2 ? points : null
    }

    return null
  } catch (err) {
    console.warn('[kis] fetchKisOhlc failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}
