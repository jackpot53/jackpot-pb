/**
 * 코스피200 3년치 OHLC 백필 스크립트.
 * 사용법: DATABASE_URL=... npx tsx --env-file=.env.local scripts/backfill-ohlc.ts
 */
import { backfillUniverseHistory } from '../lib/robo-advisor/ohlc-collector'

async function main() {
  console.log('[backfill-ohlc] 3년치 일봉 백필 시작 (수 분 소요)...')
  await backfillUniverseHistory()
  console.log('[backfill-ohlc] 완료')
  process.exit(0)
}

main().catch((err) => {
  console.error('[backfill-ohlc] 오류:', err)
  process.exit(1)
})
