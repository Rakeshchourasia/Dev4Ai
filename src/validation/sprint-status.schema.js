import { z } from "zod";

export const updateSprintStatusSchema = z.object({
  status: z.enum([
    "PLANNED",
    "ACTIVE",
    "COMPLETED",
  ]),
});