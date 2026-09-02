import { z } from "zod";

export const createTicketSchema = z.object({
  squadId: z
    .string()
    .uuid("Invalid squad ID"),

  sprintId: z
    .string()
    .uuid("Invalid sprint ID"),

  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),

  description: z
    .string()
    .trim()
    .optional(),

  priority: z
    .enum([
      "LOW",
      "MEDIUM",
      "HIGH",
      "URGENT",
    ])
    .default("MEDIUM"),

  assignedTo: z
    .string()
    .uuid("Invalid assigned user ID")
    .nullable()
    .optional(),
});

export const updateTicketSchema = z.object({
  squadId: z
    .string()
    .uuid("Invalid squad ID")
    .optional(),

  sprintId: z
    .string()
    .uuid("Invalid sprint ID")
    .optional(),

  title: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .optional(),

  description: z
    .string()
    .trim()
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

  assignedTo: z
    .string()
    .uuid("Invalid assigned user ID")
    .nullable()
    .optional(),
});