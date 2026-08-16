import { z } from "zod";

export const createSquadSchema = z.object({
  companyId: z.string().uuid({
    message: "Invalid company ID",
  }),

  name: z
    .string()
    .min(2, {
      message: "Squad name must be at least 2 characters long",
    }),
});

export const updateSquadSchema = z.object({
  companyId: z
    .string()
    .uuid({
      message: "Invalid company ID",
    })
    .optional(),

  name: z
    .string()
    .min(2, {
      message: "Squad name must be at least 2 characters long",
    })
    .optional(),
});