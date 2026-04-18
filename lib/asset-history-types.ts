export type AssetHistoryPoint = {
  date: string
  value: number
  projected?: boolean
}

export type AssetHistoryKind = 'line-nav' | 'line-projected'

export type AssetHistoryResponse = {
  assetId: string
  points: AssetHistoryPoint[]
  kind: AssetHistoryKind
}
