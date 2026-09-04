# TEST-PLAN.md

**Dono**: QA
**Data**: 2026-09-03
**Gate de entrada**: `TASK.md` aprovado no Gate 3 do CTO (`capacity-and-timeline-validation`).
**Fonte**: `PRD-TECNICO.md` (RF-MVP-01 a 08, ACs, RN-01 a 11), `TASK.md` Seção 3.1
(critério de aceite por tarefa do MVP), `SDD.md` (decisões de arquitetura que afetam
testabilidade — Seção 2.5, "Atualização do dashboard"), `UX-SPEC.md` (Seção 5, WCAG
2.1 AA), código-fonte real de `supabase/tests/*.test.sql`,
`supabase/functions/backup-export/lib.test.ts`, `frontend/src/**/*.test.ts(x)`.
**Consumidor**: `devsecops`, `cto`.

**Nota de escopo e retroatividade**: este documento é produzido **depois** de quase
todo o MVP (Backend `BE-M-00` a `BE-M-13`, Frontend `FE-M-00` a `FE-M-12`) já estar
implementado e já ter passado por validação funcional ad-hoc do QA, registrada em
`QA-REPORT.md` (rodadas de 2026-09-02 e 2026-09-03). O que faltava não era a
validação em si — já feita e documentada — mas a formalização da estratégia que
deveria precedê-la. Por isso, este `TEST-PLAN.md` **descreve com precisão a
estratégia de teste já em vigor** (que casos de teste existem, onde vivem, o que
cada um prova, contra qual ferramenta rodam) em vez de propor uma estratégia
hipotética alternativa que não corresponderia ao que o código real contém. Onde um
critério de aceite (AC) de RF-MVP-01 a 08 não tem teste automatizado
correspondente hoje, isso é sinalizado explicitamente na Seção 6 como gap a
fechar — não é apresentado como coberto.

---

## 1. Estratégia de Teste por Tipo

### 1.1 Funcional (unidade/componente + regra de negócio a nível de banco)

Executada em duas camadas, conforme a origem da regra:

- **Nível de banco** (`supabase/tests/*.test.sql`): valida RN-01 a RN-11, RLS,
  triggers e RPCs diretamente contra o schema real do projeto Supabase linkado —
  não contra um banco de teste isolado (não há staging separado, `DIR-03`). Todo
  arquivo roda dentro de `BEGIN;...ROLLBACK;`, nenhuma linha real é alterada.
  Onde a regra depende de `auth.uid()`/RLS de verdade, o teste usa
  `SET LOCAL ROLE authenticated` + `request.jwt.claims` simulado, nunca roda como
  `owner`/`postgres` (que ignora RLS) para os casos que precisam disso.
- **Nível de componente/módulo frontend** (`frontend/src/**/*.test.ts(x)`, Vitest +
  Testing Library): valida comportamento de UI, máscara de moeda, lockout local,
  fila offline, máquina de estado de autenticação — tudo que não depende de round
  trip real de rede (mocka o client de API via `vi.mock`, mesmo princípio de
  isolamento que os testes SQL alcançam via transação).
- **Nível de função isolada** (`supabase/functions/backup-export/lib.test.ts`, Deno
  test): valida a lógica de export/criptografia de `BE-M-10` sem depender de rede.

Comando de execução (mesmo já usado nas rodadas de `QA-REPORT.md`, repetível a
qualquer momento):

```
supabase db query --linked --file supabase/tests/<arquivo>.test.sql   # 1 por 1, ou script que itera todos
deno test --allow-env --allow-net supabase/functions/backup-export/lib.test.ts
cd frontend && npx vitest run
cd frontend && npm run build   # tsc -b && vite build — build limpo é parte do critério funcional
cd frontend && npx oxlint      # não bloqueia por si só, mas todo achado vira débito rastreado
```

### 1.2 Integração (Backend ↔ Frontend, cross-tarefa)

Não existe uma suíte de integração de rede real separada (sem credenciais de
projeto configuradas em ambiente de CI/QA até o momento — ver Seção 6). A
integração cruzada é verificada por uma combinação de:

1. **Contrato publicado**: toda tarefa de Frontend que consome uma tarefa de
   Backend é implementada contra o contrato real em `API-CONTRACT.yaml` (não
   contra um mock hipotético) — confirmado por leitura direta do código-fonte em
   cada rodada de `QA-REPORT.md` (ex.: `FE-M-03`↔`BE-M-06`, `FE-M-04`↔`BE-M-09`,
   `FE-M-06`/`FE-M-08`↔`BE-M-01`, `FE-M-10`↔`BE-M-07`).
