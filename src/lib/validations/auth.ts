import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, { error: "Password is required." }),
});

export const RegisterSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Full name is required." }),
    email: z.email({ error: "Enter a valid email address." }).trim(),
    serviceNo: z
      .string()
      .trim()
      .min(2, { error: "Service number is required." }),
    rank: z.string().trim().min(2, { error: "Rank is required." }),
    role: z.enum(["IGP", "AIG", "CP", "DPO", "SPO"], {
      error: "Select a role.",
    }),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters." })
      .regex(/[a-zA-Z]/, { error: "Password must contain a letter." })
      .regex(/[0-9]/, { error: "Password must contain a number." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });
