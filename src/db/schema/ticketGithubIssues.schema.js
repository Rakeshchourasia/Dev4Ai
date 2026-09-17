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

export const ticketGithubIssues = pgTable(
  "ticket_github_issues",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    // 1-to-1: Each DEVAI ticket can be mapped to at most one GitHub issue
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, {
        onDelete: "cascade",
      }),

    // Authoritative GitHub repository numeric ID stored as string
    githubRepositoryId: varchar("github_repository_id", {
      length: 50,
    }).notNull(),

    // Authoritative GitHub issue numeric ID (global node/id) stored as string
    githubIssueId: varchar("github_issue_id", {
      length: 50,
    }).notNull(),

    // Human-facing issue number within repo (e.g. 42 for #42)
    githubIssueNumber: integer("github_issue_number").notNull(),

    // Direct URL to the GitHub issue
    githubIssueUrl: varchar("github_issue_url", {
      length: 500,
    }).notNull(),

    // Issue state on GitHub: "open" | "closed"
    githubIssueState: varchar("github_issue_state", {
      length: 50,
    }).notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  },
  (table) => [

    // Enforce 1 GitHub issue per DEVAI ticket
    uniqueIndex("ticket_github_issues_ticket_id_unique")
      .on(table.ticketId),

    // Prevent linking the same GitHub issue to multiple DEVAI tickets
    uniqueIndex("ticket_github_issues_repo_issue_unique")
      .on(table.githubRepositoryId, table.githubIssueId),

    // Supporting index on issue number
    index("ticket_github_issues_issue_number_idx")
      .on(table.githubIssueNumber),
  ]
);
