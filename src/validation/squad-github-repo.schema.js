import { z } from "zod";
import { githubOwnerName, githubRepoName } from "./github-repo.schema.js";

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// ==========================================
// LINK REPOSITORY BODY SCHEMA
// ==========================================

export const linkSquadGithubRepoSchema = z.object({
  githubRepositoryId: z.coerce
    .string({
      error: "githubRepositoryId is required",
    })
    .min(1, "githubRepositoryId cannot be empty"),

  owner: githubOwnerName,
  repo: githubRepoName,
});

// ==========================================
// ROUTE PARAM SCHEMAS
// ==========================================

export const squadGithubRepoParamsSchema = z.object({
  squadId: z
    .string()
    .regex(uuidRegex, "Invalid squad ID format"),
});

export const deleteSquadGithubRepoParamsSchema = z.object({
  squadId: z
    .string()
    .regex(uuidRegex, "Invalid squad ID format"),
  id: z
    .string()
    .regex(uuidRegex, "Invalid repository link ID format"),
});
