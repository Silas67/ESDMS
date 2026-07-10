import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, { error: "Password is required." }),
});

const PasswordSchema = z
  .string()
  .min(8, { error: "Password must be at least 8 characters." })
  .regex(/[a-zA-Z]/, { error: "Password must contain a letter." })
  .regex(/[0-9]/, { error: "Password must contain a number." });

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
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Current password is required." }),
    newPassword: PasswordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    error: "Passwords do not match.",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    error: "New password must be different from your current password.",
    path: ["newPassword"],
  });
