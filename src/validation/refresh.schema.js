import { z } from "zod";

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, { message: "Refresh token is required" }),
});
