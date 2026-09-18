import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /**
   * `UX-SPEC.md` Seção 3.1: no máximo 2 níveis de elevação simultâneos por
   * tela — `sm` (padrão, card comum) e `md`, reservado ao card de saldo
   * consolidado do Dashboard (`S-DASH-01`, `FE-RS-05`). Prop em vez de
   * `className` solta para o chamador, para nunca haver 2 classes utilitárias
   * de `box-shadow` simultâneas no mesmo elemento (ordem de geração do
   * Tailwind decidiria qual vence, não a ordem do atributo `class`).
   */
  elevation?: "sm" | "md";
}

/** Card — UX-SPEC.md Seção 3.2: contêiner de conteúdo com `elevation.sm`/`elevation.md`. */
export function Card({ children, className = "", elevation = "sm", ...rest }: CardProps) {
  return (
    <div
      className={[
        "rounded-lg bg-surface p-4",
        elevation === "md" ? "shadow-elevation-md" : "shadow-elevation-sm",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
