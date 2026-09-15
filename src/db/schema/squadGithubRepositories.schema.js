import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { squads } from "./squads.schema.js";

export const squadGithubRepositories = pgTable(
  "squad_github_repositories",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    // FK -> squads.id (cascade deletion if squad is removed)
    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id, {
        onDelete: "cascade",
      }),

    // GitHub numeric repository ID stored as varchar
    githubRepositoryId: varchar("github_repository_id", {
      length: 50,
    }).notNull(),

    githubRepositoryName: varchar("github_repository_name", {
      length: 255,
    }).notNull(),

    githubOwner: varchar("github_owner", {
      length: 100,
    }).notNull(),

    githubFullName: varchar("github_full_name", {
      length: 255,
    }).notNull(),

    githubUrl: varchar("github_url", {
      length: 500,
    }).notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Prevent duplicate linking of the same GitHub repository to the same squad
    squadRepoUnique: uniqueIndex("squad_github_repositories_squad_repo_unique")
      .on(table.squadId, table.githubRepositoryId),

    // Lookup index on squadId for listing squad repos
    squadIdIdx: index("squad_github_repositories_squad_id_idx")
      .on(table.squadId),

    // Lookup index on githubRepositoryId for checking links across squads
    githubRepoIdIdx: index("squad_github_repositories_github_repo_id_idx")
      .on(table.githubRepositoryId),
  })
);
