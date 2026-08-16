import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";

import { companies } from "./companies.schema.js";

export const squads = pgTable("squads", {
  id: uuid("id")
    .defaultRandom()
    .primaryKey(),

  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),

  name: varchar("name", {
    length: 255,
  }).notNull(),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
});