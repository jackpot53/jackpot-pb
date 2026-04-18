export type KrTicker = { code: string; marketDiv: 'J' }
export type UsTicker = { excd: string; symb: string }

const KR_TICKER_RE = /^\d{6}\.(KS|KQ)$/

const KNOWN_EXCHANGE: Record<string, string> = {
  AAPL: 'NAS', MSFT: 'NAS', TSLA: 'NAS', NVDA: 'NAS', META: 'NAS',
  AMZN: 'NAS', GOOGL: 'NAS', GOOG: 'NAS', AMD: 'NAS', AVGO: 'NAS',
  JPM: 'NYS', V: 'NYS', WMT: 'NYS', JNJ: 'NYS', BAC: 'NYS',
  // KIS uses 'AMS' for NYSE Arca (formerly AMEX) — where ETFs like SPY/IVV/VOO/VTI trade
  SPY: 'AMS', QQQ: 'NAS', IVV: 'AMS', VOO: 'AMS', VTI: 'AMS',
}

export const EXCHANGE_CACHE = new Map<string, string>()
const EXCHANGE_INFLIGHT = new Map<string, Promise<string>>()

export function parseKrTicker(ticker: string): KrTicker | null {
  if (!KR_TICKER_RE.test(ticker)) return null
  return { code: ticker.slice(0, 6), marketDiv: 'J' }
}

export function isKrTicker(ticker: string): boolean {
  return KR_TICKER_RE.test(ticker)
}

const KIS_BASE = 'https://openapi.koreainvestment.com:9443'
const PROBE_ORDER = ['NAS', 'NYS', 'AMS'] as const

async function probeExchange(
  symb: string,
  excd: string,
  token: string,
  appKey: string,
  appSecret: string,
  fetchFn: typeof fetch,
): Promise<boolean> {
  try {
    const url = `${KIS_BASE}/uapi/overseas-price/v1/quotations/price?EXCD=${excd}&SYMB=${symb}`
    const res = await fetchFn(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        appkey: appKey,
        appsecret: appSecret,
        tr_id: 'HHDFS00000300',
        custtype: 'P',
      },
    })
    if (!res.ok) return false
    const data = await res.json()
    const last = Number(data?.output?.last)
    return Number.isFinite(last) && last > 0
  } catch (err) {
    console.warn(`[kis-ticker] probeExchange failed for ${symb}/${excd}:`, err)
    return false
  }
}

export async function resolveUsTicker(
  symb: string,
  getToken: () => Promise<string>,
  appKey: string,
  appSecret: string,
  fetchFn: typeof fetch = fetch,
): Promise<UsTicker> {
  if (KNOWN_EXCHANGE[symb]) {
    return { excd: KNOWN_EXCHANGE[symb], symb }
  }

  if (EXCHANGE_CACHE.has(symb)) {
    return { excd: EXCHANGE_CACHE.get(symb)!, symb }
  }

  // Deduplicate concurrent probes for the same symbol
  if (!EXCHANGE_INFLIGHT.has(symb)) {
    const probe = (async () => {
      const token = await getToken()
      for (const excd of PROBE_ORDER) {
        if (await probeExchange(symb, excd, token, appKey, appSecret, fetchFn)) {
          EXCHANGE_CACHE.set(symb, excd)
          return excd
        }
      }
      EXCHANGE_CACHE.set(symb, 'NAS')
      return 'NAS'
    })().finally(() => EXCHANGE_INFLIGHT.delete(symb))
    EXCHANGE_INFLIGHT.set(symb, probe)
  }

  const excd = await EXCHANGE_INFLIGHT.get(symb)!
  return { excd, symb }
}
