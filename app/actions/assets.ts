'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { transactions } from '@/db/schema/transactions'
import { holdings } from '@/db/schema/holdings'
import { manualValuations } from '@/db/schema/manual-valuations'
import { eq, sql } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const assetSchema = z.object({
  name: z.string().min(1, '종목명을 입력해주세요.').max(255),
  assetType: z.enum(['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'savings', 'real_estate']),
  priceType: z.enum(['live', 'manual']),
  currency: z.enum(['KRW', 'USD']),
  ticker: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export type AssetFormValues = z.infer<typeof assetSchema>
export type AssetActionError = { error: string }

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function createAsset(data: AssetFormValues): Promise<AssetActionError | void> {
  await requireUser()
  const parsed = assetSchema.safeParse(data)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }
  const { ticker, notes, ...rest } = parsed.data
  await db.insert(assets).values({
    ...rest,
    ticker: ticker ?? null,
    notes: notes ?? null,
  })
  revalidatePath('/assets')
  redirect('/assets')
}

export async function updateAsset(
  id: string,
  data: AssetFormValues
): Promise<AssetActionError | void> {
  await requireUser()
  const parsed = assetSchema.safeParse(data)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }

  // WR-02: prevent changing currency when existing transactions would have wrong encoding
  const existingAsset = await db.select({ currency: assets.currency }).from(assets).where(eq(assets.id, id)).limit(1)
  if (existingAsset[0] && existingAsset[0].currency !== parsed.data.currency) {
    const txCountRows = await db.select({ count: sql<number>`count(*)` }).from(transactions).where(eq(transactions.assetId, id))
    const txCount = Number(txCountRows[0]?.count ?? 0)
    if (txCount > 0) {
      return { error: '거래 내역이 있는 자산의 통화는 변경할 수 없습니다.' }
    }
  }

  const { ticker, notes, ...rest } = parsed.data
  await db.update(assets).set({
    ...rest,
    ticker: ticker ?? null,
    notes: notes ?? null,
  }).where(eq(assets.id, id))
  revalidatePath('/assets')
  revalidatePath(`/assets/${id}`)
  redirect('/assets')
}

export async function deleteAsset(id: string): Promise<AssetActionError | void> {
  await requireUser()
  if (!id) return { error: '자산 ID가 없습니다.' }
  // Pre-delete child rows inside a transaction to prevent partial deletes on failure
  await db.transaction(async (tx) => {
    await tx.delete(transactions).where(eq(transactions.assetId, id))
    await tx.delete(manualValuations).where(eq(manualValuations.assetId, id))
    await tx.delete(holdings).where(eq(holdings.assetId, id))
    await tx.delete(assets).where(eq(assets.id, id))
  })
  revalidatePath('/assets')
  redirect('/assets')
}
