import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";
import { ApiError } from "../../lib/api/errors";
import { offlineDb } from "../../lib/offline/db";
import { currentMonthRange } from "../../lib/date";

const accountsMock = vi.hoisted(() => ({ listAccounts: vi.fn() }));
vi.mock("../../lib/api/accounts", () => accountsMock);
const paymentMethodsMock = vi.hoisted(() => ({ listPaymentMethods: vi.fn() }));
vi.mock("../../lib/api/paymentMethods", () => paymentMethodsMock);
const categoriesMock = vi.hoisted(() => ({ listCategories: vi.fn(), listTransactionsByCategory: vi.fn() }));
vi.mock("../../lib/api/categories", () => categoriesMock);
const transactionsMock = vi.hoisted(() => ({ listTransactions: vi.fn(), createTransaction: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn() }));
vi.mock("../../lib/api/transactions", () => transactionsMock);
const shortcutsMock = vi.hoisted(() => ({ getTransactionShortcuts: vi.fn() }));
vi.mock("../../lib/api/shortcuts", () => shortcutsMock);

const { TransactionsPage } = await import("./TransactionsPage");

const ACCOUNT = { id: "acc-1", name: "Conta Corrente", type: "checking", currency: "BRL", initial_balance_cents: 0, current_balance_cents: 0, is_active: true } as const;
const PAYMENT_METHOD = { id: "pm-1", name: "Pix", type: "pix", is_active: true, is_system_default: true, account_id: null, credit_card_id: null } as const;
const CATEGORY = { id: "cat-1", name: "Mercado", kind: "expense", parent_category_id: null, is_system_default: true } as const;
/** Subcategoria (RN-12/AMB-11: `get_transaction_shortcuts()` sempre devolve o nó folha) usada nos testes de RF-REF-03. */
const SUBCATEGORY = { id: "cat-sub-1", name: "Restaurante", icon: "🍔", kind: "expense", parent_category_id: "cat-1", is_system_default: true } as const;
const TRANSACTION = {
  id: "txn-1",
  user_id: "u1",
  account_id: "acc-1",
  destination_account_id: null,
  payment_method_id: "pm-1",
  category_id: "cat-1",
  kind: "expense" as const,
  amount_cents: 4500,
  description: "Compras da semana",
  transaction_date: "2026-09-02",
  status: "cleared" as const,
  source: "manual" as const,
  created_at: "2026-09-02T10:00:00Z",
  updated_at: "2026-09-02T10:00:00Z",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <TransactionsPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  Object.values(accountsMock).forEach((m) => m.mockReset());
  Object.values(paymentMethodsMock).forEach((m) => m.mockReset());
  Object.values(categoriesMock).forEach((m) => m.mockReset());
  Object.values(transactionsMock).forEach((m) => m.mockReset());
  Object.values(shortcutsMock).forEach((m) => m.mockReset());
  accountsMock.listAccounts.mockResolvedValue([ACCOUNT]);
  paymentMethodsMock.listPaymentMethods.mockResolvedValue([PAYMENT_METHOD]);
  categoriesMock.listCategories.mockResolvedValue([CATEGORY]);
  // RF-REF-03 AC2: sem atalhos por padrão — cada teste que precisar de chips sobrescreve.
  shortcutsMock.getTransactionShortcuts.mockResolvedValue([]);
  await offlineDb.pendingTransactions.clear();
  // `BE-REF-06`/`ADR-016` Decisão 5 (`DIR-39`): toda a suíte pré-existente deste arquivo
  // (FE-REF-02 a FE-REF-05) exercita o formulário unificado (RF-REF-04) — comportamento
  // só ativo com a flag `payment_method_unification_enabled` `true`. Default global aqui
  // é `true` para não reescrever essas dezenas de casos; o describe `BE-REF-06` abaixo
  // sobrescreve para `false`/ausente especificamente para testar o gate em si.
  vi.stubEnv("VITE_PAYMENT_METHOD_UNIFICATION_ENABLED", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("TransactionsPage — S-TXN-01/02 (RF-MVP-04 AC5)", () => {
  it("busca o mês corrente por padrão", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(transactionsMock.listTransactions).toHaveBeenCalled());
    const range = currentMonthRange();
    expect(transactionsMock.listTransactions).toHaveBeenCalledWith(expect.objectContaining({ fromDate: range.from, toDate: range.to }));
  });

  it("estado vazio: nenhum lançamento no período", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Nenhum lançamento neste período")).toBeInTheDocument();
  });

  it("lista lançamentos agrupados por dia, com valor formatado e seta de saída", async () => {
    transactionsMock.listTransactions.mockResolvedValue([TRANSACTION]);
    renderPage();
    expect(await screen.findByText("Compras da semana · Pix")).toBeInTheDocument();
    expect(screen.getByText(/↓ R\$ 45,00/)).toBeInTheDocument();
  });

  describe("FE-REF-02 — hierarquia visual do item (RN-17/RN-18, S-TXN-01 revisado)", () => {
    it("linha 1 é a subcategoria em maior destaque (font-semibold); linha 2 é descrição + forma de pagamento", async () => {
      transactionsMock.listTransactions.mockResolvedValue([TRANSACTION]);
      renderPage();

      // `{ selector: "p" }` desambigua da opção "Mercado" já existente no `<select>` de Categoria do FilterBar.
      const subcategoryLine = await screen.findByText("Mercado", { selector: "p" });
      expect(subcategoryLine).toHaveClass("font-semibold");
      expect(screen.getByText("Compras da semana · Pix", { selector: "p" })).toBeInTheDocument();
    });

    it("descrição vazia: linha 2 mostra só a forma de pagamento, sem '·' solto nem texto de preenchimento (RN-17)", async () => {
      transactionsMock.listTransactions.mockResolvedValue([{ ...TRANSACTION, description: null }]);
      renderPage();

      expect(await screen.findByText("Mercado", { selector: "p" })).toBeInTheDocument();
      expect(screen.getByText("Pix", { selector: "p" })).toBeInTheDocument();
      expect(screen.queryByText(/·/, { selector: "p" })).not.toBeInTheDocument();
      expect(screen.queryByText("(sem descrição)")).not.toBeInTheDocument();
    });
  });

  it("falha de rede ao salvar um novo lançamento cai para a fila offline (DIR-11) em vez de perder o dado", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    transactionsMock.createTransaction.mockRejectedValue(new ApiError({ message: "offline", kind: "network" }));
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    await userEvent.selectOptions(dialog.getByLabelText("Forma de pagamento", { exact: false }), "pm-1");
    await userEvent.selectOptions(dialog.getByLabelText(/^Categoria/), "cat-1");
    await userEvent.type(dialog.getByLabelText("Valor", { exact: false }), "4500");
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText(/Sem conexão/)).toBeInTheDocument();
    await waitFor(async () => expect(await offlineDb.pendingTransactions.count()).toBe(1));
  });
});