2. **Teste de cliente HTTP mockado no shape do contrato real**
   (`frontend/src/lib/api/transactions.test.ts` e equivalentes): garante que o
   client trata corretamente sucesso, `409` (conflito/RN-08/RN-09) e `400`
   (validação) exatamente como o Backend real responde, documentado em
   `API-CONTRACT.yaml`.
3. **Teste e2e real contra Edge Functions em produção**, quando a superfície é uma
   Edge Function (não PostgREST direto): `supabase/tests/be_m09_webauthn_replay.test.ts`
   roda um autenticador WebAuthn virtual contra `webauthn-register`/
   `webauthn-authenticate` reais em produção — este é o único caso do MVP com um
   teste de integração ponta a ponta de rede real automatizado (as demais
   superfícies do MVP são PostgREST direto sobre tabela, cobertas pelo nível de
   banco da Seção 1.1, não por uma Edge Function intermediária).

### 1.3 Regressão

A cada nova migration/tarefa que toca um objeto já testado, a suíte completa de
`supabase/tests/*.test.sql` é re-executada por inteiro (não só o arquivo novo) —
convenção já seguida em toda tarefa de Backend desde `BE-M-01` (ex.: `BE-M-13`
revalidou os 13 arquivos SQL anteriores + a suíte Deno antes de fechar). O mesmo
vale para `npx vitest run` no Frontend — roda a suíte inteira, não só os arquivos
da tarefa em curso. Nenhuma tarefa é considerada `Concluída` com regressão
quebrada, mesmo que a funcionalidade nova em si funcione.

### 1.4 End-to-end (E2E)

Não há hoje uma suíte de e2e de navegador automatizada (`playwright-skill`) rodando
contra o app completo com backend real — as duas rodadas de `QA-REPORT.md`
registraram explicitamente essa limitação (sem `VITE_SUPABASE_ANON_KEY`/
`VITE_SUPABASE_URL` reais disponíveis nas sessões de QA até o momento). A
cobertura de fluxo ponta a ponta hoje é obtida por composição de evidências
(teste de componente + teste de API client mockado no contrato real + leitura
direta de código cruzada contra `PRD-TECNICO.md`/`UX-SPEC.md`), não por um teste
único que exercite o fluxo completo em um navegador real. Ver Seção 6 (gap) para
a recomendação formal.

---

## 2. Casos de Teste Funcionais — RF-MVP-01 a 08

Convenção da tabela: **Tipo** = `SQL` (nível de banco), `Vitest` (componente/página
frontend), `Deno` (função isolada); **Confirmado** referencia a rodada de
`QA-REPORT.md` em que o caso foi executado com sucesso pela última vez.

### RF-MVP-01 — Cadastro de Contas

| AC | Caso de teste | Local | Tipo | Confirmado |
|---|---|---|---|---|
| AC1 (criar conta válida, aparece na lista) | "cria uma nova conta com sucesso e recarrega a lista" | `frontend/src/pages/accounts/AccountsPage.test.tsx` | Vitest | QA-REPORT 1ª rodada (FE-M-06, indireto) / 2ª rodada |
| AC2 (tipo ausente rejeitado) | CASO 1 — `INSERT` sem `type` levanta `not_null_violation` | `supabase/tests/be_m03_04_05_crud.test.sql` | SQL | QA-REPORT 2ª rodada, BE-M-03 |
| AC3 (editar saldo/nome recalcula saldo consolidado) | CASO 2 — `UPDATE initial_balance_cents` reflete em `current_balance_cents` | `supabase/tests/be_m03_04_05_crud.test.sql` | SQL | QA-REPORT 2ª rodada, BE-M-03 |
| AC4 (exclusão com vínculo vira inativação, RN-08) | CASO 4/4b (`DELETE` bloqueado, lançamento não some) | `supabase/tests/be_m01_budget_and_guards.test.sql` | SQL | QA-REPORT 2ª rodada, BE-M-01 |
| AC4 (fluxo de UI: oferece inativação) | "RN-08: exclusão bloqueada por vínculo oferece inativação em vez de excluir" (`inactivateAccount` chamado) | `frontend/src/pages/accounts/AccountsPage.test.tsx` | Vitest | QA-REPORT 2ª rodada, FE-M-06 |

