'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { transactions } from '@/db/schema/transactions'
import { holdings } from '@/db/schema/holdings'
import { eq } from 'drizzle-orm'
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
  // Pre-delete child rows in order to avoid FK violations (no ON DELETE CASCADE in schema)
  // 1. Delete all transactions referencing this asset
  await db.delete(transactions).where(eq(transactions.assetId, id))
  // 2. Delete the holdings row for this asset
  await db.delete(holdings).where(eq(holdings.assetId, id))
  // 3. Now safe to delete the asset itself
  await db.delete(assets).where(eq(assets.id, id))
  revalidatePath('/assets')
  redirect('/assets')
}
