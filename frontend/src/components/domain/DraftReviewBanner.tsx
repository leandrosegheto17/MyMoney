import { useEffect, useMemo, useState } from "react";
import { Alert, Button, DatePicker, Input, Select } from "../base";
import { CategoryPicker } from "./CategoryPicker";
import type { CategoryPickerValue, CategoryTaxonomyItem } from "./CategoryPicker";
import { CurrencyInput } from "./CurrencyInput";
import { AutoFillAttentionHint, AutoFillTag } from "./AutoFillTag";
import { listAccounts } from "../../lib/api/accounts";
import { listPaymentMethods } from "../../lib/api/paymentMethods";
import { listCategories } from "../../lib/api/categories";
import { confirmCandidateTransaction, createCandidateTransaction, deleteCandidateTransaction } from "../../lib/api/candidateTransactions";
import { ApiError } from "../../lib/api/errors";
import { todayDateOnly } from "../../lib/date";
import type { Account, Category, PaymentMethod, TransactionKind } from "../../lib/api/types";
import type { VoiceExtractionResult } from "../../lib/api/voiceCapture";
import type { ReceiptExtractionResult } from "../../lib/api/receiptOcr";

export type DraftKind = Extract<TransactionKind, "income" | "expense">;

export type DraftSource =
  | { kind: "voice"; extraction: VoiceExtractionResult }
  | { kind: "photo"; extraction: ReceiptExtractionResult; image: { base64: string; mimeType: string } };

export interface DraftReviewBannerProps {
  source: DraftSource;
  /** Chamado só depois de `confirm_candidate_transaction` ter retornado com sucesso (RNF-01/RNF-08). */
  onConfirmed: (transactionId: string) => void;
  /** Chamado depois de descartar o rascunho (ou imediatamente, se o candidato nunca chegou a ser criado). */
  onDiscarded: () => void;
}

interface DerivedFields {
  amountCents: number;
  kind: DraftKind;
  date: string;
  description: string;
  amountSuggested: boolean;
  kindSuggested: boolean;
  dateSuggested: boolean;
  descriptionSuggested: boolean;
}

/**
 * Deriva os valores iniciais (e quais vieram de sugestão automática) a partir do
 * resultado de extração — pura, sem I/O. Categoria fica de fora (depende da
 * taxonomia do usuário, carregada à parte, ver `matchCategoryLabel`).
 *
 * Decisão de interpretação documentada (`TASK.md` FE-F3-04, pequena — UX-SPEC.md
 * não cobre este detalhe explicitamente): a extração de voz/foto nunca sugere
 * `account_id`/`payment_method_id` (nenhum dos dois contratos publicados —
 * `/voice-capture` v0.22.0, `/receipt-ocr` v0.21.0 — inclui esses campos, pois
 * nem a fala nem a imagem do recibo indicam qual conta/forma de pagamento foi
 * usada) — por isso "Conta"/"Forma de pagamento" abaixo são sempre campos
 * manuais, sem `AutoFillTag`, mesmo que o ASCII de `UX-SPEC.md` Seção 3.3 mostre
 * "✨sugerido" ao lado deles; o texto ali é ilustrativo do padrão visual, não uma
 * garantia de que todo campo do rascunho tem sugestão automática disponível.
 * Extração por foto também não indica "Tipo" (entrada/saída) — assume-se
 * "Saída" (compra em recibo) sem tag, editável livremente.
 */
function deriveFields(source: DraftSource): DerivedFields {
  if (source.kind === "voice") {
    const extraction = source.extraction;
    return {
      amountCents: extraction.amount_cents?.value ?? 0,
      kind: extraction.type?.value === "entrada" ? "income" : "expense",
      date: extraction.transaction_date?.value ?? todayDateOnly(),
      description: extraction.description?.value ?? "",
      amountSuggested: Boolean(extraction.amount_cents),
      kindSuggested: Boolean(extraction.type),
      dateSuggested: Boolean(extraction.transaction_date),
      descriptionSuggested: Boolean(extraction.description),
    };
  }
  const extraction = source.extraction;
  return {
    amountCents: extraction.amount_cents?.value ?? 0,
    kind: "expense",
    date: extraction.transaction_date?.value ?? todayDateOnly(),
    description: extraction.merchant_name?.value ?? "",
    amountSuggested: Boolean(extraction.amount_cents),
    kindSuggested: false,
    dateSuggested: Boolean(extraction.transaction_date),
    descriptionSuggested: Boolean(extraction.merchant_name),
  };
}

