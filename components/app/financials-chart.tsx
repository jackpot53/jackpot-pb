'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type Time,
  type WhitespaceData,
} from 'lightweight-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { resolvePalette } from '@/lib/chart/theme'
import type { FinancialPoint } from '@/app/api/financials/route'

// 매출 막대 색상 (indigo)
const REV_ACTUAL = '#6366f1'
const REV_EST = 'rgba(99,102,241,0.3)'
// 영업이익 라인 색상 (amber)
const OP_COLOR = '#f59e0b'
// 순이익 라인 색상 (emerald)
const NI_COLOR = '#10b981'

// 백만원 단위 수치 → 조/억/백만 한국어 표기
function fmtAmount(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}조`
  if (abs >= 100) return `${sign}${Math.round(abs / 100).toLocaleString('ko-KR')}억`
  return `${sign}${Math.round(abs)}백만`
}

interface Tooltip {
  x: number
  y: number
  point: FinancialPoint
}

// ─── 실제 차트 렌더링 (데이터가 준비된 후에만 마운트) ─────────────────────────
function FinancialsChartInner({ data }: { data: FinancialPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const revSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const opActualRef = useRef<ISeriesApi<'Line'> | null>(null)
  const opEstRef = useRef<ISeriesApi<'Line'> | null>(null)
  const niActualRef = useRef<ISeriesApi<'Line'> | null>(null)
  const niEstRef = useRef<ISeriesApi<'Line'> | null>(null)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const dataRef = useRef(data)

  // dataRef를 effect에서 업데이트 (render 중 ref 변경 금지)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // 분기 라벨 맵 (tickMarkFormatter가 init effect 클로저에서 캡처하므로 ref 사용)
  const periodByDateRef = useRef<Map<string, string>>(new Map())

  // 차트 초기화 (마운트 1회)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const palette = resolvePalette(container)

    const chart = createChart(container, {
      autoSize: true,
      handleScroll: false,
      handleScale: false,
      layout: {
        background: { color: 'transparent' },
        textColor: palette.mutedText,
        attributionLogo: false,
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: palette.grid, style: 2 },
      },
      // 매출 스케일(right) 표시, 영익/순익 스케일(left) 숨김 — 툴팁으로 확인
      rightPriceScale: {
        visible: true,
        borderColor: palette.border,
        scaleMargins: { top: 0.08, bottom: 0.05 },
      },
      leftPriceScale: {
        visible: false,
        scaleMargins: { top: 0.08, bottom: 0.1 },
      },
      timeScale: {
        visible: true,
        borderColor: palette.border,
        fixLeftEdge: true,
        fixRightEdge: true,
        // tickMarkFormatter는 createChart 초기 옵션에서만 설정 가능 (applyOptions 타입 미지원).
        // periodByDateRef를 통해 데이터 갱신 시 자동 반영.
        tickMarkFormatter: (time: Time) => {
          const d =
            typeof time === 'string'
              ? time
              : new Date((time as number) * 1000).toISOString().slice(0, 10)
          return periodByDateRef.current.get(d) ?? ''
        },
      },
      localization: { priceFormatter: fmtAmount },
    })

    // 매출 막대 (right 스케일)
    const revSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'right',
      priceLineVisible: false,
      lastValueVisible: false,
      base: 0,
    })

    // 영익/순익 라인 (left 스케일, hidden) — 각각 확정(solid) + 추정(dashed) 2개
    const lineBase = {
      priceScaleId: 'left',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
    } as const

    const opActual = chart.addSeries(LineSeries, { ...lineBase, color: OP_COLOR })
    const opEst = chart.addSeries(LineSeries, { ...lineBase, color: OP_COLOR, lineStyle: LineStyle.Dashed })
    const niActual = chart.addSeries(LineSeries, { ...lineBase, color: NI_COLOR })
    const niEst = chart.addSeries(LineSeries, { ...lineBase, color: NI_COLOR, lineStyle: LineStyle.Dashed })

    // 영익 기준선 (0)
    opActual.createPriceLine({
      price: 0,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      color: palette.mutedText,
      axisLabelVisible: false,
      title: '',
    })

    chartRef.current = chart
    revSeriesRef.current = revSeries
    opActualRef.current = opActual
    opEstRef.current = opEst
    niActualRef.current = niActual
    niEstRef.current = niEst

    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(Math.floor(entry.contentRect.width))
    })
    ro.observe(container)

    const onMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point) { setTooltip(null); return }
      const dateStr =
        typeof param.time === 'string'
          ? param.time
          : new Date((param.time as number) * 1000).toISOString().slice(0, 10)
      const point = dataRef.current.find(p => p.date === dateStr)
      if (!point) { setTooltip(null); return }
      setTooltip({ x: param.point.x, y: param.point.y, point })
    }
    chart.subscribeCrosshairMove(onMove)

    return () => {
      ro.disconnect()
      chart.unsubscribeCrosshairMove(onMove)
      chart.remove()
      chartRef.current = null
      revSeriesRef.current = null
      opActualRef.current = null
      opEstRef.current = null
      niActualRef.current = null
      niEstRef.current = null
    }
  }, [])

  // 데이터 갱신
  useEffect(() => {
    const chart = chartRef.current
    const revSeries = revSeriesRef.current
    const opActual = opActualRef.current
    const opEst = opEstRef.current
    const niActual = niActualRef.current
    const niEst = niEstRef.current
    if (!chart || !revSeries || !opActual || !opEst || !niActual || !niEst) return

    // 추정과 확정의 경계점 (확정 마지막 날짜) — 점선이 실선에 이어지도록
    const lastActualDate = [...data].reverse().find(p => !p.isEstimate)?.date ?? null
    const periodByDate = new Map(data.map(p => [p.date, p.period]))

    // 매출 막대: 확정=solid, 추정=반투명
    type HD = HistogramData<Time> | WhitespaceData<Time>
    revSeries.setData(
      data.map<HD>(p =>
        p.revenue === null
          ? { time: p.date as Time }
          : { time: p.date as Time, value: p.revenue, color: p.isEstimate ? REV_EST : REV_ACTUAL },
      ),
    )

    type LP = LineData<Time> | WhitespaceData<Time>

    // 확정 라인: isEstimate 구간은 whitespace
    const toActualLine = (key: 'operatingProfit' | 'netIncome'): LP[] =>
      data.map(p => {
        if (p.isEstimate) return { time: p.date as Time }
        const v = p[key]
        return v === null ? { time: p.date as Time } : { time: p.date as Time, value: v }
      })

    // 추정 라인: 비추정 구간은 whitespace (경계점만 포함해 점선이 실선과 이어짐)
    const toEstLine = (key: 'operatingProfit' | 'netIncome'): LP[] =>
      data.map(p => {
        const isBridge = !p.isEstimate && p.date === lastActualDate
        if (!p.isEstimate && !isBridge) return { time: p.date as Time }
        const v = p[key]
        return v === null ? { time: p.date as Time } : { time: p.date as Time, value: v }
      })

    opActual.setData(toActualLine('operatingProfit'))
    opEst.setData(toEstLine('operatingProfit'))
    niActual.setData(toActualLine('netIncome'))
    niEst.setData(toEstLine('netIncome'))

    // ref 업데이트 → tickMarkFormatter가 다음 렌더에서 새 라벨 반영
    periodByDateRef.current = periodByDate

    chart.timeScale().fitContent()
  }, [data])

  const hasEstimate = data.some(p => p.isEstimate)

  return (
    <div style={{ position: 'relative' }}>
      {/* 범례 */}
      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: REV_ACTUAL }} />
          매출
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-block w-4 h-[1.5px] shrink-0" style={{ background: OP_COLOR }} />
          영업이익
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-block w-4 h-[1.5px] shrink-0" style={{ background: NI_COLOR }} />
          순이익
        </span>
        {hasEstimate && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span
              className="inline-block w-4 border-b border-dashed shrink-0"
              style={{ borderColor: OP_COLOR }}
            />
            추정(E)
          </span>
        )}
      </div>

      {/* 차트 */}
      <div ref={containerRef} style={{ height: 280 }} className="w-full" />

      {/* 툴팁 */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover text-popover-foreground px-2.5 py-1.5 shadow-md text-[11px]"
          style={{
            left: tooltip.x > containerWidth * 0.6 ? tooltip.x - 160 : tooltip.x + 10,
            top: Math.max(4, tooltip.y - 30),
          }}
        >
          <p className="text-muted-foreground mb-1 font-medium text-[10px]">
            {tooltip.point.period}{tooltip.point.isEstimate ? '(E)' : ''}
          </p>
          <div className="space-y-0.5 tabular-nums">
            {tooltip.point.revenue !== null && (
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: tooltip.point.isEstimate ? REV_EST : REV_ACTUAL }}
                />
                <span className="text-muted-foreground">매출</span>
                <span className="ml-1">{fmtAmount(tooltip.point.revenue)}</span>
              </div>
            )}
            {tooltip.point.operatingProfit !== null && (
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-[1.5px] shrink-0" style={{ background: OP_COLOR }} />
                <span className="text-muted-foreground">영업이익</span>
                <span
                  className={`ml-1 ${tooltip.point.operatingProfit >= 0 ? 'text-red-500' : 'text-blue-500'}`}
                >
                  {fmtAmount(tooltip.point.operatingProfit)}
                </span>
              </div>
            )}
            {tooltip.point.netIncome !== null && (
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-[1.5px] shrink-0" style={{ background: NI_COLOR }} />
                <span className="text-muted-foreground">순이익</span>
                <span
                  className={`ml-1 ${tooltip.point.netIncome >= 0 ? 'text-red-500' : 'text-blue-500'}`}
                >
                  {fmtAmount(tooltip.point.netIncome)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 외부 공개 컴포넌트 ────────────────────────────────────────────────────────
interface Props {
  ticker: string
}

export function FinancialsChart({ ticker }: Props) {
  const [period, setPeriod] = useState<'quarter' | 'annual'>('quarter')
  const [data, setData] = useState<FinancialPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    // ticker/period 변경 시 이전 데이터 즉시 초기화 (investor-flow-chart 동일 패턴)
    /* eslint-disable react-hooks/set-state-in-effect */
    setData(null)
    setUnsupported(false)
    setLoading(true)
    /* eslint-enable react-hooks/set-state-in-effect */
    const ctrl = new AbortController()
    fetch(
      `/api/financials?ticker=${encodeURIComponent(ticker)}&period=${period}`,
      { signal: ctrl.signal },
    )
      .then(r => r.json())
      .then((res: { data?: FinancialPoint[]; unsupported?: boolean }) => {
        if (res.unsupported) { setUnsupported(true); return }
        setData(res.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [ticker, period])

  return (
    <div data-component="FinancialsChart">
      {/* 헤더: 타이틀 + 분기/연간 토글 */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-muted-foreground">단위: 백만원</p>
        <div className="flex items-center gap-0.5">
          {(['quarter', 'annual'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                period === p
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'quarter' ? '분기' : '연간'}
            </button>
          ))}
        </div>
      </div>

      {/* 상태별 렌더링 */}
      {loading && <Skeleton className="h-[280px] w-full" />}

      {!loading && unsupported && (
        <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
          해당 종목은 실적 정보를 제공하지 않습니다 (미국 주식/ETF)
        </div>
      )}

      {!loading && !unsupported && data !== null && data.length === 0 && (
        <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
          실적 데이터를 불러오지 못했습니다
        </div>
      )}

      {/* 데이터가 있을 때만 마운트 — chart init effect가 containerRef를 정상 참조 */}
      {!loading && !unsupported && data !== null && data.length > 0 && (
        <FinancialsChartInner data={data} />
      )}
    </div>
  )
}
