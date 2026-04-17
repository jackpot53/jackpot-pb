import { NextResponse } from 'next/server'
import { fetchMarketNewsForTypes } from '@/lib/market-news/fetch'

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
  category: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const typesParam = searchParams.get('types') ?? ''
  const activeTypes = typesParam ? typesParam.split(',') : []
  const items = await fetchMarketNewsForTypes(activeTypes)
  return NextResponse.json(items)
}
