import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Card — UX-SPEC.md Seção 3.2: contêiner de conteúdo com `elevation.sm`. */
export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div
      className={["rounded-lg bg-surface p-4 shadow-elevation-sm", className].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
