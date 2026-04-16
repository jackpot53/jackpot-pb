ALTER TABLE "holdings" ADD COLUMN IF NOT EXISTS "avg_exchange_rate_at_time" BIGINT DEFAULT NULL;
