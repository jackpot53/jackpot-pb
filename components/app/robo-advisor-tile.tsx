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
      ? 'text-white/40'
      : changePercent > 0
        ? 'text-red-400'
        : 'text-blue-400'

  const changeText =
    changePercent === null
      ? '-'
      : changePercent === 0
        ? '0.00%'
        : `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`

  // 스파크라인용 closes (타일에서는 latestClose만 있으므로 간이 표현)
  const sparkCloses: number[] = []
  // latestClose만 있으면 단순히 한 점이라 표시 의미 없음; 실제 히스토리 데이터가 없으니 빈 배열 전달
  // (RoboAdvisorPageClient에서 priceHistory를 내려주면 활용 가능 — 현재는 TODO)

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col gap-0.5 w-full rounded-lg p-2 text-left transition-all duration-200',
        'bg-zinc-900/60 border hover:bg-zinc-800/70',
        hasSignal
          ? 'border-yellow-400/70 shadow-[0_0_8px_rgba(250,204,21,0.25)] hover:shadow-[0_0_14px_rgba(250,204,21,0.45)]'
          : 'border-white/[0.08] hover:border-white/20',
      )}
    >
      {/* 시그널 배지 */}
      {hasSignal && (
        <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-yellow-400 text-black text-[9px] font-black z-10">
          {triggeredCount}
        </div>
      )}

      {/* 종목명 */}
      <p className="text-[10px] text-white/70 truncate w-full leading-tight font-medium">
        {stock.name}
      </p>

      {/* 현재가 */}
      <p className="text-xs font-bold text-white leading-tight tabular-nums">
        {stock.latestClose !== null ? formatPrice(stock.latestClose) : '-'}
      </p>

      {/* 등락률 */}
      <p className={cn('text-[9px] font-semibold leading-tight tabular-nums', changeColor)}>
        {changeText}
      </p>

      {/* 스파크라인 영역 (데이터 있을 때만) */}
      {sparkCloses.length >= 2 && (
        <div className="mt-0.5">
          <MiniSparkline closes={sparkCloses} />
        </div>
      )}
    </button>
  )
}
