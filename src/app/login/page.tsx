import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — ESDMS",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Election Security Duty Management System"
      subtitle="Coordinate officer duty allocations for polling units across every command level, from national down to individual field officers."
    >
      <LoginForm />
    </AuthShell>
  );
}
