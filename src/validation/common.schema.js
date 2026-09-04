import { z } from "zod";

export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid ID"),
});

export const squadIdParamSchema = z.object({
  squadId: z.string().uuid("Invalid squad ID"),
});

export const sprintIdParamSchema = z.object({
  sprintId: z.string().uuid("Invalid sprint ID"),
});