import { z } from "zod";

// ==========================================
// GITHUB OWNER / REPO NAME HELPERS
// ==========================================

/**
 * GitHub owner/org names: alphanumeric + hyphens, must start with alphanumeric.
 * Max 39 chars (GitHub hard limit).
 * Prevent path traversal and special characters.
 */
const githubOwnerName = z
  .string({ error: "Owner name is required" })
  .min(1, "Owner name is required")
  .max(39, "Owner name must be at most 39 characters")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9\-]*$/,
    "Owner name must start with a letter or digit and contain only letters, digits, or hyphens"
  )
  .refine((val) => !val.endsWith("-"), "Owner name cannot end with a hyphen")
  .refine((val) => !val.includes(".."), "Owner name cannot contain consecutive dots");

/**
 * GitHub repository names: alphanumeric, hyphens, underscores, dots.
 * Max 100 chars (GitHub hard limit).
 * Must start with alphanumeric.
 * Cannot contain path traversal or end with ".git".
 */
const githubRepoName = z
  .string({ error: "Repository name is required" })
  .min(1, "Repository name is required")
  .max(100, "Repository name must be at most 100 characters")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9\-_.]*$/,
    "Repository name must start with a letter or digit and contain only letters, digits, hyphens, underscores, or dots"
  )
  .refine((val) => !val.includes(".."), "Repository name cannot contain '..'")
  .refine((val) => !val.endsWith(".git"), "Repository name cannot end with .git");

// ==========================================
// LIST REPOSITORIES QUERY SCHEMA
// ==========================================

export const githubRepoListQuerySchema = z.object({
  // Filter by organization login (optional — if omitted, lists all user repos)
  organization: z
    .string()
    .min(1)
    .max(39)
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9\-]*$/,
      "Organization name must start with a letter or digit and contain only letters, digits, or hyphens"
    )
    .refine((val) => !val.endsWith("-"), "Organization name cannot end with a hyphen")
    .optional(),

  // Visibility filter
  visibility: z
    .enum(["all", "public", "private"], {
      error: "visibility must be one of: all, public, private",
    })
    .default("all"),

  // Pagination — use "perPage" in the API, also accept "limit"
  page: z.coerce
    .number({ error: "page must be a number" })
    .int("page must be an integer")
    .min(1, "page must be at least 1")
    .default(1),

  perPage: z.coerce
    .number({ error: "perPage must be a number" })
    .int("perPage must be an integer")
    .min(1, "perPage must be at least 1")
    .max(100, "perPage must be at most 100")
    .default(30),

  limit: z.coerce
    .number({ error: "limit must be a number" })
    .int("limit must be an integer")
    .min(1, "limit must be at least 1")
    .max(100, "limit must be at most 100")
    .optional(),
});

// ==========================================
// SINGLE REPOSITORY PARAMS SCHEMA
// ==========================================

export const githubRepoParamSchema = z.object({
  owner: githubOwnerName,
  repo: githubRepoName,
});

export { githubOwnerName, githubRepoName };
