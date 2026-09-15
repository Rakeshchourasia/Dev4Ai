CREATE TABLE "github_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" varchar(100) NOT NULL,
	"event" varchar(100) NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "github_webhook_events_delivery_id_unique" ON "github_webhook_events" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "github_webhook_events_event_idx" ON "github_webhook_events" USING btree ("event");