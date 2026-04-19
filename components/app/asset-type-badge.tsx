import { TrendingUp, BarChart2, Bitcoin, Building2, PiggyBank, BookOpen, ShieldCheck, Gem, CreditCard } from 'lucide-react'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate' | 'fund' | 'insurance' | 'precious_metal' | 'cma'

const BADGE_MAP: Record<AssetType, { label: string; icon: React.ElementType; dark: string; light: string }> = {
  // 주식 — blue
  stock_kr:      { label: '주식 (국내)', icon: TrendingUp,   dark: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',     light: 'bg-blue-50 text-blue-700 ring-blue-200' },
  stock_us:      { label: '주식 (미국)', icon: TrendingUp,   dark: 'bg-blue-400/15 text-blue-200 ring-blue-400/30',     light: 'bg-blue-50 text-blue-600 ring-blue-200' },
  // ETF — indigo
  etf_kr:        { label: 'ETF (국내)', icon: BarChart2,    dark: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30', light: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  etf_us:        { label: 'ETF (미국)', icon: BarChart2,    dark: 'bg-indigo-400/15 text-indigo-200 ring-indigo-400/30', light: 'bg-indigo-50 text-indigo-600 ring-indigo-200' },
  // 코인 — amber
  crypto:        { label: '코인',       icon: Bitcoin,      dark: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',   light: 'bg-amber-50 text-amber-700 ring-amber-200' },
  // 실물자산 — emerald
  real_estate:   { label: '부동산',     icon: Building2,    dark: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30', light: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  precious_metal:{ label: '금/은',      icon: Gem,          dark: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30', light: 'bg-emerald-50 text-emerald-600 ring-emerald-200' },
  // 저축/기타 — slate
  savings:       { label: '예적금',     icon: PiggyBank,    dark: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',   light: 'bg-slate-100 text-slate-600 ring-slate-200' },
  fund:          { label: '펀드',       icon: BookOpen,     dark: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',   light: 'bg-slate-100 text-slate-600 ring-slate-200' },
  insurance:     { label: '보험',       icon: ShieldCheck,  dark: 'bg-slate-400/15 text-slate-200 ring-slate-400/30',   light: 'bg-slate-50 text-slate-500 ring-slate-200' },
  cma:           { label: 'CMA',        icon: CreditCard,   dark: 'bg-slate-400/15 text-slate-200 ring-slate-400/30',   light: 'bg-slate-50 text-slate-500 ring-slate-200' },
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
