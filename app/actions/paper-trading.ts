'use server'

import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { getUniverseStock, getPriceHistory } from '@/db/queries/robo-advisor'
import { createPaperTradingPosition } from '@/db/queries/paper-trading'

export async function startPaperTrading(ticker: string) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return { error: '로그인이 필요합니다.' }
    }

    const stock = await getUniverseStock(ticker)
    if (!stock) {
      return { error: '종목을 찾을 수 없습니다.' }
    }

    const priceHistory = await getPriceHistory(ticker, 1)
    if (!priceHistory || priceHistory.length === 0) {
      return { error: '금일 가격 정보를 찾을 수 없습니다.' }
    }

    const latestPrice = priceHistory[0]
    await createPaperTradingPosition({
      userId: user.id,
      ticker,
      stockName: stock.name,
      entryPrice: Number(latestPrice.close),
      entryDate: latestPrice.date,
    })
  } catch (error) {
    console.error('startPaperTrading error:', error)
    return { error: '모의투자 시작에 실패했습니다.' }
  }

  redirect('/paper-trading')
}
