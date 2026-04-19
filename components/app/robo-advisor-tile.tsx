'use client'

import { cn } from '@/lib/utils'
import type { UniverseStockWithSignals } from '@/db/queries/robo-advisor'

interface Props {
  stock: UniverseStockWithSignals
  onClick: () => void
}

function MiniSparkline({ closes }: { closes: number[] }) {
  if (closes.length < 2) return null

  const w = 48
  const h = 20
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const range = max - min || 1

  const toX = (i: number) => (i / (closes.length - 1)) * w
  const toY = (v: number) => h - ((v - min) / range) * (h - 2) - 1

  const points = closes.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')

  const isUp = closes[closes.length - 1]! >= closes[0]!
  const color = isUp ? '#f87171' : '#60a5fa'

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  )
}

function formatPrice(n: number): string {
  if (n >= 100_000) return `${Math.round(n / 1_000).toLocaleString('ko-KR')}천`
  if (n >= 10_000) return n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  if (n >= 1_000) return n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  return n.toFixed(0)
}

export function RoboAdvisorTile({ stock, onClick }: Props) {
  const triggeredCount = stock.signals.filter((s) => s.triggered).length
  const hasSignal = triggeredCount > 0

  const changePercent = stock.changePercent
  const changeColor =
    changePercent === null || changePercent === 0
      ? 'text-muted-foreground'
      : changePercent > 0
        ? 'text-red-500'
        : 'text-blue-500'

  const changeText =
    changePercent === null
      ? '-'
      : changePercent === 0
        ? '0.00%'
        : `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`

  const sparkCloses: number[] = []

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col gap-0.5 w-full rounded-lg p-2 text-left transition-all duration-200',
        'bg-card border hover:shadow-md',
        hasSignal
          ? 'border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_4px_10px_-4px_rgba(251,191,36,0.35)]'
          : 'border-border hover:border-foreground/20',
      )}
    >
      {hasSignal && (
        <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black z-10">
          {triggeredCount}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground truncate w-full leading-tight font-medium">
        {stock.name}
      </p>

      <p className="text-xs font-bold text-foreground leading-tight tabular-nums">
        {stock.latestClose !== null ? formatPrice(stock.latestClose) : '-'}
      </p>

      <p className={cn('text-[9px] font-semibold leading-tight tabular-nums', changeColor)}>
        {changeText}
      </p>

      {sparkCloses.length >= 2 && (
        <div className="mt-0.5">
          <MiniSparkline closes={sparkCloses} />
        </div>
      )}
    </button>
  )
}
