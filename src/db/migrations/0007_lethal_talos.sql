CREATE TYPE "public"."sprint_status" AS ENUM('PLANNED', 'ACTIVE', 'COMPLETED');--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "status" "sprint_status" DEFAULT 'PLANNED' NOT NULL;