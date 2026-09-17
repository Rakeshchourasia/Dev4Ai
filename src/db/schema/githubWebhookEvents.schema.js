import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const githubWebhookEvents = pgTable(
  "github_webhook_events",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    // Authoritative delivery GUID from GitHub header X-GitHub-Delivery
    deliveryId: varchar("delivery_id", {
      length: 100,
    }).notNull(),

    // GitHub event type from header X-GitHub-Event (e.g. issues, pull_request, push)
    event: varchar("event", {
      length: 100,
    }).notNull(),

    // Whether this event has completed processing
    processed: boolean("processed")
      .default(false)
      .notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    processedAt: timestamp("processed_at"),
  },
  (table) => [

    // Idempotency: enforce delivery ID uniqueness across deliveries
    uniqueIndex("github_webhook_events_delivery_id_unique")
      .on(table.deliveryId),

    // Fast queries by event type
    index("github_webhook_events_event_idx")
      .on(table.event),
  ]
);
