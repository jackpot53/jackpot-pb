CREATE TYPE "public"."paper_trading_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."update_category" AS ENUM('신기능', '개선', '버그수정', '보안');--> statement-breakpoint
CREATE TABLE "paper_trading_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"stock_name" varchar(100) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"entry_price" bigint NOT NULL,
	"entry_date" varchar(10) NOT NULL,
	"status" "paper_trading_status" DEFAULT 'open' NOT NULL,
	"exit_price" bigint,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"date" date NOT NULL,
	"category" "update_category" NOT NULL,
	"items" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "assets_user_id_idx" ON "assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "manual_valuations_asset_id_idx" ON "manual_valuations" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "transactions_asset_id_idx" ON "transactions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");