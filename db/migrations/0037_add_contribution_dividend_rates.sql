CREATE TABLE "public"."contribution_dividend_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "asset_id" uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  "user_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "rate_bp" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("asset_id", "year")
);
