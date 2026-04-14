import { db } from '@/db'
import { goals } from '@/db/schema/goals'
import { asc, eq } from 'drizzle-orm'

export interface GoalRow {
  id: string
  name: string
  targetAmountKrw: number
  targetDate: string | null   // ISO date string "YYYY-MM-DD" or null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export async function listGoals(): Promise<GoalRow[]> {
  return db.select().from(goals).orderBy(asc(goals.createdAt))
}

export async function getGoalById(id: string): Promise<GoalRow | undefined> {
  const rows = await db.select().from(goals).where(eq(goals.id, id)).limit(1)
  return rows[0]
}
