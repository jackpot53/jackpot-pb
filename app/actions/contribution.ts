'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { upsertContributionDividendRate, deleteContributionDividendRate } from '@/db/queries/contribution'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

const upsertSchema = z.object({
  assetId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  ratePct: z.string().regex(/^\d+(\.\d+)?$/, '유효한 배당률을 입력해주세요.'),
})

export async function upsertDividendRate(
  assetId: string,
  year: number,
  ratePct: string,
): Promise<{ error: string } | void> {
  const user = await requireUser()
  const parsed = upsertSchema.safeParse({ assetId, year, ratePct })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? '입력 오류' }
  const rateBp = Math.round(parseFloat(parsed.data.ratePct) * 10000)
  await upsertContributionDividendRate(assetId, user.id, year, rateBp)
  revalidatePath(`/assets/${assetId}/edit`)
  revalidatePath('/assets')
}

export async function deleteDividendRate(
  assetId: string,
  year: number,
): Promise<void> {
  const user = await requireUser()
  await deleteContributionDividendRate(assetId, user.id, year)
  revalidatePath(`/assets/${assetId}/edit`)
  revalidatePath('/assets')
}
