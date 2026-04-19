'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { UniverseStockWithSignals, BacktestStats } from '@/db/queries/robo-advisor'
import { cn } from '@/lib/utils'

interface Props {
  stock: UniverseStockWithSignals | null
  statsMap: Map<string, Map<number, BacktestStats>>
  onClose: () => void
}

const SIGNAL_LABELS: Record<string, string> = {
  golden_cross: '골든크로스',
  rsi_oversold_bounce: 'RSI 과매도 반등',
  macd_cross: 'MACD 상향 돌파',
  volume_breakout: '거래량 급증 + 가격 상승',
  bollinger_breakout: '볼린저 밴드 돌파',
  stochastic_oversold: 'Stochastic 과매도 반등',
  adx_trend: '강한 상승 추세 (ADX)',
  composite: '복합 시그널',
}

const HOLDING_DAYS = [5, 10, 20, 60]

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value * 100))
  const color =
    pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-orange-400'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-'
  return `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`
}

function fmtWinRate(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-'
  return `${Number(n).toFixed(1)}%`
}

export function RoboAdvisorDetailDialog({ stock, statsMap, onClose }: Props) {
  const router = useRouter()
  if (!stock) return null

  const handlePaperTrading = () => {
    router.push('/paper-trading')
    onClose()
  }

  const triggeredSignals = stock.signals.filter((s) => s.triggered)
  const compositeSignal = stock.signals.find((s) => s.signalType === 'composite')

  const changeColor =
    stock.changePercent === null || stock.changePercent === 0
      ? 'text-muted-foreground'
      : stock.changePercent > 0
        ? 'text-red-500'
        : 'text-blue-500'

  const changeText =
    stock.changePercent === null
      ? '-'
      : `${stock.changePercent > 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`

  const priceText =
    stock.latestClose !== null
      ? stock.latestClose.toLocaleString('ko-KR') + '원'
      : '-'

  return (
    <Dialog data-component="RoboAdvisorDetailDialog" open={!!stock} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold text-foreground">{stock.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {stock.code}
                </Badge>
                {stock.market && (
                  <Badge variant="outline" className="text-[10px]">
                    {stock.market}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold tabular-nums text-foreground">{priceText}</span>
                <span className={cn('text-sm font-semibold tabular-nums', changeColor)}>
                  {changeText}
                </span>
              </div>
              {stock.sector && (
                <p className="text-xs text-muted-foreground">{stock.sector}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {triggeredSignals.length === 0 ? (
            <div className="rounded-lg bg-muted border border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">현재 발동된 시그널이 없습니다</p>
            </div>
          ) : (
            <>
              {compositeSignal && compositeSignal.triggered && compositeSignal.confidence !== null && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-800">복합 시그널 강도</p>
                  <ConfidenceBar value={Number(compositeSignal.confidence)} />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  발동 시그널 ({triggeredSignals.length}개)
                </p>
                <div className="space-y-2">
                  {triggeredSignals.map((sig) => (
                    <div
                      key={sig.signalType}
                      className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">
                          {SIGNAL_LABELS[sig.signalType] ?? sig.signalType}
                        </p>
                        {sig.confidence !== null && (
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            신뢰도 {(Number(sig.confidence) * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {sig.confidence !== null && (
                        <ConfidenceBar value={Number(sig.confidence)} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  백테스트 통계 (시그널별 보유 기간)
                </p>
                {triggeredSignals
                  .filter((s) => statsMap.has(s.signalType))
                  .map((sig) => {
                    const sigStats = statsMap.get(sig.signalType)!
                    return (
                      <div key={sig.signalType} className="space-y-1.5">
                        <p className="text-[11px] font-medium text-foreground/80">
                          {SIGNAL_LABELS[sig.signalType] ?? sig.signalType}
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-xs tabular-nums">
                            <thead>
                              <tr className="border-b border-border bg-muted/50">
                                <th className="text-left px-3 py-2 text-muted-foreground font-medium">보유일</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-medium">샘플</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-medium">승률</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-medium">평균수익</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-medium">중앙값</th>
                              </tr>
                            </thead>
                            <tbody>
                              {HOLDING_DAYS.map((days) => {
                                const row = sigStats.get(days)
                                return (
                                  <tr
                                    key={days}
                                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                                  >
                                    <td className="px-3 py-2 text-foreground font-medium">{days}일</td>
                                    <td className="px-3 py-2 text-right text-muted-foreground">
                                      {row ? Number(row.sampleCount).toLocaleString() : '-'}
                                    </td>
                                    <td className={cn('px-3 py-2 text-right font-semibold', row && Number(row.winRate) >= 50 ? 'text-emerald-600' : 'text-muted-foreground')}>
                                      {row ? fmtWinRate(Number(row.winRate)) : '-'}
                                    </td>
                                    <td className={cn('px-3 py-2 text-right font-semibold', row && Number(row.avgReturn) >= 0 ? 'text-red-500' : 'text-blue-500')}>
                                      {row ? fmtPct(Number(row.avgReturn)) : '-'}
                                    </td>
                                    <td className={cn('px-3 py-2 text-right', row && Number(row.medianReturn) >= 0 ? 'text-red-400' : 'text-blue-400')}>
                                      {row ? fmtPct(Number(row.medianReturn)) : '-'}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}

                {triggeredSignals.every((s) => !statsMap.has(s.signalType)) && (
                  <p className="text-xs text-muted-foreground py-2">
                    백테스트 통계 데이터가 아직 없습니다
                  </p>
                )}
              </div>
            </>
          )}

          <div className="rounded-lg bg-muted/50 border border-border px-3 py-2">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              ⚠️ 과거 데이터 기반 통계이며 투자 조언이 아닙니다. 모든 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
            </p>
          </div>

          <Button onClick={handlePaperTrading} className="w-full">
            모의투자로 시뮬레이션
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
