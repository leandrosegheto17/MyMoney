import { useEffect, useRef, useState } from "react";
import { Alert, Button, DatePicker, Input, Modal, Select } from "../../components/base";
import { CategoryPicker } from "../../components/domain/CategoryPicker";
import type { CategoryTaxonomyItem } from "../../components/domain/CategoryPicker";
import { CurrencyInput } from "../../components/domain/CurrencyInput";
import { createTransaction, updateTransaction } from "../../lib/api/transactions";
import { ApiError } from "../../lib/api/errors";
import { enqueueTransaction } from "../../lib/offline/queue";
import { todayDateOnly } from "../../lib/date";
import { derivePaymentMethodLabel } from "../../lib/paymentMethods/derivePaymentMethodLabel";
import type { Account, NewTransaction, PaymentMethod, Transaction, TransactionKind } from "../../lib/api/types";

/**
 * RF-REF-03 AC3 (`ADR-015`) — pré-preenchimento vindo de um clique em `ShortcutChip`.
 * `categoryId` é sempre o nó folha (subcategoria) devolvido por
 * `get_transaction_shortcuts()`; `TransactionFormModal` resolve o pai a partir de
 * `categories` (mesmo padrão já usado para `editingTransaction`, abaixo).
 */
export interface ShortcutPrefill {
  categoryId: string;
  paymentMethodId: string | null;
  kind: TransactionKind;
}

export interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onQueuedOffline: () => void;
  accounts: Account[];
  paymentMethods: PaymentMethod[];
  categories: CategoryTaxonomyItem[];
  /** Presente = edição; ausente = novo lançamento (S-TXN-02). */
  editingTransaction: Transaction | null;
  /** Presente = formulário aberto a partir de um `ShortcutChip` (RF-REF-03); `null` = fluxo normal ("+ Novo"/editar). */
  shortcutPrefill?: ShortcutPrefill | null;
}

interface FormErrors {
  date?: string;
  paymentMethod?: string;
  category?: string;
  amount?: string;
}

/**
 * S-TXN-02 — Novo/Editar lançamento manual (`UX-SPEC.md` Seção 2.2, revisado
 * 2026-09-04 por `RF-REF-04`): "Data | Forma de pagamento (rótulo desambiguado, RN-14)
 * | Categoria > Subcategoria | Valor | Tipo (Entrada/Saída, toggle) | Descrição" — 6
 * campos (era 7). Campo "Conta" **não existe mais** neste formulário, nem visível nem
 * oculto (RN-16/DIR-36): o usuário escolhe só a forma de pagamento, e o servidor
 * resolve `account_id` implicitamente (`ADR-016` Decisão 3) — o payload de
 * criação/edição nunca envia `account_id`. Campos obrigatórios marcados com `*`;
 * validação inline por campo ao perder foco e no submit (RF-MVP-04 AC2).
 */
