import { z } from "zod";

export const ImportPollingUnitRowSchema = z.object({
  inecCode: z.string().trim().min(1),
  name: z.string().trim().min(2),
  stateCode: z.string().trim().min(2),
  lgaName: z.string().trim().min(1),
  ward: z.string().trim().optional(),
  address: z.string().trim().optional(),
  capacity: z.string().trim().optional(),
});

export type ImportPollingUnitRow = z.infer<typeof ImportPollingUnitRowSchema>;
