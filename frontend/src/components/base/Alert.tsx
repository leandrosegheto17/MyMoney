import type { ReactNode } from "react";

export type AlertVariant = "info" | "warning" | "danger" | "success";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: "bg-blue-50 text-neutral-800 border-primary",
  warning: "bg-amber-50 text-neutral-800 border-warning",
  danger: "bg-red-50 text-neutral-800 border-danger",
  success: "bg-green-50 text-neutral-800 border-income",
};

const VARIANT_ICON: Record<AlertVariant, string> = {
  info: "ℹ",
  warning: "⚠",
  danger: "⛔",
  success: "✓",
};

/**
 * Alert/Banner — UX-SPEC.md Seção 3.2: mensagem persistente inline (erro de
 * carregamento, aviso de orçamento). `role="alert"` para variantes que exigem
 * atenção imediata (warning/danger), `role="status"` para info/success — ambos
 * anunciados via região viva, nunca dependem só da cor (ícone + texto sempre juntos).
 */
export function Alert({ variant = "info", title, children, action }: AlertProps) {
  const role = variant === "warning" || variant === "danger" ? "alert" : "status";
  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={["flex items-start gap-3 rounded-md border-l-4 p-4 text-sm", VARIANT_CLASSES[variant]].join(" ")}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {VARIANT_ICON[variant]}
      </span>
      <div className="flex-1">
        {title && <p className="font-medium">{title}</p>}
        <div>{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
