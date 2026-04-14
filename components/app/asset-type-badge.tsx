import { TrendingUp, BarChart2, Bitcoin, Building2, PiggyBank, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate' | 'fund'

const BADGE_MAP: Record<AssetType, { label: string; className: string; icon: React.ElementType }> = {
  stock_kr:    { label: '주식 (국내)', icon: TrendingUp,  className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  stock_us:    { label: '주식 (미국)', icon: TrendingUp,  className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  etf_kr:      { label: 'ETF (국내)', icon: BarChart2,   className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  etf_us:      { label: 'ETF (미국)', icon: BarChart2,   className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  crypto:      { label: '코인',       icon: Bitcoin,     className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  real_estate: { label: '부동산',     icon: Building2,   className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  savings:     { label: '예적금',     icon: PiggyBank,   className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200' },
  fund:        { label: '펀드',       icon: BookOpen,    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
}

export function AssetTypeBadge({ assetType }: { assetType: AssetType }) {
  const { label, className, icon: Icon } = BADGE_MAP[assetType]
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}
