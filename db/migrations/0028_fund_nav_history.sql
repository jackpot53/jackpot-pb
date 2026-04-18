CREATE TABLE IF NOT EXISTS "fund_nav_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticker" varchar(32) NOT NULL,
  "nav_krw" bigint NOT NULL,
  "recorded_at" date NOT NULL,
  "source" varchar(16) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "fund_nav_history_ticker_date" UNIQUE("ticker", "recorded_at")
);
