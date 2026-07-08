import { z } from "zod";

export const CreateOfficerSchema = z.object({
  serviceNo: z.string().trim().min(2, { error: "Service number is required." }),
  name: z.string().trim().min(2, { error: "Full name is required." }),
  rank: z.string().trim().min(2, { error: "Rank is required." }),
  gender: z.union([z.enum(["Male", "Female"]), z.literal("")]).optional(),
  phone: z.string().trim().optional(),
  stateId: z.string().min(1, { error: "State is required." }),
  lgaId: z.string().optional(),
});

export type CreateOfficerInput = z.infer<typeof CreateOfficerSchema>;

export const ImportOfficerRowSchema = z.object({
  serviceNo: z.string().trim().min(2),
  name: z.string().trim().min(2),
  rank: z.string().trim().min(2),
  gender: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  stateCode: z.string().trim().min(2),
  lgaName: z.string().trim().optional(),
});

export type ImportOfficerRow = z.infer<typeof ImportOfficerRowSchema>;
