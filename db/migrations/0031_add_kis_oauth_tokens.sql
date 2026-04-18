CREATE TABLE IF NOT EXISTS "kis_oauth_tokens" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"token_value" varchar(2048) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