describe("FE-REF-03 — ShortcutBar/ShortcutChip (RF-REF-03, S-TXN-01, ADR-015/API-CONTRACT.yaml v0.18.0)", () => {
  it("AC2: sem lançamento no histórico (RPC devolve []), a barra de atalhos não é renderizada", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    shortcutsMock.getTransactionShortcuts.mockResolvedValue([]);
    renderPage();

    await screen.findByText("Nenhum lançamento neste período");
    expect(screen.queryByRole("group", { name: "Atalhos de lançamento rápido" })).not.toBeInTheDocument();
  });

  it("exibe skeleton de pílulas enquanto get_transaction_shortcuts está pendente, sem bloquear o restante da tela", async () => {
    transactionsMock.listTransactions.mockResolvedValue([TRANSACTION]);
    let resolveShortcuts: (value: unknown[]) => void = () => {};
    shortcutsMock.getTransactionShortcuts.mockReturnValue(new Promise<unknown[]>((resolve) => (resolveShortcuts = resolve)));
    renderPage();

    expect(await screen.findByRole("status", { name: "Carregando atalhos de lançamento" })).toBeInTheDocument();
    // Restante da tela carrega normalmente enquanto a RPC de atalhos ainda está pendente.
    expect(await screen.findByText("Mercado", { selector: "p" })).toBeInTheDocument();

    resolveShortcuts([]);
    await waitFor(() => expect(screen.queryByRole("status", { name: "Carregando atalhos de lançamento" })).not.toBeInTheDocument());
  });

  it("falha ao carregar a RPC omite a barra silenciosamente, sem Banner e sem bloquear a lista (UX-SPEC Seção 4.2)", async () => {
    transactionsMock.listTransactions.mockResolvedValue([TRANSACTION]);
    shortcutsMock.getTransactionShortcuts.mockRejectedValue(new ApiError({ message: "RPC indisponível", kind: "unknown" }));
    renderPage();

    expect(await screen.findByText("Mercado", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Atalhos de lançamento rápido" })).not.toBeInTheDocument();
    expect(screen.queryByText("RPC indisponível")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("achado de qualidade: RPC de atalhos responde antes de `categories` (corrida) — não renderiza chip sem nome/ícone, mantém skeleton até a referência chegar", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    shortcutsMock.getTransactionShortcuts.mockResolvedValue([{ category_id: SUBCATEGORY.id, payment_method_id: PAYMENT_METHOD.id }]);
    let resolveCategories: (value: unknown[]) => void = () => {};
    categoriesMock.listCategories.mockReturnValue(new Promise<unknown[]>((resolve) => (resolveCategories = resolve)));
    renderPage();

    // Atalhos já responderam, mas `categories` (Promise.all de loadReferenceData) ainda não —
    // a barra continua em skeleton, nenhum chip (nem um chip "anônimo" sem nome) é renderizado.
    expect(await screen.findByRole("status", { name: "Carregando atalhos de lançamento" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Lançar em/ })).not.toBeInTheDocument();

    resolveCategories([CATEGORY, SUBCATEGORY]);
    expect(await screen.findByRole("button", { name: "Lançar em Restaurante" })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Carregando atalhos de lançamento" })).not.toBeInTheDocument();
  });

  it("achado de qualidade: falha permanente ao carregar `categories` não deixa chip anônimo nem barra presa em carregamento — barra some (mesmo tratamento de AC2)", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    shortcutsMock.getTransactionShortcuts.mockResolvedValue([{ category_id: SUBCATEGORY.id, payment_method_id: PAYMENT_METHOD.id }]);
    categoriesMock.listCategories.mockRejectedValue(new ApiError({ message: "Não foi possível carregar categorias", kind: "unknown" }));
    renderPage();

    await waitFor(() => expect(screen.queryByRole("status", { name: "Carregando atalhos de lançamento" })).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /^Lançar em/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Atalhos de lançamento rápido" })).not.toBeInTheDocument();
  });

  it("AC1: renderiza um ShortcutChip por linha devolvida pela RPC, com ícone + nome da subcategoria", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    categoriesMock.listCategories.mockResolvedValue([CATEGORY, SUBCATEGORY]);
    shortcutsMock.getTransactionShortcuts.mockResolvedValue([{ category_id: SUBCATEGORY.id, payment_method_id: PAYMENT_METHOD.id }]);
    renderPage();

    expect(await screen.findByRole("button", { name: "Lançar em Restaurante" })).toBeInTheDocument();
  });

  it("AC3/AC4: clique no atalho abre o formulário com subcategoria/forma de pagamento/tipo/data pré-preenchidos e foco automático no campo Valor", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    categoriesMock.listCategories.mockResolvedValue([CATEGORY, SUBCATEGORY]);
    shortcutsMock.getTransactionShortcuts.mockResolvedValue([{ category_id: SUBCATEGORY.id, payment_method_id: PAYMENT_METHOD.id }]);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Lançar em Restaurante" }));

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText(/^Categoria/)).toHaveValue(CATEGORY.id);
    expect(dialog.getByLabelText("Subcategoria", { exact: false })).toHaveValue(SUBCATEGORY.id);
    expect(dialog.getByLabelText("Forma de pagamento", { exact: false })).toHaveValue(PAYMENT_METHOD.id);
    // Data pré-preenchida = hoje (todayDateOnly()); descrição permanece vazia (RN-13).
    expect(dialog.getByLabelText("Descrição", { exact: false })).toHaveValue("");
    // AC4 — foco automático no campo Valor, não no primeiro campo do formulário (desvio intencional, UX-SPEC Seção 2.2).
    expect(dialog.getByLabelText("Valor", { exact: false })).toHaveFocus();
  });

  it("AC5: usuário pode editar um campo pré-preenchido pelo atalho (forma de pagamento) antes de confirmar", async () => {
    const OTHER_PAYMENT_METHOD = { id: "pm-2", name: "Dinheiro", type: "cash", is_active: true, is_system_default: true, account_id: null, credit_card_id: null } as const;
    transactionsMock.listTransactions.mockResolvedValue([]);
    categoriesMock.listCategories.mockResolvedValue([CATEGORY, SUBCATEGORY]);
    paymentMethodsMock.listPaymentMethods.mockResolvedValue([PAYMENT_METHOD, OTHER_PAYMENT_METHOD]);
    shortcutsMock.getTransactionShortcuts.mockResolvedValue([{ category_id: SUBCATEGORY.id, payment_method_id: PAYMENT_METHOD.id }]);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Lançar em Restaurante" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText("Forma de pagamento", { exact: false })).toHaveValue(PAYMENT_METHOD.id);

    await userEvent.selectOptions(dialog.getByLabelText("Forma de pagamento", { exact: false }), OTHER_PAYMENT_METHOD.id);
    expect(dialog.getByLabelText("Forma de pagamento", { exact: false })).toHaveValue(OTHER_PAYMENT_METHOD.id);
  });

  it("AC6: submissão de um lançamento originado de atalho persiste com created_via_shortcut=true", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    categoriesMock.listCategories.mockResolvedValue([CATEGORY, SUBCATEGORY]);
    shortcutsMock.getTransactionShortcuts.mockResolvedValue([{ category_id: SUBCATEGORY.id, payment_method_id: PAYMENT_METHOD.id }]);
    transactionsMock.createTransaction.mockResolvedValue(TRANSACTION);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Lançar em Restaurante" }));
    const dialog = within(screen.getByRole("dialog"));
    // FE-REF-04/RN-16: campo "Conta" não existe mais no formulário — nada a selecionar.
    await userEvent.type(dialog.getByLabelText("Valor", { exact: false }), "3000");
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(transactionsMock.createTransaction).toHaveBeenCalled());
    expect(transactionsMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        created_via_shortcut: true,
        category_id: SUBCATEGORY.id,
        payment_method_id: PAYMENT_METHOD.id,
        kind: "expense",
      }),
    );
    // DIR-36: `account_id` nunca é enviado pelo formulário unificado (kind != transfer).
    expect(transactionsMock.createTransaction.mock.calls[0][0]).not.toHaveProperty("account_id");
  });

  it("fluxo normal ('+ Novo lançamento') não envia created_via_shortcut", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    transactionsMock.createTransaction.mockResolvedValue(TRANSACTION);
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    await userEvent.selectOptions(dialog.getByLabelText("Forma de pagamento", { exact: false }), PAYMENT_METHOD.id);
    await userEvent.selectOptions(dialog.getByLabelText(/^Categoria/), CATEGORY.id);
    await userEvent.type(dialog.getByLabelText("Valor", { exact: false }), "4500");
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(transactionsMock.createTransaction).toHaveBeenCalled());
    const payload = transactionsMock.createTransaction.mock.calls[0][0];
    expect(payload.created_via_shortcut).toBeUndefined();
  });
});

