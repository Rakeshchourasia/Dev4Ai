import { z } from "zod";

export const ticketQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),

  status: z
    .enum([
      "TODO",
      "IN_PROGRESS",
      "DONE",
    ])
    .optional(),

  priority: z
    .enum([
      "LOW",
      "MEDIUM",
      "HIGH",
      "URGENT",
    ])
    .optional(),

  sortBy: z
    .enum([
      "title",
      "priority",
      "status",
      "createdAt",
      "updatedAt",
    ])
    .optional(),

  sortOrder: z
    .enum([
      "asc",
      "desc",
    ])
    .optional(),
});