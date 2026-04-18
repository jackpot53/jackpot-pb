/**
 * 코스피200 유니버스 초기 시드 스크립트.
 *
 * 사용법:
 *   npx tsx scripts/seed-universe.ts
 *
 * data/kospi200-seed.json을 읽어 universe_stocks 테이블에 upsert.
 * ticker는 Yahoo Finance 형식 (${code}.KS).
 * 이미 존재하는 종목은 이름·섹터만 갱신 (시가총액·순위는 유지).
 */

import 'dotenv/config'
import path from 'path'
import fs from 'fs/promises'
import { upsertUniverseStock } from '../db/queries/robo-advisor'

type SeedEntry = {
  code: string
  name: string
  market: 'KOSPI' | 'KOSDAQ'
  sector?: string
}

async function main() {
  const seedPath = path.resolve(process.cwd(), 'data/kospi200-seed.json')
  const raw = await fs.readFile(seedPath, 'utf-8')
  const seeds: SeedEntry[] = JSON.parse(raw)

  console.log(`[seed-universe] seeding ${seeds.length} stocks...`)

  let success = 0
  let failed = 0

  for (const s of seeds) {
    const ticker = `${s.code}.KS`
    try {
      await upsertUniverseStock({
        ticker,
        code: s.code,
        name: s.name,
        market: s.market,
        sector: s.sector ?? null,
      })
      console.log(`  ✓ ${ticker} — ${s.name}`)
      success++
    } catch (err) {
      console.error(`  ✗ ${ticker} — ${s.name}:`, err)
      failed++
    }
  }

  console.log(`\n[seed-universe] done — success=${success}, failed=${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[seed-universe] fatal error:', err)
  process.exit(1)
})
