import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import type { BacktestStatEntry } from '@/lib/robo-advisor/analysis-helpers'

interface Props {
  stats: Record<string, BacktestStatEntry>
}

export function BacktestStatsTable({ stats }: Props) {
  const entries = Object.entries(stats)
  if (entries.length === 0) return null

  return (
    <section className='space-y-3'>
      <h2 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <TrendingUp className="h-4 w-4 text-rose-500" />백테스트 통계 · 20일 보유
      </h2>
      <Card>
        <CardContent className='p-0 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm tabular-nums'>
              <thead>
                <tr className='border-b border-border bg-muted/40'>
                  <th className='px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs'>시그널</th>
                  <th className='px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs'>승률</th>
                  <th className='px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs'>평균 수익률</th>
                  <th className='px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs'>중위 수익률</th>
                  <th className='px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs'>샘플</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([name, s]) => (
                  <tr key={name} className='border-b border-border last:border-0 hover:bg-muted/30 transition-colors'>
                    <td className='px-4 py-2.5 text-foreground font-medium'>{name}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold ${
                        s.winRate >= 5000 ? 'text-emerald-600' : 'text-foreground/80'
                      }`}
                    >
                      {(s.winRate / 100).toFixed(1)}%
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-medium ${
                        s.avgReturn > 0 ? 'text-red-500' : 'text-blue-500'
                      }`}
                    >
                      {(s.avgReturn / 100).toFixed(2)}%
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right ${
                        s.medianReturn > 0 ? 'text-red-400' : 'text-blue-400'
                      }`}
                    >
                      {(s.medianReturn / 100).toFixed(2)}%
                    </td>
                    <td className='px-4 py-2.5 text-right text-muted-foreground'>{s.sampleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
