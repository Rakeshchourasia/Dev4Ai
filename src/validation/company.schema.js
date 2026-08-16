import { z } from "zod";

export const createCompanySchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Company name must be at least 2 characters long",
    }),
});

export const updateCompanySchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Company name must be at least 2 characters long",
    }),
});