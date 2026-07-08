import { z } from "zod";

export const ApproveUserSchema = z.object({
  userId: z.string().min(1),
  zoneId: z.string().optional(),
  stateId: z.string().optional(),
  lgaId: z.string().optional(),
});

export type ApproveUserInput = z.infer<typeof ApproveUserSchema>;
