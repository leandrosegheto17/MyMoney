import type { ReactNode } from "react";
import { Card } from "./Card";

/** Página inteira de autenticação/onboarding (sem `AppLayout`) — UX-SPEC.md Seção 3.2. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-surface-alt p-4">{children}</div>;
}

export interface AuthCardProps {
  title: string;
  eyebrow?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  size?: "sm" | "md";
  align?: "left" | "center";
}

/** AuthCard — `Card` com slots eyebrow/título h1/description/corpo/footer (FE-RS-16). */
export function AuthCard({
  title,
  eyebrow,
  description,
  footer,
  children,
  size = "sm",
  align = "left",
}: AuthCardProps) {
  return (
    <Card
      className={[
        "w-full p-6",
        size === "md" ? "max-w-md" : "max-w-sm",
        align === "center" ? "text-center" : "text-left",
      ].join(" ")}
    >
      {eyebrow ? <p className="mb-1 text-sm font-medium text-neutral-600">{eyebrow}</p> : null}
      <h1 className="font-serif text-2xl font-semibold text-neutral-900">{title}</h1>
      {description ? <p className="mt-2 text-sm text-neutral-600">{description}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
      {footer ? <footer className="mt-6 text-sm text-neutral-600">{footer}</footer> : null}
    </Card>
  );
}
