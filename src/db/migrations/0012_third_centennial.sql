CREATE TABLE "user_auth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"provider_email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_auth_accounts" ADD CONSTRAINT "user_auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_auth_accounts_provider_account_unique" ON "user_auth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "user_auth_accounts_user_id_idx" ON "user_auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_auth_accounts_provider_email_idx" ON "user_auth_accounts" USING btree ("provider_email");