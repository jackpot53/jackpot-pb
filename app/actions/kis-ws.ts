'use server'

import { getAuthUser } from '@/utils/supabase/server'
import { resolveUsTicker } from '@/lib/price/kis-ticker'
import { getToken } from '@/lib/price/kis-token'

/**
 * Resolves a US ticker to its KIS exchange code (NAS/NYS/AMS).
 * Uses the in-memory EXCHANGE_CACHE so repeated resolves are free.
 * Returns null on auth failure or resolution failure.
 */
export async function resolveExchangeAction(ticker: string): Promise<string | null> {
  const user = await getAuthUser()
  if (!user) return null

  const appKey = process.env.KIS_APP_KEY
  const appSecret = process.env.KIS_APP_SECRET
  if (!appKey || !appSecret) return null

  try {
    const { excd } = await resolveUsTicker(ticker, getToken, appKey, appSecret)
    return excd
  } catch {
    return null
  }
}
