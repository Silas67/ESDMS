import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,215,0,0.12),_transparent_55%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full border-2 border-accent">
            <span className="font-heading text-lg font-semibold text-accent">
              NPF
            </span>
          </div>
          <div>
            <p className="font-heading text-sm font-semibold tracking-wide uppercase">
              Nigeria Police Force
            </p>
            <p className="text-xs text-primary-foreground/70">
              Election Security Duty Management System
            </p>
          </div>
        </div>

        <div className="relative max-w-md space-y-4">
          <div className="h-1 w-16 rounded-full bg-accent" />
          <h1 className="font-heading text-3xl font-semibold text-balance">
            {title}
          </h1>
          <p className="text-primary-foreground/70">{subtitle}</p>
        </div>

        <p className="relative text-xs text-primary-foreground/50">
          Authorized personnel only. All access is logged and monitored.
        </p>
      </div>

      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-full border-2 border-primary">
              <span className="font-heading text-sm font-semibold text-primary">
                NPF
              </span>
            </div>
            <div>
              <p className="font-heading text-sm font-semibold text-primary uppercase">
                ESDMS
              </p>
              <p className="text-xs text-muted-foreground">
                Nigeria Police Force
              </p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
