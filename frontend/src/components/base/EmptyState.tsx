import type { ReactNode } from "react";

export interface EmptyStateProps {
  /** Ícone/ilustração decorativa — sempre `aria-hidden`, o texto é quem carrega a semântica. */
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** EmptyState — UX-SPEC.md Seção 3.2: ilustração + texto + CTA (Padrão A, Seção 4.1). */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg p-8 text-center">
      {icon && (
        <div aria-hidden="true" className="text-neutral-300">
          {icon}
        </div>
      )}
      <p className="text-base font-medium text-neutral-700">{title}</p>
      {description && <p className="text-sm text-neutral-500">{description}</p>}
      {action}
    </div>
  );
}