### RF-MVP-02 — Cadastro de Formas de Pagamento

| AC | Caso de teste | Local | Tipo | Confirmado |
|---|---|---|---|---|
| AC1 (formas padrão pré-cadastradas desde o 1º acesso) | CASO 1/1b-1f — 4 formas padrão (Pix/débito/boleto/dinheiro) semeadas na 1ª conta ativa; "crédito" deliberadamente **não** semeado no MVP | `supabase/tests/be_m02_payment_methods_defaults.test.sql` | SQL | QA-REPORT 2ª rodada, BE-M-02 |
| AC1 (formas padrão não editáveis/excluíveis) | "formas padrão exibem badge 'Padrão' e não têm ação de excluir"; CASO 3/4 (policy protege `is_system_default`); CASO 8/8b (`UPDATE`/`DELETE` via RLS real afetam 0 linhas) | `frontend/src/pages/paymentMethods/PaymentMethodsPage.test.tsx`; `supabase/tests/be_m02_payment_methods_defaults.test.sql`; `supabase/tests/be_m03_04_05_crud.test.sql` | Vitest + SQL | QA-REPORT 2ª rodada, BE-M-02/BE-M-04/FE-M-07 |
| AC2 (forma de pagamento obrigatória no lançamento) | Constraint `transactions_non_transfer_requires_method_and_category` (`payment_method_id IS NOT NULL`) — auditada em `AUDITORIA-BE-M-00.md`; caminho de erro `400` testado em `createTransaction: 400 (campo obrigatório ausente)` | `supabase/migrations/20260827170841_baseline_legacy.sql`; `frontend/src/lib/api/transactions.test.ts` | SQL (constraint) + Vitest | QA-REPORT 2ª rodada, BE-M-06 |
| AC3 (cadastro customizado adicional) | CASO 7 — `INSERT` de forma customizada via RLS real; "cadastra uma forma de pagamento customizada" | `supabase/tests/be_m03_04_05_crud.test.sql`; `frontend/src/pages/paymentMethods/PaymentMethodsPage.test.tsx` | SQL + Vitest | QA-REPORT 2ª rodada, BE-M-04/FE-M-07 |

**Nota de interpretação documentada (não é gap)**: AC1 cita literalmente "5 formas"
incluindo "crédito", mas `AUDITORIA-BE-M-00.md` (Achado 2, Seção 3) documenta que
`credit_card` só pode existir a partir de `BE-F2-01` (Fase 2, exige um `CreditCard`
real por constraint de schema) — decisão já registrada e não escalada, lendo
`RF-F2-01` AC1 em conjunto com este AC. O caso de teste reflete essa interpretação
(4 formas, não 5) deliberadamente, não por lacuna de cobertura.

### RF-MVP-03 — Categorização com Subcategorias

| AC | Caso de teste | Local | Tipo | Confirmado |
|---|---|---|---|---|
| AC1 (taxonomia padrão no 1º acesso) | Equivalência confirmada contra `PRD-TECNICO.md` na auditoria (`AUDITORIA-BE-M-00.md` Seção 1); ver Seção 6 desta doc para o gap de teste automatizado do caminho "usuário novo" | `AUDITORIA-BE-M-00.md` (documentação, não teste executável) | — | QA-REPORT 2ª rodada, BE-M-00/BE-M-02 (documentado) |
| AC2 (edição de categoria reflete em todos os pontos de seleção sem reload) | "reflects taxonomy edits in real time without requiring a reload"; "clears a selected subcategory that no longer exists after a live taxonomy edit" | `frontend/src/components/domain/CategoryPicker.test.tsx` | Vitest | QA-REPORT 1ª rodada, FE-M-02 |
| AC3 (bloqueio de exclusão de categoria vinculada) | CASO 5/6 (`DELETE` bloqueado com lançamento ou budget vinculado); CASO 7 (sem vínculo, exclui normalmente) | `supabase/tests/be_m01_budget_and_guards.test.sql` | SQL | QA-REPORT 2ª rodada, BE-M-01/BE-M-05 |
| AC3 (fluxo de UI: modal com contagem + CTA) | "RN-09: exclusão bloqueada mostra contagem de lançamentos vinculados e CTA 'Ver lançamentos desta categoria'" | `frontend/src/pages/categories/CategoriesPage.test.tsx` | Vitest | QA-REPORT 2ª rodada, FE-M-08 |
| (estrutural) hierarquia de 2 níveis / bloqueio de 3 níveis / auto-referência | CASO 4/5/6 | `supabase/tests/be_m03_04_05_crud.test.sql` | SQL | QA-REPORT 2ª rodada, BE-M-05 |

