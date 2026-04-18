'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
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
  // value는 0~1 범위 기대
  const pct = Math.min(100, Math.max(0, value * 100))
  const color =
    pct >= 70 ? 'bg-green-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-orange-400'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-white/50 w-8 text-right">
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
  if (!stock) return null

  const triggeredSignals = stock.signals.filter((s) => s.triggered)
  const compositeSignal = stock.signals.find((s) => s.signalType === 'composite')

  const changeColor =
    stock.changePercent === null || stock.changePercent === 0
      ? 'text-white/50'
      : stock.changePercent > 0
        ? 'text-red-400'
        : 'text-blue-400'

  const changeText =
    stock.changePercent === null
      ? '-'
      : `${stock.changePercent > 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`

  const priceText =
    stock.latestClose !== null
      ? stock.latestClose.toLocaleString('ko-KR') + '원'
      : '-'

  return (
    <Dialog open={!!stock} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="bg-zinc-950 border-white/[0.12] text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold">{stock.name}</span>
                <Badge variant="outline" className="text-[10px] border-white/20 text-white/50">
                  {stock.code}
                </Badge>
                {stock.market && (
                  <Badge variant="outline" className="text-[10px] border-white/20 text-white/40">
                    {stock.market}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold tabular-nums">{priceText}</span>
                <span className={cn('text-sm font-semibold tabular-nums', changeColor)}>
                  {changeText}
                </span>
              </div>
              {stock.sector && (
                <p className="text-xs text-white/40">{stock.sector}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* 발동 시그널 없음 */}
          {triggeredSignals.length === 0 ? (
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4 text-center">
              <p className="text-sm text-white/40">현재 발동된 시그널이 없습니다</p>
            </div>
          ) : (
            <>
              {/* 복합 시그널 confidence */}
              {compositeSignal && compositeSignal.triggered && compositeSignal.confidence !== null && (
                <div className="rounded-lg bg-yellow-400/5 border border-yellow-400/20 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-yellow-300">복합 시그널 강도</p>
                  <ConfidenceBar value={Number(compositeSignal.confidence)} />
                </div>
              )}

              {/* 발동 시그널 목록 */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  발동 시그널 ({triggeredSignals.length}개)
                </p>
                <div className="space-y-2">
                  {triggeredSignals.map((sig) => (
                    <div
                      key={sig.signalType}
                      className="rounded-lg bg-white/[0.04] border border-white/[0.07] p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">
                          {SIGNAL_LABELS[sig.signalType] ?? sig.signalType}
                        </p>
                        {sig.confidence !== null && (
                          <span className="text-[10px] text-white/40 tabular-nums">
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

              {/* 백테스트 통계 테이블 */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  백테스트 통계 (시그널별 보유 기간)
                </p>
                {triggeredSignals
                  .filter((s) => statsMap.has(s.signalType))
                  .map((sig) => {
                    const sigStats = statsMap.get(sig.signalType)!
                    return (
                      <div key={sig.signalType} className="space-y-1.5">
                        <p className="text-[11px] font-medium text-white/60">
                          {SIGNAL_LABELS[sig.signalType] ?? sig.signalType}
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-white/[0.07]">
                          <table className="w-full text-xs tabular-nums">
                            <thead>
                              <tr className="border-b border-white/[0.07] bg-white/[0.03]">
                                <th className="text-left px-3 py-2 text-white/40 font-medium">보유일</th>
                                <th className="text-right px-3 py-2 text-white/40 font-medium">샘플</th>
                                <th className="text-right px-3 py-2 text-white/40 font-medium">승률</th>
                                <th className="text-right px-3 py-2 text-white/40 font-medium">평균수익</th>
                                <th className="text-right px-3 py-2 text-white/40 font-medium">중앙값</th>
                              </tr>
                            </thead>
                            <tbody>
                              {HOLDING_DAYS.map((days) => {
                                const row = sigStats.get(days)
                                return (
                                  <tr
                                    key={days}
                                    className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-colors"
                                  >
                                    <td className="px-3 py-2 text-white/70 font-medium">{days}일</td>
                                    <td className="px-3 py-2 text-right text-white/50">
                                      {row ? Number(row.sampleCount).toLocaleString() : '-'}
                                    </td>
                                    <td className={cn('px-3 py-2 text-right font-semibold', row && Number(row.winRate) >= 50 ? 'text-green-400' : 'text-white/50')}>
                                      {row ? fmtWinRate(Number(row.winRate)) : '-'}
                                    </td>
                                    <td className={cn('px-3 py-2 text-right font-semibold', row && Number(row.avgReturn) >= 0 ? 'text-red-400' : 'text-blue-400')}>
                                      {row ? fmtPct(Number(row.avgReturn)) : '-'}
                                    </td>
                                    <td className={cn('px-3 py-2 text-right', row && Number(row.medianReturn) >= 0 ? 'text-red-300/80' : 'text-blue-300/80')}>
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
                  <p className="text-xs text-white/30 py-2">
                    백테스트 통계 데이터가 아직 없습니다
                  </p>
                )}
              </div>
            </>
          )}

          {/* TODO: AssetCandleChart — 해당 종목이 user asset에 있으면 재사용,
               없으면 /api/sparklines?tickers=<ticker>로 직접 fetch 후 표시.
               현재는 미구현. */}

          {/* 면책 문구 */}
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] px-3 py-2">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ 과거 데이터 기반 통계이며 투자 조언이 아닙니다. 모든 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
