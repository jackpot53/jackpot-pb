import { TrendingUp, BarChart2, Bitcoin, Building2, PiggyBank, BookOpen, ShieldCheck, Gem, CreditCard } from 'lucide-react'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate' | 'fund' | 'insurance' | 'precious_metal' | 'cma'

const BADGE_MAP: Record<AssetType, { label: string; icon: React.ElementType; dark: string; light: string }> = {
  stock_kr:      { label: '주식 (국내)', icon: TrendingUp,   dark: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',    light: 'bg-blue-50 text-blue-700 ring-blue-200' },
  stock_us:      { label: '주식 (미국)', icon: TrendingUp,   dark: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',       light: 'bg-sky-50 text-sky-700 ring-sky-200' },
  etf_kr:        { label: 'ETF (국내)', icon: BarChart2,    dark: 'bg-violet-500/15 text-violet-300 ring-violet-500/30', light: 'bg-violet-50 text-violet-700 ring-violet-200' },
  etf_us:        { label: 'ETF (미국)', icon: BarChart2,    dark: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30', light: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  crypto:        { label: '코인',       icon: Bitcoin,      dark: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',  light: 'bg-amber-50 text-amber-700 ring-amber-200' },
  real_estate:   { label: '부동산',     icon: Building2,    dark: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30', light: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  savings:       { label: '예적금',     icon: PiggyBank,    dark: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',  light: 'bg-slate-100 text-slate-600 ring-slate-200' },
  fund:          { label: '펀드',       icon: BookOpen,     dark: 'bg-purple-500/15 text-purple-300 ring-purple-500/30', light: 'bg-purple-50 text-purple-700 ring-purple-200' },
  insurance:     { label: '보험',       icon: ShieldCheck,  dark: 'bg-teal-500/15 text-teal-300 ring-teal-500/30',    light: 'bg-teal-50 text-teal-700 ring-teal-200' },
  precious_metal:{ label: '금/은',      icon: Gem,          dark: 'bg-yellow-500/15 text-yellow-300 ring-yellow-500/30', light: 'bg-yellow-50 text-yellow-700 ring-yellow-200' },
  cma:           { label: 'CMA',        icon: CreditCard,   dark: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30',    light: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
}

export function AssetTypeBadge({ assetType, light }: { assetType: AssetType; light?: boolean }) {
  const { label, icon: Icon, dark, light: lightStyle } = BADGE_MAP[assetType]
  const style = light ? lightStyle : dark
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${style}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