### RF-MVP-04 — Lançamento Manual de Transação

| AC | Caso de teste | Local | Tipo | Confirmado |
|---|---|---|---|---|
| AC1 (persistir + atualizar saldo imediatamente) | `apply_transaction_effect` regressão (9 casos); "createTransaction: POST /transactions bem-sucedido retorna o lançamento criado com saldo já refletido (DIR-12)" | `supabase/tests/apply_transaction_effect.test.sql`; `frontend/src/lib/api/transactions.test.ts` | SQL + Vitest | QA-REPORT 2ª rodada, BE-M-00/BE-M-06 |
| AC2 (campo obrigatório ausente rejeita sem persistir parcial) | Constraint `transactions_non_transfer_requires_method_and_category`; "createTransaction: 400 (campo obrigatório ausente) lança ApiError kind 'validation'" | Schema (baseline); `frontend/src/lib/api/transactions.test.ts` | SQL (constraint) + Vitest | QA-REPORT 2ª rodada, BE-M-06 |
| AC3 (editar lançamento recalcula saldo) | Coberto por `apply_transaction_effect` (trigger reage a `UPDATE`, não só `INSERT` — 9 casos de regressão incluem update) | `supabase/tests/apply_transaction_effect.test.sql` | SQL | QA-REPORT 2ª rodada, BE-M-00 |
| AC4 (excluir lançamento reverte efeito no saldo) | Idem — `apply_transaction_effect` reage a `DELETE` | `supabase/tests/apply_transaction_effect.test.sql` | SQL | QA-REPORT 2ª rodada, BE-M-00 |
| AC5 (lista mês corrente por padrão + filtros) | "busca o mês corrente por padrão"; "lista lançamentos agrupados por dia..."; `listTransactions` "sem filtro nenhum, lista o que o servidor retornar (mês corrente decidido pelo servidor/RLS)" | `frontend/src/pages/transactions/TransactionsPage.test.tsx`; `frontend/src/lib/api/transactions.test.ts` | Vitest | QA-REPORT 2ª rodada, FE-M-09 |
| (integração DIR-11) falha de rede ao salvar cai na fila offline | "falha de rede ao salvar um novo lançamento cai para a fila offline (DIR-11) em vez de perder o dado" | `frontend/src/pages/transactions/TransactionsPage.test.tsx`; `frontend/src/lib/offline/{queue,sync}.test.ts` | Vitest | QA-REPORT 2ª rodada, FE-M-03/FE-M-09 |

### RF-MVP-05 — Dashboard: Saldo Consolidado

| AC | Caso de teste | Local | Tipo | Confirmado |
|---|---|---|---|---|
| AC1 (saldo consolidado = soma de contas ativas) | CASO 2 — `get_month_provision().current_total_balance_cents` correto após lançamentos; "mostra o saldo consolidado e o resumo do mês" (`R$ 8.420,15`) | `supabase/tests/be_m07_dashboard.test.sql`; `frontend/src/pages/dashboard/DashboardPage.test.tsx` | SQL + Vitest | QA-REPORT 2ª rodada, BE-M-07/FE-M-10 |
| AC2 (mesmo cliente reflete a mudança imediatamente após criar/editar/excluir) | Mesmo teste de AC1 (a RPC recalcula do zero a cada chamada; o client atualiza o próprio estado após a resposta da escrita, `DIR-12`, sem esperar Realtime — decisão em `SDD.md` Seção 2.5) | `supabase/tests/be_m07_dashboard.test.sql`; `frontend/src/lib/api/transactions.test.ts` | SQL + Vitest | QA-REPORT 2ª rodada |
| AC2 (propagação para *outras* abas/dispositivos via Supabase Realtime) | **Sem teste automatizado — ver Seção 6, gap** | — | — | — |

### RF-MVP-06 — Dashboard: Entradas/Saídas do Mês e Distribuição por Categoria

