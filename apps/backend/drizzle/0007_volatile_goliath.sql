ALTER TABLE "staff_invitations" ADD COLUMN "permissions" json;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "permissions" json;