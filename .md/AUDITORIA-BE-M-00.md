# AUDITORIA-BE-M-00.md

**Dono**: Backend
**Data**: 2026-09-02
**Tarefa**: `BE-M-00` (`TASK.md` Seção 3.1) — auditoria e formalização dos objetos
reaproveitados do schema `public` do projeto Supabase `xrcxbzrglndetrrhavhc`
(`mymoney`), conforme a tabela de auditoria do `ADR-012` e as condições de aceite
nº 1/nº 2 do CTO (`CTO-REVIEW.md`, "Gate 2 (Reaberto por Bloqueio 003)").
**Método**: inspeção via `supabase db query --linked` (Management API, sem Docker/
senha) contra o schema real; nenhuma linha de dado real foi alterada ou removida
(confirmado — ver Seção 8). Toda consulta usada aqui é somente leitura, exceto o
teste de regressão (Seção 4), que roda inteiramente dentro de `BEGIN; ... ROLLBACK;`.
**Consumidores**: `BE-M-01` a `BE-M-12` (pré-requisito, DIR-02/G-01), `qa`, `devsecops`.

---

## 1. Tabelas — Equivalência Campo a Campo

Confirmado: as 7 tabelas existentes batem 1:1 com o desenho de `SDD.md` Seção 5.1/
`ADR-012`. Nenhuma recriação necessária.

| Tabela | PK | FK relevantes | RLS | Decisão |
|---|---|---|---|---|
| `accounts` | `id uuid` | `user_id → auth.users` (`ON DELETE CASCADE`) | Habilitada, `auth.uid() = user_id` + gate MFA (`app_email_mfa_verified = 'true'`) | **Adotar** |
| `categories` | `id uuid` | `parent_category_id → categories.id` (self, `NO ACTION`), `user_id → auth.users` (`CASCADE`) | Habilitada, `user_id = auth.uid() OR user_id IS NULL` (SELECT) + gate MFA | **Adotar** |
| `payment_methods` | `id uuid` | `account_id → accounts.id` (`CASCADE`), `user_id → auth.users` (`CASCADE`) | Habilitada, `auth.uid() = user_id` + gate MFA | **Adotar, com achado** (Seção 3) |
| `transactions` | `id uuid` | `account_id`/`destination_account_id → accounts.id` (`CASCADE`), `category_id → categories.id` (`CASCADE`), `payment_method_id → payment_methods.id` (`NO ACTION`), `user_id → auth.users` (`CASCADE`) | Habilitada, `auth.uid() = user_id` + gate MFA | **Adotar, com achado crítico** (Seção 2) |
| `profiles` | `id uuid` (= `auth.users.id`) | `id → auth.users` (`CASCADE`) | Habilitada, `auth.uid() = id` (SELECT/UPDATE only, sem INSERT/DELETE via API) | **Adotar, com achado** (Seção 6 — exposição de `pin_hash`) |
| `webauthn_credentials` | `id uuid` | `user_id → auth.users` (`CASCADE`) | Habilitada, `auth.uid() = user_id` (sem gate MFA — correto, precisa funcionar antes do MFA estar verificado) | **Adotar** |
| `email_mfa_challenges` | `id uuid` | `user_id → auth.users` (`CASCADE`) | Habilitada, sem policy de SELECT/INSERT/UPDATE/DELETE para `authenticated` (só acessível via função `SECURITY DEFINER`) | **Adotar** |

**Colunas de `transactions` que antecipam Fase 2/3** (`recurring_rule_id`,
`installment_plan_id`, `installment_number`, `card_invoice_id`, `attachment_id`,
`source`, `import_staging_id`, `external_ref`) — confirmadas presentes, todas
`nullable`, sem FK ainda (as tabelas referenciadas não existem). Adotadas como
estão; a `FOREIGN KEY` de cada uma é adicionada quando a tabela correspondente for
criada (Fase 2/3), nunca redesenhadas agora.

**Enums confirmados**: `account_type` (checking/savings/wallet/investment),
`category_kind` (income/expense), `payment_method_type` (pix/debit_card/
credit_card/boleto/cash — os 5 tipos padrão de RF-MVP-02), `transaction_kind`
(income/expense/transfer), `transaction_source` (manual/audio/ocr/import/
openfinance), `transaction_status` (pending/cleared/reconciled).

**Dado real confirmado intacto** (contagem em 2026-09-02, antes e depois de toda
consulta desta auditoria): 1 `profiles`, 12 `categories`, 0 `accounts`, 0
`transactions`, 0 `payment_methods`, 0 `webauthn_credentials`, 0
`email_mfa_challenges`. Nenhuma tabela de negócio além de `profiles`/`categories`
tem dado real hoje — o que reduz o risco de qualquer migration aditiva subsequente
(`BE-M-01` em diante) a praticamente zero em termos de "dado a perder".

---

## 2. Achado Crítico — FK `ON DELETE CASCADE` em `transactions.account_id` e
`transactions.category_id` contradiz RN-08/RN-09/DIR-05

