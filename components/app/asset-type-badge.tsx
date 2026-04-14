import { Badge } from '@/components/ui/badge'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate'

const BADGE_MAP: Record<AssetType, { label: string; className: string }> = {
  stock_kr:    { label: '주식',   className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  stock_us:    { label: '주식',   className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  etf_kr:      { label: 'ETF',    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  etf_us:      { label: 'ETF',    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  crypto:      { label: '코인',   className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  real_estate: { label: '부동산', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  savings:     { label: '예적금', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200' },
}

export function AssetTypeBadge({ assetType }: { assetType: AssetType }) {
  const { label, className } = BADGE_MAP[assetType]
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
