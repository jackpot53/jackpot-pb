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
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />

      <div
        className="flex items-center gap-0 whitespace-nowrap"
        style={{
          animation: `ticker-scroll ${items.length * 4}s linear infinite`,
          width: 'max-content',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {doubled.map((item, i) => {
          const isPos = item.returnPct >= 0
          const daily = item.dailyChangePct
          return (
            <span
              key={`${item.id}-${i}`}
              className="inline-flex items-center gap-2 px-3 text-xs"
            >
              <span className="bg-gray-100 text-gray-800 font-semibold px-2 py-0.5 rounded-md tracking-wide">
                {item.label || item.id}
              </span>
              <span className={isPos ? 'text-red-500 font-bold' : 'text-blue-500 font-bold'}>
                {isPos ? '▲' : '▼'} {formatPct(item.returnPct)}
              </span>
              {daily !== null && (
                <span className={`text-[10px] ${daily >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                  ({formatPct(daily)})
                </span>
              )}
              <span className="text-gray-200 ml-1">|</span>
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
