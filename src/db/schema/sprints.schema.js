import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

import { squads } from "./squads.schema.js";

export const sprintStatusEnum = pgEnum("sprint_status", [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
]);

export const sprints = pgTable(
  "sprints",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    status: sprintStatusEnum("status")
      .default("PLANNED")
      .notNull(),

    startDate: timestamp("start_date")
      .notNull(),

    endDate: timestamp("end_date")
      .notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    squadIdIdx: index("sprints_squad_id_idx")
      .on(table.squadId),

    statusIdx: index("sprints_status_idx")
      .on(table.status),
  })
);