import { getAuthUser } from '@/utils/supabase/server'
import { loadPerformances } from '@/lib/server/load-performances'
import { TickerBandClient, type TickerItem } from './ticker-band-client'

export async function TickerBand() {
  const user = await getAuthUser()
  if (!user) return null

  let performances
  try {
    const result = await loadPerformances(user.id)
    performances = result.performances
  } catch {
    return null
  }

  const items: TickerItem[] = performances
    .filter((p) => p.totalCostKrw > 0)
    .map((p) => ({
      id: p.assetId,
      label: p.name,
      returnPct: p.returnPct,
      dailyChangePct: p.dailyChangeBps !== null ? p.dailyChangeBps / 100 : null,
    }))

  if (items.length === 0) return null

  return <TickerBandClient items={items} />
}
