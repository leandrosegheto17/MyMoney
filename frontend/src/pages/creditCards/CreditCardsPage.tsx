import { useEffect, useState } from "react";
import { Alert, Button, Card, EmptyState, Modal, Skeleton } from "../../components/base";
import { Input } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { InvoiceTimeline } from "../../components/domain/InvoiceTimeline";
import { createCreditCard, getCreditCardsAvailableLimit, listCreditCards, listInvoicesByCard, updateCreditCard } from "../../lib/api/creditCards";
import { listCategories } from "../../lib/api/categories";
import { listTransactions } from "../../lib/api/transactions";
import { ApiError } from "../../lib/api/errors";
import { formatCentsToBRL } from "../../lib/currency";
import type { Category, CreditCard, CreditCardAvailableLimitItem, Invoice, NewCreditCard, Transaction } from "../../lib/api/types";

type FormState = { name: string; limitCents: number; closingDay: string; dueDay: string };
const EMPTY_FORM: FormState = { name: "", limitCents: 0, closingDay: "", dueDay: "" };

/** S-CARD-01/02 (FE-F2-01) + S-CARD-03 (FE-F2-02, `InvoiceTimeline`) — UX-SPEC.md Padrão A. */
export function CreditCardsPage() {
  const { showToast } = useToast();
  const [cards, setCards] = useState<CreditCard[] | null>(null);
  const [limits, setLimits] = useState<CreditCardAvailableLimitItem[]>([]);
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
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar os cartões.");
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
              {formatCentsToBRL(selectedLimit.available_cents)} de {formatCentsToBRL(selectedLimit.limit_cents)}
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
        <ul className="flex flex-col gap-3">
          {cards.map((card) => {
            const limit = limits.find((l) => l.credit_card_id === card.id);
            return (
              <li key={card.id}>
                <Card className="flex items-center justify-between gap-4">
                  <button type="button" onClick={() => void openDetail(card)} className="flex-1 text-left focus-visible:outline-2 focus-visible:outline-primary">
                    <p className="font-medium text-neutral-900">{card.name}</p>
                    <p className="text-sm text-neutral-500">
                      Fecha dia {card.closing_day} · Vence dia {card.due_day}
                    </p>
                    {limit && (
                      <p className="text-sm text-neutral-600">
                        Disponível: {formatCentsToBRL(limit.available_cents)} de {formatCentsToBRL(card.limit_cents)}
                      </p>
                    )}
                  </button>
                  <Button variant="ghost" onClick={() => openEditForm(card)}>
                    Editar
                  </Button>
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
          <Input
            label="Limite (R$)"
            required
            type="number"
            min={0}
            step="0.01"
            value={form.limitCents ? (form.limitCents / 100).toString() : ""}
            onChange={(event) => setForm({ ...form, limitCents: Math.round(Number(event.target.value || 0) * 100) })}
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
