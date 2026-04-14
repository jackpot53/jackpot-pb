'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { refreshAllPrices } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { computePortfolio } from '@/lib/portfolio'
import { writePortfolioSnapshot } from '@/lib/snapshot/writer'

export async function takeSnapshot(): Promise<{ ok: boolean; snapshotDate?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    await refreshAllPrices()
    const { performances, priceMap } = await loadPerformances(user.id)
    const fxRateInt = priceMap.get('USD_KRW')?.priceKrw ?? 0
    const summary = computePortfolio(performances, fxRateInt)

    const snapshotDate = new Date().toISOString().slice(0, 10)
    const returnBps = Math.round((summary.returnPct / 100) * 10000)

    await writePortfolioSnapshot({
      snapshotDate,
      totalValueKrw: summary.totalValueKrw,
      totalCostKrw: summary.totalCostKrw,
      returnBps,
      userId: user.id,
    })

    revalidatePath('/goals')
    return { ok: true, snapshotDate }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}
