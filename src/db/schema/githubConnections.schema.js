import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema.js";

export const githubConnections = pgTable(
  "github_connections",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    // FK → users.id  (one connection per DEVAI user)
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    // GitHub's numeric user ID stored as a string
    githubUserId: varchar("github_user_id", {
      length: 50,
    }).notNull(),

    githubUsername: varchar("github_username", {
      length: 255,
    }).notNull(),

    // AES-256-GCM encrypted JSON: "{iv}:{authTag}:{ciphertext}" (all base64)
    // NEVER store plaintext tokens
    accessTokenEncrypted: text("access_token_encrypted").notNull(),

    // Nullable — GitHub classic tokens don't have a refresh token
    refreshTokenEncrypted: text("refresh_token_encrypted"),

    accessTokenExpiresAt: timestamp("access_token_expires_at"),

    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),

    // Space-separated OAuth scopes (e.g. "read:user user:email")
    scopes: varchar("scopes", {
      length: 500,
    }),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Each DEVAI user can have at most one GitHub connection
    userIdUnique: uniqueIndex(
      "github_connections_user_id_unique"
    ).on(table.userId),

    // Each GitHub account can be connected to at most one DEVAI user
    githubUserIdUnique: uniqueIndex(
      "github_connections_github_user_id_unique"
    ).on(table.githubUserId),

    // Supporting index for lookups by userId
    userIdIdx: index("github_connections_user_id_idx").on(table.userId),
  })
);