| AC | Caso de teste | Local | Tipo | Confirmado |
|---|---|---|---|---|
| AC1 (total entradas/saídas do mês) | "mostra o saldo consolidado e o resumo do mês" (asserts `R$ 6.200,00`/`R$ 980,00`) | `frontend/src/pages/dashboard/DashboardPage.test.tsx` | Vitest | QA-REPORT 2ª rodada, FE-M-10 |
| AC2 (gráfico, não só tabela, de distribuição por categoria) | CASO 3 — `get_monthly_category_summary` traz distribuição; "gráfico é o 2º bloco visível..."; "expõe uma alternativa textual/tabela para leitor de tela (WCAG)"; "sem dados, mostra mensagem em vez de gráfico vazio" | `supabase/tests/be_m07_dashboard.test.sql`; `frontend/src/components/domain/DonutChart.test.tsx`; `frontend/src/pages/dashboard/DashboardPage.test.tsx` | SQL + Vitest | QA-REPORT 2ª rodada, BE-M-07/FE-M-10 |
| AC3 (contagem de lançamentos do mês, instrumentação RN-11) | CASO 1 — `get_month_transaction_count`; `expect(screen.getByText("42 este mês"))` | `supabase/tests/be_m07_dashboard.test.sql`; `frontend/src/pages/dashboard/DashboardPage.test.tsx` (linha 48) | SQL + Vitest | QA-REPORT 2ª rodada, BE-M-07/FE-M-10 |

### RF-MVP-07 — Orçamento por Categoria por Mês

| AC | Caso de teste | Local | Tipo | Confirmado |
|---|---|---|---|---|
| AC1 (armazenar teto, associar aos lançamentos do mês) | CASO 1 (`budget` aceita teto válido); CASO 2/3 (rejeita `limit_cents<=0` e duplicata) | `supabase/tests/be_m01_budget_and_guards.test.sql` | SQL | QA-REPORT 2ª rodada, BE-M-01 |
| AC2 (abaixo de 80%, sem alerta) | CASO 1 — 50% gasto → `alert_level = 'none'` | `supabase/tests/be_m08_budget_status.test.sql` | SQL | QA-REPORT 2ª rodada, BE-M-08 |
| AC3 (atingir limiar de 80%, alerta visual) | CASO 2 — 85% gasto → `alert_level = 'warning'`; "estado de alerta (>=80%): ícone + texto + cor de aviso, nunca só cor" | `supabase/tests/be_m08_budget_status.test.sql`; `frontend/src/components/domain/ProgressBar.test.tsx` | SQL + Vitest | QA-REPORT 2ª rodada, BE-M-08/FE-M-11 |
| AC4 (estouro >100%, severidade maior) | CASO 3 — 105% gasto → `alert_level = 'exceeded'`; "estado de estouro (>100%): severidade maior, texto/ícone diferentes do alerta" | `supabase/tests/be_m08_budget_status.test.sql`; `frontend/src/components/domain/ProgressBar.test.tsx` | SQL + Vitest | QA-REPORT 2ª rodada, BE-M-08/FE-M-11 |

### RF-MVP-08 — Login Seguro (Biometria/PIN)

| AC | Caso de teste | Local | Tipo | Confirmado |
|---|---|---|---|---|
| AC1 (exigir autenticação antes de exibir dado financeiro) | "só renderiza o conteúdo autenticado quando totalmente desbloqueado"; PIN nunca em texto puro (`pin.test.ts`); `pin_hash` inacessível via `SELECT`/`UPDATE` direto (CASO 1/2) | `frontend/src/lib/auth/AuthGate.test.tsx`; `frontend/src/lib/auth/pin.test.ts`; `supabase/tests/be_m09_profiles_pin_privacy.test.sql` | Vitest + SQL | QA-REPORT 2ª rodada, FE-M-04/BE-M-09 |
| AC1 (mecanismo WebAuthn server-side, quando disponível) | `set_pin`/`verify_pin` `SECURITY DEFINER` funcionam (CASO 4/4b); replay de challenge rejeitado ponta a ponta (5/5 passos) | `supabase/tests/be_m09_profiles_pin_privacy.test.sql`; `supabase/tests/be_m09_webauthn_replay.test.ts` | SQL + e2e (Deno/produção) | QA-REPORT 2ª rodada, BE-M-09 |
| AC2 (bloqueio após N tentativas malsucedidas) | "trava após a 5ª tentativa incorreta, com lockedUntil 300000ms à frente"; "libera automaticamente depois que a janela expira"; "bloqueia por 5 minutos após a 5ª tentativa incorreta, com contagem regressiva visível" | `frontend/src/lib/auth/lockout.test.ts`; `frontend/src/pages/auth/UnlockPage.test.tsx` | Vitest | QA-REPORT 2ª rodada, FE-M-04 |
| AC3 (logout explícito encerra a sessão) | "logout explícito encerra a sessão ativa" (`signOut()` real) | `frontend/src/pages/settings/SettingsPage.test.tsx` | Vitest | QA-REPORT 2ª rodada, FE-M-12 |

