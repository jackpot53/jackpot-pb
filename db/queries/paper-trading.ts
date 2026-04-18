import { db } from '@/db'
import { paperTradingPositions } from '@/db/schema/paper-trading-positions'
import { eq, and } from 'drizzle-orm'

export async function createPaperTradingPosition({
  userId,
  ticker,
  stockName,
  entryPrice,
  entryDate,
}: {
  userId: string
  ticker: string
  stockName: string
  entryPrice: number
  entryDate: string
}) {
  const result = await db
    .insert(paperTradingPositions)
    .values({
      userId,
      ticker,
      stockName,
      entryPrice,
      entryDate,
      quantity: 1,
    })
    .returning({ id: paperTradingPositions.id })

  return result[0]?.id
}

export async function getPaperTradingPositions(userId: string) {
  return db
    .select()
    .from(paperTradingPositions)
    .where(
      and(
        eq(paperTradingPositions.userId, userId),
        eq(paperTradingPositions.status, 'open'),
      ),
    )
    .orderBy(paperTradingPositions.createdAt)
}
