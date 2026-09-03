import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Card, ConfirmationDialog, EmptyState, FilterBar, Select, Skeleton } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { listAccounts } from "../../lib/api/accounts";
import { listPaymentMethods } from "../../lib/api/paymentMethods";
import { listCategories } from "../../lib/api/categories";
import { deleteTransaction, listTransactions } from "../../lib/api/transactions";
import { ApiError } from "../../lib/api/errors";
import { currentMonthRange, formatDayHeading } from "../../lib/date";
import { formatCentsToBRL } from "../../lib/currency";
import type { Account, Category, PaymentMethod, Transaction } from "../../lib/api/types";
import { TransactionFormModal } from "./TransactionFormModal";

/** S-TXN-01 — Lista de lançamentos (UX-SPEC.md Seção 2.2): FilterBar + lista agrupada por dia, mês corrente por padrão (RF-MVP-04 AC5). */
export function TransactionsPage() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const monthRange = useMemo(() => currentMonthRange(), []);
  const [accountFilter, setAccountFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("categoria") ?? "");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadReferenceData() {
    const [accountList, paymentMethodList, categoryList] = await Promise.all([listAccounts(), listPaymentMethods(), listCategories()]);
    setAccounts(accountList);
    setPaymentMethods(paymentMethodList);
    setCategories(categoryList);
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

  useEffect(() => {
    void loadReferenceData();
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
  const paymentMethodNameById = useMemo(() => new Map(paymentMethods.map((method) => [method.id, method.name])), [paymentMethods]);

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
    setIsFormOpen(true);
  }

  function openEditForm(transaction: Transaction) {
    setEditingTransaction(transaction);
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
          options={paymentMethods.map((m) => ({ value: m.id, label: m.name }))}
          value={paymentMethodFilter}
          onChange={(e) => setPaymentMethodFilter(e.target.value)}
        />
        <Select label="Categoria" placeholder="Todas" options={categories.map((c) => ({ value: c.id, label: c.name }))} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} />
      </FilterBar>

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
                {items.map((transaction) => (
                  <li key={transaction.id}>
                    <Card className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-neutral-900">{transaction.description || "(sem descrição)"}</p>
                        <p className="text-sm text-neutral-500">
                          {transaction.category_id ? categoryNameById.get(transaction.category_id) ?? "" : ""}
                          {transaction.payment_method_id ? ` · ${paymentMethodNameById.get(transaction.payment_method_id) ?? ""}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={transaction.kind === "income" ? "font-semibold text-income" : "font-semibold text-expense"}>
                          {transaction.kind === "income" ? "↑" : "↓"} {formatCentsToBRL(transaction.amount_cents)}
                        </span>
                        <div className="flex gap-2">
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
                ))}
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
