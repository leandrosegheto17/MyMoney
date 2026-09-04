import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Card, ConfirmationDialog, EmptyState, FilterBar, Select, Skeleton } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { ShortcutBar } from "../../components/domain/ShortcutBar";
import type { ShortcutBarItem } from "../../components/domain/ShortcutBar";
import { listAccounts } from "../../lib/api/accounts";
import { listPaymentMethods } from "../../lib/api/paymentMethods";
import { listCategories } from "../../lib/api/categories";
import { deleteTransaction, listTransactions } from "../../lib/api/transactions";
import { getTransactionShortcuts } from "../../lib/api/shortcuts";
import { ApiError } from "../../lib/api/errors";
import { currentMonthRange, formatDayHeading } from "../../lib/date";
import { formatCentsToBRL } from "../../lib/currency";
import { derivePaymentMethodLabel } from "../../lib/paymentMethods/derivePaymentMethodLabel";
import type { Account, Category, PaymentMethod, Transaction, TransactionShortcut } from "../../lib/api/types";
import { TransactionFormModal } from "./TransactionFormModal";
import type { ShortcutPrefill } from "./TransactionFormModal";

/** S-TXN-01 — Lista de lançamentos (UX-SPEC.md Seção 2.2): FilterBar + lista agrupada por dia, mês corrente por padrão (RF-MVP-04 AC5). */
export function TransactionsPage() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** `null` = carregando (RF-REF-03 AC1/AC8); `[]` = sem atalhos, `ShortcutBar` omitida (AC2) — mesmo tratamento para "sem histórico" e falha silenciosa da RPC (UX-SPEC Seção 4.2). */
  const [shortcuts, setShortcuts] = useState<TransactionShortcut[] | null>(null);
  /** `true` assim que `loadReferenceData()` termina (sucesso ou falha) — usado só para não renderizar `ShortcutChip` sem nome/ícone/tipo resolvido enquanto `categories` ainda não chegou (achado de qualidade, ver `TASK.md` FE-REF-03). */
  const [referenceDataReady, setReferenceDataReady] = useState(false);
  const [shortcutPrefill, setShortcutPrefill] = useState<ShortcutPrefill | null>(null);

  const monthRange = useMemo(() => currentMonthRange(), []);
  const [accountFilter, setAccountFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("categoria") ?? "");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadReferenceData() {
    try {
      const [accountList, paymentMethodList, categoryList] = await Promise.all([listAccounts(), listPaymentMethods(), listCategories()]);
      setAccounts(accountList);
      setPaymentMethods(paymentMethodList);
      setCategories(categoryList);
    } catch {
      // Esta tela não tem `Banner` dedicado para falha de dados de referência (contas/
      // formas/categorias) — comportamento pré-existente, não introduzido por esta
      // mudança. Capturado aqui só para não deixar uma rejeição não tratada solta no
      // processo; `referenceDataReady` (finally) já é o suficiente para destravar
      // `ShortcutBar` sem ficar preso esperando `categories` que nunca chega.
    } finally {
      setReferenceDataReady(true);
    }
  }

  async function loadTransactions() {
    setLoadError(null);
    try {
      setTransactions(
        await listTransactions({
          fromDate: monthRange.from,
          toDate: monthRange.to,
          accountId: accountFilter || undefined,
          paymentMethodId: paymentMethodFilter || undefined,
          categoryId: categoryFilter || undefined,
        }),
      );
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar os lançamentos.");
    }
  }

  /**
   * RF-REF-03 AC8: recalcula a cada carregamento da tela de lançamentos (não a cada
   * mudança de filtro) — sem cache client-side, reflete uso real mais recente
   * (`ADR-015` Decisão 1). Falha da RPC é tratada como "sem atalhos" (`[]`): a barra
   * é um acelerador opcional, sua ausência temporária nunca bloqueia a tela nem
   * exibe `Banner` (UX-SPEC.md Seção 4.2, "ShortcutBar/ShortcutChip").
   */
  async function loadShortcuts() {
    try {
      setShortcuts(await getTransactionShortcuts());
    } catch {
      setShortcuts([]);
    }
  }

  useEffect(() => {
    void loadReferenceData();
    void loadShortcuts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountFilter, paymentMethodFilter, categoryFilter]);

  const categoryTaxonomy = useMemo(
    () => categories.map((category) => ({ id: category.id, name: category.name, parentId: category.parent_category_id })),
    [categories],
  );
  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  /**
   * FE-REF-05 (RNF-13, DIR-37): rótulo desambiguado de RN-14, calculado por
   * `derivePaymentMethodLabel()` — a mesma função (nenhuma reimplementação local)
   * usada pelo `<select>` de `S-TXN-02` (`TransactionFormModal`, `FE-REF-04`).
   * Consumida pela linha 2 do item de lista (abaixo) e pelo `<select>` do filtro
   * "forma de pagamento" do `FilterBar` (JSX abaixo).
   */
  const paymentMethodLabelById = useMemo(
    () => new Map(paymentMethods.map((method) => [method.id, derivePaymentMethodLabel(method, accounts)])),
    [paymentMethods, accounts],
  );

  /**
   * Resolve nome/ícone/tipo (`categories.kind`, RN-13) para cada linha crua da RPC —
   * DIR-34: sem reordenação, mantém a ordem já devolvida pelo servidor. Filtra (nunca
   * substitui por rótulo vazio) todo atalho cuja categoria não resolve em `categoryById`
   * — cobre tanto a corrida transitória em que a RPC de atalhos responde antes de
   * `loadReferenceData()` quanto a falha permanente de `loadReferenceData()` (`categories`
   * ficando `[]` para sempre); sem isso, o chip renderizaria sem nome/ícone acessível e
   * pré-preencheria `kind="expense"` por padrão mesmo para categoria de entrada.
   */
  const shortcutItems: ShortcutBarItem[] = useMemo(
    () =>
      (shortcuts ?? [])
        .filter((shortcut) => categoryById.has(shortcut.category_id))
        .map((shortcut) => {
          const category = categoryById.get(shortcut.category_id)!;
          return {
            categoryId: shortcut.category_id,
            label: category.name,
            icon: category.icon ?? null,
            paymentMethodId: shortcut.payment_method_id,
            kind: category.kind === "income" ? "income" : "expense",
          };
        }),
    [shortcuts, categoryById],
  );

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const transaction of transactions ?? []) {
      const list = groups.get(transaction.transaction_date) ?? [];
      list.push(transaction);
      groups.set(transaction.transaction_date, list);
    }
    return Array.from(groups.entries());
  }, [transactions]);

  function openNewForm() {
    setEditingTransaction(null);
    setShortcutPrefill(null);
    setIsFormOpen(true);
  }

  function openEditForm(transaction: Transaction) {
    setEditingTransaction(transaction);
    setShortcutPrefill(null);
    setIsFormOpen(true);
  }

  /** RF-REF-03 AC3 — clique em `ShortcutChip` abre o formulário completo pré-preenchido (RN-13), foco automático no campo Valor tratado dentro de `TransactionFormModal`. */
  function openFormFromShortcut(item: ShortcutBarItem) {
    setEditingTransaction(null);
    setShortcutPrefill({ categoryId: item.categoryId, paymentMethodId: item.paymentMethodId, kind: item.kind });
    setIsFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
      showToast("Lançamento excluído");
      await loadTransactions();
    } catch (cause) {
      showToast(cause instanceof ApiError ? cause.message : "Não foi possível excluir.", "danger");
    } finally {
      setIsDeleting(false);
    }
  }

  function clearFilters() {
    setAccountFilter("");
    setPaymentMethodFilter("");
    setCategoryFilter("");
    setSearchParams({});
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Lançamentos</h1>
        <Button onClick={openNewForm}>+ Novo lançamento</Button>
      </div>

      <FilterBar onClear={clearFilters}>
        <Select label="Conta" placeholder="Todas" options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} />
        <Select
          label="Forma de pagamento"
          placeholder="Todas"
          options={paymentMethods.map((m) => ({ value: m.id, label: paymentMethodLabelById.get(m.id) ?? m.name }))}
          value={paymentMethodFilter}
          onChange={(e) => setPaymentMethodFilter(e.target.value)}
        />
        <Select label="Categoria" placeholder="Todas" options={categories.map((c) => ({ value: c.id, label: c.name }))} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} />
      </FilterBar>

      {/* Achado de qualidade (FE-REF-03): também aguarda `referenceDataReady` — sem isso, a
          barra podia renderizar chips sem nome/ícone (`categories` ainda vazio) numa corrida
          transitória entre a RPC de atalhos e `loadReferenceData()`. */}
      <ShortcutBar isLoading={shortcuts === null || !referenceDataReady} items={shortcutItems} onSelect={openFormFromShortcut} />

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!transactions && !loadError && <Skeleton lines={6} aria-label="Carregando lançamentos" />}
      {transactions && transactions.length === 0 && (
        <EmptyState title="Nenhum lançamento neste período" action={<Button onClick={openNewForm}>+ Novo lançamento</Button>} />
      )}

      {transactions && groupedByDay.length > 0 && (
        <div className="flex flex-col gap-4">
          {groupedByDay.map(([date, items]) => (
            <div key={date}>
              <h2 className="mb-2 text-sm font-medium text-neutral-500">{formatDayHeading(date)}</h2>
              <ul className="flex flex-col gap-2">
                {items.map((transaction) => {
                  // FE-REF-02 (S-TXN-01 revisado, RN-17/RN-18): linha 1 é a subcategoria (maior
                  // destaque, nó folha de `category_id`); linha 2 é descrição (quando preenchida)
                  // + forma de pagamento, texto secundário. Descrição vazia é omitida por
                  // completo — nunca "(sem descrição)" nem "·" solto.
                  const subcategoryName = transaction.category_id ? categoryNameById.get(transaction.category_id) ?? "" : "";
                  // FE-REF-05 (RNF-13): rótulo desambiguado de RN-14, mesma função `derivePaymentMethodLabel()`
                  // consumida pelo formulário (`FE-REF-04`) e pelo filtro (JSX acima) — nenhuma reimplementação local.
                  const paymentMethodLabel = transaction.payment_method_id ? paymentMethodLabelById.get(transaction.payment_method_id) ?? "" : "";
                  const secondaryLine = [transaction.description || null, paymentMethodLabel || null].filter(Boolean).join(" · ");

                  return (
                    <li key={transaction.id}>
                      <Card className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          {/* RN-17: mesmo tratamento da linha 2 — sem categoria resolvida (kind=transfer,
                              dado legado/importado), a linha 1 também some por completo, nunca um
                              parágrafo vazio (`title=""`) ocupando espaço. */}
                          {subcategoryName && (
                            <p className="truncate text-base font-semibold text-neutral-900" title={subcategoryName}>
                              {subcategoryName}
                            </p>
                          )}
                          {secondaryLine && (
                            <p className="truncate text-sm text-neutral-500" title={secondaryLine}>
                              {secondaryLine}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <span className={transaction.kind === "income" ? "font-semibold text-income" : "font-semibold text-expense"}>
                            {transaction.kind === "income" ? "↑" : "↓"} {formatCentsToBRL(transaction.amount_cents)}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="ghost" onClick={() => openEditForm(transaction)}>
                              Editar
                            </Button>
                            <Button variant="ghost" onClick={() => setDeleteTarget(transaction)}>
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <TransactionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={() => {
          setIsFormOpen(false);
          showToast(editingTransaction ? "Lançamento atualizado" : "Lançamento salvo com sucesso");
          void loadTransactions();
        }}
        onQueuedOffline={() => {
          setIsFormOpen(false);
          showToast("Sem conexão — lançamento salvo neste dispositivo, será sincronizado automaticamente.");
        }}
        accounts={accounts}
        paymentMethods={paymentMethods}
        categories={categoryTaxonomy}
        editingTransaction={editingTransaction}
        shortcutPrefill={shortcutPrefill}
      />

      <ConfirmationDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Excluir lançamento"
        description="Tem certeza que deseja excluir este lançamento? O saldo da conta será atualizado."
        confirmLabel="Excluir"
        isConfirming={isDeleting}
      />
    </div>
  );
}
