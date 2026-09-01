import { z } from "zod";

export const sprintQuerySchema = z.object({
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
      "PLANNED",
      "ACTIVE",
      "COMPLETED",
    ])
    .optional(),

  sortBy: z
    .enum([
      "name",
      "startDate",
      "endDate",
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