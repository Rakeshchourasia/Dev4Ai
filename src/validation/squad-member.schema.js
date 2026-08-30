import { z } from "zod";

export const addSquadMemberSchema = z.object({
  userId: z
    .string()
    .uuid({
      message: "Invalid user ID",
    }),
});