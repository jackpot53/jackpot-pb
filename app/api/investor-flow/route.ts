import { NextRequest, NextResponse } from 'next/server'
import { toKisCode } from '@/lib/kis/symbol'
import { fetchKisInvestorFlow } from '@/lib/kis/investor-flow'

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

function rangeToStartDate(range: string): Date {
  const d = new Date()
  if (range === '5y') d.setFullYear(d.getFullYear() - 5)
  else if (range === '3y') d.setFullYear(d.getFullYear() - 3)
  else d.setFullYear(d.getFullYear() - 1)
  return d
}

function sortAndDedup(points: InvestorFlowPoint[]): InvestorFlowPoint[] {
  points.sort((a, b) => a.date.localeCompare(b.date))
  const seen = new Set<string>()
  return points.filter(p => {
    if (seen.has(p.date)) return false
    seen.add(p.date)
    return true
  })
}

// Naver 스크래핑: targetStart 날짜에 도달하거나 데이터가 소진될 때까지 수집.
// 페이지 1 = 최근, 페이지 N = 과거 방향이므로 페이지를 늘릴수록 더 오래된 데이터.
async function fetchNaverUntilStart(code: string, targetStart: Date): Promise<InvestorFlowPoint[]> {
  const MAX_PAGES = 80  // 5년치도 충분히 커버
  const BATCH = 5
  const targetStartStr = targetStart.toISOString().slice(0, 10)
  const allPoints: InvestorFlowPoint[] = []

  for (let start = 1; start <= MAX_PAGES; start += BATCH) {
    const pageCount = Math.min(BATCH, MAX_PAGES - start + 1)
    const pages = Array.from({ length: pageCount }, (_, i) => start + i)
    const results = await Promise.allSettled(pages.map(p => fetchPage(code, p)))

    let gotAny = false
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.length > 0) {
        allPoints.push(...r.value)
        gotAny = true
      }
    }

    // 이번 배치에서 아무 데이터도 못 받으면 과거 데이터 소진 — 종료
    if (!gotAny) break

    // 수집된 최고(오래된) 날짜가 목표 시작일에 도달했으면 종료
    const oldest = allPoints.reduce((min, p) => p.date < min ? p.date : min, allPoints[0].date)
    if (oldest <= targetStartStr) break
  }

  return allPoints
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker') ?? ''
  const range = req.nextUrl.searchParams.get('range') ?? '1y'

  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  if (!isKrTicker(ticker)) {
    return NextResponse.json({ unsupported: true })
  }

  const code = extractCode(ticker)
  const targetStart = rangeToStartDate(range)
  // 목표 시작일 기준 2주 이내면 "커버됨"으로 판정 (주말·공휴일 여유)
  const coverageTolerance = new Date(targetStart)
  coverageTolerance.setDate(coverageTolerance.getDate() + 14)
  const toleranceStr = coverageTolerance.toISOString().slice(0, 10)

  // KIS 우선 시도
  let kisData: InvestorFlowPoint[] | null = null
  const kisCode = toKisCode(ticker)
  if (kisCode) {
    try {
      const result = await fetchKisInvestorFlow(kisCode, range)
      if (result && result.length > 0) kisData = result
    } catch (err) {
      console.error('[investor-flow] KIS fetch error, falling back to Naver:', err)
    }
  }

  // KIS가 전체 기간을 커버하면 바로 반환 (kisData는 오름차순 정렬됨)
  if (kisData && kisData[0].date <= toleranceStr) {
    return NextResponse.json(
      { data: kisData },
      { headers: { 'Cache-Control': 'public, max-age=86400' } },
    )
  }

  // KIS 미커버 — Naver를 목표 시작일까지 스크래핑
  try {
    const naverRaw = await fetchNaverUntilStart(code, targetStart)
    const naverData = sortAndDedup(naverRaw)

    if (naverData.length === 0) {
      // Naver도 실패 → KIS 데이터라도 반환
      if (kisData && kisData.length > 0) {
        return NextResponse.json({ data: kisData }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
      }
      return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
    }

    // KIS와 Naver 중 더 과거까지 커버하는 소스 선택 (데이터 일관성을 위해 단일 소스)
    if (kisData && kisData.length > 0 && kisData[0].date < naverData[0].date) {
      return NextResponse.json({ data: kisData }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
    }

    return NextResponse.json({ data: naverData }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
  } catch {
    if (kisData && kisData.length > 0) {
      return NextResponse.json({ data: kisData }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
    }
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }
}
