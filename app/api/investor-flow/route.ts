import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface InvestorFlowPoint {
  date: string   // 'YYYY-MM-DD'
  institution: number  // 기관 순매수량 (주)
  foreign: number      // 외국인 순매수량 (주)
  individual: number   // 개인 순매수량 (주, = -(institution + foreign))
}

function parseQuantity(s: string): number {
  const clean = s.replace(/,/g, '').replace(/\+/g, '').trim()
  const n = Number(clean)
  return isNaN(n) ? 0 : n
}

function parseDateStr(s: string): string {
  // '2026.05.29' → '2026-05-29'
  return s.replace(/\./g, '-')
}

function extractText(html: string, pattern: RegExp): string {
  const m = html.match(pattern)
  return m ? m[1].trim() : ''
}

async function fetchPage(code: string, page: number): Promise<InvestorFlowPoint[]> {
  const url = `https://finance.naver.com/item/frgn.naver?code=${code}&page=${page}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Accept': 'text/html',
      'Referer': 'https://finance.naver.com/',
    },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  if (!res.ok) return []

  const buf = await res.arrayBuffer()
  const html = new TextDecoder('euc-kr').decode(buf)

  // 데이터 테이블 추출 (summary 속성으로 특정)
  const tableMatch = html.match(/<table[^>]*summary="외국인 기관 순매매 거래량에 관한표이며 날짜별로 정보를 제공합니다\."[\s\S]*?<\/table>/)
  if (!tableMatch) return []
  const table = tableMatch[0]

  // onMouseOver가 있는 tr 행들 추출 (데이터 행)
  const rows = table.match(/<tr onMouseOver[\s\S]*?<\/tr>/g) ?? []

  const points: InvestorFlowPoint[] = []
  for (const row of rows) {
    // 날짜
    const dateMatch = row.match(/class="tah p10 gray03">([^<]+)<\/span>/)
    if (!dateMatch) continue
    const date = parseDateStr(dateMatch[1].trim())
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) continue

    // td 내 span.tah 값들 추출 (순서: 종가, 전일비, 등락률, 거래량, 기관순매수, 외국인순매수, 보유주수, 보유율)
    const spans = [...row.matchAll(/class="tah p11[^"]*">([^<]+)<\/span>/g)].map(m => m[1].trim())
    // spans[0]=종가, spans[1]=전일비, spans[2]=등락률, spans[3]=거래량, spans[4]=기관순매수, spans[5]=외국인순매수
    if (spans.length < 6) continue

    const institution = parseQuantity(spans[4])
    const foreign = parseQuantity(spans[5])
    const individual = -(institution + foreign)

    points.push({ date, institution, foreign, individual })
  }
  return points
}

function isKrTicker(ticker: string): boolean {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ')
}

function extractCode(ticker: string): string {
  return ticker.replace(/\.(KS|KQ)$/, '')
}

function rangeToPages(range: string): number {
  if (range === '5y') return 30
  if (range === '3y') return 18
  return 9  // 1y default
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker') ?? ''
  const range = req.nextUrl.searchParams.get('range') ?? '1y'

  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  if (!isKrTicker(ticker)) {
    return NextResponse.json({ unsupported: true })
  }

  const code = extractCode(ticker)
  const maxPages = rangeToPages(range)

  try {
    // 1~maxPages 병렬 fetch (5개씩 batch로 제한)
    const allPoints: InvestorFlowPoint[] = []
    const BATCH = 5
    for (let start = 1; start <= maxPages; start += BATCH) {
      const pages = Array.from({ length: Math.min(BATCH, maxPages - start + 1) }, (_, i) => start + i)
      const results = await Promise.allSettled(pages.map(p => fetchPage(code, p)))
      for (const r of results) {
        if (r.status === 'fulfilled') allPoints.push(...r.value)
      }
    }

    // 날짜 기준 정렬 (오래된 것부터)
    allPoints.sort((a, b) => a.date.localeCompare(b.date))

    // 중복 날짜 제거
    const seen = new Set<string>()
    const data = allPoints.filter(p => {
      if (seen.has(p.date)) return false
      seen.add(p.date)
      return true
    })

    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }
}
