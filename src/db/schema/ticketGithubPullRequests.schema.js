import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { tickets } from "./tickets.schema.js";

export const ticketGithubPullRequests = pgTable(
  "ticket_github_pull_requests",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    // Ticket to which this GitHub PR is linked
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, {
        onDelete: "cascade",
      }),

    // Authoritative GitHub repository numeric ID stored as string
    githubRepositoryId: varchar("github_repository_id", {
      length: 50,
    }).notNull(),

    // Authoritative GitHub PR numeric ID (global node/id) stored as string
    githubPrId: varchar("github_pr_id", {
      length: 50,
    }).notNull(),

    // Human-facing PR number within repo (e.g. 101 for #101)
    githubPrNumber: integer("github_pr_number").notNull(),

    // Direct URL to the GitHub pull request
    githubPrUrl: varchar("github_pr_url", {
      length: 500,
    }).notNull(),

    // PR state on GitHub: "open" | "closed"
    state: varchar("state", {
      length: 50,
    }).notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Prevent linking the exact same GitHub PR to the same ticket multiple times
    ticketRepoPrUnique: uniqueIndex("ticket_github_prs_unique")
      .on(table.ticketId, table.githubRepositoryId, table.githubPrId),

    // Fast lookup for all PRs linked to a ticket
    ticketIdIdx: index("ticket_github_prs_ticket_id_idx")
      .on(table.ticketId),

    // Supporting index on PR number
    prNumberIdx: index("ticket_github_prs_number_idx")
      .on(table.githubPrNumber),
  })
);