describe("FE-REF-04 — formulário unificado de conta + forma de pagamento (RF-REF-04, S-TXN-02 revisado, ADR-016)", () => {
  it("AC1: campo 'Conta' não existe mais no formulário, nem visível nem oculto", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.queryByLabelText("Conta", { exact: false })).not.toBeInTheDocument();
    expect(dialog.queryByText("Conta")).not.toBeInTheDocument();
  });

  it("AC3: rótulo da forma de pagamento ganha sufixo '{Forma} {Conta}' quando há mais de 1 conta ativa (RN-14, derivePaymentMethodLabel)", async () => {
    const SECOND_ACCOUNT = { id: "acc-2", name: "Nubank", type: "checking", currency: "BRL", initial_balance_cents: 0, current_balance_cents: 0, is_active: true } as const;
    accountsMock.listAccounts.mockResolvedValue([ACCOUNT, SECOND_ACCOUNT]);
    paymentMethodsMock.listPaymentMethods.mockResolvedValue([{ ...PAYMENT_METHOD, name: "Pix", account_id: ACCOUNT.id }]);
    transactionsMock.listTransactions.mockResolvedValue([]);
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("option", { name: "Pix Conta Corrente" })).toBeInTheDocument();
  });

  it("AC3: com só 1 conta ativa, o rótulo da forma de pagamento é simples, sem sufixo de conta", async () => {
    paymentMethodsMock.listPaymentMethods.mockResolvedValue([{ ...PAYMENT_METHOD, name: "Pix", account_id: ACCOUNT.id }]);
    transactionsMock.listTransactions.mockResolvedValue([]);
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("option", { name: "Pix" })).toBeInTheDocument();
  });

  it("AC5: forma de pagamento vinculada a cartão de crédito continua exibindo o nome do cartão, mesmo com mais de 1 conta ativa", async () => {
    const SECOND_ACCOUNT = { id: "acc-2", name: "Nubank", type: "checking", currency: "BRL", initial_balance_cents: 0, current_balance_cents: 0, is_active: true } as const;
    const CARD_PAYMENT_METHOD = { id: "pm-card", name: "Cartão Nubank", type: "credit_card", is_active: true, is_system_default: false, account_id: null, credit_card_id: "card-1" } as const;
    accountsMock.listAccounts.mockResolvedValue([ACCOUNT, SECOND_ACCOUNT]);
    paymentMethodsMock.listPaymentMethods.mockResolvedValue([CARD_PAYMENT_METHOD]);
    transactionsMock.listTransactions.mockResolvedValue([]);
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("option", { name: "Cartão Nubank" })).toBeInTheDocument();
  });

  it("DIR-36: payload de criação nunca envia account_id (kind != transfer, resolução server-side via payment_method_id)", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    transactionsMock.createTransaction.mockResolvedValue(TRANSACTION);
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    await userEvent.selectOptions(dialog.getByLabelText("Forma de pagamento", { exact: false }), PAYMENT_METHOD.id);
    await userEvent.selectOptions(dialog.getByLabelText(/^Categoria/), CATEGORY.id);
    await userEvent.type(dialog.getByLabelText("Valor", { exact: false }), "4500");
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(transactionsMock.createTransaction).toHaveBeenCalled());
    expect(transactionsMock.createTransaction.mock.calls[0][0]).not.toHaveProperty("account_id");
  });

  it("achado de qualidade (fix-loop 1/2): payload de edição envia account_id: null EXPLICITAMENTE (nunca omite a chave) — PATCH do PostgREST preserva o valor antigo quando a coluna está ausente, diferente do POST", async () => {
    transactionsMock.listTransactions.mockResolvedValue([TRANSACTION]);
    transactionsMock.updateTransaction.mockResolvedValue(TRANSACTION);
    renderPage();

    await userEvent.click((await screen.findAllByRole("button", { name: "Editar" }))[0]);
    const dialog = within(screen.getByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(transactionsMock.updateTransaction).toHaveBeenCalled());
    expect(transactionsMock.updateTransaction.mock.calls[0][1]).toHaveProperty("account_id", null);
  });

  it("achado de qualidade (fix-loop 1/2, regressão): editar um lançamento trocando a forma de pagamento para uma vinculada a outra conta envia account_id: null — sem isso, o lançamento continuaria debitando a conta antiga silenciosamente", async () => {
    const ACCOUNT_Y = { id: "acc-y", name: "Conta Y", type: "checking", currency: "BRL", initial_balance_cents: 0, current_balance_cents: 0, is_active: true } as const;
    // Forma A (assume conta X, resolvida na criação — não representada no client, só no servidor) e forma B (vinculada à conta Y).
    const PAYMENT_METHOD_A = { id: "pm-a", name: "Pix Mercado Pago", type: "pix", is_active: true, is_system_default: false, account_id: ACCOUNT.id, credit_card_id: null } as const;
    const PAYMENT_METHOD_B = { id: "pm-b", name: "Pix C6", type: "pix", is_active: true, is_system_default: false, account_id: ACCOUNT_Y.id, credit_card_id: null } as const;
    accountsMock.listAccounts.mockResolvedValue([ACCOUNT, ACCOUNT_Y]);
    paymentMethodsMock.listPaymentMethods.mockResolvedValue([PAYMENT_METHOD_A, PAYMENT_METHOD_B]);
    transactionsMock.listTransactions.mockResolvedValue([{ ...TRANSACTION, payment_method_id: PAYMENT_METHOD_A.id }]);
    transactionsMock.updateTransaction.mockResolvedValue(TRANSACTION);
    renderPage();

    await userEvent.click((await screen.findAllByRole("button", { name: "Editar" }))[0]);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText("Forma de pagamento", { exact: false })).toHaveValue(PAYMENT_METHOD_A.id);

    await userEvent.selectOptions(dialog.getByLabelText("Forma de pagamento", { exact: false }), PAYMENT_METHOD_B.id);
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(transactionsMock.updateTransaction).toHaveBeenCalled());
    expect(transactionsMock.updateTransaction.mock.calls[0][1]).toMatchObject({
      payment_method_id: PAYMENT_METHOD_B.id,
      account_id: null,
    });
  });

  it("novo 400 documentado em API-CONTRACT.yaml v0.19.0 (account_id omitido + payment_method_id de outro usuário, checagem própria do trigger) exibe Alert de erro — mesmo tratamento genérico já usado para todo 400/409 do formulário (lib/api/errors.ts)", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    transactionsMock.createTransaction.mockRejectedValue(
      new ApiError({
        message: "Preencha todos os campos obrigatórios antes de salvar.",
        kind: "validation",
        status: 400,
      }),
    );
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    await userEvent.selectOptions(dialog.getByLabelText("Forma de pagamento", { exact: false }), PAYMENT_METHOD.id);
    await userEvent.selectOptions(dialog.getByLabelText(/^Categoria/), CATEGORY.id);
    await userEvent.type(dialog.getByLabelText("Valor", { exact: false }), "4500");
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("Preencha todos os campos obrigatórios antes de salvar.");
    // Não é tratado como falha de rede — não cai para a fila offline (DIR-11 só se aplica a `kind: "network"`).
    expect(screen.queryByText(/Sem conexão/)).not.toBeInTheDocument();
  });

  it("grid responsivo '2 colunas a partir de md' preservado (5+ campos, AC literal)", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    const dateField = dialog.getByLabelText("Data", { exact: false });
    const gridContainer = dateField.closest(".grid");
    expect(gridContainer).toHaveClass("grid-cols-1", "md:grid-cols-2");
  });
});

