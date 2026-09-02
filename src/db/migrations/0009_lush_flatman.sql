CREATE INDEX "sprints_squad_id_idx" ON "sprints" USING btree ("squad_id");--> statement-breakpoint
CREATE INDEX "sprints_status_idx" ON "sprints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "squad_members_user_id_idx" ON "squad_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "squads_company_id_idx" ON "squads" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "tickets_squad_id_idx" ON "tickets" USING btree ("squad_id");--> statement-breakpoint
CREATE INDEX "tickets_sprint_id_idx" ON "tickets" USING btree ("sprint_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tickets_created_by_idx" ON "tickets" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "tickets_assigned_to_idx" ON "tickets" USING btree ("assigned_to");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");