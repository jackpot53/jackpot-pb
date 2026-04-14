'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db'
import { goals } from '@/db/schema/goals'
import { eq } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'

const goalSchema = z.object({
  name: z.string().min(1, '목표 이름을 입력하세요').max(255),
  targetAmountKrw: z.coerce.number().int().min(1, '올바른 금액을 입력하세요 (1원 이상의 숫자)'),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식으로 입력하세요 (YYYY-MM-DD)')
    .optional()
    .nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export type GoalFormValues = z.infer<typeof goalSchema>
export type GoalActionError = { error: string }

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function createGoal(data: GoalFormValues): Promise<GoalActionError | void> {
  await requireUser()
  const parsed = goalSchema.safeParse(data)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }
  const { targetDate, notes, ...rest } = parsed.data
  await db.insert(goals).values({
    ...rest,
    targetDate: targetDate ?? null,
    notes: notes ?? null,
  })
  revalidatePath('/goals')
  revalidatePath('/')   // Dashboard goals section cache
}

export async function updateGoal(
  id: string,
  data: GoalFormValues
): Promise<GoalActionError | void> {
  await requireUser()
  const parsed = goalSchema.safeParse(data)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }
  const { targetDate, notes, ...rest } = parsed.data
  await db.update(goals).set({
    ...rest,
    targetDate: targetDate ?? null,
    notes: notes ?? null,
  }).where(eq(goals.id, id))
  revalidatePath('/goals')
  revalidatePath('/')   // Dashboard goals section cache
}

export async function deleteGoal(id: string): Promise<GoalActionError | void> {
  await requireUser()
  if (!id) return { error: '목표 ID가 없습니다.' }
  await db.delete(goals).where(eq(goals.id, id))
  revalidatePath('/goals')
  revalidatePath('/')   // Dashboard goals section cache
}
