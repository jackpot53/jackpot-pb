import { db } from '@/db'
import { contributionDetails } from '@/db/schema/contribution-details'
import { contributionDividendRates } from '@/db/schema/contribution-dividend-rates'
import { inArray, eq, and } from 'drizzle-orm'
import type { ContributionDetailsRow } from '@/db/schema/contribution-details'
import type { ContributionDividendRateRow } from '@/db/schema/contribution-dividend-rates'

export async function getContributionDetails(ids: string[]): Promise<Map<string, ContributionDetailsRow>> {
  if (ids.length === 0) return new Map()
  const rows = await db.select().from(contributionDetails).where(inArray(contributionDetails.assetId, ids))
  return new Map(rows.map((r) => [r.assetId, r]))
}

export async function getContributionDividendRates(ids: string[]): Promise<Map<string, ContributionDividendRateRow[]>> {
  if (ids.length === 0) return new Map()
  const rows = await db.select().from(contributionDividendRates).where(inArray(contributionDividendRates.assetId, ids))
  const map = new Map<string, ContributionDividendRateRow[]>()
  for (const row of rows) {
    const existing = map.get(row.assetId) ?? []
    existing.push(row)
    map.set(row.assetId, existing)
  }
  return map
}

export async function upsertContributionDividendRate(
  assetId: string,
  userId: string,
  year: number,
  rateBp: number,
): Promise<void> {
  await db.insert(contributionDividendRates).values({ assetId, userId, year, rateBp })
    .onConflictDoUpdate({
      target: [contributionDividendRates.assetId, contributionDividendRates.year],
      set: { rateBp },
    })
}

export async function deleteContributionDividendRate(
  assetId: string,
  userId: string,
  year: number,
): Promise<void> {
  await db.delete(contributionDividendRates).where(
    and(
      eq(contributionDividendRates.assetId, assetId),
      eq(contributionDividendRates.userId, userId),
      eq(contributionDividendRates.year, year),
    )
  )
}
