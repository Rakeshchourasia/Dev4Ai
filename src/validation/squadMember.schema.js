import { z } from "zod";

export const addSquadMemberSchema = z.object({
  userId: z.string().uuid({
    message: "Invalid user ID",
  }),
});

export const createSquadMemberSchema = z.object({
  squadId: z.string().uuid({
    message: "Invalid squad ID",
  }),
  userId: z.string().uuid({
    message: "Invalid user ID",
  }),
});
