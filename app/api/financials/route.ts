import { NextRequest, NextResponse } from 'next/server'
import { toKisCode } from '@/lib/kis/symbol'
import { fetchKisFinancials } from '@/lib/kis/financials'

export const dynamic = 'force-dynamic'

export type { FinancialPoint } from '@/lib/kis/financials'

function isKrTicker(ticker: string): boolean {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ')
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker') ?? ''
  const periodParam = req.nextUrl.searchParams.get('period')
  const period: 'quarter' | 'annual' = periodParam === 'annual' ? 'annual' : 'quarter'

  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  if (!isKrTicker(ticker)) {
    return NextResponse.json({ unsupported: true })
  }

  const code = toKisCode(ticker) ?? ticker.replace(/\.(KS|KQ)$/, '')

  const data = await fetchKisFinancials(code, period)
  if (!data) return NextResponse.json({ error: 'fetch failed' }, { status: 500 })

  // 실적은 분기 단위 갱신이므로 6시간 캐시
  return NextResponse.json(
    { data },
    { headers: { 'Cache-Control': 'public, max-age=21600' } },
  )
}
