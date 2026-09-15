CREATE TABLE "squad_github_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_id" uuid NOT NULL,
	"github_repository_id" varchar(50) NOT NULL,
	"github_repository_name" varchar(255) NOT NULL,
	"github_owner" varchar(100) NOT NULL,
	"github_full_name" varchar(255) NOT NULL,
	"github_url" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "squad_github_repositories" ADD CONSTRAINT "squad_github_repositories_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "squad_github_repositories_squad_repo_unique" ON "squad_github_repositories" USING btree ("squad_id","github_repository_id");--> statement-breakpoint
CREATE INDEX "squad_github_repositories_squad_id_idx" ON "squad_github_repositories" USING btree ("squad_id");--> statement-breakpoint
CREATE INDEX "squad_github_repositories_github_repo_id_idx" ON "squad_github_repositories" USING btree ("github_repository_id");