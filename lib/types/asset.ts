// 자산 유형 단일 소스. DB `db/schema/assets.ts`의 assetTypeEnum과 동기 유지.
export type AssetType =
  | 'stock_kr'
  | 'stock_us'
  | 'etf_kr'
  | 'etf_us'
  | 'crypto'
  | 'savings'
  | 'real_estate'
  | 'fund'
  | 'insurance'
  | 'precious_metal'
  | 'cma'
  | 'contribution'
  | 'bond'

export type Currency = 'KRW' | 'USD'
