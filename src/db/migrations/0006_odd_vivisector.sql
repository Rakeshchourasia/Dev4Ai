CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'MEMBER');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'MEMBER' NOT NULL;