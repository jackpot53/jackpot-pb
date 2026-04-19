import { TrendingUp, BarChart2, Bitcoin, Building2, PiggyBank, BookOpen, ShieldCheck, Gem, CreditCard, Users, ScrollText } from 'lucide-react'
import type { AssetType } from '@/lib/types/asset'

const BADGE_MAP: Record<AssetType, { label: string; icon: React.ElementType; style: string }> = {
  stock_kr:      { label: '주식 (국내)', icon: TrendingUp,  style: 'bg-blue-600 text-white'    },
  stock_us:      { label: '주식 (미국)', icon: TrendingUp,  style: 'bg-sky-600 text-white'     },
  etf_kr:        { label: 'ETF (국내)', icon: BarChart2,   style: 'bg-indigo-600 text-white'  },
  etf_us:        { label: 'ETF (미국)', icon: BarChart2,   style: 'bg-violet-600 text-white'  },
  crypto:        { label: '코인',       icon: Bitcoin,     style: 'bg-amber-500 text-white'   },
  real_estate:   { label: '부동산',     icon: Building2,   style: 'bg-emerald-600 text-white' },
  precious_metal:{ label: '금/은',      icon: Gem,         style: 'bg-yellow-600 text-white'  },
  savings:       { label: '예적금',     icon: PiggyBank,   style: 'bg-teal-600 text-white'    },
  fund:          { label: '펀드',       icon: BookOpen,    style: 'bg-teal-700 text-white'    },
  insurance:     { label: '보험',       icon: ShieldCheck, style: 'bg-slate-600 text-white'   },
  cma:           { label: 'CMA',        icon: CreditCard,  style: 'bg-rose-600 text-white'    },
  contribution:  { label: '출자금',     icon: Users,       style: 'bg-green-700 text-white'   },
  bond:          { label: '채권',       icon: ScrollText,  style: 'bg-indigo-700 text-white'  },
}

export function AssetTypeBadge({ assetType }: { assetType: AssetType }) {
  const { label, icon: Icon, style } = BADGE_MAP[assetType]
  return (
    <span data-component="AssetTypeBadge" className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