**Cobertura consolidada**: todo AC de RF-MVP-01 a 08 tem ao menos um caso de teste
mapeado acima — critério de aceite de `QA-M-01` satisfeito. A única exceção
explícita é a metade de RF-MVP-05 AC2 relativa à propagação Realtime entre
abas/dispositivos (Seção 6, gap sinalizado, não escondido).

---

## 3. Casos de Teste — Regras de Negócio Transversais (suporte aos RFs acima)

| Regra | Caso de teste | Local | Tipo |
|---|---|---|---|
| RN-08 (inativação, não exclusão física, de conta vinculada) | CASO 4/4b | `supabase/tests/be_m01_budget_and_guards.test.sql` | SQL |
| RN-09 (bloqueio de exclusão de categoria vinculada, incl. budget) | CASO 5/6 | `supabase/tests/be_m01_budget_and_guards.test.sql` | SQL |
| RLS ownership (usuário A nunca lê/escreve dado de B) | 9 tabelas, 9 casos | `supabase/tests/be_m11_rls_cross_user.test.sql` | SQL |
| Autorização de referência cruzada entre tabelas "ownable" (IDOR, SEC-DEBT-002/`BE-M-13`) | 9 casos, incl. reprodução exata do cenário do DevSecOps | `supabase/tests/be_m13_fk_ownership.test.sql` | SQL |
| Cadastro restrito a allow-list (`BE-M-12`) | RED→GREEN + smoke `POST /auth/v1/signup` real | `supabase/tests/be_m12_restrict_signup.test.sql` | SQL + e2e |

Estes casos não mapeiam para um AC literal de RF-MVP-01 a 08, mas sustentam a
integridade referencial e a segurança que vários desses ACs pressupõem (ex.: RN-08
é o mecanismo por trás de RF-MVP-01 AC4). Referenciados aqui por completude —
`QA-M-02` (tarefa separada, `Não iniciada`) é quem formaliza este bloco como
entrega própria de QA.

---

## 4. Estratégia de Integração Cruzada — Mapa de Dependências Testadas

| Par | O que é verificado | Evidência |
|---|---|---|
| `FE-M-03` ↔ `BE-M-06` | Fila offline sincroniza via `POST /transactions` real, item só sai da fila após sucesso confirmado do servidor | `frontend/src/lib/offline/sync.test.ts` (`syncPendingTransactions`, `realSyncClient`) |
| `FE-M-04` ↔ `BE-M-09` | Cliente WebAuthn/MFA por e-mail integra contra o contrato real das 3 Edge Functions, incluindo mensagens de erro distintas por código HTTP | Leitura direta de código (QA-REPORT 2ª rodada, Seção 2.4, FE-M-04) + `be_m09_webauthn_replay.test.ts` |
| `FE-M-06`/`FE-M-08` ↔ `BE-M-01` | `409` real de RN-08/RN-09 é tratado na UI com o texto/CTA corretos, não um erro genérico | `AccountsPage.test.tsx`, `CategoriesPage.test.tsx` |
| `FE-M-10` ↔ `BE-M-07` | Achado de `provisioned_balance_cents` (double-counting) documentado no Backend não vazou para a UI — Frontend usa exclusivamente `current_total_balance_cents` | Grep confirmado em `DashboardPage.tsx` (QA-REPORT 2ª rodada) |
| `FE-M-11` ↔ `BE-M-08` | 3 níveis de alerta (`none`/`warning`/`exceeded`) do `get_budget_status` renderizam com cor+ícone+texto consistentes | `ProgressBar.test.tsx` + `be_m08_budget_status.test.sql` |

---

## 5. Estratégia de Regressão — Gatilho e Escopo

- **Gatilho**: qualquer migration nova sobre `public`, qualquer alteração de
  Edge Function, ou qualquer tarefa de Frontend que altere um arquivo já coberto
  por teste existente.
