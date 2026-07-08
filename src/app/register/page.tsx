import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Request access — ESDMS",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Request platform access"
      subtitle="New accounts are reviewed by a command administrator before they can sign in. Use your official service details."
    >
      <RegisterForm />
    </AuthShell>
  );
}
