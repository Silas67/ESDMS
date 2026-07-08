import { z } from "zod";

export const CreateAssignmentSchema = z.object({
  officerId: z.string().min(1, { error: "Select an officer." }),
  pollingUnitId: z.string().min(1, { error: "Select a polling unit." }),
  role: z.string().trim().optional(),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
