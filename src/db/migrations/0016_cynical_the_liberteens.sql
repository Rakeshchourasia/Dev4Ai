CREATE TABLE "ticket_github_pull_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"github_repository_id" varchar(50) NOT NULL,
	"github_pr_id" varchar(50) NOT NULL,
	"github_pr_number" integer NOT NULL,
	"github_pr_url" varchar(500) NOT NULL,
	"state" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_github_pull_requests" ADD CONSTRAINT "ticket_github_pull_requests_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_github_prs_unique" ON "ticket_github_pull_requests" USING btree ("ticket_id","github_repository_id","github_pr_id");--> statement-breakpoint
CREATE INDEX "ticket_github_prs_ticket_id_idx" ON "ticket_github_pull_requests" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_github_prs_number_idx" ON "ticket_github_pull_requests" USING btree ("github_pr_number");