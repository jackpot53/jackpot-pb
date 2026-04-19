CREATE TABLE IF NOT EXISTS "kis_ws_approval" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"approval_key" varchar(512) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
