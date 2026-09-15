CREATE TABLE "ticket_github_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"github_repository_id" varchar(50) NOT NULL,
	"github_issue_id" varchar(50) NOT NULL,
	"github_issue_number" integer NOT NULL,
	"github_issue_url" varchar(500) NOT NULL,
	"github_issue_state" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_github_issues" ADD CONSTRAINT "ticket_github_issues_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_github_issues_ticket_id_unique" ON "ticket_github_issues" USING btree ("ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_github_issues_repo_issue_unique" ON "ticket_github_issues" USING btree ("github_repository_id","github_issue_id");--> statement-breakpoint
CREATE INDEX "ticket_github_issues_issue_number_idx" ON "ticket_github_issues" USING btree ("github_issue_number");