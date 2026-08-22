import { z } from "zod";

export const ticketQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10),

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
});