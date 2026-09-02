import {
  pgTable,
  uuid,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

import { squads } from "./squads.schema.js";
import { users } from "./users.schema.js";

export const squadMembers = pgTable(
  "squad_members",
  {
    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id, {
        onDelete: "cascade",
      }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [
        table.squadId,
        table.userId,
      ],
    }),

    userIdIdx: index("squad_members_user_id_idx")
      .on(table.userId),
  })
);