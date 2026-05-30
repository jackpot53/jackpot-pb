import type {
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  SeriesAttachedParameter,
  IChartApiBase,
  ISeriesApi,
  SeriesType,
  Time,
} from 'lightweight-charts'
import type { CanvasRenderingTarget2D } from 'fancy-canvas'

interface CloudPoint {
  time: Time
  senkouA: number
  senkouB: number
}

/** 캔버스 좌표로 변환된 구름 구간 */
interface CloudCoord {
  x: number
  ya: number   // senkouA canvas y
  yb: number   // senkouB canvas y
  priceA: number
  priceB: number
}

class IchimokuCloudFillRenderer implements IPrimitivePaneRenderer {
  private _points: CloudPoint[] = []
  private _chart: IChartApiBase<Time> | null = null
  private _series: ISeriesApi<SeriesType, Time> | null = null
  private _bullColor: string
  private _bearColor: string

  constructor(bullColor: string, bearColor: string) {
    this._bullColor = bullColor
    this._bearColor = bearColor
  }

  update(
    points: CloudPoint[],
    chart: IChartApiBase<Time>,
    series: ISeriesApi<SeriesType, Time>,
  ) {
    this._points = points
    this._chart = chart
    this._series = series
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      const chart = this._chart
      const series = this._series
      if (!chart || !series || this._points.length < 2) return

      const ts = chart.timeScale()

      // 좌표 변환
      const coords: CloudCoord[] = []
      for (const p of this._points) {
        const x = ts.timeToCoordinate(p.time)
        const ya = series.priceToCoordinate(p.senkouA)
        const yb = series.priceToCoordinate(p.senkouB)
        if (x === null || ya === null || yb === null) continue
        coords.push({ x, ya, yb, priceA: p.senkouA, priceB: p.senkouB })
      }
      if (coords.length < 2) return

      const bullColor = this._bullColor
      const bearColor = this._bearColor

      ctx.save()

      for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1]
        const curr = coords[i]

        const diffPrev = prev.priceA - prev.priceB
        const diffCurr = curr.priceA - curr.priceB
        const prevBull = diffPrev >= 0
        const currBull = diffCurr >= 0

        if (prevBull === currBull) {
          // 부호 동일 — 단순 사각형 fill
          fillQuad(ctx, prev.x, prev.ya, prev.yb, curr.x, curr.ya, curr.yb, prevBull ? bullColor : bearColor)
        } else {
          // 부호 전환 — 교차점 계산 후 두 영역을 각각 fill
          const absPrev = Math.abs(diffPrev)
          const absCurr = Math.abs(diffCurr)
          const t = absPrev / (absPrev + absCurr)

          const xCross = prev.x + t * (curr.x - prev.x)
          // 교차점에서 senkouA == senkouB이므로 ya == yb
          const yCross = prev.ya + t * (curr.ya - prev.ya)

          // 전환 전 구간
          fillQuad(ctx, prev.x, prev.ya, prev.yb, xCross, yCross, yCross, prevBull ? bullColor : bearColor)
          // 전환 후 구간
          fillQuad(ctx, xCross, yCross, yCross, curr.x, curr.ya, curr.yb, currBull ? bullColor : bearColor)
        }
      }

      ctx.restore()
    })
  }
}

/**
 * 사다리꼴(또는 삼각형) 채우기 헬퍼.
 * (x1, ya1 ~ yb1) → (x2, ya2 ~ yb2) 구간을 color로 채운다.
 */
function fillQuad(
  ctx: CanvasRenderingContext2D,
  x1: number, ya1: number, yb1: number,
  x2: number, ya2: number, yb2: number,
  color: string,
) {
  ctx.beginPath()
  ctx.moveTo(x1, ya1)
  ctx.lineTo(x2, ya2)
  ctx.lineTo(x2, yb2)
  ctx.lineTo(x1, yb1)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

class IchimokuCloudFillView implements IPrimitivePaneView {
  private _renderer: IchimokuCloudFillRenderer

  constructor(bullColor: string, bearColor: string) {
    this._renderer = new IchimokuCloudFillRenderer(bullColor, bearColor)
  }

  zOrder(): 'bottom' {
    return 'bottom'
  }

  renderer(): IPrimitivePaneRenderer {
    return this._renderer
  }

  update(
    points: CloudPoint[],
    chart: IChartApiBase<Time>,
    series: ISeriesApi<SeriesType, Time>,
  ) {
    this._renderer.update(points, chart, series)
  }
}

/**
 * 일목균형표 구름대(선행스팬1·2 사이)를 양운(녹색)·음운(적색)으로 채우는 시리즈 프리미티브.
 * 캔들 시리즈에 attachPrimitive로 부착한다.
 *
 * Usage:
 *   const fill = new IchimokuCloudFill()
 *   candleSeries.attachPrimitive(fill)
 *   fill.setData([{ time: '2024-01-01', senkouA: 50000, senkouB: 48000 }, ...])
 */
export class IchimokuCloudFill implements ISeriesPrimitive<Time> {
  private _points: CloudPoint[] = []
  private _visible = true
  private _chart: IChartApiBase<Time> | null = null
  private _series: ISeriesApi<SeriesType, Time> | null = null
  private _requestUpdate: (() => void) | null = null
  private _view: IchimokuCloudFillView

  constructor(
    bullColor = 'rgba(20,184,166,0.12)',  // 양운 — teal
    bearColor = 'rgba(239,68,68,0.12)',   // 음운 — red
  ) {
    this._view = new IchimokuCloudFillView(bullColor, bearColor)
  }

  attached(param: SeriesAttachedParameter<Time>) {
    this._chart = param.chart
    this._series = param.series
    this._requestUpdate = param.requestUpdate
  }

  detached() {
    this._chart = null
    this._series = null
    this._requestUpdate = null
  }

  updateAllViews() {
    if (!this._chart || !this._series) return
    const pts = this._visible ? this._points : []
    this._view.update(pts, this._chart, this._series)
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._view]
  }

  setData(points: CloudPoint[]) {
    this._points = points
    this._requestUpdate?.()
  }

  setVisible(visible: boolean) {
    this._visible = visible
    this._requestUpdate?.()
  }
}