function categorySuggestionLabel(source: DraftSource): string | undefined {
  return source.extraction.category_suggestion_label?.value;
}

/**
 * Casa o rótulo textual sugerido (`category_suggestion_label`) com uma
 * categoria real do usuário — responsabilidade explicitamente delegada a quem
 * consome o contrato (`_shared/ocrProvider.ts`: "nunca deste adapter"). Match
 * exato (case-insensitive) contra nome de categoria OU subcategoria; sem match,
 * o campo fica em branco para seleção manual (nunca inventa uma categoria).
 */
function matchCategoryLabel(label: string | undefined, categories: Category[]): CategoryPickerValue | null {
  if (!label) return null;
  const normalized = label.trim().toLowerCase();
  const match = categories.find((category) => category.name.trim().toLowerCase() === normalized);
  if (!match) return null;
  return match.parent_category_id
    ? { categoryId: match.parent_category_id, subcategoryId: match.id }
    : { categoryId: match.id, subcategoryId: null };
}

function friendlyError(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

/**
 * `DraftReviewBanner` — `UX-SPEC.md` S-CAP-03/S-CAP-05 (`FE-F3-04`), tela mais
 * crítica do produto para RNF-01/RNF-08 (DIR-20): barreira entre a extração
 * automática (voz/foto) e o lançamento real gravado no banco. Fixo e
 * não-descartável (`CaptureFab` monta este componente dentro do `Modal`
 * compartilhado com `dismissible={false}` — sem Esc/backdrop/"✕") — as duas
 * ÚNICAS saídas são os botões explícitos "Cancelar rascunho" e "Confirmar
 * lançamento" abaixo. **Nenhum timer, nenhuma auto-confirmação, nenhuma
 * navegação automática** (WCAG 2.2.1) — toda transição de estado aqui é
 * resultado direto de uma ação clicada pelo usuário.
 *
 * Fluxo de persistência (`BE-F3-00`, único caminho autorizado por DIR-20): ao
 * montar, cria imediatamente um `candidate_transaction` pendente com o dado
 * bruto da extração (`raw_payload`) — isto NÃO é a `Transaction` real, é só o
 * rascunho (RNF-01 não é violado: nenhum saldo é afetado, nenhuma linha em
 * `transactions` existe até `confirm_candidate_transaction`). "Cancelar
 * rascunho" exclui fisicamente essa linha pendente
 * (`DELETE /candidate_transaction`, RF-F3-01 AC4) — `UX-SPEC.md` documenta essa
 * ação como "sem confirmação adicional" (nenhum `ConfirmationDialog`), citando
 * que nada foi persistido como lançamento REAL. "Confirmar lançamento" chama
 * `confirm_candidate_transaction` com os valores FINAIS do formulário (já
 * refletindo qualquer edição do usuário, RF-F3-01 AC3) — o único caminho que
 * cria uma `Transaction` de verdade.
 *
 * Cada campo pré-preenchido automaticamente mostra `AutoFillTag` ("✨ sugerido")
 * até o usuário editar **aquele campo especificamente** (RF-F3-01 AC3) — editar
 * um campo nunca afeta a tag de outro. Campo que a extração tentou preencher e
 * não conseguiu mostra `AutoFillAttentionHint` ("⚠ preencha") em vez de erro
 * (RF-F3-02 AC3) — nunca bloqueia os demais.
 */
export function DraftReviewBanner({ source, onConfirmed, onDiscarded }: DraftReviewBannerProps) {
  const derived = useMemo(() => deriveFields(source), [source]);

  const [accountId, setAccountId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [category, setCategory] = useState<CategoryPickerValue>({ categoryId: null, subcategoryId: null });
  const [categorySuggested, setCategorySuggested] = useState(false);

  const [amountCents, setAmountCents] = useState(derived.amountCents);
  const [amountSuggested, setAmountSuggested] = useState(derived.amountSuggested);
  const [kind, setKind] = useState<DraftKind>(derived.kind);
  const [kindSuggested, setKindSuggested] = useState(derived.kindSuggested);
  const [date, setDate] = useState(derived.date);
  const [dateSuggested, setDateSuggested] = useState(derived.dateSuggested);
  const [description, setDescription] = useState(derived.description);
  const [descriptionSuggested, setDescriptionSuggested] = useState(derived.descriptionSuggested);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(true);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [isCreatingCandidate, setIsCreatingCandidate] = useState(true);
  const [creationError, setCreationError] = useState<string | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const categoryTaxonomy = useMemo<CategoryTaxonomyItem[]>(
    () => categories.map((item) => ({ id: item.id, name: item.name, parentId: item.parent_category_id })),
    [categories],
  );

  async function loadReferenceData() {
    setIsLoadingReferenceData(true);
    setReferenceError(null);
    try {
      const [accountList, paymentMethodList, categoryList] = await Promise.all([
        listAccounts({ onlyActive: true }),
        listPaymentMethods(),
        listCategories(),
      ]);
      setAccounts(accountList);
      setPaymentMethods(paymentMethodList);
      setCategories(categoryList);
      const matched = matchCategoryLabel(categorySuggestionLabel(source), categoryList);
      if (matched) {
        setCategory(matched);
        setCategorySuggested(true);
      }
    } catch (cause) {
      setReferenceError(friendlyError(cause, "Não foi possível carregar contas/formas de pagamento/categorias."));
    } finally {
      setIsLoadingReferenceData(false);
    }
  }

  async function createCandidate() {
    setIsCreatingCandidate(true);
    setCreationError(null);
    try {
      const candidate = await createCandidateTransaction({
        source: source.kind === "voice" ? "audio" : "ocr",
        raw_payload: source.extraction as unknown as Record<string, unknown>,
      });
      setCandidateId(candidate.id);
    } catch (cause) {
      setCreationError(friendlyError(cause, "Não foi possível salvar o rascunho agora."));
    } finally {
      setIsCreatingCandidate(false);
    }
  }

  useEffect(() => {
    void loadReferenceData();
    void createCandidate();
    // Monta uma única vez: `source` é fixo durante o ciclo de vida deste componente
    // (`CaptureFab` cria uma nova instância de `DraftReviewBanner` a cada captura).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCategoryId = category.subcategoryId ?? category.categoryId;
  const canConfirm =
    Boolean(candidateId) &&
    Boolean(accountId) &&
    Boolean(paymentMethodId) &&
    Boolean(selectedCategoryId) &&
    amountCents > 0 &&
    Boolean(date) &&
    !isConfirming &&
    !isDiscarding;

  async function handleConfirm() {
    if (!candidateId || !accountId || !paymentMethodId || !selectedCategoryId || amountCents <= 0 || !date) {
      setValidationError("Preencha todos os campos obrigatórios antes de confirmar.");
      return;
    }
    setValidationError(null);
    setConfirmError(null);
    setIsConfirming(true);
    try {
      const transactionId = await confirmCandidateTransaction({
        p_candidate_id: candidateId,
        p_account_id: accountId,
        p_payment_method_id: paymentMethodId,
        p_category_id: selectedCategoryId,
        p_kind: kind,
        p_amount_cents: amountCents,
        p_transaction_date: date,
        p_description: description.trim() || undefined,
      });
      onConfirmed(transactionId);
    } catch (cause) {
      setConfirmError(friendlyError(cause, "Não foi possível confirmar o lançamento agora. Tente novamente."));
    } finally {
      setIsConfirming(false);
    }
  }

  /** RF-F3-01 AC4 — "sem confirmação adicional" (UX-SPEC.md S-CAP-03/05): exclusão física direta, sem `ConfirmationDialog`. */
  async function handleDiscard() {
    if (!candidateId) {
      onDiscarded();
      return;
    }
    setDiscardError(null);
    setIsDiscarding(true);
    try {
      await deleteCandidateTransaction(candidateId);
      onDiscarded();
    } catch (cause) {
      setDiscardError(friendlyError(cause, "Não foi possível descartar o rascunho agora. Tente novamente."));
    } finally {
      setIsDiscarding(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border-l-4 border-primary bg-primary-soft px-4 py-3">
        <p className="text-sm font-semibold text-neutral-900">✨ RASCUNHO — revise antes de salvar</p>
        <p className="text-xs text-neutral-700">Nada é salvo até você confirmar.</p>
      </div>

      {source.kind === "photo" && (
        <img
          src={`data:${source.image.mimeType};base64,${source.image.base64}`}
          alt="Foto do recibo enviada para leitura"
          className="max-h-48 w-full rounded-md border border-neutral-200 object-contain"
        />
      )}

      {isCreatingCandidate && !creationError && (
        <p role="status" aria-live="polite" className="text-xs text-neutral-500">
          Salvando rascunho...
        </p>
      )}

      {creationError && (
        <Alert
          variant="danger"
          title="Não foi possível salvar o rascunho"
          action={
            <Button onClick={() => void createCandidate()} loading={isCreatingCandidate}>
              Tentar novamente
            </Button>
          }
        >
          {creationError}
        </Alert>
      )}

      {referenceError && (
        <Alert variant="danger" title="Não foi possível carregar os dados de referência" action={<Button onClick={() => void loadReferenceData()}>Tentar novamente</Button>}>
          {referenceError}
        </Alert>
      )}

      {validationError && <Alert variant="warning">{validationError}</Alert>}
      {confirmError && <Alert variant="danger" title="Não foi possível confirmar o lançamento">{confirmError}</Alert>}
      {discardError && <Alert variant="danger" title="Não foi possível descartar o rascunho">{discardError}</Alert>}

      <div className="flex gap-2" role="group" aria-label="Tipo de lançamento">
        <Button
          variant={kind === "expense" ? "primary" : "secondary"}
          onClick={() => {
            setKind("expense");
            setKindSuggested(false);
          }}
        >
          Saída
        </Button>
        <Button
          variant={kind === "income" ? "primary" : "secondary"}
          onClick={() => {
            setKind("income");
            setKindSuggested(false);
          }}
        >
          Entrada
        </Button>
        {kindSuggested && <AutoFillTag />}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <DatePicker
              label="Data"
              required
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setDateSuggested(false);
              }}
            />
            {dateSuggested && <AutoFillTag />}
          </div>
        </div>

        <div className="min-w-0">
          <Select
            label="Conta"
            required
            placeholder={isLoadingReferenceData ? "Carregando..." : "Selecione"}
            disabled={isLoadingReferenceData}
            options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          />
        </div>

        <div className="min-w-0">
          <Select
            label="Forma de pagamento"
            required
            placeholder={isLoadingReferenceData ? "Carregando..." : "Selecione"}
            disabled={isLoadingReferenceData}
            options={paymentMethods.map((method) => ({ value: method.id, label: method.name }))}
            value={paymentMethodId}
            onChange={(event) => setPaymentMethodId(event.target.value)}
          />
        </div>

        <div className="min-w-0 md:col-span-2 flex items-start gap-2">
          <div className="flex-1">
            <CurrencyInput
              label="Valor"
              required
              valueCents={amountCents}
              onValueChange={(cents) => {
                setAmountCents(cents);
                setAmountSuggested(false);
              }}
            />
          </div>
          {amountSuggested ? <AutoFillTag /> : amountCents <= 0 && <AutoFillAttentionHint />}
        </div>

        <div className="min-w-0 md:col-span-2 flex items-start gap-2">
          <div className="flex-1">
            <CategoryPicker
              categories={categoryTaxonomy}
              value={category}
              onChange={(value) => {
                setCategory(value);
                setCategorySuggested(false);
              }}
              required
            />
          </div>
          {categorySuggested ? <AutoFillTag /> : !selectedCategoryId && <AutoFillAttentionHint />}
        </div>

        <div className="min-w-0 md:col-span-2 flex items-start gap-2">
          <div className="flex-1">
            <Input
              label="Descrição"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setDescriptionSuggested(false);
              }}
            />
          </div>
          {descriptionSuggested ? <AutoFillTag /> : !description && <AutoFillAttentionHint />}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => void handleDiscard()} loading={isDiscarding}>
          Cancelar
        </Button>
        <Button onClick={() => void handleConfirm()} loading={isConfirming} disabled={!canConfirm}>
          Confirmar lançamento
        </Button>
      </div>
    </div>
  );
}
