import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Alert } from "../base/Alert";
import { Button } from "../base/Button";
import { Select } from "../base/Select";
import { CandidateList } from "./CandidateList";
import type { CandidateListItemView } from "./CandidateList";
import { CategoryPicker } from "./CategoryPicker";
import type { CategoryPickerValue, CategoryTaxonomyItem } from "./CategoryPicker";
import { listAccounts } from "../../lib/api/accounts";
import { listPaymentMethods } from "../../lib/api/paymentMethods";
import { listCategories } from "../../lib/api/categories";
import { createImportBatch, createCandidateTransaction, confirmCandidateTransaction } from "../../lib/api/candidateTransactions";
import { extractStatementImport } from "../../lib/api/statementImport";
import type { StatementFileFormat, StatementImportCandidate } from "../../lib/api/statementImport";
import { dataUrlToBase64, readFileAsDataUrl } from "../../lib/receiptImage";
import { ApiError } from "../../lib/api/errors";
import type { Account, Category, PaymentMethod } from "../../lib/api/types";

export interface StatementImportFlowProps {
  /** Chamado só depois que TODOS os candidatos selecionados foram confirmados com sucesso (RNF-01/RNF-08). */
  onImported: (count: number) => void;
  onCancel: () => void;
}

interface CandidateEntry {
  key: string;
  candidate: StatementImportCandidate;
}

function friendlyError(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

function detectFileFormat(fileName: string): StatementFileFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".ofx")) return "ofx";
  if (lower.endsWith(".csv")) return "csv";
  return null;
}

/**
 * `StatementImportFlow` — `UX-SPEC.md` S-CAP-06/S-CAP-07 (`FE-F3-05`),
 * `UX-FL-05`/`FL-05`. Orquestra o upload de extrato (S-CAP-06) e a revisão em
 * lote da lista de candidatos (S-CAP-07, `CandidateList`/`ReconciliationHint`)
 * até a confirmação explícita — mesmo princípio de RNF-01 (extensão AMB-06b)
 * de `DraftReviewBanner`: nada é persistido antes da confirmação.
 *
 * **Decisão de design documentada (gap real de `UX-SPEC.md`, não deste
 * código — `TASK.md` `FE-F3-05`)**: o schema real de `transactions`
 * (`transactions_non_transfer_requires_method_and_category`) exige
 * `payment_method_id`/`category_id` para todo lançamento não-transferência,
 * mas o wireframe de S-CAP-07 não mostra nenhum campo de forma de
 * pagamento/categoria por item da lista — só checkbox + data + descrição +
 * valor + sinalização de duplicata. Resolvido da forma menos intrusiva ao
 * wireframe existente (mesmo precedente do `Bloqueio 008`/`FE-M-04`,
 * preenchimento funcional mínimo sinalizado ao UX/UI, sem bloquear a
 * cadeia): **um único seletor de Forma de Pagamento + um único seletor de
 * Categoria, aplicados a toda a seleção do lote** (`account_id` já foi
 * escolhido em S-CAP-06 e é reaproveitado para todos os candidatos do lote).
 * Achado sinalizado ao `coordenador`/UX-UI para uma futura revisão de
 * wireframe; não registrado em `BLOCKERS.md` — é detalhe de tela resolvível
 * pelo Frontend, não trava a cadeia.
 *
 * Fluxo de persistência ao confirmar (`BE-F3-00`): 1 `POST /import_batch`
 * (`source: "import"`), depois, para cada candidato selecionado, em ordem,
 * `POST /candidate_transaction` seguido de
 * `POST /rpc/confirm_candidate_transaction`. Falha parcial no meio do lote
 * **nunca** perde o que já foi confirmado (RNF-01 não permite desfazer
 * confirmação silenciosamente) — os candidatos já confirmados saem da lista
 * (persistidos de verdade), os que falharam continuam selecionados na tela
 * para nova tentativa, com um erro claro listando quantos falharam.
 */
