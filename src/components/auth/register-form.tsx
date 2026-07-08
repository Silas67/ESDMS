"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ROLE_OPTIONS = [
  { value: "IGP", label: "IGP / DIG — National command" },
  { value: "AIG", label: "AIG — Zonal command" },
  { value: "CP", label: "CP — State command" },
  { value: "DPO", label: "DPO — LGA / Division" },
  { value: "SPO", label: "SPO / Field officer" },
];

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined);

  if (state?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Request submitted</CardTitle>
          <CardDescription>
            Your account has been created and is pending approval by a
            command administrator. You&apos;ll be able to sign in once
            approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            className="w-full"
          >
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Request access</CardTitle>
        <CardDescription>
          Submit your details for admin approval. You won&apos;t be able to
          sign in until an administrator approves your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required aria-invalid={!!state?.errors?.name} />
            {state?.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={!!state?.errors?.email}
            />
            {state?.errors?.email && (
              <p className="text-xs text-destructive">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="serviceNo">Service number</Label>
              <Input id="serviceNo" name="serviceNo" required aria-invalid={!!state?.errors?.serviceNo} />
              {state?.errors?.serviceNo && (
                <p className="text-xs text-destructive">
                  {state.errors.serviceNo[0]}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rank">Rank</Label>
              <Input id="rank" name="rank" required aria-invalid={!!state?.errors?.rank} />
              {state?.errors?.rank && (
                <p className="text-xs text-destructive">{state.errors.rank[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Select name="role" required>
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Select your command level" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.role && (
              <p className="text-xs text-destructive">{state.errors.role[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={!!state?.errors?.password}
            />
            {state?.errors?.password && (
              <p className="text-xs text-destructive">
                {state.errors.password[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={!!state?.errors?.confirmPassword}
            />
            {state?.errors?.confirmPassword && (
              <p className="text-xs text-destructive">
                {state.errors.confirmPassword[0]}
              </p>
            )}
          </div>

          {state?.message && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Submitting..." : "Submit request"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
