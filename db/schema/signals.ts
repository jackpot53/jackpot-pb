import { pgTable, varchar, boolean, date, integer, jsonb, pgEnum, primaryKey } from 'drizzle-orm/pg-core'

export const signalTypeEnum = pgEnum('signal_type', [
  'golden_cross',
  'rsi_oversold_bounce',
  'macd_cross',
  'volume_breakout',
  'bollinger_breakout',
  'stochastic_oversold',
  'adx_trend',
  'composite',
])

// Per-ticker signal state, upserted daily by the OHLC cron job.
// One row per (ticker, signalType). triggered=true means signal fired today.
export const signals = pgTable('signals', {
  ticker: varchar('ticker', { length: 20 }).notNull(),
  signalType: signalTypeEnum('signal_type').notNull(),
  triggered: boolean('triggered').notNull().default(false),
  triggeredAt: date('triggered_at'),              // 가장 최근 발생일
  // confidence: 0~100, composite 시그널에서만 유효 (복합 점수)
  confidence: integer('confidence'),
  // detail: 지표 값 스냅샷 (RSI 값, MACD 값 등), JSON
  detail: jsonb('detail'),
}, (t) => [
  primaryKey({ columns: [t.ticker, t.signalType] }),
])
