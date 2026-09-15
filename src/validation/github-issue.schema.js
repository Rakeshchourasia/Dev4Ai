import { z } from "zod";
import { githubOwnerName, githubRepoName } from "./github-repo.schema.js";

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// ==========================================
// LIST REPO ISSUES QUERY SCHEMA
// ==========================================

export const listGithubIssuesQuerySchema = z.object({
  state: z
    .enum(["open", "closed", "all"], {
      errorMap: () => ({ message: 'state must be one of: "open", "closed", "all"' }),
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
});

// ==========================================
// IMPORT GITHUB ISSUE SCHEMA
// ==========================================

export const importGithubIssueSchema = z.object({
  issueNumber: z.coerce
    .number({
      required_error: "issueNumber is required",
      invalid_type_error: "issueNumber must be a number",
    })
    .int("issueNumber must be an integer")
    .positive("issueNumber must be positive"),

  squadId: z
    .string({ required_error: "squadId is required" })
    .regex(uuidRegex, "Invalid squad ID format"),

  sprintId: z
    .string({ required_error: "sprintId is required" })
    .regex(uuidRegex, "Invalid sprint ID format"),

  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "URGENT"], {
      errorMap: () => ({ message: 'priority must be one of: "LOW", "MEDIUM", "HIGH", "URGENT"' }),
    })
    .default("MEDIUM"),
});

// ==========================================
// CREATE GITHUB ISSUE FROM TICKET SCHEMA
// ==========================================

export const createIssueFromTicketSchema = z.object({
  owner: githubOwnerName.optional(),
  repo: githubRepoName.optional(),
  repositoryId: z.union([z.string(), z.number()]).optional(),
});

// ==========================================
// PARAM SCHEMAS
// ==========================================

export const ticketIdParamSchema = z.object({
  ticketId: z
    .string({ required_error: "ticketId is required" })
    .regex(uuidRegex, "Invalid ticket ID format"),
});

export const repoPathParamsSchema = z.object({
  owner: githubOwnerName,
  repo: githubRepoName,
});
