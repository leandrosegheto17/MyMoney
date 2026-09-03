export interface SkeletonProps {
  /** Número de linhas de placeholder (padrão de listas — UX-SPEC 4.1, "Skeleton 3–5 linhas"). */
  lines?: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * Skeleton — UX-SPEC.md Seção 3.2: placeholder de carregamento.
 * `role="status"` + `aria-label` comunicam o estado de carregamento a leitor de tela;
 * a animação de pulso respeita `prefers-reduced-motion` (index.css, regra global).
 */
export function Skeleton({ lines = 3, className = "", "aria-label": ariaLabel = "Carregando conteúdo" }: SkeletonProps) {
  return (
    <div role="status" aria-label={ariaLabel} className={["flex flex-col gap-2", className].join(" ")}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-4 animate-pulse rounded-md bg-neutral-200" />
      ))}
    </div>
  );
}
