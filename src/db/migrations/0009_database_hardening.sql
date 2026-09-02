CREATE UNIQUE INDEX "sprints_one_active_per_squad_idx"
ON "sprints" ("squad_id")
WHERE "status" = 'ACTIVE';

--> statement-breakpoint

CREATE INDEX "refresh_tokens_user_id_idx"
ON "refresh_tokens" ("user_id");