- **Escopo mínimo**: suíte completa de `supabase/tests/*.test.sql` (hoje 14
  arquivos, incluindo `be_m13_fk_ownership.test.sql`) + `deno test` de
  `backup-export/lib.test.ts` + `npx vitest run` completo (hoje 34 arquivos, 140
  testes) + `npm run build` (falha de build é tratada como regressão, não só
  erro de tipo isolado).
- **Critério de fechamento de tarefa**: nenhuma tarefa é marcada `Concluída` por
  Backend/Frontend com regressão quebrada — convenção já seguida em todas as 23
  tarefas validadas nas rodadas anteriores de `QA-REPORT.md`.
- **Regressão de lote** (unidade de ritmo do `EXECUTION-FLOW.md`): ao fechar um
  lote inteiro (Seção 7 do `TASK.md`, ainda vazia nesta data), a regressão acima é
  o piso mínimo — o veredito de fechamento de lote (QA + DevSecOps + Tech Lead)
  não dispensa esta suíte.

---

## 6. Gaps de Cobertura Identificados (a fechar, não maquiados)

| # | Gap | AC afetado | Por que não está coberto hoje | Recomendação |
|---|---|---|---|---|
| G-TP-01 | Propagação de saldo/lançamento via Supabase Realtime para *outras* abas/dispositivos da mesma sessão | RF-MVP-05 AC2 (metade "outras abas/dispositivos") | Nenhum arquivo de código do Frontend registra um canal `postgres_changes`/`channel(...)` (grep confirmado em `frontend/src`, `2026-09-03`); a arquitetura prevê o mecanismo (`SDD.md` Seção 2.5, tabela de componentes linha `Supabase Realtime`), mas este `TEST-PLAN.md` não afirma se a lacuna é de implementação ou só de instrumentação de teste — isso é validação de tarefa, fora do escopo desta rodada (só planejamento). Fica registrado para a próxima rodada de `acceptance-criteria-validation` confirmar contra o código real e, se for lacuna de implementação, decidir com Backend/Frontend/Tech Lead se é débito técnico ou bloqueio | Antes de fechar o lote que contém `FE-M-10`/`BE-M-07` como lote formal (Seção 7 do `TASK.md`), confirmar com o time responsável se o canal Realtime existe; se não existir, registrar como débito técnico com dono e prazo, dado que a metade "mesmo cliente" do AC já está coberta e o risco residual (saldo desatualizado em uma 2ª aba do mesmo usuário) é baixo para um produto de usuário único (RNF-09) |
| G-TP-02 | Caminho "usuário novo" do seed de taxonomia padrão (`handle_new_user()`) | RF-MVP-03 AC1 | Toda a suíte SQL reaproveita um profile já existente (`SELECT id INTO v_user_id FROM public.profiles LIMIT 1`) — nenhum teste automatizado cria de fato um novo usuário e verifica que a taxonomia padrão aparece no primeiro acesso; a evidência hoje é só a auditoria de equivalência de dados já existentes (`AUDITORIA-BE-M-00.md` Seção 1), não uma execução do gatilho real | Um teste dedicado (ou extensão do padrão já usado em `be_m13_fk_ownership.test.sql`, que cria um usuário B real dentro da transação via allow-list temporária) que insere um novo `auth.users` e confirma a taxonomia padrão semeada antes do `ROLLBACK` |

Nenhum outro AC de RF-MVP-01 a 08 ficou sem teste mapeado — os dois gaps acima são
específicos e já isolados, não indicam um padrão sistêmico de ausência de
cobertura no restante da matriz da Seção 2.

---

## Checklist de Pronto (auto-verificação do QA)

- [x] Todo AC de RF-MVP-01 a 08 tem ao menos um caso de teste mapeado (Seção 2) —
      critério de aceite literal de `QA-M-01`
- [x] Estratégia funcional, de integração, de regressão e e2e documentadas
      (Seção 1), refletindo o que já está em vigor, não uma proposta hipotética
- [x] Testes automatizados já existentes referenciados por arquivo e caso
      específico, não por afirmação genérica de "está testado"
- [x] Gaps de cobertura sinalizados explicitamente, sem disfarçar como cobertos
      (Seção 6)
- [x] Regras de negócio transversais que sustentam os ACs do MVP documentadas
      (Seção 3), sem duplicar o escopo de `QA-M-02`

**TEST-PLAN.md pronto — `QA-M-01` fechada nesta rodada.**
