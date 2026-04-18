'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db'
import { updates } from '@/db/schema/updates'
import { createClient } from '@/utils/supabase/server'

const ADMIN_EMAIL = 'shuaihan77@gmail.com'

const updateSchema = z.object({
  version: z.string().min(1, '버전을 입력하세요').max(20),
  title: z.string().min(1, '제목을 입력하세요').max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)'),
  category: z.enum(['신기능', '개선', '버그수정', '보안']),
  items: z.array(z.string().min(1)).min(1, '항목을 하나 이상 입력하세요'),
})

export type UpdateFormValues = z.infer<typeof updateSchema>
export type UpdateActionError = { error: string }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.email !== ADMIN_EMAIL) throw new Error('Forbidden')
  return user
}

export async function createUpdate(data: UpdateFormValues): Promise<UpdateActionError | void> {
  await requireAdmin()
  const parsed = updateSchema.safeParse(data)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }
  await db.insert(updates).values(parsed.data)
  revalidatePath('/updates')
}
