import type { InsuranceProduct } from './scrape'
import { fetchNonLifeProducts, fetchLifeProducts } from './scrape'

const TTL_MS = 24 * 60 * 60 * 1000

let cache: { data: InsuranceProduct[]; fetchedAt: number } | null = null
let inflight: Promise<InsuranceProduct[]> | null = null

async function buildCatalog(): Promise<InsuranceProduct[]> {
  const [nonLife, life] = await Promise.allSettled([fetchNonLifeProducts(), fetchLifeProducts()])
  const products: InsuranceProduct[] = [
    ...(nonLife.status === 'fulfilled' ? nonLife.value : []),
    ...(life.status === 'fulfilled' ? life.value : []),
  ]
  return products
}

export async function getInsuranceCatalog(): Promise<InsuranceProduct[]> {
  const now = Date.now()
  const isStale = !cache || now - cache.fetchedAt > TTL_MS

  if (!isStale) return cache!.data

  // stale-while-revalidate: return current stale data immediately, refresh in background
  if (cache && isStale && !inflight) {
    inflight = buildCatalog()
      .then(data => {
        cache = { data, fetchedAt: Date.now() }
        return data
      })
      .catch(() => cache?.data ?? [])
      .finally(() => { inflight = null })
  }

  // first-ever fetch: wait for it
  if (!cache) {
    if (!inflight) {
      inflight = buildCatalog()
        .then(data => {
          cache = { data, fetchedAt: Date.now() }
          return data
        })
        .catch(() => [])
        .finally(() => { inflight = null })
    }
    return inflight
  }

  return cache.data
}

export async function searchInsuranceProducts(
  query: string,
  catalogFn: () => Promise<InsuranceProduct[]> = getInsuranceCatalog,
): Promise<InsuranceProduct[]> {
  if (!query.trim()) return []
  const catalog = await catalogFn()
  const normalized = query.toLowerCase().replace(/\s+/g, '')
  return catalog
    .filter(p => p.name.toLowerCase().replace(/\s+/g, '').includes(normalized))
    .slice(0, 20)
}
