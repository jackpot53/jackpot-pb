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

interface BandPoint {
  time: Time
  upper: number
  lower: number
}

class BollingerBandFillRenderer implements IPrimitivePaneRenderer {
  private _points: BandPoint[] = []
  private _chart: IChartApiBase<Time> | null = null
  private _series: ISeriesApi<SeriesType, Time> | null = null
  private _fillColor: string

  constructor(fillColor: string) {
    this._fillColor = fillColor
  }

  update(
    points: BandPoint[],
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
      if (!chart || !series || this._points.length === 0) return

      const ts = chart.timeScale()

      // 좌표 변환 — null(밴드 시작 전 구간)은 건너뜀
      type Coord = { x: number; upper: number; lower: number }
      const coords: Coord[] = []
      for (const p of this._points) {
        const x = ts.timeToCoordinate(p.time)
        const yu = series.priceToCoordinate(p.upper)
        const yl = series.priceToCoordinate(p.lower)
        if (x === null || yu === null || yl === null) continue
        coords.push({ x, upper: yu, lower: yl })
      }
      if (coords.length < 2) return

      // upper 라인 → lower 라인 역방향으로 폴리곤 fill
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(coords[0].x, coords[0].upper)
      for (let i = 1; i < coords.length; i++) ctx.lineTo(coords[i].x, coords[i].upper)
      for (let i = coords.length - 1; i >= 0; i--) ctx.lineTo(coords[i].x, coords[i].lower)
      ctx.closePath()
      ctx.fillStyle = this._fillColor
      ctx.fill()
      ctx.restore()
    })
  }
}

class BollingerBandFillView implements IPrimitivePaneView {
  private _renderer: BollingerBandFillRenderer

  constructor(fillColor: string) {
    this._renderer = new BollingerBandFillRenderer(fillColor)
  }

  zOrder(): 'bottom' {
    return 'bottom'
  }

  renderer(): IPrimitivePaneRenderer {
    return this._renderer
  }

  update(
    points: BandPoint[],
    chart: IChartApiBase<Time>,
    series: ISeriesApi<SeriesType, Time>,
  ) {
    this._renderer.update(points, chart, series)
  }
}

/**
 * 볼린저 밴드 상·하단 사이를 반투명 폴리곤으로 채우는 시리즈 프리미티브.
 * 캔들 시리즈에 attachPrimitive로 부착한다.
 *
 * Usage:
 *   const fill = new BollingerBandFill()
 *   candleSeries.attachPrimitive(fill)
 *   fill.setData([{ time: '2024-01-01', upper: 80000, lower: 70000 }, ...])
 */
export class BollingerBandFill implements ISeriesPrimitive<Time> {
  private _points: BandPoint[] = []
  private _visible = true
  private _chart: IChartApiBase<Time> | null = null
  private _series: ISeriesApi<SeriesType, Time> | null = null
  private _requestUpdate: (() => void) | null = null
  private _view: BollingerBandFillView

  constructor(fillColor = 'rgba(148, 163, 184, 0.12)') {
    this._view = new BollingerBandFillView(fillColor)
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

  setData(points: BandPoint[]) {
    this._points = points
    this._requestUpdate?.()
  }

  setVisible(visible: boolean) {
    this._visible = visible
    this._requestUpdate?.()
  }
}
