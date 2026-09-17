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

    // ==========================================
    // AUDIT RETENTION DESIGN
    //
    // ticketId / squadId / sprintId are nullable
    // soft-references: SET NULL on delete so that
    // audit history survives entity deletion.
    //
    // entityType + entityId + description always
    // preserve the historical context even after
    // the entity is gone.
    // ==========================================

    ticketId: uuid("ticket_id")
      .references(() => tickets.id, {
        onDelete: "set null",
      }),

    squadId: uuid("squad_id")
      .references(() => squads.id, {
        onDelete: "set null",
      }),

    sprintId: uuid("sprint_id")
      .references(() => sprints.id, {
        onDelete: "set null",
      }),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => [

    index(
      "activity_logs_user_id_idx"
    ).on(table.userId),

    index(
      "activity_logs_ticket_id_idx"
    ).on(table.ticketId),

    index(
      "activity_logs_squad_id_idx"
    ).on(table.squadId),

    index(
      "activity_logs_sprint_id_idx"
    ).on(table.sprintId),

    index(
      "activity_logs_created_at_idx"
    ).on(table.createdAt),
  ]
);