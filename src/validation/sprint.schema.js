import { z } from "zod";

export const createSprintSchema = z
  .object({
    squadId: z.string().uuid({
      message: "Invalid squad ID",
    }),

    name: z
      .string()
      .min(2, {
        message: "Sprint name must be at least 2 characters long",
      }),

    startDate: z.coerce.date({
      message: "Invalid start date",
    }),

    endDate: z.coerce.date({
      message: "Invalid end date",
    }),
  })
  .refine(
    (data) => data.startDate < data.endDate,
    {
      message: "Start date must be before end date",
      path: ["endDate"],
    }
  );

export const updateSprintSchema = z
  .object({
    squadId: z
      .string()
      .uuid({
        message: "Invalid squad ID",
      })
      .optional(),

    name: z
      .string()
      .min(2)
      .optional(),

    startDate: z.coerce.date().optional(),

    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) {
        return true;
      }

      return data.startDate < data.endDate;
    },
    {
      message: "Start date must be before end date",
      path: ["endDate"],
    }
  );