export function TransactionFormModal({
  isOpen,
  onClose,
  onSaved,
  onQueuedOffline,
  accounts,
  paymentMethods,
  categories,
  editingTransaction,
  shortcutPrefill = null,
}: TransactionFormModalProps) {
  const [date, setDate] = useState(todayDateOnly());
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [categoryValue, setCategoryValue] = useState<{ categoryId: string | null; subcategoryId: string | null }>({
    categoryId: null,
    subcategoryId: null,
  });
  const [amountCents, setAmountCents] = useState(0);
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const amountFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTransaction) {
      setDate(editingTransaction.transaction_date);
      setPaymentMethodId(editingTransaction.payment_method_id ?? "");
      const category = categories.find((c) => c.id === editingTransaction.category_id);
      setCategoryValue(
        category?.parentId
          ? { categoryId: category.parentId, subcategoryId: category.id }
          : { categoryId: editingTransaction.category_id, subcategoryId: null },
      );
      setAmountCents(editingTransaction.amount_cents);
      setKind(editingTransaction.kind);
      setDescription(editingTransaction.description ?? "");
    } else if (shortcutPrefill) {
      // RF-REF-03 AC3/RN-13: subcategoria, forma de pagamento, tipo e data pré-preenchidos;
      // descrição vazia e valor em branco (usuário completa digitando só o valor, AC4).
      setDate(todayDateOnly());
      setPaymentMethodId(shortcutPrefill.paymentMethodId ?? "");
      const category = categories.find((c) => c.id === shortcutPrefill.categoryId);
      setCategoryValue(
        category?.parentId
          ? { categoryId: category.parentId, subcategoryId: category.id }
          : { categoryId: shortcutPrefill.categoryId, subcategoryId: null },
      );
      setAmountCents(0);
      setKind(shortcutPrefill.kind);
      setDescription("");
    } else {
      setDate(todayDateOnly());
      setPaymentMethodId("");
      setCategoryValue({ categoryId: null, subcategoryId: null });
      setAmountCents(0);
      setKind("expense");
      setDescription("");
    }
    setErrors({});
    setBanner(null);
  }, [isOpen, editingTransaction, shortcutPrefill, categories]);

  // RF-REF-03 AC4 — aberto a partir de um atalho, o foco vai para o campo Valor (não o
  // primeiro campo do formulário, desvio intencional de UX-SPEC.md Seção 2.2/5). Roda
  // depois do focus trap do `Modal` (efeito do componente pai, commit posterior ao do
  // filho — useFocusTrap.ts), então esta chamada é a que vence.
  useEffect(() => {
    if (!isOpen || !shortcutPrefill) return;
    amountFieldRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [isOpen, shortcutPrefill]);

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!date) nextErrors.date = "Informe a data.";
    if (!paymentMethodId) nextErrors.paymentMethod = "Selecione a forma de pagamento.";
    if (!categoryValue.categoryId) nextErrors.category = "Selecione a categoria.";
    if (amountCents <= 0) nextErrors.amount = "Informe um valor maior que zero.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setBanner(null);
    setIsSaving(true);

    const categoryId = categoryValue.subcategoryId ?? categoryValue.categoryId ?? undefined;
    // RF-REF-03 AC6/`ADR-015` Decisão 2 (DIR-35): só envia `created_via_shortcut` quando o
    // lançamento se originou de um clique em atalho — omitido no fluxo normal, backend
    // assume `false` por padrão. Nunca inferido a partir de `source` (canais ortogonais).
    const payload: NewTransaction = {
      kind,
      amount_cents: amountCents,
      transaction_date: date,
      payment_method_id: paymentMethodId || undefined,
      category_id: categoryId,
      description: description.trim() || undefined,
      ...(!editingTransaction && shortcutPrefill ? { created_via_shortcut: true } : {}),
      // RN-16/DIR-36 (`ADR-016` Decisão 3) — achado de qualidade corrigido (fix-loop 1/2):
      // este formulário só cria/edita `kind` income/expense (nunca transfer), então
      // `account_id` nunca é escolhido pelo usuário em nenhum dos dois fluxos — mas o
      // payload precisa tratar criação e edição de forma DIFERENTE. Criação (`POST`):
      // simplesmente OMITE a chave — no INSERT do PostgREST, coluna ausente já vira NULL,
      // e o trigger server-side resolve a partir de `payment_method_id`. Edição (`PATCH`):
      // envia `account_id: null` EXPLICITAMENTE — no UPDATE do PostgREST, coluna ausente do
      // payload preserva o valor antigo da linha (não vira NULL), então omitir aqui faria o
      // trigger nunca disparar e o lançamento continuar debitando a conta resolvida na
      // criação mesmo depois de trocar para uma forma de pagamento vinculada a outra conta —
      // bug real encontrado em revisão de qualidade, corrigido enviando `null` explícito só
      // no caminho de edição, sem tocar em criação nem em nenhum trigger/migration do backend.
      ...(editingTransaction ? { account_id: null } : {}),
    };

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, payload);
      } else {
        await createTransaction(payload);
      }
      onSaved();
    } catch (cause) {
      if (!editingTransaction && cause instanceof ApiError && cause.kind === "network") {
        // DIR-11/RNF-04: sem conexão, cai para a fila offline em vez de perder o lançamento
        // digitado. RN-16/DIR-36: `accountId` não é mais coletado pelo formulário — a fila
        // local também deixa de carregar essa informação (ver `lib/offline/db.ts`/`sync.ts`),
        // o mapeamento para `POST /transactions` na sincronização real também omite
        // `account_id`, mesma regra aplicada ao caminho online.
        await enqueueTransaction({
          paymentMethodId,
          categoryId: categoryValue.categoryId ?? "",
          subcategoryId: categoryValue.subcategoryId,
          amountCents,
          type: kind === "income" ? "entrada" : "saida",
          description,
          date,
        });
        onQueuedOffline();
      } else {
        setBanner(cause instanceof ApiError ? cause.message : "Não foi possível salvar o lançamento. Tente novamente.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTransaction ? "Editar lançamento" : "Novo lançamento"}>
      <div className="flex flex-col gap-4">
        {banner && <Alert variant="danger">{banner}</Alert>}

        <div className="flex gap-2" role="group" aria-label="Tipo de lançamento">
          <Button variant={kind === "expense" ? "primary" : "secondary"} onClick={() => setKind("expense")} type="button">
            Saída
          </Button>
          <Button variant={kind === "income" ? "primary" : "secondary"} onClick={() => setKind("income")} type="button">
            Entrada
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <DatePicker label="Data" required value={date} onChange={(event) => setDate(event.target.value)} error={errors.date} />
          </div>

          <div className="min-w-0">
            <Select
              label="Forma de pagamento"
              required
              placeholder="Selecione"
              options={paymentMethods.map((method) => ({ value: method.id, label: derivePaymentMethodLabel(method, accounts) }))}
              value={paymentMethodId}
              onChange={(event) => setPaymentMethodId(event.target.value)}
              error={errors.paymentMethod}
            />
          </div>

          {/* Observação de qualidade (não-bloqueante, corrigida por trivialidade): com 5 itens
              de grid em 2 colunas, "Valor" ficaria sozinho na 3ª linha, deixando uma célula
              órfã vazia ao lado — `md:col-span-2` evita o buraco visual sem alterar nenhum
              campo/ordem de tabulação. */}
          <div className="min-w-0 md:col-span-2" ref={amountFieldRef}>
            <CurrencyInput label="Valor" required valueCents={amountCents} onValueChange={setAmountCents} error={errors.amount} />
          </div>

          <div className="min-w-0 md:col-span-2">
            <CategoryPicker categories={categories} value={categoryValue} onChange={setCategoryValue} required error={errors.category} />
          </div>

          <div className="min-w-0 md:col-span-2">
            <Input label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} loading={isSaving}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
