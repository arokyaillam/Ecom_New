ALTER TABLE "customers" ADD COLUMN "is_blocked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "blocked_at" timestamp;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "blocked_reason" text;