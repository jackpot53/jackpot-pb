CREATE TYPE "public"."currency" AS ENUM('KRW', 'USD');--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "currency" TYPE "public"."currency" USING "currency"::"public"."currency";--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "currency" TYPE "public"."currency" USING "currency"::"public"."currency";--> statement-breakpoint
ALTER TABLE "manual_valuations" ALTER COLUMN "currency" TYPE "public"."currency" USING "currency"::"public"."currency";--> statement-breakpoint
ALTER TABLE "price_cache" ALTER COLUMN "currency" TYPE "public"."currency" USING "currency"::"public"."currency";
