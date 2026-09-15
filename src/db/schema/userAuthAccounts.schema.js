import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema.js";

export const userAuthAccounts = pgTable(
  "user_auth_accounts",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    provider: varchar("provider", {
      length: 50,
    }).notNull(),

    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),

    providerEmail: varchar("provider_email", {
      length: 255,
    }),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    providerAccountUnique: uniqueIndex(
      "user_auth_accounts_provider_account_unique"
    ).on(table.provider, table.providerAccountId),

    userIdIdx: index("user_auth_accounts_user_id_idx").on(table.userId),

    providerEmailIdx: index("user_auth_accounts_provider_email_idx").on(
      table.providerEmail
    ),
  })
);
