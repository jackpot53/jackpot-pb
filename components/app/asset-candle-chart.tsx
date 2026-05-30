'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  LineStyle,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type CandlestickData,
  type Time,
  type MouseEventParams,
} from 'lightweight-charts'
import type { OhlcPoint } from '@/lib/price/sparkline'
import { CHART_UP, CHART_DOWN, resolvePalette } from '@/lib/chart/theme'
import { MA_COLORS, MA_PERIODS } from '@/lib/chart/ma-colors'
import { sma } from '@/lib/robo-advisor/indicators/sma'

type Period = '일봉' | '주봉' | '월봉'

const PERIODS: Period[] = ['일봉', '주봉', '월봉']
const PERIOD_PARAMS: Record<Period, { interval: string; range: string }> = {
  '일봉': { interval: '1d', range: '1y' },
  '주봉': { interval: '1wk', range: '1y' },
  '월봉': { interval: '1mo', range: '1y' },
}

interface AssetCandleChartProps {
  ticker: string
  initialData: OhlcPoint[]
  assetType?: string
  avgPrice?: number | null
}

interface TooltipState {
  x: number
  y: number
  point: OhlcPoint
}

function fmtAxisPrice(v: number): string {
  if (v >= 100_000) return `${(v / 10_000).toFixed(0)}만`
  if (v >= 10_000) return `${(v / 10_000).toFixed(1)}만`
  if (v >= 1_000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  if (v >= 100) return v.toFixed(1)
  return v.toFixed(2)
}

function fmtTooltipPrice(v: number): string {
  if (v >= 1_000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  return v.toFixed(2)
}

function toSeriesData(points: OhlcPoint[]): CandlestickData<Time>[] {
  return points.map((p) => ({
    time: p.date,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
  }))
}

export function AssetCandleChart({ ticker, initialData, avgPrice }: AssetCandleChartProps) {
  const [period, setPeriod] = useState<Period>('일봉')
  const [fetchedByPeriod, setFetchedByPeriod] = useState<Partial<Record<Period, OhlcPoint[]>>>({})
  const [loading, setLoading] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [maVisible, setMaVisible] = useState<Record<number, boolean>>(
    Object.fromEntries(MA_PERIODS.map((p) => [p, true])),
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const maSeriesRef = useRef<Map<number, ISeriesApi<'Line'>>>(new Map())
  const avgPriceLineRef = useRef<IPriceLine | null>(null)
  const avgPriceRef = useRef<number | null | undefined>(avgPrice)
  const [avgPriceLabelY, setAvgPriceLabelY] = useState<number | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const baseData = useMemo<OhlcPoint[]>(
    () => period === '일봉'
      ? (fetchedByPeriod['일봉'] ?? initialData)
      : (fetchedByPeriod[period] ?? []),
    [period, initialData, fetchedByPeriod],
  )

  const data = baseData

  // initialData가 비어있으면 일봉 데이터를 직접 fetch
  useEffect(() => {
    if (initialData.length > 0) return
    const { interval, range } = PERIOD_PARAMS['일봉']
    fetch(`/api/sparklines?tickers=${encodeURIComponent(ticker)}&interval=${interval}&range=${range}`)
      .then((r) => r.json())
      .then((res: Record<string, OhlcPoint[]>) => {
        const d = res[ticker]
        if (d && d.length >= 2) setFetchedByPeriod((prev) => ({ ...prev, '일봉': d }))
      })
      .catch(() => {})
  }, [ticker, initialData.length])

  // 주/월봉 전환 시 호출 — 사용자 액션에서 직접 트리거.
  const selectPeriod = useCallback(
    (next: Period) => {
      setPeriod(next)
      if (next === '일봉' || fetchedByPeriod[next]) return
      const { interval, range } = PERIOD_PARAMS[next]
      setLoading(true)
      fetch(`/api/sparklines?tickers=${encodeURIComponent(ticker)}&interval=${interval}&range=${range}`)
        .then((r) => r.json())
        .then((res: Record<string, OhlcPoint[]>) => {
          const d = res[ticker]
          if (d && d.length >= 2) {
            setFetchedByPeriod((prev) => ({ ...prev, [next]: d }))
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    },
    [fetchedByPeriod, ticker],
  )

  // avgPriceRef를 prop과 동기화 (차트 생성 effect 클로저에서 최신 값 읽기용)
  useEffect(() => { avgPriceRef.current = avgPrice }, [avgPrice])

  // Chart 생성(한 번)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const palette = resolvePalette(container)

    const chart = createChart(container, {
      autoSize: true,
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
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: palette.mutedText, width: 1, style: 3 },
        horzLine: { color: palette.mutedText, width: 1, style: 3 },
      },
      localization: {
        priceFormatter: fmtAxisPrice,
      },
      handleScroll: false,
      handleScale: false,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: CHART_UP,
      downColor: CHART_DOWN,
      borderUpColor: CHART_UP,
      borderDownColor: CHART_DOWN,
      wickUpColor: CHART_UP,
      wickDownColor: CHART_DOWN,
    })

    // 이평선 시리즈 5개 생성
    const maMap = new Map<number, ISeriesApi<'Line'>>()
    for (const p of MA_PERIODS) {
      const maSeries = chart.addSeries(LineSeries, {
        color: MA_COLORS[p],
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      maMap.set(p, maSeries)
    }

    chartRef.current = chart
    seriesRef.current = series
    maSeriesRef.current = maMap

    setContainerWidth(container.clientWidth)
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(Math.floor(entry.contentRect.width))
    })
    ro.observe(container)

    // 크로스헤어 툴팁
    const onMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point || !container) {
        setTooltip(null)
        return
      }
      const bar = param.seriesData.get(series) as CandlestickData<Time> | undefined
      if (!bar) {
        setTooltip(null)
        return
      }
      const timeStr =
        typeof param.time === 'string'
          ? param.time
          : typeof param.time === 'number'
            ? new Date(param.time * 1000).toISOString().slice(0, 10)
            : `${(param.time as { year: number; month: number; day: number }).year}-${String((param.time as { month: number }).month).padStart(2, '0')}-${String((param.time as { day: number }).day).padStart(2, '0')}`
      setTooltip({
        x: param.point.x,
        y: param.point.y,
        point: {
          date: timeStr,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        },
      })
    }
    chart.subscribeCrosshairMove(onMove)

    // 매수가 좌측 라벨 y좌표: 차트 스케일 변경 시 재계산
    const refreshAvgLabel = () => {
      const p = avgPriceRef.current
      if (!p || p <= 0) { setAvgPriceLabelY(null); return }
      const coord = series.priceToCoordinate(p)
      setAvgPriceLabelY(typeof coord === 'number' ? coord : null)
    }
    chart.timeScale().subscribeVisibleLogicalRangeChange(refreshAvgLabel)

    return () => {
      ro.disconnect()
      chart.unsubscribeCrosshairMove(onMove)
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(refreshAvgLabel)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      maSeriesRef.current = new Map()
      avgPriceLineRef.current = null
    }
  }, [])

  // 데이터/기간 교체 시 캔들 + 이평선 업데이트
  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart || baseData.length === 0) return
    series.setData(toSeriesData(baseData))

    const closes = baseData.map((p) => p.close)
    for (const p of MA_PERIODS) {
      const maSeries = maSeriesRef.current.get(p)
      if (!maSeries) continue
      if (baseData.length < p) {
        maSeries.setData([])
        maSeries.applyOptions({ visible: false })
        continue
      }
      const values = sma(closes, p)
      const lineData = values
        .map((v, i) => v == null ? null : { time: baseData[i].date as Time, value: v })
        .filter((d): d is { time: Time; value: number } => d !== null)
      maSeries.setData(lineData)
      maSeries.applyOptions({ visible: maVisible[p] })
    }

    chart.timeScale().fitContent()
    // fitContent 렌더링 후 매수가 라벨 y좌표 갱신
    requestAnimationFrame(() => {
      const p = avgPriceRef.current
      if (!p || p <= 0) return
      const coord = series.priceToCoordinate(p)
      setAvgPriceLabelY(typeof coord === 'number' ? coord : null)
    })
  }, [baseData, maVisible])

  // Live tick → 마지막 캔들만 patch (일봉)
  useEffect(() => {
    const series = seriesRef.current
    if (!series || period !== '일봉' || data.length === 0) return
    const last = data[data.length - 1]
    series.update({
      time: last.date,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
    })
  }, [data, period])

  // 매수가 기준선 + 좌측 HTML 라벨 y좌표 계산
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    if (avgPriceLineRef.current) {
      series.removePriceLine(avgPriceLineRef.current)
      avgPriceLineRef.current = null
    }
    if (avgPrice == null || avgPrice <= 0) {
      setAvgPriceLabelY(null)
      return
    }
    avgPriceLineRef.current = series.createPriceLine({
      price: avgPrice,
      color: '#64748b',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '',
    })
    const coord = series.priceToCoordinate(avgPrice)
    setAvgPriceLabelY(typeof coord === 'number' ? coord : null)
  }, [avgPrice])

  const changePct = tooltip
    ? ((tooltip.point.close - tooltip.point.open) / tooltip.point.open) * 100
    : null
  const isUp = tooltip ? tooltip.point.close >= tooltip.point.open : true

  return (
    <div data-component="AssetCandleChart" className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 pt-2 pb-0.5">
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => selectPeriod(p)}
              className={`px-2.5 py-0.5 text-xs rounded-md font-medium transition-colors ${
                period === p
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {p}
            </button>
          ))}
          {loading && <span className="text-xs text-muted-foreground ml-1">…</span>}
        </div>

        {/* 이평선 범례 */}
        <div className="flex items-center gap-0.5">
          {MA_PERIODS.map((p) => {
            const insufficient = baseData.length > 0 && baseData.length < p
            const on = maVisible[p] && !insufficient
            return (
              <button
                key={p}
                disabled={insufficient}
                onClick={() => setMaVisible((prev) => ({ ...prev, [p]: !prev[p] }))}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] tabular-nums transition-opacity ${
                  insufficient
                    ? 'opacity-25 cursor-not-allowed'
                    : on
                      ? 'opacity-100 hover:opacity-80'
                      : 'opacity-35 hover:opacity-60'
                }`}
              >
                <span
                  className="inline-block w-3 h-px"
                  style={{ backgroundColor: MA_COLORS[p], height: '1.5px' }}
                />
                {p}
              </button>
            )
          })}
        </div>
      </div>

      <div ref={containerRef} className="relative flex-1 min-h-0">
        {avgPriceLabelY != null && (
          <div
            className="pointer-events-none absolute z-10 text-[10px] font-medium text-slate-500 leading-none"
            style={{ left: 6, top: avgPriceLabelY - 8 }}
          >
            매수가
          </div>
        )}
        {baseData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">{loading ? '불러오는 중…' : '데이터 없음'}</span>
          </div>
        )}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover text-popover-foreground px-3 py-2 shadow-md text-xs min-w-[140px]"
            style={{
              left: tooltip.x > containerWidth * 0.6 ? tooltip.x - 158 : tooltip.x + 12,
              top: Math.max(4, tooltip.y - 80),
            }}
          >
            <p className="text-muted-foreground mb-1.5 font-medium">{tooltip.point.date}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
              <span className="text-muted-foreground">시가</span>
              <span className="font-medium">{fmtTooltipPrice(tooltip.point.open)}</span>
              <span className="text-muted-foreground">고가</span>
              <span className={`font-medium ${isUp ? 'text-red-500' : 'text-blue-500'}`}>{fmtTooltipPrice(tooltip.point.high)}</span>
              <span className="text-muted-foreground">저가</span>
              <span className={`font-medium ${isUp ? 'text-red-500' : 'text-blue-500'}`}>{fmtTooltipPrice(tooltip.point.low)}</span>
              <span className="text-muted-foreground">종가</span>
              <span className={`font-medium ${isUp ? 'text-red-500' : 'text-blue-500'}`}>{fmtTooltipPrice(tooltip.point.close)}</span>
            </div>
            {changePct !== null && (
              <div className={`mt-1.5 font-semibold text-sm ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
