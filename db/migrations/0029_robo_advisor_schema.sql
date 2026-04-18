-- 로보어드바이저: 코스피 200 유니버스, OHLC 히스토리, 시그널, 백테스트 통계

CREATE TYPE "public"."kr_market" AS ENUM('KOSPI', 'KOSDAQ');
CREATE TYPE "public"."signal_type" AS ENUM(
  'golden_cross',
  'rsi_oversold_bounce',
  'macd_cross',
  'volume_breakout',
  'bollinger_breakout',
  'stochastic_oversold',
  'adx_trend',
  'composite'
);

-- 코스피/코스닥 유니버스 종목 마스터
CREATE TABLE "universe_stocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticker" varchar(20) NOT NULL,
  "code" varchar(6) NOT NULL,
  "name" varchar(100) NOT NULL,
  "market" "kr_market" NOT NULL,
  "sector" varchar(50),
  "market_cap_krw" bigint,
  "rank" integer,
  "is_active" boolean NOT NULL DEFAULT true,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "universe_stocks_ticker" UNIQUE("ticker")
);

-- 일봉 OHLC 가격 히스토리 (원화 정수)
CREATE TABLE "price_history" (
  "ticker" varchar(20) NOT NULL,
  "date" date NOT NULL,
  "open" bigint NOT NULL,
  "high" bigint NOT NULL,
  "low" bigint NOT NULL,
  "close" bigint NOT NULL,
  "volume" bigint,
  PRIMARY KEY ("ticker", "date")
);

-- 시그널 상태 (일일 upsert, ticker × signal_type)
CREATE TABLE "signals" (
  "ticker" varchar(20) NOT NULL,
  "signal_type" "signal_type" NOT NULL,
  "triggered" boolean NOT NULL DEFAULT false,
  "triggered_at" date,
  "confidence" integer,
  "detail" jsonb,
  PRIMARY KEY ("ticker", "signal_type")
);

-- 시그널별 백테스트 통계 (주간 갱신)
CREATE TABLE "signal_backtest_stats" (
  "signal_type" varchar(40) NOT NULL,
  "holding_days" integer NOT NULL,
  "sample_count" integer NOT NULL,
  "win_rate_bps" integer NOT NULL,
  "avg_return_bps" integer NOT NULL,
  "median_return_bps" integer NOT NULL,
  "max_drawdown_bps" integer NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("signal_type", "holding_days")
);

-- 인덱스: ticker 별 시세 히스토리 최신 날짜 조회용
CREATE INDEX "price_history_ticker_date_idx" ON "price_history" ("ticker", "date" DESC);
-- 인덱스: 발동된 시그널 빠른 조회
CREATE INDEX "signals_triggered_idx" ON "signals" ("triggered") WHERE "triggered" = true;
