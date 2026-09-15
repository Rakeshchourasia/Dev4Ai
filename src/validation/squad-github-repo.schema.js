import { z } from "zod";
import { githubOwnerName, githubRepoName } from "./github-repo.schema.js";

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// ==========================================
// LINK REPOSITORY BODY SCHEMA
// ==========================================

export const linkSquadGithubRepoSchema = z.object({
  githubRepositoryId: z.coerce
    .number({
      required_error: "githubRepositoryId is required",
      invalid_type_error: "githubRepositoryId must be a number",
    })
    .int("githubRepositoryId must be an integer")
    .positive("githubRepositoryId must be a positive number"),

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