export function StatementImportFlow({ onImported, onCancel }: StatementImportFlowProps) {
  const [step, setStep] = useState<"upload" | "processing" | "review">("upload");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(true);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [entries, setEntries] = useState<CandidateEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [skippedLines, setSkippedLines] = useState(0);

  const [batchPaymentMethodId, setBatchPaymentMethodId] = useState("");
  const [batchCategory, setBatchCategory] = useState<CategoryPickerValue>({ categoryId: null, subcategoryId: null });

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const categoryTaxonomy = useMemo<CategoryTaxonomyItem[]>(
    () => categories.map((item) => ({ id: item.id, name: item.name, parentId: item.parent_category_id })),
    [categories],
  );

  useEffect(() => {
    void loadReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    } catch (cause) {
      setReferenceError(friendlyError(cause, "Não foi possível carregar contas/formas de pagamento/categorias."));
    } finally {
      setIsLoadingReferenceData(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!accountId || !file) {
      setUploadError("Selecione a conta e o arquivo do extrato antes de importar.");
      return;
    }
    const fileFormat = detectFileFormat(file.name);
    if (!fileFormat) {
      setUploadError("Formato de arquivo não suportado. Selecione um arquivo .ofx ou .csv.");
      return;
    }

    setUploadError(null);
    setStep("processing");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const result = await extractStatementImport({
        fileContentBase64: dataUrlToBase64(dataUrl),
        fileFormat,
        accountId,
      });

      const nextEntries: CandidateEntry[] = result.candidates.map((candidate, index) => ({
        key: `candidate-${index}`,
        candidate,
      }));
      // RF-F3-03 AC2: candidato sinalizado como possível duplicata vem
      // desmarcado por padrão; os demais vêm marcados (mockup de UX-SPEC.md
      // mostra a maioria pré-selecionada — o AC só exige o oposto para
      // duplicata).
      const initialSelection = new Set(
        nextEntries.filter((entry) => entry.candidate.duplicate_of_transaction_id === null).map((entry) => entry.key),
      );

      setEntries(nextEntries);
      setSelected(initialSelection);
      setSkippedLines(result.skipped_lines);
      setStep("review");
    } catch (cause) {
      setUploadError(friendlyError(cause, "Não foi possível ler o arquivo. Verifique o formato (OFX/CSV) e tente novamente."));
      setStep("upload");
    }
  }

  function toggleSelection(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(entries.map((entry) => entry.key)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const items: CandidateListItemView[] = entries.map((entry) => ({
    key: entry.key,
    date: entry.candidate.raw_payload.transaction_date,
    description: entry.candidate.raw_payload.description ?? "",
    amountCents: entry.candidate.raw_payload.amount_cents,
    kind: entry.candidate.raw_payload.kind,
    isDuplicate: entry.candidate.duplicate_of_transaction_id !== null,
    duplicateOfTransactionId: entry.candidate.duplicate_of_transaction_id,
  }));

  const selectedCategoryId = batchCategory.subcategoryId ?? batchCategory.categoryId;
  const canConfirm = selected.size > 0 && Boolean(batchPaymentMethodId) && Boolean(selectedCategoryId) && !isConfirming;

  async function handleConfirm() {
    if (!canConfirm) return;
    setConfirmError(null);
    setIsConfirming(true);

    const toConfirm = entries.filter((entry) => selected.has(entry.key));
    const remaining: CandidateEntry[] = entries.filter((entry) => !selected.has(entry.key));
    const failedKeys: string[] = [];
    let confirmedCount = 0;

    try {
      const batch = await createImportBatch({ source: "import", raw_metadata: { file_name: file?.name ?? null } });

      for (const entry of toConfirm) {
        try {
          const created = await createCandidateTransaction({
            source: "import",
            import_batch_id: batch.id,
            raw_payload: entry.candidate.raw_payload as unknown as Record<string, unknown>,
            duplicate_of_transaction_id: entry.candidate.duplicate_of_transaction_id,
          });
          await confirmCandidateTransaction({
            p_candidate_id: created.id,
            p_account_id: accountId,
            p_payment_method_id: batchPaymentMethodId,
            p_category_id: selectedCategoryId,
            p_kind: entry.candidate.raw_payload.kind,
            p_amount_cents: entry.candidate.raw_payload.amount_cents,
            p_transaction_date: entry.candidate.raw_payload.transaction_date,
            p_description: entry.candidate.raw_payload.description ?? undefined,
          });
          confirmedCount += 1;
        } catch {
          // Falha parcial (RNF-01): nunca reverte o que já foi confirmado — o
          // candidato que falhou volta para a lista/seleção, para nova
          // tentativa, em vez de ser silenciosamente descartado.
          failedKeys.push(entry.key);
          remaining.push(entry);
        }
      }
    } catch (cause) {
      // Falha ao criar o próprio lote: nenhum candidato foi tentado ainda.
      setConfirmError(friendlyError(cause, "Não foi possível iniciar a importação agora. Tente novamente."));
      setIsConfirming(false);
      return;
    }

    setIsConfirming(false);

    if (failedKeys.length > 0) {
      setEntries(remaining);
      setSelected(new Set(failedKeys));
      setConfirmError(
        `${confirmedCount} lançamento(s) importado(s) com sucesso. ${failedKeys.length} não puderam ser importados — revise e tente novamente.`,
      );
      return;
    }

    onImported(confirmedCount);
  }

  return (
    <div className="flex flex-col gap-4">
      {referenceError && (
        <Alert variant="danger" title="Não foi possível carregar os dados de referência" action={<Button onClick={() => void loadReferenceData()}>Tentar novamente</Button>}>
          {referenceError}
        </Alert>
      )}

      {step === "upload" && (
        <div className="flex flex-col gap-4">
          <Select
            label="Conta"
            required
            placeholder={isLoadingReferenceData ? "Carregando..." : "Selecione"}
            disabled={isLoadingReferenceData}
            options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="statement-import-file" className="text-sm font-medium text-neutral-700">
              Arquivo do extrato (.ofx ou .csv)
            </label>
            <input
              id="statement-import-file"
              type="file"
              accept=".ofx,.csv"
              onChange={handleFileChange}
              className="min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>

          {uploadError && (
            <Alert variant="danger" title="Não foi possível ler o arquivo">
              {uploadError}
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancelar importação
            </Button>
            <Button onClick={() => void handleUpload()} disabled={!accountId || !file}>
              Importar
            </Button>
          </div>
        </div>
      )}

      {step === "processing" && (
        <p role="status" aria-live="polite" className="py-6 text-center text-sm text-neutral-500">
          Interpretando arquivo...
        </p>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-4">
          {skippedLines > 0 && (
            <Alert variant="info">{skippedLines} linha(s) do arquivo não puderam ser reconhecidas e foram ignoradas.</Alert>
          )}

          {confirmError && <Alert variant="danger" title="Falha parcial na importação">{confirmError}</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Forma de pagamento (aplica à seleção)"
              required
              placeholder={isLoadingReferenceData ? "Carregando..." : "Selecione"}
              disabled={isLoadingReferenceData}
              options={paymentMethods.map((method) => ({ value: method.id, label: method.name }))}
              value={batchPaymentMethodId}
              onChange={(event) => setBatchPaymentMethodId(event.target.value)}
            />
            <CategoryPicker
              categories={categoryTaxonomy}
              value={batchCategory}
              onChange={setBatchCategory}
              categoryLabel="Categoria (aplica à seleção)"
              required
            />
          </div>

          <CandidateList items={items} selected={selected} onToggle={toggleSelection} onSelectAll={selectAll} onClearSelection={clearSelection} />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancelar importação
            </Button>
            <Button onClick={() => void handleConfirm()} loading={isConfirming} disabled={!canConfirm}>
              Confirmar {selected.size} lançamentos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
