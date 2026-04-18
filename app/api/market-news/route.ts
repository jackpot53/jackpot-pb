import { NextResponse } from 'next/server'
import { fetchMarketNewsForTypes } from '@/lib/market-news/fetch'

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
  category: string
}

const VALID_ASSET_TYPES = new Set([
  'stock_kr', 'etf_kr', 'stock_us', 'etf_us', 'fund', 'crypto',
  'savings', 'real_estate', 'insurance', 'cma', 'precious_metal',
])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const typesParam = searchParams.get('types') ?? ''
  const activeTypes = typesParam
    ? typesParam.split(',').filter((t) => VALID_ASSET_TYPES.has(t))
    : []
  const items = await fetchMarketNewsForTypes(activeTypes)
  return NextResponse.json(items)
}
