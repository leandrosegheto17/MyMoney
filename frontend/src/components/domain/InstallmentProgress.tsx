export interface InstallmentProgressProps {
  description: string;
  installmentsCount: number;
  generatedCount: number;
}

/**
 * InstallmentProgress — UX-SPEC.md Seção 3.3/S-INST-02: "Parcela 4 de 12" + barra de
 * progresso, **semântica de contagem, não percentual de meta** — distinta de
 * `ProgressBar` (FE-F2-03 AC literal: "não é ProgressBar percentual genérico").
 * `generatedCount`/`installmentsCount` vêm de `GET /rpc/get_installment_purchases_progress`
 * (BE-F2-05), nunca recalculados no client (DIR-06).
 */
export function InstallmentProgress({ description, installmentsCount, generatedCount }: InstallmentProgressProps) {
  const clamped = Math.min(generatedCount, installmentsCount);
  const pct = installmentsCount > 0 ? (clamped / installmentsCount) * 100 : 0;
  const isComplete = clamped >= installmentsCount;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-800">{description}</span>
        <span className={["font-medium", isComplete ? "text-income" : "text-neutral-600"].join(" ")}>
          {isComplete && <span aria-hidden="true">✓ </span>}
          Parcela {clamped} de {installmentsCount}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Parcelas pagas de ${description}`}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={installmentsCount}
        aria-valuetext={`Parcela ${clamped} de ${installmentsCount}`}
        className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
      >
        <div
          className={["h-full rounded-full transition-all duration-200", isComplete ? "bg-income" : "bg-primary"].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
