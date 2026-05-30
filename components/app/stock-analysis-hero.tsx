import { TrendingUp } from 'lucide-react'
import { StartPaperTradingButton } from '@/components/app/start-paper-trading-button'
import type { BacktestStatEntry } from '@/lib/robo-advisor/analysis-helpers'

interface Props {
  ticker: string
  name: string
  market: string
  code: string
  sector: string | null
  marketCapKrw: number | null
  triggeredSignals: string[]
  backtestStats: Record<string, BacktestStatEntry>
}

export function StockAnalysisHero({
  ticker,
  name,
  market,
  code,
  sector,
  marketCapKrw,
  triggeredSignals,
  backtestStats,
}: Props) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 p-6 sm:p-8 text-white shadow-xl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-orange-300/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <style>{`
          @keyframes pulse-ring-1 {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.6; }
            50% { opacity: 0.3; }
            100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
          }
          @keyframes pulse-ring-2 {
            0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.4; }
            50% { opacity: 0.2; }
            100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
          }
          @keyframes pulse-ring-3 {
            0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0.3; }
            50% { opacity: 0.15; }
            100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
          }
        `}</style>
        <div className="absolute top-1/2 right-16 w-32 h-32 hidden sm:block">
          <div className="absolute inset-0 rounded-full border-2 border-white/40" style={{ animation: 'pulse-ring-1 2s ease-out infinite' }} />
          <div className="absolute inset-0 rounded-full border-2 border-white/25" style={{ animation: 'pulse-ring-2 2.5s ease-out infinite' }} />
          <div className="absolute inset-0 rounded-full border-2 border-white/15" style={{ animation: 'pulse-ring-3 3s ease-out infinite' }} />
        </div>
      </div>

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-1.5 text-white/80 text-xs font-semibold tracking-widest uppercase">
              <TrendingUp className="h-3.5 w-3.5" />종목분석
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>{name}</h1>
            <p className="text-white/80 text-sm">
              {market} • {code} • {sector || '미분류'}
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums">
                {marketCapKrw
                  ? (marketCapKrw / 1e12).toFixed(1)
                  : '미정'}{' '}
                <span className="text-base font-medium">조</span>
              </p>
              <p className="text-xs text-white/75">시가총액</p>
            </div>
            <StartPaperTradingButton ticker={ticker} />
          </div>
        </div>

        {triggeredSignals.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {triggeredSignals.map((signal) => {
              const stats = backtestStats[signal]
              return (
                <div
                  key={signal}
                  className='px-3 py-1.5 bg-white/15 border border-white/30 backdrop-blur-sm rounded-full text-xs font-medium text-white'
                >
                  {signal}
                  {stats && (
                    <span className='ml-2 text-white/85 font-semibold'>
                      승률 {(stats.winRate / 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
