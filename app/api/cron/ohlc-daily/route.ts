import type { NextRequest } from 'next/server'
import { updateDailyHistory } from '@/lib/robo-advisor/ohlc-collector'
import { updateUniverseRanks } from '@/lib/robo-advisor/market-cap'

/**
 * 평일 장 마감 후 OHLC 증분 수집 + 시가총액 갱신 cron.
 * vercel.json: '30 7 * * 1-5' = 평일 16:30 KST (07:30 UTC).
 *
 * 순서:
 *   1. updateDailyHistory()  — 최근 5거래일 OHLC upsert
 *   2. updateUniverseRanks() — 시가총액 갱신 + rank 재계산
 *   3. evaluateAllSignals()  — 신호 평가 (signals 모듈 구현 전 skip)
 *
 * Auth: Authorization: Bearer {CRON_SECRET} — snapshot/route.ts와 동일 패턴.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const start = Date.now()

  try {
    // Step 1: 최근 5 거래일 OHLC 증분 수집
    let ohlcStats: { success: number; failed: number } = { success: 0, failed: 0 }
    try {
      await updateDailyHistory()
      // updateDailyHistory는 내부에서 collectAllOhlc를 호출하므로
      // 집계 통계는 로그에서만 확인 가능
      ohlcStats = { success: -1, failed: 0 }  // exact counts logged internally
    } catch (err) {
      console.error('[cron/ohlc-daily] updateDailyHistory error:', err)
      ohlcStats = { success: 0, failed: -1 }
    }

    // Step 2: 시가총액 갱신 + rank 재계산
    try {
      await updateUniverseRanks()
    } catch (err) {
      console.error('[cron/ohlc-daily] updateUniverseRanks error:', err)
    }

    // Step 3: evaluateAllSignals — signals 모듈 미구현, 추후 추가
    // TODO: import { evaluateAllSignals } from '@/lib/robo-advisor/signals'
    //       await evaluateAllSignals()

    const duration = Date.now() - start

    return Response.json({
      ok: true,
      duration,
      stats: ohlcStats,
    })
  } catch (error) {
    console.error('[cron/ohlc-daily] unexpected error:', error)
    return Response.json(
      { ok: false, error: String(error), duration: Date.now() - start },
      { status: 500 },
    )
  }
}
