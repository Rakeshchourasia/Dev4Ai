CREATE TABLE "github_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"github_user_id" varchar(50) NOT NULL,
	"github_username" varchar(255) NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scopes" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_connections" ADD CONSTRAINT "github_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "github_connections_user_id_unique" ON "github_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_connections_github_user_id_unique" ON "github_connections" USING btree ("github_user_id");--> statement-breakpoint
CREATE INDEX "github_connections_user_id_idx" ON "github_connections" USING btree ("user_id");