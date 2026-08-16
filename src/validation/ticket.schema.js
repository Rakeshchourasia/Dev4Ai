import { z } from "zod";

const status = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
];

const priority = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

export const createTicketSchema = z.object({
  squadId: z.string().uuid({
    message: "Invalid squad ID",
  }),

  sprintId: z.string().uuid({
    message: "Invalid sprint ID",
  }),

  title: z
    .string()
    .min(2, {
      message: "Ticket title must be at least 2 characters long",
    }),

  description: z
    .string()
    .optional(),

  priority: z
    .enum(priority)
    .optional(),

  createdBy: z.string().uuid({
    message: "Invalid creator user ID",
  }),

  assignedTo: z
    .string()
    .uuid({
      message: "Invalid assigned user ID",
    })
    .optional(),
});

export const updateTicketSchema = z.object({
  title: z
    .string()
    .min(2)
    .optional(),

  description: z
    .string()
    .optional(),

  status: z
    .enum(status)
    .optional(),

  priority: z
    .enum(priority)
    .optional(),

  assignedTo: z
    .string()
    .uuid({
      message: "Invalid assigned user ID",
    })
    .nullable()
    .optional(),
});