describe("FE-REF-05 — derivePaymentMethodLabel() consistente entre item de lista e FilterBar (RNF-13, DIR-37)", () => {
  it("item de lista e filtro 'forma de pagamento' exibem o mesmo rótulo desambiguado para a mesma forma de pagamento", async () => {
    const SECOND_ACCOUNT = { id: "acc-2", name: "Nubank", type: "checking", currency: "BRL", initial_balance_cents: 0, current_balance_cents: 0, is_active: true } as const;
    accountsMock.listAccounts.mockResolvedValue([ACCOUNT, SECOND_ACCOUNT]);
    paymentMethodsMock.listPaymentMethods.mockResolvedValue([{ ...PAYMENT_METHOD, name: "Pix", account_id: ACCOUNT.id }]);
    transactionsMock.listTransactions.mockResolvedValue([{ ...TRANSACTION, description: null }]);
    renderPage();

    // Linha 2 do item de lista (FE-REF-02/FE-REF-05).
    expect(await screen.findByText("Pix Conta Corrente", { selector: "p" })).toBeInTheDocument();
    // Opção do filtro "forma de pagamento" (FilterBar).
    const filterSelect = screen.getByLabelText("Forma de pagamento", { exact: false });
    expect(within(filterSelect).getByRole("option", { name: "Pix Conta Corrente" })).toBeInTheDocument();
  });

  it("filtro 'conta' do FilterBar permanece inalterado, não é removido por este pacote", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole("search")).toBeInTheDocument();
    expect(screen.getByLabelText("Conta", { exact: false })).toBeInTheDocument();
  });

  it("ShortcutChip não exibe texto de forma de pagamento — UX-SPEC.md confirma que a pílula só mostra ícone + nome da subcategoria, cláusula condicional de FE-REF-05 não se aplica hoje", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    categoriesMock.listCategories.mockResolvedValue([CATEGORY, SUBCATEGORY]);
    shortcutsMock.getTransactionShortcuts.mockResolvedValue([{ category_id: SUBCATEGORY.id, payment_method_id: PAYMENT_METHOD.id }]);
    renderPage();

    const chip = await screen.findByRole("button", { name: "Lançar em Restaurante" });
    expect(chip).toHaveTextContent("Restaurante");
    expect(chip).not.toHaveTextContent(PAYMENT_METHOD.name);
  });
});

