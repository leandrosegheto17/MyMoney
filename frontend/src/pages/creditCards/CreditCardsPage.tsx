import { useEffect, useState } from "react";
import { Alert, Button, Card, EmptyState, Modal, Skeleton } from "../../components/base";
import { Input } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { CurrencyInput } from "../../components/domain/CurrencyInput";
import { InvoiceTimeline } from "../../components/domain/InvoiceTimeline";
import { createCreditCard, getCreditCardsAvailableLimit, listCreditCards, listInvoicesByCard, listInvoicesByCards, updateCreditCard } from "../../lib/api/creditCards";
import { listCategories } from "../../lib/api/categories";
import { listTransactions } from "../../lib/api/transactions";
import { ApiError } from "../../lib/api/errors";
import { Num } from "../../components/base/Num";
import type { Category, CreditCard, CreditCardAvailableLimitItem, Invoice, NewCreditCard, Transaction } from "../../lib/api/types";

type FormState = { name: string; limitCents: number; closingDay: string; dueDay: string };
const EMPTY_FORM: FormState = { name: "", limitCents: 0, closingDay: "", dueDay: "" };

/** Próximo vencimento (DD/MM) a partir de hoje, dado o dia de vencimento do cartão. */
function nextDueLabel(dueDay: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = dueDay < now.getDate() ? now.getMonth() + 1 : now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const date = new Date(year, month, Math.min(dueDay, lastDay));
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** S-CARD-01/02 (FE-F2-01) + S-CARD-03 (FE-F2-02, `InvoiceTimeline`) — UX-SPEC.md Padrão A. */
export function CreditCardsPage() {
  const { showToast } = useToast();
  const [cards, setCards] = useState<CreditCard[] | null>(null);
  const [limits, setLimits] = useState<CreditCardAvailableLimitItem[]>([]);
  const [currentInvoiceTotals, setCurrentInvoiceTotals] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<{ name?: string; limit?: string; closingDay?: string; dueDay?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const [cardList, limitList] = await Promise.all([listCreditCards(), getCreditCardsAvailableLimit()]);
      setCards(cardList);
      setLimits(limitList);
      void loadCurrentInvoiceTotals(cardList);
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar os cartões.");
    }
  }

  /** Melhor esforço: falha aqui só omite o destaque da fatura atual, sem derrubar a lista. */
  async function loadCurrentInvoiceTotals(cardList: CreditCard[]) {
    try {
      const allInvoices = await listInvoicesByCards(cardList.map((c) => c.id));
      const currentCompetencia = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
      const currentByCard: Record<string, Invoice> = {};
      cardList.forEach((card) => {
        // Mesma regra de InvoiceTimeline: primeira fatura do horizonte (competência >= atual) = "Fatura Atual".
        const current = allInvoices
          .filter((invoice) => invoice.credit_card_id === card.id && invoice.competencia >= currentCompetencia)
          .sort((x, y) => x.competencia.localeCompare(y.competencia))[0];
        if (current) currentByCard[card.id] = current;
      });
      const invoiceIds = Object.values(currentByCard).map((invoice) => invoice.id);
      const txs = invoiceIds.length > 0 ? await listTransactions({ cardInvoiceIds: invoiceIds }) : [];
      const totals: Record<string, number> = {};
      Object.entries(currentByCard).forEach(([cardId, current]) => {
        totals[cardId] = (txs ?? []).filter((t) => t.card_invoice_id === current.id).reduce((sum, t) => sum + t.amount_cents, 0);
      });
      setCurrentInvoiceTotals(totals);
    } catch {
      setCurrentInvoiceTotals({});
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openNewForm() {
    setEditingCard(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSaveError(null);
    setIsFormOpen(true);
  }

  function openEditForm(card: CreditCard) {
    setEditingCard(card);
    setForm({ name: card.name, limitCents: card.limit_cents, closingDay: String(card.closing_day), dueDay: String(card.due_day) });
    setFormErrors({});
    setSaveError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit() {
    const nextErrors: typeof formErrors = {};
    if (!form.name.trim()) nextErrors.name = "Informe um nome para o cartão.";
    if (form.limitCents <= 0) nextErrors.limit = "Informe um limite maior que zero.";
    const closingDayNum = Number(form.closingDay);
    if (!form.closingDay || closingDayNum < 1 || closingDayNum > 31) nextErrors.closingDay = "Informe um dia entre 1 e 31.";
    const dueDayNum = Number(form.dueDay);
    if (!form.dueDay || dueDayNum < 1 || dueDayNum > 31) nextErrors.dueDay = "Informe um dia entre 1 e 31.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload: NewCreditCard = { name: form.name.trim(), limit_cents: form.limitCents, closing_day: closingDayNum, due_day: dueDayNum };
      if (editingCard) {
        await updateCreditCard(editingCard.id, payload);
      } else {
        await createCreditCard(payload);
      }
      setIsFormOpen(false);
      showToast("Cartão salvo");
      await load();
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : "Não foi possível salvar o cartão.");
    } finally {
      setIsSaving(false);
    }
  }

  async function openDetail(card: CreditCard) {
    setSelectedCardId(card.id);
    setInvoices(null);
    setDetailError(null);
    try {
      const [invoiceList, transactionList, categoryList] = await Promise.all([
        listInvoicesByCard(card.id),
        listTransactions(),
        listCategories(),
      ]);
      setInvoices(invoiceList);
      setTransactions(transactionList);
      setCategories(categoryList);
    } catch (cause) {
      setDetailError(cause instanceof ApiError ? cause.message : "Não foi possível carregar a fatura.");
    }
  }

  const selectedCard = cards?.find((c) => c.id === selectedCardId) ?? null;
  const selectedLimit = limits.find((l) => l.credit_card_id === selectedCardId) ?? null;
  const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  if (selectedCard) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setSelectedCardId(null)}>
            ← Voltar
          </Button>
          <h1 className="text-xl font-semibold text-neutral-900">{selectedCard.name}</h1>
        </div>

        {selectedLimit && (
          <Card>
            <p className="text-sm text-neutral-500">Limite disponível</p>
            <p className="text-xl font-semibold tabular-nums text-neutral-900">
              <Num value={selectedLimit.available_cents} format="currency" /> de <Num value={selectedLimit.limit_cents} format="currency" />
            </p>
          </Card>
        )}

        {detailError && <Alert variant="danger">{detailError}</Alert>}
        {!invoices && !detailError && <Skeleton lines={4} aria-label="Carregando fatura" />}
        {invoices && (
          <Card>
            <InvoiceTimeline invoices={invoices} transactions={transactions} categoryNameById={categoryNameById} />
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Cartões de crédito</h1>
        <Button onClick={openNewForm}>+ Novo cartão</Button>
      </div>

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!cards && !loadError && <Skeleton lines={4} aria-label="Carregando cartões" />}
      {cards && cards.length === 0 && (
        <EmptyState title="Nenhum cartão cadastrado ainda" description="Cadastre um cartão para começar a usar fatura e parcelamento." action={<Button onClick={openNewForm}>Cadastrar</Button>} />
      )}

      {cards && cards.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {cards.map((card) => {
            const limit = limits.find((l) => l.credit_card_id === card.id);
            const usedPercent = limit && card.limit_cents > 0 ? Math.min(100, Math.round((limit.committed_cents / card.limit_cents) * 100)) : 0;
            const currentTotal = currentInvoiceTotals[card.id];
            return (
              <li key={card.id}>
                <Card className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void openDetail(card)}
                      className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <p className="truncate font-medium text-neutral-900" title={card.name}>
                        {card.name}
                      </p>
                      <p className="text-sm text-neutral-600">vence {nextDueLabel(card.due_day)}</p>
                      <p className="text-xs text-neutral-500">
                        Fecha dia {card.closing_day} · Vence dia {card.due_day}
                      </p>
                    </button>
                    <Button variant="ghost" aria-label={`Editar ${card.name}`} onClick={() => openEditForm(card)}>
                      Editar
                    </Button>
                  </div>
                  {currentTotal !== undefined && (
                    <div>
                      <p className="text-sm text-neutral-600">Fatura atual</p>
                      <p className="text-2xl font-semibold tabular-nums text-neutral-900"><Num value={currentTotal} format="currency" /></p>
                    </div>
                  )}
                  {limit && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm text-neutral-600">
                        <span>Limite usado</span>
                        <span className="flex gap-1 tabular-nums">
                          <span data-testid="limit-used-percent"><Num value={usedPercent} format="percent" /></span>
                          <span>de</span>
                          <span data-testid="limit-total"><Num value={card.limit_cents} format="currency" /></span>
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`Limite usado de ${card.name}`}
                        aria-valuenow={usedPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
                      >
                        <div className="h-full bg-primary" style={{ width: `${usedPercent}%` }} />
                      </div>
                      <p className="text-sm text-neutral-600">Disponível: <Num value={limit.available_cents} format="currency" /></p>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingCard ? "Editar cartão" : "Novo cartão"}>
        <div className="flex flex-col gap-4">
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          <Input label="Nome" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={formErrors.name} />
          <CurrencyInput
            label="Limite (R$)"
            required
            valueCents={form.limitCents}
            onValueChange={(cents) => setForm({ ...form, limitCents: cents })}
            error={formErrors.limit}
          />
          <Input
            label="Dia de fechamento"
            required
            type="number"
            min={1}
            max={31}
            value={form.closingDay}
            onChange={(event) => setForm({ ...form, closingDay: event.target.value })}
            error={formErrors.closingDay}
          />
          <Input
            label="Dia de vencimento"
            required
            type="number"
            min={1}
            max={31}
            value={form.dueDay}
            onChange={(event) => setForm({ ...form, dueDay: event.target.value })}
            error={formErrors.dueDay}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} loading={isSaving}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
