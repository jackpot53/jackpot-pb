import { getPriceHistory } from '@/db/queries/robo-advisor'
import { sma } from '@/lib/robo-advisor/indicators/sma'
import { bollinger } from '@/lib/robo-advisor/indicators/bollinger'
import { macd } from '@/lib/robo-advisor/indicators/macd'
import type { MacdPoint } from '@/lib/robo-advisor/indicators/macd'
import type { BollingerPoint } from '@/lib/robo-advisor/indicators/bollinger'
import { NextRequest, NextResponse } from 'next/server'
import type { OhlcPoint } from '@/lib/price/sparkline'

export const dynamic = 'force-dynamic'

type SeriesPoint = {
  time: string
  value: number
}

type MacdSeriesPoint = {
  time: string
  macd: number
  signal: number
  hist: number
}

type BollingerSeriesPoint = {
  time: string
  upper: number
  mid: number
  lower: number
}

type OhlcResponse = {
  candles: {
    time: string
    open: number
    high: number
    low: number
    close: number
    volume: number | null
  }[]
  sma5: SeriesPoint[]
  sma20: SeriesPoint[]
  bollinger: BollingerSeriesPoint[]
  macd: MacdSeriesPoint[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    const { ticker } = await params
    const days = request.nextUrl.searchParams.get('days') || '180'
    const daysNum = Math.min(Math.max(parseInt(days), 30), 365)

    const priceHistory = await getPriceHistory(ticker, daysNum)

    if (priceHistory.length === 0) {
      return NextResponse.json(
        { error: 'No price history found' },
        { status: 404 },
      )
    }

    const closes = priceHistory.map((p) => Number(p.close))
    const highs = priceHistory.map((p) => Number(p.high))
    const lows = priceHistory.map((p) => Number(p.low))

    const sma5Series = sma(closes, 5)
    const sma20Series = sma(closes, 20)
    const bollingerSeries = bollinger(closes, 20, 2)
    const macdSeries = macd(closes)

    const sma5: SeriesPoint[] = []
    const sma20: SeriesPoint[] = []
    const bollingerPoints: BollingerSeriesPoint[] = []
    const macdPoints: MacdSeriesPoint[] = []

    for (let i = 0; i < priceHistory.length; i++) {
      const date = priceHistory[i].date

      if (sma5Series[i] !== null && sma5Series[i] !== undefined) {
        sma5.push({ time: date, value: sma5Series[i] as number })
      }

      if (sma20Series[i] !== null && sma20Series[i] !== undefined) {
        sma20.push({ time: date, value: sma20Series[i] as number })
      }

      if (
        bollingerSeries[i] &&
        bollingerSeries[i].upper !== null &&
        bollingerSeries[i].middle !== null &&
        bollingerSeries[i].lower !== null
      ) {
        const bb = bollingerSeries[i]
        bollingerPoints.push({
          time: date,
          upper: bb.upper!,
          mid: bb.middle!,
          lower: bb.lower!,
        })
      }

      if (
        macdSeries[i] &&
        macdSeries[i].macd !== null &&
        macdSeries[i].signal !== null &&
        macdSeries[i].histogram !== null
      ) {
        const m = macdSeries[i]
        macdPoints.push({
          time: date,
          macd: m.macd!,
          signal: m.signal!,
          hist: m.histogram!,
        })
      }
    }

    const candles = priceHistory.map((row) => ({
      time: row.date,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: row.volume ? Number(row.volume) : null,
    }))

    const response: OhlcResponse = {
      candles,
      sma5,
      sma20,
      bollinger: bollingerPoints,
      macd: macdPoints,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('OHLC API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OHLC data' },
      { status: 500 },
    )
  }
}
