import { z } from "zod";
import { githubOwnerName, githubRepoName } from "./github-repo.schema.js";

const uuidRegex =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// ==========================================
// LIST REPO PULL REQUESTS QUERY SCHEMA
// ==========================================

export const listGithubPullsQuerySchema = z.object({
  state: z
    .enum(["open", "closed", "all"], {
      errorMap: () => ({
        message: 'state must be one of: "open", "closed", "all"',
      }),
    })
    .default("open"),

  page: z.coerce
    .number({ invalid_type_error: "page must be a number" })
    .int("page must be an integer")
    .min(1, "page must be at least 1")
    .default(1),

  perPage: z.coerce
    .number({ invalid_type_error: "perPage must be a number" })
    .int("perPage must be an integer")
    .min(1, "perPage must be at least 1")
    .max(100, "perPage must be at most 100")
    .default(30),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),

  sort: z
    .enum(["created", "updated", "popularity", "long-running"], {
      errorMap: () => ({
        message:
          'sort must be one of: "created", "updated", "popularity", "long-running"',
      }),
    })
    .default("created"),

  direction: z
    .enum(["asc", "desc"], {
      errorMap: () => ({
        message: 'direction must be one of: "asc", "desc"',
      }),
    })
    .default("desc"),

  head: z.string().optional(),
  base: z.string().optional(),
});

// ==========================================
// PULL NUMBER PATH PARAM SCHEMA
// ==========================================

export const pullNumberParamSchema = z.object({
  owner: githubOwnerName,
  repo: githubRepoName,
  pullNumber: z.coerce
    .number({
      required_error: "pullNumber is required",
      invalid_type_error: "pullNumber must be a number",
    })
    .int("pullNumber must be an integer")
    .positive("pullNumber must be positive"),
});

// ==========================================
// LINK TICKET GITHUB PR BODY SCHEMA
// ==========================================

export const linkTicketGithubPrSchema = z.object({
  pullNumber: z.coerce
    .number({
      required_error: "pullNumber is required",
      invalid_type_error: "pullNumber must be a number",
    })
    .int("pullNumber must be an integer")
    .positive("pullNumber must be positive"),

  owner: githubOwnerName.optional(),
  repo: githubRepoName.optional(),
  repositoryId: z.union([z.string(), z.number()]).optional(),
});

// ==========================================
// TICKET ID PARAM SCHEMA
// ==========================================

export const ticketIdParamSchema = z.object({
  ticketId: z
    .string({ required_error: "ticketId is required" })
    .regex(uuidRegex, "Invalid ticket ID format"),
});
