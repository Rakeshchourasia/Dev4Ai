import { z } from "zod";

// ==========================================
// CREATE TICKET
// ==========================================

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
    .min(1, "Ticket title is required")
    .max(
      255,
      "Ticket title must not exceed 255 characters"
    ),

  description: z
    .string()
    .trim()
    .max(
      5000,
      "Ticket description must not exceed 5000 characters"
    )
    .optional()
    .nullable(),

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
    .optional()
    .nullable(),
});

// ==========================================
// UPDATE TICKET
// ==========================================

export const updateTicketSchema = z
  .object({
    sprintId: z
      .string()
      .uuid("Invalid sprint ID")
      .optional(),

    title: z
      .string()
      .trim()
      .min(
        1,
        "Ticket title cannot be empty"
      )
      .max(
        255,
        "Ticket title must not exceed 255 characters"
      )
      .optional(),

    description: z
      .string()
      .trim()
      .max(
        5000,
        "Ticket description must not exceed 5000 characters"
      )
      .optional()
      .nullable(),

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
      .optional()
      .nullable(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0,
    {
      message:
        "At least one field is required for update",
    }
  );