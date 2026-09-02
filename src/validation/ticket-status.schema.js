import { z } from "zod";

export const updateTicketStatusSchema = z.object({
  status: z.enum([
    "TODO",
    "IN_PROGRESS",
    "DONE",
  ]),
});