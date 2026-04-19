CREATE TABLE "public"."contribution_details" (
  "asset_id" uuid PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  "user_id" uuid NOT NULL,
  "deposit_date" date,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
