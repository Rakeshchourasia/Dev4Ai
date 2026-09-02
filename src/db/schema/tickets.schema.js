import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema.js";
import { squads } from "./squads.schema.js";
import { sprints } from "./sprints.schema.js";

export const ticketStatusEnum = pgEnum(
  "ticket_status",
  [
    "TODO",
    "IN_PROGRESS",
    "DONE",
  ]
);

export const ticketPriorityEnum = pgEnum(
  "ticket_priority",
  [
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
  ]
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id),

    sprintId: uuid("sprint_id")
      .notNull()
      .references(() => sprints.id),

    title: varchar("title", {
      length: 255,
    }).notNull(),

    description: text("description"),

    status: ticketStatusEnum("status")
      .default("TODO")
      .notNull(),

    priority: ticketPriorityEnum("priority")
      .default("MEDIUM")
      .notNull(),

    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),

    assignedTo: uuid("assigned_to")
      .references(() => users.id),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    squadIdIdx: index("tickets_squad_id_idx")
      .on(table.squadId),

    sprintIdIdx: index("tickets_sprint_id_idx")
      .on(table.sprintId),

    statusIdx: index("tickets_status_idx")
      .on(table.status),

    priorityIdx: index("tickets_priority_idx")
      .on(table.priority),

    createdByIdx: index("tickets_created_by_idx")
      .on(table.createdBy),

    assignedToIdx: index("tickets_assigned_to_idx")
      .on(table.assignedTo),
  })
);