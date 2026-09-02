import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema.js";
import { tickets } from "./tickets.schema.js";
import { squads } from "./squads.schema.js";
import { sprints } from "./sprints.schema.js";

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    action: varchar("action", {
      length: 100,
    }).notNull(),

    entityType: varchar("entity_type", {
      length: 50,
    }).notNull(),

    entityId: uuid("entity_id")
      .notNull(),

    description: text("description"),

    ticketId: uuid("ticket_id")
      .references(() => tickets.id, {
        onDelete: "cascade",
      }),

    squadId: uuid("squad_id")
      .references(() => squads.id, {
        onDelete: "cascade",
      }),

    sprintId: uuid("sprint_id")
      .references(() => sprints.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index(
      "activity_logs_user_id_idx"
    ).on(table.userId),

    ticketIdIdx: index(
      "activity_logs_ticket_id_idx"
    ).on(table.ticketId),

    squadIdIdx: index(
      "activity_logs_squad_id_idx"
    ).on(table.squadId),

    sprintIdIdx: index(
      "activity_logs_sprint_id_idx"
    ).on(table.sprintId),

    createdAtIdx: index(
      "activity_logs_created_at_idx"
    ).on(table.createdAt),
  })
);