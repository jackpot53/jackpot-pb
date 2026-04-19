'use client'
import { TrendingUp, TrendingDown, Minus, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssetPerformance } from '@/lib/portfolio/portfolio'
import { AssetLogo } from '@/components/app/asset-logo'

function fmtKrw(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}억원`
  if (abs >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만원`
  return `${n.toLocaleString()}원`
}

function fmtPct(bps: number): string {
  const pct = bps / 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

export function TodayAssetPnl({ performances }: { performances: AssetPerformance[] }) {
  const assets = performances
    .filter((a) => a.dailyChangeBps !== null && a.currentValueKrw > 0)
    .map((a) => ({
      ...a,
      dailyChangeKrw: a.currentValueKrw * (a.dailyChangeBps! / 10000),
    }))
    .sort((a, b) => Math.abs(b.dailyChangeKrw) - Math.abs(a.dailyChangeKrw))

  if (assets.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-xs font-semibold text-muted-foreground">
          <ListOrdered className="h-3 w-3" />
          <span>자산별 손익</span>
        </div>
        <span className="text-xs text-muted-foreground">어제 대비</span>
      </div>

      <div className="divide-y divide-border">
        {assets.map((a) => {
          const up = a.dailyChangeBps! > 0
          const dn = a.dailyChangeBps! < 0
          return (
            <div key={a.assetId} className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-muted/30 transition-colors">
              <AssetLogo
                ticker={a.ticker}
                name={a.name}
                assetType={a.assetType as any}
                size={36}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{a.name}</p>
                {a.ticker && (
                  <p className="text-xs text-muted-foreground mt-0.5">{a.ticker}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className={cn(
                  'text-sm font-bold',
                  up && 'text-rose-600',
                  dn && 'text-blue-600',
                  !up && !dn && 'text-muted-foreground',
                )}>
                  {a.dailyChangeKrw >= 0 ? '+' : ''}{fmtKrw(a.dailyChangeKrw)}
                </p>
                <p className={cn(
                  'text-xs font-medium mt-0.5 flex items-center justify-end gap-0.5',
                  up && 'text-rose-500',
                  dn && 'text-blue-500',
                  !up && !dn && 'text-muted-foreground',
                )}>
                  {up && <TrendingUp className="h-3 w-3" />}
                  {dn && <TrendingDown className="h-3 w-3" />}
                  {!up && !dn && <Minus className="h-3 w-3" />}
                  {fmtPct(a.dailyChangeBps!)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
