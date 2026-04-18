import { cache } from 'react'
import { db } from '@/db'
import { updates } from '@/db/schema/updates'
import { desc } from 'drizzle-orm'
import { InferSelectModel } from 'drizzle-orm'

export type UpdateRow = InferSelectModel<typeof updates>

export const getUpdates = cache(async (): Promise<UpdateRow[]> => {
  return db.select().from(updates).orderBy(desc(updates.date))
})
