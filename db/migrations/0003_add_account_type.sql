DO $$ BEGIN
  CREATE TYPE "public"."account_type" AS ENUM('isa', 'irp', 'pension', 'dc', 'brokerage');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "account_type" "account_type";