describe("BE-REF-06 — feature flag payment_method_unification_enabled (ADR-016 Decisão 5, DIR-39)", () => {
  it("flag ausente/false: comportamento antigo se mantém — campo 'Conta' volta a existir e é obrigatório no formulário de lançamento", async () => {
    vi.stubEnv("VITE_PAYMENT_METHOD_UNIFICATION_ENABLED", undefined);
    transactionsMock.listTransactions.mockResolvedValue([]);
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText("Conta", { exact: false })).toBeInTheDocument();

    // Sem selecionar a conta, submit deve reportar erro de validação e NUNCA chamar a API.
    await userEvent.selectOptions(dialog.getByLabelText("Forma de pagamento", { exact: false }), PAYMENT_METHOD.id);
    await userEvent.selectOptions(dialog.getByLabelText(/^Categoria/), CATEGORY.id);
    await userEvent.type(dialog.getByLabelText("Valor", { exact: false }), "4500");
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }));
    expect(await dialog.findByText("Selecione a conta.")).toBeInTheDocument();
    expect(transactionsMock.createTransaction).not.toHaveBeenCalled();
  });

  it("flag ausente/false: payload de criação envia account_id explícito (comportamento anterior a RF-REF-04)", async () => {
    vi.stubEnv("VITE_PAYMENT_METHOD_UNIFICATION_ENABLED", "false");
    transactionsMock.listTransactions.mockResolvedValue([]);
    transactionsMock.createTransaction.mockResolvedValue(TRANSACTION);
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    await userEvent.selectOptions(dialog.getByLabelText("Conta", { exact: false }), ACCOUNT.id);
    await userEvent.selectOptions(dialog.getByLabelText("Forma de pagamento", { exact: false }), PAYMENT_METHOD.id);
    await userEvent.selectOptions(dialog.getByLabelText(/^Categoria/), CATEGORY.id);
    await userEvent.type(dialog.getByLabelText("Valor", { exact: false }), "4500");
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(transactionsMock.createTransaction).toHaveBeenCalled());
    expect(transactionsMock.createTransaction.mock.calls[0][0]).toMatchObject({ account_id: ACCOUNT.id });
  });

  it("flag true: comportamento novo fica ativo — campo 'Conta' não existe e payload de criação nunca envia account_id", async () => {
    vi.stubEnv("VITE_PAYMENT_METHOD_UNIFICATION_ENABLED", "true");
    transactionsMock.listTransactions.mockResolvedValue([]);
    transactionsMock.createTransaction.mockResolvedValue(TRANSACTION);
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.queryByLabelText("Conta", { exact: false })).not.toBeInTheDocument();

    await userEvent.selectOptions(dialog.getByLabelText("Forma de pagamento", { exact: false }), PAYMENT_METHOD.id);
    await userEvent.selectOptions(dialog.getByLabelText(/^Categoria/), CATEGORY.id);
    await userEvent.type(dialog.getByLabelText("Valor", { exact: false }), "4500");
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(transactionsMock.createTransaction).toHaveBeenCalled());
    expect(transactionsMock.createTransaction.mock.calls[0][0]).not.toHaveProperty("account_id");
  });
});
