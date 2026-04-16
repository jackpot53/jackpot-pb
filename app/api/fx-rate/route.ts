import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/fx-rate?date=YYYY-MM-DD
 * Fetches USD/KRW exchange rate for a given date.
 *
 * Strategy:
 *  1. BOK ECOS API (if BOK_API_KEY is set) — official Korean bank rate
 *  2. Yahoo Finance KRW=X — fallback, no API key required
 *
 * Returns { rate: number, date: string } where rate is the human-readable value (e.g. 1356.5).
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date 파라미터가 필요합니다 (YYYY-MM-DD)' }, { status: 400 })
  }

  // 1. BOK ECOS (preferred, requires API key)
  const apiKey = process.env.BOK_API_KEY
  if (apiKey) {
    const result = await fetchBokRate(date, apiKey)
    if (result) return NextResponse.json(result)
  }

  // 2. Yahoo Finance fallback (no key required)
  const result = await fetchYahooRate(date)
  if (result) return NextResponse.json(result)

  return NextResponse.json({ error: '환율 데이터를 가져올 수 없습니다' }, { status: 502 })
}

async function fetchBokRate(date: string, apiKey: string): Promise<{ rate: number; date: string } | null> {
  const BOK_STAT_CODE = '036Y001'
  const BOK_ITEM_CODE = '0000001'
  const endDate = date.replace(/-/g, '')
  const startDt = new Date(date)
  startDt.setDate(startDt.getDate() - 7)
  const startDate = startDt.toISOString().slice(0, 10).replace(/-/g, '')

  try {
    const url = `https://ecos.bok.or.kr/api/StatisticSearch/${encodeURIComponent(apiKey)}/json/kr/1/10/${BOK_STAT_CODE}/D/${startDate}/${endDate}/${BOK_ITEM_CODE}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    const rows: { DATA_VALUE: string; TIME: string }[] = data?.StatisticSearch?.row ?? []
    if (!rows.length) return null
    const latest = rows[rows.length - 1]
    const rate = parseFloat(latest.DATA_VALUE)
    if (isNaN(rate) || rate <= 0) return null
    return { rate, date: latest.TIME }
  } catch {
    return null
  }
}

async function fetchYahooRate(date: string): Promise<{ rate: number; date: string } | null> {
  try {
    // Search a window of ±3 days to handle weekends/holidays
    const endDt = new Date(date)
    endDt.setDate(endDt.getDate() + 1)
    const startDt = new Date(date)
    startDt.setDate(startDt.getDate() - 7)
    const period1 = Math.floor(startDt.getTime() / 1000)
    const period2 = Math.floor(endDt.getTime() / 1000)

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d&period1=${period1}&period2=${period2}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = await res.json()

    const timestamps: number[] = data?.chart?.result?.[0]?.timestamp ?? []
    const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    if (!timestamps.length || !closes.length) return null

    // Find the entry closest to (but not after) the requested date
    const targetTs = new Date(date).getTime() / 1000 + 86400 // end of requested day
    let bestIdx = 0
    for (let i = 0; i < timestamps.length; i++) {
      if (timestamps[i] <= targetTs) bestIdx = i
    }

    const rate = closes[bestIdx]
    if (!rate || isNaN(rate) || rate <= 0) return null

    const rateDate = new Date(timestamps[bestIdx] * 1000).toISOString().slice(0, 10)
    return { rate: Math.round(rate * 100) / 100, date: rateDate }
  } catch {
    return null
  }
}
