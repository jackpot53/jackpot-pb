import { NextRequest, NextResponse } from 'next/server'
import { toKisCode } from '@/lib/kis/symbol'
import { fetchKisShortSellingDebug } from '@/lib/kis/short-selling'
import type { ShortSellingPoint } from '@/lib/kis/short-selling'

export { type ShortSellingPoint }

export const dynamic = 'force-dynamic'

function isKrTicker(ticker: string): boolean {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ')
}

function rangeToLabel(range: string): string {
  if (range === '5y') return '5y'
  if (range === '3y') return '3y'
  return '1y'
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker') ?? ''
  const range = rangeToLabel(req.nextUrl.searchParams.get('range') ?? '1y')

  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  if (!isKrTicker(ticker)) {
    return NextResponse.json({ unsupported: true })
  }

  const kisCode = toKisCode(ticker)
  if (!kisCode) {
    return NextResponse.json({ unsupported: true })
  }

  const result = await fetchKisShortSellingDebug(kisCode, range)
  if (!result.data || result.data.length === 0) {
    return NextResponse.json({ error: 'fetch failed', debug: result.debug }, { status: 500 })
  }

  return NextResponse.json(
    { data: result.data },
    { headers: { 'Cache-Control': 'public, max-age=86400' } },
  )
}
