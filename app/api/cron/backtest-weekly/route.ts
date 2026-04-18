import type { NextRequest } from 'next/server'

/**
 * 주간 백테스트 실행 cron.
 * vercel.json: '0 0 * * 0' = 일요일 09:00 KST (00:00 UTC).
 *
 * backtest 모듈 미구현 시 gracefully skip.
 * 모듈 구현 후 TODO 주석을 해제해 활성화.
 *
 * Auth: Authorization: Bearer {CRON_SECRET}.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // TODO: backtest 모듈 구현 후 아래 주석 해제
    // import { runAllBacktests } from '@/lib/robo-advisor/backtest'
    // await runAllBacktests()

    console.log('[cron/backtest-weekly] backtest module not yet implemented, skipping')
    return Response.json({ ok: true, skipped: 'backtest module not yet implemented' })
  } catch (error) {
    console.error('[cron/backtest-weekly] error:', error)
    return Response.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
