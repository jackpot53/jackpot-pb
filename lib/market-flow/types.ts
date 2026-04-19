export type KrAssetType = 'stock_kr' | 'etf_kr'
export type UsAssetType = 'stock_us' | 'etf_us'

export interface FlowEntry {
  code: string           // 6자리 (KR) or symbol (US)
  ticker: string         // AssetLogo용 ticker
  name: string
  netAmount: number      // 순매수 금액 (백만원, KR) or 0 (US)
  changePercent?: number // 등락률 (US trending / sise_quant)
  assetType: KrAssetType | UsAssetType
}

export interface KrFlowData {
  foreign: FlowEntry[]       // 외국인 순매수 상위
  institutional: FlowEntry[] // 기관 순매수 상위
  hotStocks: FlowEntry[]     // 거래량 상위 (개인 관심 종목 대리지표)
}

export interface UsFlowData {
  trending: FlowEntry[] // Yahoo Finance Trending
}

export interface MarketFlowData {
  kr: KrFlowData
  us: UsFlowData
  fetchedAt: number
}
