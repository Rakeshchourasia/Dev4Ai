import { z } from "zod";

// ==========================================
// CREATE SPRINT
// ==========================================

export const createSprintSchema = z.object({
  squadId: z
    .string()
    .uuid("Invalid squad ID"),

  name: z
    .string()
    .trim()
    .min(1, "Sprint name is required")
    .max(
      255,
      "Sprint name must not exceed 255 characters"
    ),

  startDate: z
    .string()
    .datetime(
      "Invalid start date"
    ),

  endDate: z
    .string()
    .datetime(
      "Invalid end date"
    ),
});

// ==========================================
// UPDATE SPRINT
// ==========================================

export const updateSprintSchema = z
  .object({
    squadId: z
      .string()
      .uuid("Invalid squad ID")
      .optional(),

    name: z
      .string()
      .trim()
      .min(
        1,
        "Sprint name cannot be empty"
      )
      .max(
        255,
        "Sprint name must not exceed 255 characters"
      )
      .optional(),

    startDate: z
      .string()
      .datetime(
        "Invalid start date"
      )
      .optional(),

    endDate: z
      .string()
      .datetime(
        "Invalid end date"
      )
      .optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0,
    {
      message:
        "At least one field is required for update",
    }
  );

// ==========================================
// UPDATE SPRINT STATUS
// ==========================================

export const updateSprintStatusSchema =
  z.object({
    status: z.enum(
      [
        "PLANNED",
        "ACTIVE",
        "COMPLETED",
      ],
      {
        message:
          "Invalid sprint status",
      }
    ),
  });