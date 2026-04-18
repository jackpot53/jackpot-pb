import type { NextRequest } from 'next/server'
import { runAllBacktests } from '@/lib/robo-advisor/backtest/runner'
import { writeBacktestStats } from '@/lib/robo-advisor/backtest/stats-writer'

/**
 * 주간 백테스트 실행 cron.
 * vercel.json: '0 0 * * 0' = 일요일 09:00 KST (00:00 UTC).
 * Auth: Authorization: Bearer {CRON_SECRET}.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const start = Date.now()
  try {
    const results = await runAllBacktests()
    await writeBacktestStats(results)

    return Response.json({
      ok: true,
      duration: Date.now() - start,
      combinations: results.length,
    })
  } catch (error) {
    console.error('[cron/backtest-weekly] error:', error)
    return Response.json({ ok: false, error: String(error), duration: Date.now() - start }, { status: 500 })
  }
}
