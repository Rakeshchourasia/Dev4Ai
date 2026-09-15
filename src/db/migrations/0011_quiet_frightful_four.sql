-- ============================================================
-- Migration 0011: Audit Log Retention + Missing Indexes
--
-- 1. Change activity_logs FK onDelete from CASCADE -> SET NULL
--    for ticket_id, squad_id, sprint_id
--    (preserves audit history when entities are deleted)
--
-- 2. Add refresh_tokens user_id index
--    (was in orphan 0009_database_hardening.sql, never applied)
--
-- 3. Add unique partial index for one ACTIVE sprint per squad
--    (was in orphan 0009_database_hardening.sql, never applied)
--    Note: Drizzle cannot generate partial indexes - added manually
-- ============================================================

ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_ticket_id_tickets_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_squad_id_squads_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_sprint_id_sprints_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sprints_one_active_per_squad_idx" ON "sprints" ("squad_id") WHERE "status" = 'ACTIVE';