**Achado**: `transactions_account_id_fkey` e `transactions_category_id_fkey` estão
definidas com `ON DELETE CASCADE`. Isso significa que, hoje, um `DELETE` físico em
`public.accounts` ou `public.categories` **apagaria silenciosamente todos os
lançamentos vinculados**, em vez de ser bloqueado — o oposto do que RN-08
("exclusão de conta com lançamentos vinculados vira inativação, não exclusão
definitiva") e RN-09 ("exclusão de categoria com lançamentos vinculados é
bloqueada") exigem, e do que `DIR-05`/`G-05` mandam ("enforced a nível de banco").

**Por que isto não é uma perda de dado hoje**: `transactions` tem 0 linhas reais
(Seção 1) — o risco é 100% prospectivo (a partir do momento em que o usuário
começar a lançar), não retroativo.

**Decisão** (dentro do escopo de auditoria, não é desvio que exija `BLOCKERS.md` —
é exatamente o que `DIR-05`/`BE-M-01` já preveem: "auditam se essas constraints já
existem... antes de assumir que precisam ser criadas do zero", e aqui a resposta é
"não existem, e pior, o oposto existe"): `BE-M-01` adiciona um trigger `BEFORE
DELETE` em `accounts` e em `categories` que levanta exceção se existir
`transactions` vinculada, bloqueando o `DELETE` (e, por consequência, o cascade)
antes que ele aconteça — sem tocar na definição da FK existente (puramente
aditivo: `CREATE FUNCTION` + `CREATE TRIGGER`, DIR-03). A FK `ON DELETE CASCADE`
permanece como está (evita qualquer discussão sobre "redefinição" de constraint
sob G-02) — o trigger intercepta o `DELETE` antes de o Postgres processar o
cascade, então a FK nunca chega a ser exercida no caso vinculado. Ver `BE-M-01`
(migration `20260903000100_be_m01_budget_and_rn08_rn09_guards.up.sql`).

---

## 3. Achado — `payment_methods` não tem coluna "padrão" e exige `account_id`

**Achado 1**: ao contrário de `categories.is_system_default`, `payment_methods`
não tem coluna equivalente. `BE-M-02`/`BE-M-04` precisam de uma para marcar as
formas de pagamento pré-cadastradas como não editáveis/excluíveis (RF-MVP-02 AC1).

**Achado 2**: `payment_methods_account_or_card_check` exige `account_id IS NOT
NULL` para todo tipo diferente de `credit_card`, e `credit_card_id IS NOT NULL`
para `credit_card` — mas `CreditCard` só existe a partir de `BE-F2-01` (Fase 2).
Logo, tecnicamente **não é possível** pré-cadastrar uma forma de pagamento do tipo
`credit_card` ("crédito") antes da Fase 2, apesar de RF-MVP-02 AC1 citar "Pix,
débito, **crédito**, boleto, dinheiro" como as 5 pré-cadastradas.

**Resolução (desvio pequeno, documentado, não escalado)**: `RF-F2-01` AC1 já
resolve essa aparente contradição de forma mais precisa que `RF-MVP-02` AC1:
"Cartão cadastrado disponibiliza 'crédito' como forma de pagamento vinculada" —
ou seja, o próprio corpo de requisitos já trata "crédito" como algo que só existe
a partir do cadastro de um cartão (Fase 2), não como um registro vazio
pré-existente no MVP. Interpretação adotada: `BE-M-02`/`BE-M-04` seedam as **4**
formas de pagamento não-cartão (Pix, débito, boleto, dinheiro) — não as "5" — cada
uma vinculada à primeira conta ativa do usuário (ver Seção 3.1); "crédito" passa a
existir de fato quando `BE-F2-01` cadastra o primeiro cartão, consistente com o
próprio check constraint do schema reaproveitado e com `RF-F2-01`. Nenhum ADR/SDD
precisa ser alterado — é uma leitura conjunta de dois requisitos já existentes,
não uma decisão de arquitetura nova.

### 3.1 Consequência de design: seed fica amarrado à criação da primeira conta

Como `account_id` é obrigatório para as 4 formas de pagamento não-cartão, elas não
podem ser semeadas no cadastro do usuário (`auth.users`/`handle_new_user()`) —
ainda não existe conta nesse momento. `BE-M-02` semeia as 4 formas padrão via
trigger `AFTER INSERT ON accounts`, disparado apenas na **primeira** conta ativa
de cada usuário (idempotente — não semeia de novo em contas subsequentes). Isso é
compatível com o fluxo de onboarding já desenhado por UX/UI (`FE-M-05`,
S-ONB-01 "primeira conta" antes de qualquer outra tela) — na prática, as formas de
pagamento padrão existem "desde o primeiro acesso" real ao produto (RF-MVP-02
AC1), mesmo que tecnicamente semeadas alguns milissegundos depois do cadastro de
usuário, no momento da primeira conta.

---

## 4. `apply_transaction_effect` — Teste de Regressão

Exigido por `ADR-012` ("Backend escreve teste automatizado de regressão antes de
qualquer alteração futura — sem cobertura de teste conhecida hoje"). Arquivo:
`supabase/tests/apply_transaction_effect.test.sql`, executado via:

```
supabase db query --linked --file supabase/tests/apply_transaction_effect.test.sql
```

9 casos cobertos (INSERT/UPDATE/DELETE de `income`/`expense`/`transfer`,
`accounts_init_current_balance`, `transactions_set_status` — hoje/futuro,
`transactions_block_inactive_account`), todo o script dentro de `BEGIN;
...ROLLBACK;` — nenhuma linha real alterada. **Resultado: PASS, todos os 9 casos
passaram** (executado em 2026-09-02, ver histórico de execução desta sessão).
Confirmado por consulta pós-execução: `SELECT count(*) FROM accounts WHERE name
LIKE 'TEST_%'` retornou `0` — nenhum resíduo.

**Achado adicional do teste (CASO 8b)**: `apply_transaction_effect` aplica o
efeito no saldo da conta **imediatamente na inserção**, independentemente de
`status` ser `pending` ou `cleared` (a função só olha `kind`, nunca `status`).
Ou seja, um lançamento com data futura (`pending`) já impacta
`accounts.current_balance_cents` no momento da inserção, não apenas quando
`fn_clear_due_transactions` o transiciona para `cleared` no vencimento. Isto tem
implicação direta para a auditoria de `get_month_provision` (`BE-M-07`, Seção 5).

---

## 5. `fn_clear_due_transactions` vs. a regra de negócio real (achado de numeração)

**Achado**: `TASK.md`/`ADR-012` referem-se a esta função como implementando
"RN-11 (transição prevista→efetivado por vencimento)". **Isto está incorreto**:
`PRD-TECNICO.md` Seção 3 define `RN-11` como "Baseline real de M2 (volume de
lançamentos/mês) apurado operacionalmente" — uma regra completamente diferente,
sem nenhuma relação com transição de status de lançamento. A regra de "lançamento
previsto (pendente) → lançamento efetivado no vencimento" só aparece
explicitamente no corpo de `RF-F2-06` (Contas Fixas, **Fase 2**), sem numeração
`RN-NN` própria no MVP.

**Análise de impacto**: isto é um erro de referência textual no `TASK.md`/`ADR-012`
(citação de RN incorreta), não um problema de arquitetura ou uma ambiguidade que
mude o resultado — a função `fn_clear_due_transactions()` em si (`UPDATE
transactions SET status='cleared' WHERE status='pending' AND transaction_date <=
hoje`) é semanticamente correta e consistente com o padrão geral do produto
(qualquer lançamento datado no futuro nasce `pending` e vira `cleared` quando a
data chega, seja ele manual — MVP — ou de conta fixa — Fase 2). **Decisão (desvio
pequeno, documentado, não escalado)**: `fn_clear_due_transactions`/`pg_cron`
(`*/15 * * * *`) são **adotados como estão** para o MVP — a transição
pending→cleared de lançamentos manuais com data futura é uma funcionalidade
legítima e já correta, mesmo sem numeração `RN-NN` própria explícita no MVP (é uma
generalização direta e não-controversa da mesma regra que `RF-F2-06`/`RN-05`
formalizam para Fase 2). Nenhuma migration necessária. `BE-M-06` deve citar este
achado (não "RN-11") ao referenciar a regra em código/documentação/API-CONTRACT.

---

## 6. Segurança — Achado: `profiles.pin_hash` legível via `SELECT` direto do cliente

**Achado**: a policy `profiles_select_own` (`auth.uid() = id`) é uma policy de
**linha** (RLS), sem restrição de coluna. Como não há `REVOKE` de coluna aplicado,
o cliente autenticado (`authenticated` role) pode, hoje, rodar
`SELECT pin_hash, pin_failed_attempts, pin_locked_until FROM public.profiles WHERE
id = auth.uid()` diretamente via PostgREST — expondo o hash bcrypt do PIN (e o
estado de tentativas/bloqueio) pela API REST, mesmo havendo RPCs dedicadas
(`set_pin`/`verify_pin`) que deveriam ser o único canal de acesso a esse dado.

**Risco**: exfiltração do hash bcrypt (mesmo com `crypt`/`gen_salt('bf')`, um hash
exposto é sempre pior que um hash nunca exposto — abre superfície a ataque de
força bruta offline, ainda que caro). Não é um achado teórico de "outro produto":
é uma configuração de GRANT/coluna desta própria implementação.

**Decisão**: tratado em `BE-M-09` (auditoria de `webauthn_credentials`/
`set_pin`/`verify_pin`, DIR-02) — migration aditiva revogando `SELECT` de coluna
em `pin_hash`, `pin_failed_attempts`, `pin_locked_until` para o role
`authenticated` (`REVOKE (pin_hash, pin_failed_attempts, pin_locked_until) ON
public.profiles FROM authenticated`), preservando `set_pin`/`verify_pin`
(`SECURITY INVOKER`, mas chamadas como owner via função) como único canal de
leitura/escrita indireta desses campos. Não é destrutivo (não altera dado, só
GRANT), não exige revisão do CTO sob G-02.

---

## 7. `set_pin` / `verify_pin` — Inspeção de Corpo (condição da ADR-013)

Corpo de ambas as funções inspecionado por completo (código-fonte capturado
nesta auditoria, ver histórico de sessão). Achados:

- **`set_pin(new_pin text)`**: valida formato (4-6 dígitos numéricos), grava
  `pin_hash = crypt(new_pin, gen_salt('bf'))`, zera tentativas/bloqueio. Chamada
  única, no momento de configurar/trocar o PIN — não é o gesto de desbloqueio.
- **`verify_pin(candidate_pin text)`**: compara `crypt(candidate, pin_hash) =
  pin_hash`; se errar 5 vezes, bloqueia por 15 minutos (`pin_locked_until = now()
  + 15min`) — **não** 5 minutos como `DIR-18`/`G-17` (baseline vigente) exigem.
  Ver achado de divergência abaixo.

**Pergunta central da ADR-013**: `verify_pin` é o mecanismo *primário* de
desbloqueio (exigindo rede a cada gesto, o que contradiria `ADR-010`/RNF-04) ou
uma validação *secundária/opcional*?

**Resposta**: a própria função não impõe qual papel ela ocupa — isso é decidido
pelo consumidor (Frontend). `ADR-010` (Bloqueio 001, já `Resolvido`) e
`UX-SPEC.md` (S-AUTH-03/04/05) **já fixaram** que o gesto de desbloqueio é a
checagem local de hash de PIN em IndexedDB (100% offline) — `DIR-16`/`DIR-17`. Não
há nenhuma tarefa em `TASK.md` (`FE-M-04`) que planeje chamar `verify_pin` como
parte do gesto de desbloqueio em si. **Decisão**: `verify_pin`/`set_pin` são
adotadas como está, no papel de **mecanismo secundário/servidor** — usadas para
(a) configurar/trocar o PIN (`set_pin`, precisa mesmo de rede, é uma ação
explícita do usuário nas Configurações) e (b) revalidação server-side pontual em
ações sensíveis (ex.: antes de `BE-F3-09`, exclusão de conta), nunca como gate
primário de desbloqueio. **Compatível com `ADR-010`, adotado sem nova revisão** —
não é necessário abrir novo `BLOCKERS.md` (o cenário de conflito que a `ADR-013`
descreveu como gatilho de escalonamento não se concretizou).

**Achado à parte, não relacionado à pergunta da ADR-013**: `verify_pin` bloqueia
por **15 minutos**, enquanto `DIR-18`/`G-17` fixam **5 minutos** como baseline
para o *gesto de desbloqueio local* (que é implementado no client, IndexedDB, e
não usa esta função). Como `verify_pin` não é o gesto de desbloqueio (ver acima),
essa diferença **não viola `DIR-18`/`G-17`** diretamente — mas é uma inconsistência
de UX/produto que vale registrar: se `BE-M-09`/Frontend decidirem futuramente usar
`verify_pin` em algum fluxo de revalidação visível ao usuário, o tempo de bloqueio
exibido (15 min) precisa ser o real do servidor, não presumido como 5 min. Nenhuma
ação corretiva necessária agora — só uma nota de atenção para quem consumir esta
função depois.

---

## 8. `custom_access_token_hook` — Ativação do Auth Hook (item não resolvido)

Confirmada a existência da função (`SECURITY DEFINER`, `search_path = public,
pg_temp`, assinatura de Auth Hook do GoTrue) e sua lógica (injeta
`app_email_mfa_verified=true` no claim do JWT se existir um
`email_mfa_challenges` consumido para a `session_id` do evento). **A ativação real
do hook nas configurações de Auth do projeto (Dashboard → Authentication → Hooks)
não pôde ser confirmada nem refutada com a ferramentação disponível nesta sessão**
(`supabase db query --linked` só alcança o banco, não as configurações do GoTrue;
`supabase config push` só escreve, não lê/lista a configuração remota atual; e não
tentei extrair o token de acesso do CLI para chamar a Management API de
configurações de Auth diretamente, pela mesma razão de escopo seguro já registrada
no item 6 do `SPK-001`/Bloqueio 003).

**Isto não é tratado como bloqueio novo** — é a mesma categoria de pendência já
prevista e aceita pelo CTO na condição de aceite nº 4 (`ADR-013`, "Negative
Consequences": "Ativação real do Auth Hook... segue não confirmada nesta rodada...
fora do alcance de uma inspeção de schema via CLI/SQL") e análoga ao item 6 do
`SPK-001` (plano/tier). **Recomendação formal**: confirmação manual do stakeholder/
CTO em `https://supabase.com/dashboard/project/xrcxbzrglndetrrhavhc/auth/hooks`
antes de qualquer funcionalidade de produção depender do gate de MFA por claim —
`BE-M-09` implementa o código assumindo que o hook está ativo (é o cenário mais
provável, dado que `email_mfa_challenges`/`custom_access_token_hook` foram
deliberadamente construídos juntos na implementação anterior), mas permanece
**pendente de confirmação**, registrado explicitamente no critério de aceite de
`BE-M-09` como ressalva não-bloqueante — mesmo padrão do item 6 do `SPK-001`.

---

## 9. `handle_new_user()` — Efeito Colateral (encaminhado para `BE-M-12`)

Confirmado exatamente como `ADR-012` descreve: `SECURITY DEFINER`, insere `id` em
`profiles` para todo novo usuário de `auth.users`, `ON CONFLICT (id) DO NOTHING`.
Nenhum efeito colateral adicional além do já documentado. Mitigação (restringir
cadastro público) implementada em `BE-M-12`, não nesta tarefa — ver Seção "Status"
do `TASK.md`.

---

## 10. Demais Triggers — Enumeração Individual (item "c" do critério de aceite)

Todos os 13 triggers de `public` nomeados e documentados (nenhum trigger
"desconhecido" restante):

| Trigger | Tabela | Timing/Evento | Função | Decisão |
|---|---|---|---|---|
| `accounts_init_current_balance` | `accounts` | `BEFORE INSERT` | `accounts_init_current_balance()` | Adotar |
| `accounts_adjust_balance_on_initial_update` | `accounts` | `BEFORE UPDATE` | `accounts_adjust_balance_on_initial_update()` | Adotar |
| `accounts_set_updated_at` | `accounts` | `BEFORE UPDATE` | `set_updated_at()` | Adotar |
| `categories_set_updated_at` | `categories` | `BEFORE UPDATE` | `set_updated_at()` | Adotar |
| `categories_validate_hierarchy` | `categories` | `BEFORE INSERT/UPDATE` | `validate_category_hierarchy()` (limita a 1 nível, bloqueia auto-referência, valida `user_id` do pai) | Adotar |
| `payment_methods_set_updated_at` | `payment_methods` | `BEFORE UPDATE` | `set_updated_at()` | Adotar |
| `profiles_set_updated_at` | `profiles` | `BEFORE UPDATE` | `set_updated_at()` | Adotar |
| `transactions_before_insert_block_inactive_account` | `transactions` | `BEFORE INSERT` | `transactions_block_inactive_account()` | Adotar |
| `transactions_before_insert_set_status` | `transactions` | `BEFORE INSERT` | `transactions_set_status()` | Adotar |
| `transactions_maintain_account_balance` | `transactions` | `AFTER INSERT/UPDATE/DELETE` | `transactions_maintain_account_balance()` → `apply_transaction_effect()` | Adotar (testado, Seção 4) |
| `transactions_set_updated_at` | `transactions` | `BEFORE UPDATE` | `set_updated_at()` | Adotar |

Nenhum trigger de "hierarquia"/"status" adicional além dos listados acima e em
`ADR-012` foi encontrado. Item "c" do critério de aceite de `BE-M-00`: **satisfeito
integralmente**.

---

## 11. Roles, Extensions, Storage (confirmação — sem mudança em relação ao `SPK-001`)

- **Roles**: só os padrão de projeto Supabase (`anon`, `authenticated`,
  `authenticator`, `dashboard_user`, `postgres`, `service_role`,
  `supabase_admin`, etc.) + `cli_login_postgres` (sessão local). Nenhum role
  customizado de aplicação. **Confirmado, sem mudança.**
- **Extensions**: `pg_cron` 1.6.4, `pg_stat_statements` 1.11, `pgcrypto` 1.3,
  `plpgsql` 1.0, `supabase_vault` 0.3.1, `uuid-ossp` 1.1. **Confirmado, sem
  mudança.**
- **`pg_cron`**: 1 job ativo — `fn-clear-due-transactions` (`*/15 * * * *` →
  `select public.fn_clear_due_transactions();`). **Confirmado, sem mudança.**
- **Storage**: `storage.buckets` vazio — nenhum bucket criado. **Confirmado, sem
  mudança.** Relevante para `BE-M-09`/Fase 3 (fotos de recibo, DIR-29/G-18):
  bucket a criar como privado desde o início.

---

## 12. Resumo de Decisões (tabela consolidada)

| # | Objeto/Achado | Decisão | Tarefa que resolve |
|---|---|---|---|
| 1 | 7 tabelas estruturais | Adotar como estão | `BE-M-01` confirma, sem recriar |
| 2 | FK `CASCADE` em `transactions.account_id`/`category_id` (RN-08/RN-09) | Adotar com condição — adicionar trigger `BEFORE DELETE` de bloqueio | `BE-M-01` |
| 3 | `payment_methods` sem coluna "padrão"; check constraint exige `account_id`/`credit_card_id` | Adotar com condição — seed das 4 formas não-cartão amarrado à 1ª conta; "crédito" só na Fase 2 | `BE-M-02`/`BE-M-04` |
| 4 | `apply_transaction_effect` (+ triggers de saldo/status) | Adotar — teste de regressão escrito e **PASS** | `BE-M-00` (esta tarefa) |
| 5 | `fn_clear_due_transactions` (numeração RN-11 incorreta no `TASK.md`/`ADR-012`) | Adotar como está — função correta, só a citação de RN está errada | `BE-M-06` (corrigir citação) |
| 6 | `profiles.pin_hash` legível via SELECT direto | Adotar com condição — `REVOKE` de coluna | `BE-M-09` |
| 7 | `set_pin`/`verify_pin` | Adotar como mecanismo secundário/servidor, não gate primário — compatível com `ADR-010`, sem novo `BLOCKERS.md` | `BE-M-09` |
| 8 | `custom_access_token_hook` — ativação do Auth Hook | **Não confirmável via ferramentação atual** — pendência registrada, não bloqueante | `BE-M-09` (ressalva) |
| 9 | `handle_new_user()` — cadastro não controlado | Adotar função como está; mitigar efeito colateral | `BE-M-12` |
| 10 | 13 triggers | Todos enumerados e documentados individualmente | `BE-M-00` (esta tarefa) |
| 11 | Roles/extensions/cron/storage | Confirmados sem mudança em relação ao `SPK-001` | — |
| 12 | 3 Edge Functions (`auth-email-mfa`, `webauthn-register`, `webauthn-authenticate`) — auditoria formal item a item (`DIR-33`) | Adotar as 3 — mitigação de replay de challenge (Bloqueio 006) aplicada e provada por teste E2E | `BE-M-09` (Seção 14) |

Nenhum objeto foi tratado como "corretude comprovada só por já funcionar hoje"
(condição de aceite nº 2 do CTO) — todo item acima tem achado + decisão + tarefa
de destino explícitos. Nenhum achado desta auditoria exigiu abertura de novo
`BLOCKERS.md` — todos os itens (2, 3, 5, 6, 7) foram pequenos desvios de
implementação, resolvidos e documentados dentro do próprio escopo de auditoria,
conforme a disciplina prevista em `DIR-02`. O item 8 é uma pendência de
confirmação externa (dashboard), não uma ambiguidade de arquitetura — tratado como
ressalva, mesmo padrão do item 6 do `SPK-001`.

---

## 13. Edge Functions — Auditoria (`DIR-33`, pré-requisito de `BE-M-10`)

**Contexto**: `DIR-33` (nova, `BLOCKERS.md` Bloqueio 005) exige que "Edge
Functions" seja categoria explícita de auditoria de objeto reaproveitado,
mesmo nível de rigor de tabela/função/trigger/policy (`DIR-02`), rodada
**antes** de qualquer código novo em toda tarefa que crie uma Edge Function —
`BE-M-10` é a primeira a carregar esse pré-requisito como condição de aceite
explícita.

**Método**: `supabase functions list --project-ref xrcxbzrglndetrrhavhc` e
`supabase secrets list --project-ref xrcxbzrglndetrrhavhc`, executados
**antes** de escrever qualquer arquivo em `supabase/functions/backup-export/`
(2026-09-03, mesma sessão de `BE-M-10`/`BE-M-11`).

**Achado — `functions list`**: 3 Edge Functions ativas (`auth-email-mfa`,
`webauthn-authenticate`, `webauthn-register`) — as mesmas 3 já adotadas por
`BE-M-09`/Bloqueio 005, todas do domínio de Autenticação/MFA/WebAuthn.
**Nenhuma Edge Function de backup/export/disaster-recovery existe.**

**Achado — `secrets list`**: `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`,
`SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` (secrets de sistema, geridos pelo
próprio Supabase), `WEBAUTHN_ORIGIN`/`WEBAUTHN_RP_ID`/`WEBAUTHN_RP_NAME`
(datados de 2026-08-28, domínio WebAuthn, já conhecidos). **Nenhum secret com
nome/padrão sugestivo de storage externo de backup** (ex.: `AWS_*`, `S3_*`,
`BACKBLAZE_*`, `R2_*`, `BACKUP_*`) existia antes desta tarefa.

**Decisão**: ao contrário de `BE-M-09`, não há aqui nenhum objeto da
implementação anterior a auditar/adotar/adaptar — `BE-M-10` é escrita do zero
com segurança, sem risco de duplicar trabalho já existente nem de criar dois
mecanismos paralelos de backup. Implementação em
`supabase/functions/backup-export/` (`index.ts` + `lib.ts`, 16 testes
unitários via `deno test`), migration
`20260903090000_be_m10_backup_export.sql` (`pg_net`, tabela
`backup_export_log`, funções `trigger_backup_export()`/
`check_backup_health()`, agendamento `pg_cron`). Nenhum achado exigiu novo
`BLOCKERS.md` quanto à existência do objeto em si — o achado registrado em
`BLOCKERS.md` (Bloqueio 007) é sobre a **ausência de credenciais reais** de um
bucket de storage externo (item de provisionamento, não de auditoria de
objeto reaproveitado).

---

## 14. Edge Functions — Auditoria Formal Item a Item (`BE-M-09`, condição de aceite nº 2 do CTO)

**Contexto**: a Seção 13 (acima) cobriu o pré-requisito de processo de
`DIR-33` para `BE-M-10` (rodar `supabase functions list`/`secrets list`
**antes** de escrever código novo). Esta seção é a auditoria **formal**,
item a item, das 3 Edge Functions da implementação anterior adotadas por
decisão do Tech Lead (`BLOCKERS.md` Bloqueio 005, "Caminho 1") como
implementação real de RF-MVP-08 — mesmo rigor da tabela de auditoria do
`ADR-012` (contrato de entrada/saída, achado, decisão por objeto), exigida
explicitamente como condição de aceite de `BE-M-09` (`TASK.md` Seção 3.1).

**Método**: leitura completa do código-fonte das 3 functions (já inspecionado
por `functions download`, só leitura, no Bloqueio 005), confronto contra
RF-MVP-08 AC1-3 (`PRD-TECNICO.md`) e `ADR-005`/`ADR-010`/`ADR-013`, e
confirmação de que a mitigação do risco de replay (`BLOCKERS.md` Bloqueio
006, veredito do CTO "mitigar agora") foi de fato implementada e testada
antes de fechar o item como "Adotar" sem ressalva.

### 14.1 `auth-email-mfa` — Segundo fator por e-mail

**Contrato**:

| Ação | Entrada | Saída (sucesso) | Saída (erro) |
|---|---|---|---|
| `POST /functions/v1/auth-email-mfa` `{action:"request"}` (JWT AAL1 no header `Authorization`) | — | `200 {success:true}` | `429` (rate limit 5/30min ou cooldown 60s), `502` (falha no envio de e-mail), `500` (erro interno), `401` (sem JWT válido) |
| `POST /functions/v1/auth-email-mfa` `{action:"verify", code:"123456"}` | `code`: string, 6 dígitos | `200 {success:true}` | `400` (código inválido/expirado/incorreto), `429` (5 tentativas esgotadas), `401`, `500` |

**Comparação com RF-MVP-08**: não é a implementação de AC1 (PIN/biometria) em
si — é uma camada adicional de segurança já em produção (gate MFA via claim
`app_email_mfa_verified` em `accounts`/`categories`/`payment_methods`/
`transactions`, `custom_access_token_hook`, auditado em `AUDITORIA-BE-M-00.md`
Seção 8). Nenhum AC de RF-MVP-08 exige ou proíbe essa camada — é reforço
consistente com o espírito de RNF de segurança do produto, não uma
duplicação nem um conflito de requisito.

**Comparação com ADR-005/ADR-010/ADR-013**: `ADR-013` já avaliou e endossou
o gate de MFA por claim JWT como compatível com a arquitetura de autenticação
deste produto (Supabase Auth + WebAuthn/PIN local para desbloqueio, MFA por
e-mail como camada de servidor independente). Nenhuma contradição.

**Achados de segurança confirmados na leitura de código** (Bloqueio 005,
reafirmados aqui): rate limit (5 envios/30min, cooldown 60s), hash SHA-256
com comparação em tempo constante (`constantTimeEqual`), máximo 5 tentativas
de verificação por código, geração via `crypto.getRandomValues` com
rejection sampling (sem viés de módulo), logging estruturado que nunca
inclui o código/hash em claro. Nenhum achado novo nesta rodada.

**Decisão: Adotar, sem ressalva.** Nenhuma condição pendente.

### 14.2 `webauthn-register` — Registro de credencial WebAuthn

**Contrato**:

| Ação | Entrada | Saída (sucesso) | Saída (erro) |
|---|---|---|---|
| `POST /functions/v1/webauthn-register` `{action:"generate-options"}` | — | `200 {options: PublicKeyCredentialCreationOptionsJSON}` | `401`, `500`, `503` |
| `POST /functions/v1/webauthn-register` `{action:"verify", attestationResponse, deviceLabel?}` | `attestationResponse`: `RegistrationResponseJSON` (client `navigator.credentials.create()`); `deviceLabel?`: string (até 255 chars) | `200 {success:true, credentialId}` | `400` (corpo/challenge/assinatura inválidos), `409` (`challenge_replayed` — mitigação Bloqueio 006 — ou `already_registered` — `credential_id` duplicado), `401`, `500`, `504` (timeout) |

**Comparação com RF-MVP-08**: implementa o lado servidor de AC1 (registro da
credencial biométrica usada depois para o gesto de desbloqueio local). AC2
(bloqueio após N tentativas malsucedidas) **não se aplica a este endpoint**
— `DIR-18`/`AUDITORIA-BE-M-00.md` Seção 7 já fixaram que o lockout de AC2 é
propriedade do gesto de desbloqueio local (PIN em IndexedDB, `FE-M-04`), não
de uma cerimônia de registro server-side; o próprio protocolo WebAuthn já
limita tentativas via verificação de usuário no autenticador do dispositivo,
fora do alcance/necessidade de um contador de app aqui. AC3 (logout) não é
escopo desta function.

**Comparação com ADR-005/ADR-010/ADR-013**: consistente — `ADR-010`
(Bloqueio 001) já confirmou que o gesto de desbloqueio é local/offline; este
endpoint é o registro server-side da credencial que sustenta esse gesto,
exigindo sessão já autenticada (e-mail/senha), exatamente como `ADR-005`
descreve o fluxo. `ADR-013` confirma WebAuthn aqui como "desbloqueio local
complementar à sessão já existente, não segundo fator independente" — este
endpoint não emite sessão nem altera claim de JWT, coerente com essa leitura.

**Achado de segurança (Bloqueio 006) — RESOLVIDO nesta tarefa**: challenge
HMAC-SHA256 stateless (TTL 90s) sem consumo único, permitindo replay da
mesma dupla challenge+assertion dentro da janela — severidade Média
(DevSecOps), veredito do CTO "mitigar agora". **Mitigação aplicada e
deployada** (`supabase functions deploy webauthn-register --use-api`,
version 4→5, `verify_jwt` preservado): `public.webauthn_challenges`
(migration `20260902100600_be_m09_webauthn_challenges.sql`, já aplicada em
produção — confirmado via `supabase migration list --linked` e
`supabase db push --linked` = "Remote database is up to date") registra
consumo único; "generate-options" insere a linha, "verify" extrai o
`challenge` do `clientDataJSON` da própria resposta e faz um
`UPDATE ... WHERE consumed_at IS NULL AND expires_at > now() RETURNING`
atômico **antes** de chamar `verifyRegistrationResponse` — nenhuma linha
afetada = `409 challenge_replayed`, sem sequer tentar validar a assinatura.
**Provado por teste automatizado end-to-end contra a function real**
(`supabase/tests/be_m09_webauthn_replay.test.ts`, autenticador virtual
ECDSA P-256/CBOR próprio, sem lib de terceiros) — ver Seção 14.4.

**Achado secundário (aceito como dívida técnica pelo CTO, `BLOCKERS.md`
Bloqueio 006)**: a chave HMAC deriva diretamente de
`SUPABASE_SERVICE_ROLE_KEY` sem HKDF/label de contexto — severidade Baixa,
sem correção pronta para aplicar agora; registro mantido aqui para
rastreabilidade, sem ação desta tarefa.

**Decisão: Adotar — mitigação de replay aplicada e testada, achado
secundário (HMAC sem HKDF) aceito como dívida técnica pelo CTO.** Nenhuma
condição pendente para `BE-M-09` fechar sem ressalva quanto a este item.

### 14.3 `webauthn-authenticate` — Autenticação (desbloqueio local complementar) com credencial já registrada

**Contrato**:

| Ação | Entrada | Saída (sucesso) | Saída (erro) |
|---|---|---|---|
| `POST /functions/v1/webauthn-authenticate` `{action:"generate-options"}` | — | `200 {options: PublicKeyCredentialRequestOptionsJSON}` | `401`, `404` (`no_credentials` — usuário sem credencial registrada), `500`, `503` |
| `POST /functions/v1/webauthn-authenticate` `{action:"verify", assertionResponse}` | `assertionResponse`: `AuthenticationResponseJSON` (client `navigator.credentials.get()`) | `200 {success:true}` | `400`, `404` (`credential_not_found`), `409` (`challenge_replayed` — mitigação Bloqueio 006), `401`, `500`, `504` |

**Comparação com RF-MVP-08**: implementa o lado servidor de AC1 para a
reautenticação/desbloqueio com credencial já registrada. Mesma leitura de
AC2 do item 14.2 (lockout é responsabilidade do gesto local, não desta
function). Em sucesso, só atualiza `sign_count`/`last_used_at` — não emite
sessão nova nem altera claim de JWT (confirmado na leitura de código, e já
documentado no parecer do DevSecOps em `BLOCKERS.md` Bloqueio 006), reduzindo
o "prêmio" de um eventual comprometimento a próximo de zero.

**Comparação com ADR-005/ADR-010/ADR-013**: mesma conclusão do item 14.2 —
consistente com "desbloqueio local complementar à sessão já existente".

**Achado de segurança (Bloqueio 006) — RESOLVIDO nesta tarefa**: mesmo
mecanismo/mitigação do item 14.2, aplicado simetricamente (`consumeChallenge`/
`persistChallenge`, `ceremony_type='authentication'`). Deployado junto
(`supabase functions deploy webauthn-authenticate --use-api`, version 4→5,
`verify_jwt` preservado). Provado pelo mesmo teste end-to-end (Seção 14.4).

**Decisão: Adotar — mitigação de replay aplicada e testada.** Nenhuma
condição pendente.

### 14.4 Prova da Mitigação — Teste Automatizado End-to-End (condição de aceite de mitigação, Bloqueio 006)

`supabase/tests/be_m09_webauthn_replay.test.ts` (`deno test --allow-net
--allow-env`) roda contra as Edge Functions **reais** em produção (não é
teste unitário isolado) — implementa um autenticador virtual mínimo (ECDSA
P-256, atestação "none", CBOR escrito à mão, sem lib de terceiros de
"virtual authenticator") para produzir cerimônias WebAuthn genuinamente
válidas, porque a mitigação precisa ser provada contra o código real que
chama `verifyRegistrationResponse`/`verifyAuthenticationResponse`, não contra
um mock. 5 passos, todos **PASS** (execução em 2026-09-03):

1. `webauthn-register`: fluxo legítimo (challenge usado uma única vez)
   registra com sucesso (`200`).
2. `webauthn-register`: reenvio da MESMA dupla challenge+assertion válida é
   rejeitado (`409 challenge_replayed`).
3. `webauthn-authenticate`: fluxo legítimo autentica com sucesso (`200`),
   usando a credencial registrada no passo 1.
4. `webauthn-authenticate`: reenvio da MESMA dupla challenge+assertion
   válida é rejeitado (`409 challenge_replayed`).
5. Regressão: uma nova cerimônia legítima (challenge distinto) continua
   funcionando (`200`) depois dos dois replays rejeitados — prova que a
   mitigação não bloqueia uso legítimo subsequente.

Setup/teardown: usuário de teste descartável (allow-list temporária via
`public.allowed_signup_emails`, `BE-M-12` + Auth Admin API), removido ao
final (`finally`) via exclusão do usuário (cascade confirmado em `auth.users
→ profiles/webauthn_credentials/webauthn_challenges`) e da linha de
allow-list — teste falha explicitamente se sobrar qualquer resíduo. Confirmado
por consulta pós-execução: contagem de `profiles`/`categories`/`accounts`/
`transactions`/`payment_methods`/`webauthn_credentials`/`webauthn_challenges`
idêntica à da auditoria original (Seção 1) — nenhum dado real tocado.

Regressão completa (12 testes SQL de `BE-M-00` a `BE-M-12` + 16 testes
unitários de `BE-M-10`) revalidada nesta mesma sessão — todos **PASS**, sem
resíduo.

### 14.5 Resumo — 3 Edge Functions

| # | Edge Function | Decisão | Condição pendente |
|---|---|---|---|
| 1 | `auth-email-mfa` | Adotar | Nenhuma |
| 2 | `webauthn-register` | Adotar | Nenhuma (mitigação de replay aplicada e testada) |
| 3 | `webauthn-authenticate` | Adotar | Nenhuma (mitigação de replay aplicada e testada) |

Nenhum item desta seção exigiu novo `BLOCKERS.md` — o único achado de
segurança em aberto (replay de challenge) já tinha veredito dado
(`BLOCKERS.md` Bloqueio 006, CTO) antes do início desta tarefa; esta seção
só executa e prova a condição de aceite de mitigação já determinada.
