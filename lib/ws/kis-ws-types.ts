export type Market = 'kr' | 'us'

export type Tick = {
  ticker: string         // app-side ticker (e.g. '005930.KS' or 'AAPL')
  price: number          // KR: KRW int / US: USD float
  changePercent: number | null
  tradedAt: number       // ms epoch
  market: Market
}

export type SubscribeRequest = {
  ticker: string
  market: Market
  /** US: KIS exchange code (NAS/NYS/AMS) — required when market='us' */
  excd?: string
}

export type WsStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'
