export interface TickerItem {
  id: string
  label: string
  returnPct: number
  dailyChangePct: number | null
}

interface TickerBandClientProps {
  items: TickerItem[]
}

function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function TickerBandClient({ items }: TickerBandClientProps) {
  if (items.length === 0) return null

  // Duplicate items for seamless looping
  const doubled = [...items, ...items]

  return (
    <div className="flex-1 min-w-0 overflow-hidden relative mx-4">
      {/* fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-r from-black/60 to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-l from-black/60 to-transparent" />

      <div
        className="flex items-center gap-0 whitespace-nowrap"
        style={{
          animation: `ticker-scroll ${items.length * 4}s linear infinite`,
          width: 'max-content',
        }}
      >
        {doubled.map((item, i) => {
          const isPos = item.returnPct >= 0
          const daily = item.dailyChangePct
          return (
            <span
              key={`${item.id}-${i}`}
              className="inline-flex items-center gap-1.5 px-3 text-xs"
            >
              <span className="text-white/60 font-medium tracking-wide">{item.label}</span>
              <span className={isPos ? 'text-red-400 font-semibold' : 'text-blue-400 font-semibold'}>
                {isPos ? '▲' : '▼'} {formatPct(item.returnPct)}
              </span>
              {daily !== null && (
                <span className={`text-[10px] ${daily >= 0 ? 'text-red-400/60' : 'text-blue-400/60'}`}>
                  ({formatPct(daily)})
                </span>
              )}
              <span className="text-white/15 ml-1">|</span>
            </span>
          )
        })}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
