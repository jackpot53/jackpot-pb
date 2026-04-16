import { fetchKrInvestorFlow } from './naver-investor'
import { fetchKrHotStocks } from './naver-hot'
import { fetchYahooTrending } from './yahoo-trending'
import type { MarketFlowData, KrFlowData, UsFlowData } from './types'

// 주간 캐시 (서버 인스턴스 내 in-memory)
const cache = new Map<string, { data: MarketFlowData; at: number }>()
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000

async function fetchKrFlow(): Promise<KrFlowData> {
  const [investorFlow, hotStocks] = await Promise.all([
    fetchKrInvestorFlow(),
    fetchKrHotStocks(),
  ])
  return {
    foreign: investorFlow.foreign,
    institutional: investorFlow.institutional,
    hotStocks,
  }
}

async function fetchUsFlow(): Promise<UsFlowData> {
  const trending = await fetchYahooTrending()
  return { trending }
}

export async function getMarketFlow(): Promise<MarketFlowData> {
  const now = Date.now()
  const hit = cache.get('flow')
  if (hit && now - hit.at < CACHE_TTL) return hit.data

  const [krResult, usResult] = await Promise.allSettled([
    fetchKrFlow(),
    fetchUsFlow(),
  ])

  const kr: KrFlowData =
    krResult.status === 'fulfilled'
      ? krResult.value
      : { foreign: [], institutional: [], hotStocks: [] }

  const us: UsFlowData =
    usResult.status === 'fulfilled'
      ? usResult.value
      : { trending: [] }

  const data: MarketFlowData = { kr, us, fetchedAt: now }

  // 유효 데이터가 있을 때만 캐시 저장
  if (
    kr.foreign.length > 0 ||
    kr.institutional.length > 0 ||
    us.trending.length > 0
  ) {
    cache.set('flow', { data, at: now })
  }

  return data
}
