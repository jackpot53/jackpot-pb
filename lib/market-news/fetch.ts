import type { NewsItem } from '@/app/api/market-news/route'

const FEEDS: { url: string; source: string; category: string; types: string[] }[] = [
  { url: 'https://www.hankyung.com/feed/finance',      source: '한국경제',       category: '국내증시', types: ['stock_kr', 'etf_kr', 'fund'] },
  { url: 'https://www.mk.co.kr/rss/40300001/',         source: '매일경제',       category: '국내증시', types: ['stock_kr', 'etf_kr', 'fund'] },
  { url: 'https://www.hankyung.com/feed/global-market',source: '한국경제',       category: '해외증시', types: ['stock_us', 'etf_us'] },
  { url: 'https://www.yna.co.kr/rss/economy.xml',      source: '연합뉴스',       category: '경제',     types: ['savings', 'real_estate', 'insurance', 'cma', 'precious_metal'] },
  { url: 'https://www.coindeskkorea.com/rss',          source: 'CoinDesk Korea', category: '암호화폐', types: ['crypto'] },
  { url: 'https://kr.investing.com/rss/news_301.rss',  source: 'Investing.com',  category: '해외증시', types: ['stock_us', 'etf_us'] },
]

const cache = new Map<string, { items: NewsItem[]; at: number }>()
const CACHE_TTL = 30 * 60 * 1000

function extractText(block: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`)
  const plainRe  = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  return (cdataRe.exec(block)?.[1] ?? plainRe.exec(block)?.[1] ?? '').trim()
}

function parseRss(xml: string, source: string, category: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1]
    const title = extractText(block, 'title')
    const link  = extractText(block, 'link') || extractText(block, 'guid')
    const pubDate = extractText(block, 'pubDate')
    if (title && link) items.push({ title, link, pubDate, source, category })
  }
  return items
}

async function fetchFeed(feed: (typeof FEEDS)[0]): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; jackpot-pb/1.0)' },
      signal: AbortSignal.timeout(5000),
    })
    return parseRss(await res.text(), feed.source, feed.category)
  } catch {
    return []
  }
}

export async function fetchMarketNewsForTypes(assetTypes: string[]): Promise<NewsItem[]> {
  const selected = assetTypes.length > 0
    ? FEEDS.filter((f) => f.types.some((t) => assetTypes.includes(t)))
    : FEEDS
  const unique = selected.filter((f, i, arr) => arr.findIndex((x) => x.url === f.url) === i)

  const cacheKey = unique.map((f) => f.url).sort().join('|')
  const now = Date.now()
  const hit = cache.get(cacheKey)
  if (hit && now - hit.at < CACHE_TTL) return hit.items

  const results = await Promise.all(unique.map(fetchFeed))

  const merged: NewsItem[] = []
  const queues = results.filter((r) => r.length > 0)
  let i = 0
  while (merged.length < 6 && queues.some((q) => q.length > i)) {
    for (const q of queues) {
      if (q[i] && merged.length < 6) merged.push(q[i])
    }
    i++
  }

  if (merged.length > 0) cache.set(cacheKey, { items: merged, at: now })
  return merged
}
