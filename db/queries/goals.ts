import { cache } from 'react'
import { db } from '@/db'
import { goals } from '@/db/schema/goals'
import { asc, eq, and } from 'drizzle-orm'

export interface GoalRow {
  id: string
  name: string
  targetAmountKrw: number
  targetDate: string | null   // ISO date string "YYYY-MM-DD" or null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export const listGoals = cache(async (userId: string): Promise<GoalRow[]> => {
  return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(asc(goals.createdAt))
})

export async function getGoalById(id: string, userId: string): Promise<GoalRow | undefined> {
  const rows = await db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId))).limit(1)
  return rows[0]
}
