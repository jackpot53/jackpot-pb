CREATE TYPE "public"."paper_trading_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "kis_oauth_tokens" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"token_value" varchar(2048) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
