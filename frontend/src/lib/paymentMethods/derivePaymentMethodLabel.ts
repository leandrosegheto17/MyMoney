import type { Account, PaymentMethod } from "../api/types";

/**
 * `derivePaymentMethodLabel()` — RN-14 (`ADR-016` Decisão 1), função única e
 * compartilhada exigida por DIR-37/RNF-13: toda superfície que exibe forma de
 * pagamento importa esta mesma função, nenhuma reimplementa o cálculo do rótulo.
 *
 * Superfícies consumidoras (RF-REF-04 AC6, `UX-SPEC.md` Seção 3.3 "Regra de exibição
 * compartilhada"): `<select>` de `S-TXN-02` (`FE-REF-04`, `TransactionFormModal`),
 * linha 2 do item de lista de `S-TXN-01` (`FE-REF-02`/`FE-REF-05`, `TransactionsPage`),
 * `FilterBar` — rótulo do filtro "forma de pagamento" (`FE-REF-05`, `TransactionsPage`).
 * `ShortcutChip` está fora desta lista de fato: por especificação (`UX-SPEC.md` Seção
 * 2.2 wireframe revisado + Seção 3.3, linha `ShortcutChip`), a pílula exibe só
 * ícone + nome da subcategoria — nunca forma de pagamento — então a cláusula
 * condicional "quando exibir forma de pagamento" de `FE-REF-05` nunca se aplica hoje.
 *
 * 100% client-side (`ADR-016` Decisão 1) — nenhum dado é persistido/renomeado no
 * banco, nenhum endpoint novo. Calculado a partir das listas que o frontend já
 * carrega (`GET /accounts`, `GET /payment_methods`), ambas já escopadas por RLS ao
 * próprio usuário autenticado.
 *
 * Regra (RN-14):
 * - Forma vinculada a cartão de crédito (`type === "credit_card"`) ou sem
 *   `account_id` (mesmo caso, defensivo): mantém o nome já cadastrado da forma de
 *   pagamento, sem sufixo — RN-14 exceção 1 / RF-REF-04 AC5, comportamento já
 *   existente, inalterado.
 * - Forma vinculada a conta, com mais de 1 conta **ativa** no momento da exibição:
 *   `"{Forma de Pagamento} {Nome da Conta}"`.
 * - Forma vinculada a conta, com 0 ou 1 conta ativa: `"{Forma de Pagamento}"` simples.
 */
export function derivePaymentMethodLabel(paymentMethod: PaymentMethod, accounts: Account[]): string {
  if (paymentMethod.type === "credit_card" || !paymentMethod.account_id) {
    return paymentMethod.name;
  }

  const activeAccountsCount = accounts.filter((account) => account.is_active).length;
  if (activeAccountsCount <= 1) {
    return paymentMethod.name;
  }

  const account = accounts.find((candidate) => candidate.id === paymentMethod.account_id);
  return account ? `${paymentMethod.name} ${account.name}` : paymentMethod.name;
}
