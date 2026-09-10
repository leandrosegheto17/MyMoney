import { Link } from "react-router-dom";

export interface ReconciliationHintProps {
  /** `duplicate_of_transaction_id` do candidato (RF-F3-03 AC2). */
  transactionId: string;
}

/**
 * `ReconciliationHint` — `UX-SPEC.md` S-CAP-07 (`FE-F3-05`): link "ver
 * lançamento existente" ao lado de um candidato sinalizado como possível
 * duplicata (mesma `transaction_date`+`amount_cents` de um lançamento já
 * existente na conta, `BE-F3-03`).
 *
 * Decisão de interpretação pequena, documentada aqui (`UX-SPEC.md` não define
 * o destino deste link, e `router.tsx` não expõe nenhuma rota de detalhe de
 * lançamento único — só a lista `/lancamentos`): navega para a lista de
 * lançamentos existente, mesmo destino/padrão já usado por "Lançamento
 * manual" em `CaptureFab` (RN-20). Deep-link direto ao lançamento específico
 * (ex. `?highlight=<id>`) ficaria para quando `TransactionsPage` ganhar esse
 * suporte — fora do escopo desta tarefa, sinalizado como achado não-bloqueante
 * (mesmo padrão do `Bloqueio 008`).
 */
export function ReconciliationHint({ transactionId }: ReconciliationHintProps) {
  return (
    <Link
      to="/lancamentos"
      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
      title={`Possível duplicata do lançamento ${transactionId} — abre a lista de lançamentos`}
    >
      ver lançamento existente
    </Link>
  );
}
