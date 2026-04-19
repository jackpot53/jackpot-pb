import { getToken, KisTokenError } from '@/lib/price/kis-token'
import type { KrAssetType } from './types'

const KIS_BASE = 'https://openapi.koreainvestment.com:9443'

const ETF_PREFIXES = [
  'KODEX', 'TIGER', 'KINDEX', 'KBSTAR', 'ARIRANG', 'KOSEF',
  'HANARO', 'SOL ', 'ACE ', 'TIMEFOLIO', '파워', 'TREX',
  'FOCUS', 'KTOP', 'PLUS', 'TRUE', 'VITA', 'KB스타',
]

export function detectKrAssetType(name: string): KrAssetType {
  return ETF_PREFIXES.some((p) => name.startsWith(p)) ? 'etf_kr' : 'stock_kr'
}

function getCredentials(): { appKey: string; appSecret: string } {
  const appKey = process.env.KIS_APP_KEY
  const appSecret = process.env.KIS_APP_SECRET
  if (!appKey) throw new KisTokenError('KIS_APP_KEY is not set')
  if (!appSecret) throw new KisTokenError('KIS_APP_SECRET is not set')
  return { appKey, appSecret }
}

export async function kisGet(
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
    signal: AbortSignal.timeout(5_000),
  })
}
