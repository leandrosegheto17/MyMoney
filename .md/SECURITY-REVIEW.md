# SECURITY-REVIEW.md

**Dono**: DevSecOps
**Data**: 2026-09-03
**Gate de entrada**: `QA-REPORT.md` (Aprovado/Aprovado com ressalvas) para as 5 skills
de auditoria propriamente dita; `static-security-analysis` roda independente disso.
**Fonte**: achados concretos já levantados por `code-review` (esforço alto,
sub-agentes), verificados diretamente contra código-fonte real
(`supabase/functions/`, `supabase/migrations/`), `SDD.md` Seção 7, `GUARDRAILS.md`,
`CTO-REVIEW.md`, e o schema real do projeto Supabase linkado (`supabase db query
--linked`, consultas de metadado/comentário/constraint, sem alterar dado).
**Consumidor**: `devops`, `cto`.

---

## 0. Nota de processo — violação do meu próprio gate de entrada (leitura obrigatória antes do resto)

`QA-REPORT.md` hoje só cobre **FE-M-00, FE-M-01, FE-M-02** (rodada única, 2026-09-02,
veredito Aprovado 3/3). **Nenhuma tarefa `BE-M-00` a `BE-M-12` tem entrada em
`QA-REPORT.md`** — o QA ainda não validou funcionalmente nada do Backend. Os 6
achados triados abaixo são, em sua maioria, sobre artefatos de Backend
(`supabase/functions/auth-email-mfa`, migrations `BE-M-01`/`BE-M-08`/`BE-M-12`).

Por guardrail próprio ("NUNCA audita um build antes do QA aprovar funcionalmente"),
eu não deveria estar rodando as 5 skills de auditoria propriamente dita sobre esse
código ainda. Esta rodada é uma **exceção pontual e explícita**: os achados já
tinham sido concretamente levantados por uma revisão de código anterior (não por
mim reaudiando do zero), e o pedido foi para classificar severidade/decidir
bloqueio vs. débito sobre achados já existentes — não para auditar um build
funcionalmente não validado. Tratei isso como triagem de achados pontuais, não
como o "Aprovado em segurança" formal do build Backend completo.

**Consequência prática**: os vereditos abaixo são tecnicamente válidos (cada achado
foi confirmado por leitura direta do código-fonte real e, quando aplicável, por
consulta direta ao schema do projeto linkado — não aceitei a lista às cegas). Mas o
**fechamento formal deste gate para o build Backend (BE-M-00 a BE-M-12) fica
condicionado a**: QA produzir uma rodada em `QA-REPORT.md` aprovando (Aprovado ou
Aprovado com ressalvas) as tarefas Backend correspondentes. Se essa rodada de QA
resultar em mudança de código nos arquivos aqui auditados (`auth-email-mfa`,
migrations de `budget`/`categories`/`signup`), **esta revisão de segurança precisa
ser reconfirmada** sobre o código final, não apenas sobre o que existe hoje.

Sinalizo isso ao CTO em paralelo (Seção 5) — é relevante para a decisão de quando
considerar o Backend "pronto" no pipeline.

---

## 1. Achados triados

### 1.1 — CORS wildcard em `auth-email-mfa` (Achado #1)

- **Status**: **Confirmado.** `supabase/functions/auth-email-mfa/index.ts:43-48`
  define `CORS_HEADERS` local com `"Access-Control-Allow-Origin": "*"`, enquanto
  `webauthn-register`/`webauthn-authenticate` usam `_shared/cors.ts` (`WEBAUTHN_ORIGIN`,
  allowlist estrita, comentário explícito "Origem restrita via env var (nunca
  '*')"). `auth-email-mfa` não importa esse helper compartilhado — reimplementa
  CORS com wildcard, mesma classe de endpoint (autenticado, mutável, MFA).
- **Análise de exploitabilidade real**: o endpoint autentica por `Authorization:
  Bearer <JWT>`, não por cookie de sessão. CORS wildcard nesse modelo não permite
  que uma origem maliciosa "ande de carona" na sessão do usuário automaticamente
  (diferente de cookie, o browser não anexa o Bearer token sozinho a uma requisição
  cross-origin) — o atacante precisaria já ter o token por outro meio (XSS no app
  legítimo, vazamento de `localStorage`), caso em que o CORS já deixou de ser a
  barreira relevante. Além disso, as respostas do endpoint não carregam dado
  sensível (`{success: true}` ou mensagens de erro genéricas como "Código
  incorreto.") — não há PII/segredo exposto a uma leitura cross-origin da resposta.
- **Severidade**: **Média.** Risco real mas de baixa exploitabilidade prática hoje;
  inconsistência clara com o padrão de segurança já estabelecido no próprio
  repositório para a mesma classe de endpoint (existe módulo compartilhado pronto
  para isso, só não foi usado aqui).
- **Veredito**: **Não bloqueia o gate.** Débito registrado — **SEC-DEBT-001**.
- **Prazo/condição**: corrigir antes de qualquer próximo deploy que toque
  `auth-email-mfa` ou qualquer Edge Function nova autenticada por JWT de sessão
  (o custo da correção é trivial — trocar `CORS_HEADERS` local por
  `corsHeaders(origin)` de `_shared/cors.ts`, com uma env var própria ou reuso de
  `WEBAUTHN_ORIGIN`/nova `APP_ORIGIN`). Recomendo não esperar o prazo — é uma
  correção de baixo custo e baixo risco, cabe no mesmo ciclo de qualquer tarefa
  que já for tocar o arquivo.
- **Escalar para**: `backend` (correção de código).

### 1.2 — Possível bypass de RLS cross-tenant via `budget.category_id` (Achado #2)

- **Status**: **Confirmado, e é um padrão sistêmico, não isolado a `budget`.**
  `budget_insert_own`/`budget_update_own`
  (`supabase/migrations/20260902100000_be_m01_budget_and_rn08_rn09_guards.sql:43-50`)
  só verificam `auth.uid() = user_id`, sem validar que `category_id` pertence ao
  mesmo usuário. Verifiquei o schema real via `supabase db query --linked`:
  `transactions_insert_own`/`transactions_update_own` têm exatamente o mesmo
  padrão — `WITH CHECK (auth.uid() = user_id AND ...)`, sem validar
  `account_id`/`category_id`/`payment_method_id`/`destination_account_id`. Isto é
  um gap de autorização de referência cruzada (IDOR/broken object-level
  authorization, classe OWASP API1/API3) presente na convenção do projeto inteiro,
  não um erro pontual da migration de `budget`.
- **Segunda parte confirmada**: `categories_block_delete_when_linked`
  (mesma migration, linhas 91-106) não é `SECURITY DEFINER` — roda com o RLS do
  usuário que está fazendo o `DELETE`. Se um usuário A inserisse um `budget`
  malicioso referenciando `category_id` de B (explorando o gap acima), quando B
  tentasse apagar sua própria categoria, a consulta `select 1 from public.budget
  where category_id = old.id` (rodando como B) não enxergaria a linha de A (RLS
  filtra `budget.user_id = auth.uid()` = B) — o `EXISTS` retorna falso e o `DELETE`
  passa, quebrando a garantia de RN-09 nesse cenário específico. Isso é
  consequência do gap de INSERT, não um problema independente.
- **Categorias do sistema (`user_id IS NULL`) não são o vetor de risco aqui** —
  são compartilhadas por design (`categories_select` já permite leitura por
  qualquer usuário autenticado); o risco real é só sobre categorias **privadas**
  de outro usuário.
- **Análise de exploitabilidade real, hoje**: (a) produto arquitetado para um
  único usuário real (`SDD.md` Seção 7, "Isolamento Multi-Tenant" — RNF-09); (b)
  `category_id`/`account_id` são UUID v4 aleatórios — inviável de adivinhar sem
  vazamento prévio por outro canal; (c) a mitigação primária real, segundo o
  próprio `SDD.md` Seção 7, é impedir que um segundo `auth.users` exista, não a
  RLS por si só — que é exatamente o que a Achado #5/`BE-M-12` implementa. Hoje,
  com o allow-list de signup ativo e um único usuário real, a probabilidade de
  exploração é próxima de zero.
- **Severidade**: **Alta em termos de impacto potencial** (é um gap de autorização
  de referência cruzada, presente em múltiplas tabelas, que se torna diretamente
  explorável assim que existir um segundo `auth.users`), mas **exploitabilidade
  atual muito baixa** dado o contexto de usuário único + allow-list de signup já
  implementado.
- **Veredito**: **Não bloqueia este gate hoje**, mas registro como **débito com
  condição de bloqueio automática (não é prazo de calendário)** — **SEC-DEBT-002**.
- **Condição de bloqueio**: este débito passa a **bloquear qualquer mudança** que
  (a) adicione um segundo e-mail a `allowed_signup_emails`, (b) remova/desative o
  trigger `auth_users_before_insert_restrict_signup`, ou (c) introduza qualquer
  funcionalidade de compartilhamento/múltiplos usuários — nenhuma dessas mudanças
  pode ir a produção com este gap ainda aberto. Independente disso, recomendo ao
  Backend corrigir proativamente antes do início da Fase 3 (mais tabelas novas
  herdariam o mesmo padrão incorreto por cópia se não for corrigido agora e
  documentado como convenção). Correção sugerida: adicionar `EXISTS (SELECT 1 FROM
  public.categories c WHERE c.id = category_id AND (c.user_id = auth.uid() OR
  c.user_id IS NULL))` (e equivalente para `account_id`/`payment_method_id`/
  `destination_account_id` em `transactions`) às policies de `INSERT`/`UPDATE`;
  tornar `categories_block_delete_when_linked`/`accounts_block_delete_when_linked`
  `SECURITY DEFINER` (mesmo padrão de `auth_users_restrict_signup`), já que sua
  função é validar um invariante do sistema, não uma permissão do usuário
  corrente.
- **Escalar para**: `backend` (correção de código, sistemática — todas as tabelas
  com FK para outra tabela "ownable", não só `budget`).
- **Sinalização ao CTO (paralela, não pré-requisito)**: ver Seção 5 — a decisão de
  "quando" isso deixa de ser aceitável é uma decisão de risco de produto (ex.: se o
  stakeholder algum dia quiser convidar um segundo usuário real), não só técnica.

### 1.3 — `schema-baseline-legacy.sql` não referenciado (Achado #3)

- **Status**: **Confirmado.** `supabase/schema-baseline-legacy.sql` (1317 linhas,
  contém `CREATE TABLE`/policies/functions reais) não aparece em
  `supabase/config.toml` (`schema_paths = []`) nem é `\i`/referenciado por
  nenhuma migration. As 13 migrations `*_baseline_legacy.sql` em
  `supabase/migrations/` são todas placeholders de 5 linhas ("Conteudo real nao
  versionado neste repositorio... Nao reexecutar / nao contem DDL").
- **Verifiquei também o mecanismo de backup real** (`supabase/functions/
  backup-export/index.ts`) para avaliar se isso é coberto por outro caminho: não
  é. `runExport()` faz um dump lógico **de dados** (`select * from` cada tabela de
  `BACKUP_TABLES`), criptografa e envia a S3 — não captura schema/DDL (tabelas,
  policies, functions, triggers) em nenhum momento.
- **Impacto real**: se o projeto Supabase linkado for perdido/corrompido, ou se
  `supabase db reset`/uma migração para um projeto novo for necessária, **não há
  como reconstruir o schema a partir deste repositório** — as migrations não
  recriam as tabelas/functions herdadas da implementação anterior (categories,
  transactions, accounts, `apply_transaction_effect`, RLS policies, etc., todas
  confirmadas presentes em `schema-baseline-legacy.sql` mas ausentes das
  migrations reais). Mesmo com o backup diário funcionando perfeitamente (hoje
  nem isso — `BLOCKERS.md` Bloqueio 006, credenciais S3 pendentes do
  stakeholder), restaurar os dados baixados não adiantaria sem o schema para
  recebê-los. Isto é uma lacuna real na promessa de disaster recovery que
  `SDD.md` Seção 7 ("Retenção e Descarte de Dado") e `ADR-009`/`ADR-011`
  formalizam como requisito de arquitetura — o requisito existe no papel, mas não
  está de fato coberto ponta a ponta.
- **Severidade**: **Alta**, especificamente para a dimensão de continuidade/DR —
  não é uma vulnerabilidade ativamente explorável (ninguém rouba dado por causa
  disso), é um ponto único de falha silencioso: só se manifesta no pior momento
  possível (perda real do projeto), quando já é tarde para corrigir.
- **Veredito**: **Bloqueia o fechamento do requisito de DR de `BE-M-10`/ADR-009**
  especificamente — `BE-M-10` não pode ser considerado "cumprindo a promessa de
  disaster recovery" da arquitetura enquanto isso não for resolvido. **Não
  bloqueia o deploy das funcionalidades do produto** (CRUD, telas, etc.) — a
  operação normal do app não depende disso.
- **Prazo/condição**: resolver antes de qualquer comunicação (interna ou ao
  stakeholder) de que "o backup diário está funcionando" ser tratada como
  garantia real de recuperação. Ação concreta recomendada: gerar
  `supabase db dump --linked --schema-only` (ou equivalente) do projeto real,
  versionar o resultado como o conteúdo verdadeiro de `schema-baseline-legacy.sql`
  e referenciá-lo via `schema_paths` em `config.toml` — ou, alternativa mais
  robusta a longo prazo, fazer `backup-export` capturar `pg_dump` completo
  (schema+dado) em vez de só linhas via PostgREST, tornando cada snapshot diário
  autossuficiente.
- **Escalar para**: `backend` (captura do schema real) e `devops` (runbook de DR —
  recomendo um drill de restauração real, não só validação de "job rodou com
  sucesso" no log).
- **Sinalização ao CTO (paralela, não pré-requisito)**: ver Seção 5 — quanto risco
  de perda de dado é aceitável para este produto é uma decisão de negócio, mesmo
  que a causa raiz seja técnica.

### 1.4 — Convenção de sinal em `get_budget_status` (Achado #4)

- **Status**: **Não é achado — falso positivo, descartado com alta confiança.**
  Consultei o schema real do projeto linkado (`supabase db query --linked`, sem
  Docker): `transactions_amount_positive CHECK (amount_cents > 0)` confirma que
  `amount_cents` é **sempre armazenado positivo**, para qualquer `kind`
  (income/expense/transfer) — não existe a convenção de "negativo para despesa"
  hipotetizada. Confirmei também o código-fonte real de
  `apply_transaction_effect` (via `pg_proc.prosrc`): a função soma/subtrai
  explicitamente por `kind` (`+p_sign*amount_cents` para income,
  `-p_sign*amount_cents` para expense/transfer), nunca depende do sinal do valor
  armazenado. `get_budget_status` somar `amount_cents` como quantidade positiva
  para `kind='expense'` está **correto** e consistente com essa convenção — o
  alerta de orçamento (RF-MVP-07/RN-04) dispara normalmente.
- **Veredito**: **Não é achado.** Nenhuma ação necessária.

### 1.5 — E-mail do stakeholder hardcoded em migration (Achado #5)

- **Status**: **Confirmado.**
  `supabase/migrations/20260902100400_be_m12_restrict_signup.sql:37`:
  `values (lower('leandrosegheto17@gmail.com'), 'Stakeholder — dono do produto...')`.
  Permanece em texto puro no histórico do git.
- **Análise de risco real**: este é o e-mail do próprio dono/operador do produto
  (data subject = controller, mesmo caso avaliado pelo CTO em `CTO-REVIEW.md`
  linha 307 — "lançamentos, saldo, categoria... são dado pessoal do próprio
  stakeholder (LGPD art. 5º)... Base/finalidade: uso pessoal"), não dado de
  terceiro. Repositório aponta para `github.com/leandrosegheto17/MyMoney`
  (visibilidade não confirmada nesta sessão — sem acesso a `gh`/API do GitHub
  para checar `private`/`public` diretamente). Risco de compliance LGPD é baixo
  no cenário atual (autoprocessamento, sem terceiro-titular), mas é PII
  permanentemente cravada em histórico de controle de versão, o que dificulta
  rotação/redação futura e vira um problema real se o repositório for tornado
  público ou compartilhado com um colaborador/contratado.
- **Severidade**: **Baixa**, condicionada à visibilidade do repositório
  permanecer privada.
- **Veredito**: **Não bloqueia o gate.** Débito registrado — **SEC-DEBT-003**.
- **Prazo/condição**: (1) confirmar com o stakeholder/DevOps que o repositório é
  e permanecerá privado enquanto este padrão existir; (2) se algum dia for
  cogitado tornar o repositório público ou dar acesso a um terceiro, este item
  vira bloqueante e precisa ser resolvido antes — mover o e-mail para
  configuração fora do versionamento (seed local não commitado, ou variável de
  ambiente lida por uma migration/seed script gerado, não string literal).
- **Escalar para**: `devops` (confirmar visibilidade do repositório como
  requisito operacional — ver Seção 4).

### 1.6 — Inconsistência de status em `GUARDRAILS.md` G-01/G-02 (Achado #6)

- **Status**: **Confirmado como inconsistência de documentação — a aprovação em
  si é real, só o rótulo não foi atualizado.** `GUARDRAILS.md` linhas 41 e 57
  ainda rotulam o corpo de G-01/G-02 como
  `[PROPOSTA DE REESCRITA — aguardando aprovação do CTO]`, enquanto o próprio
  cabeçalho do documento (linhas 9-10, 18-19) afirma aprovação em 2026-09-02.
  Confirmei a aprovação real na fonte de verdade (`CTO-REVIEW.md`): linha 986,
  "Veredito — `guardrails-governance`: Aprovado. `G-01` e `G-02` (nova redação)
  entram [em vigor]"; linha 1072, "`GUARDRAILS.md` (`G-01`/`G-02`): Aprovado, sem
  ressalva." A aprovação é real e está documentada; o defeito é só o rótulo
  desatualizado no corpo da regra.
- **Risco real**: nenhum agente do pipeline deveria tratar G-01/G-02 como não
  vinculantes hoje — mas o rótulo, lido isoladamente (sem checar o changelog),
  pode induzir esse erro em qualquer rodada futura, inclusive por um agente que
  não tenha contexto do Gate 3 Reaberto.
- **Severidade**: **Baixa** — inconsistência de rastreabilidade/governança, não
  uma lacuna substantiva (a regra já é vinculante de fato, comprovado pela fonte
  primária).
- **Veredito**: **Não bloqueia o gate.** Débito registrado — **SEC-DEBT-004**.
- **Prazo/condição**: corrigir no próximo toque em `GUARDRAILS.md` — custo
  trivial (uma linha por regra). Sugestão de texto:
  `[APROVADO — CTO, "Gate 3 (Reaberto por Bloqueio 003)", 2026-09-02, ver
  CTO-REVIEW.md linha 986]`.
- **Escalar para**: `tech-lead`/`cto` (dono do documento), não é achado de código.

---

## 2. Resumo — Débitos registrados

| ID | Achado | Severidade | Bloqueia? | Prazo/condição | Dono da correção |
|---|---|---|---|---|---|
| SEC-DEBT-001 | CORS wildcard em `auth-email-mfa` | Média | Não | Antes do próximo deploy que tocar o arquivo; recomendado imediato (custo trivial) | backend |
| SEC-DEBT-002 | Sem validação de ownership de FK (`category_id`/`account_id`/etc.) em INSERT/UPDATE de `budget`/`transactions`; trigger RN-09 não `SECURITY DEFINER` | Alta (impacto) / baixa exploitabilidade hoje | Não hoje — **bloqueio automático condicional** (ver 1.2) | Antes de 2º e-mail em `allowed_signup_emails`, antes de remover o trigger de signup, ou antes de qualquer feature multiusuário; recomendado corrigir antes da Fase 3 | backend |
| SEC-DEBT-003 | E-mail do stakeholder hardcoded em migration | Baixa | Não | Confirmar repo privado; corrigir antes de tornar público/compartilhar acesso | devops (confirmação) / backend (correção se necessário) |
| SEC-DEBT-004 | Rótulo desatualizado em G-01/G-02 (`GUARDRAILS.md`) | Baixa | Não | Próximo toque no documento | tech-lead / cto |

**Achado #3 (schema baseline não referenciado)** não entra nesta tabela de débito
"leve" — é tratado como bloqueio específico da capacidade de DR (Seção 1.3), não
como item de calendário flexível.

**Achado #4** descartado (falso positivo, verificado contra schema real).

## 3. Achados que bloqueiam algo

| Achado | O que bloqueia | O que NÃO bloqueia |
|---|---|---|
| #3 — `schema-baseline-legacy.sql` não referenciado | Fechamento do requisito de DR de `BE-M-10`/ADR-009 — não pode ser tratado como "disaster recovery funcional" até resolvido | Deploy das funcionalidades do produto (CRUD, telas) |

**Nenhum achado desta rodada bloqueia o deploy funcional do produto hoje.** O
único bloqueio real e imediato é de escopo restrito (capacidade de DR), e o
achado #2 carrega um bloqueio condicional futuro (não hoje).

## 4. Requisitos de segurança operacional para o DevOps

- **Secrets**: `BACKUP_S3_ENDPOINT`/`BUCKET`/`ACCESS_KEY_ID`/`SECRET_ACCESS_KEY`
  ainda pendentes do stakeholder (`BLOCKERS.md` Bloqueio 006) — confirmar que,
  quando providos, entram via Supabase Edge Function secrets/Vault, nunca em
  `config.toml`/repositório (DIR-30).
- **CORS por ambiente**: ao corrigir SEC-DEBT-001, garantir que a env var de
  origem (`WEBAUTHN_ORIGIN` reusada ou nova) está configurada corretamente por
  ambiente (dev/staging/produção) no deploy de Edge Functions — um valor errado
  quebra silenciosamente o fluxo de MFA em produção.
- **Confirmação de Auth Hook**: `SDD.md` Seção 7 registra como condição de
  aceite ainda não fechada "confirmar que `custom_access_token_hook` está de
  fato habilitado nas configurações de Auth do projeto Supabase" — isso não é
  verificável só pela existência da function no código; DevOps deve confirmar
  via dashboard/Management API antes de considerar o gate de MFA
  (`app_email_mfa_verified`) confiável em produção.
- **Smoke test de restrição de signup**: validar em staging/produção (não só
  local) que uma tentativa de cadastro com e-mail fora de
  `allowed_signup_emails` retorna 403 de fato — o mecanismo depende de um
  trigger `BEFORE INSERT` em `auth.users`, e comportamento do GoTrue gerenciado
  nesse ponto não foi validado neste repositório além da leitura do código.
- **Visibilidade do repositório**: confirmar e documentar que
  `github.com/leandrosegheto17/MyMoney` é privado (relevante para SEC-DEBT-003 e,
  de forma mais ampla, para todo o histórico de migrations que assume esse
  contexto de "projeto pessoal").
- **Drill de restauração de DR**: uma vez que SEC-#3 (schema baseline) seja
  corrigido, agendar ao menos um teste real de restauração (não só "o job de
  backup roda com sucesso") para validar que o par schema+dado realmente
  reconstrói um ambiente funcional.

## 5. Sinalizações ao CTO (paralelas, não pré-requisito de bloqueio)

Registradas aqui como escalonamento em paralelo — o bloqueio técnico dos achados
acima já foi aplicado por mim, quando aplicável, independentemente desta
sinalização:

1. **Gap de processo (Seção 0)**: esta rodada de auditoria de segurança rodou
   sobre código de Backend que o QA ainda não validou funcionalmente
   (`QA-REPORT.md` só cobre `FE-M-00`/`01`/`02`). Recomendo ao CTO confirmar se
   isso é aceitável como exceção pontual (achados já levantados, triagem de
   severidade) ou se o fechamento formal deste gate deve esperar uma rodada de
   QA sobre `BE-M-*` antes de qualquer decisão de deploy do Backend.
2. **SEC-DEBT-002 (bypass de RLS cross-tenant condicional)**: a decisão de
   quando este gap deixa de ser "aceitável dado o contexto de usuário único" é,
   em última instância, uma decisão de risco de produto — se o stakeholder algum
   dia decidir convidar um segundo usuário real ou abrir alguma forma de
   compartilhamento, este item precisa estar resolvido antes, não depois.
3. **Achado #3 (DR não restaurável)**: quanto risco de perda de dado é aceitável
   para este produto, e com que urgência a lacuna de schema deve ser fechada, é
   uma decisão de continuidade de negócio — a causa raiz é técnica, mas o
   trade-off de prioridade (corrigir agora vs. aceitar o risco por mais um
   ciclo) não deveria ser só minha.

## 6. Critérios de Pronto — checklist desta rodada

- [x] Nenhum achado de severidade alta/crítica **ativamente explorável** em
      aberto sem tratamento (achados #2/#3 são Alta em impacto, mas com
      bloqueio condicional/escopado aplicado, não deixados em aberto sem
      controle)
- [x] Nenhum achado de compliance obrigatório (LGPD) não resolvido registrado
      como débito simples — achado #5 avaliado e justificado como baixo risco
      dado o contexto de autoprocessamento (CTO-REVIEW.md já assentou essa
      leitura), não uma pendência LGPD obrigatória ignorada
- [x] Todo achado de baixa/média severidade registrado como débito, com
      prazo/condição de correção (SEC-DEBT-001 a 004)
- [x] Requisitos de segurança operacional definidos para o DevOps (Seção 4)
- [x] Todo achado de relevância estratégica sinalizado ao CTO (Seção 5)
- [ ] **Gate de entrada formal (QA aprovando Backend) ainda pendente** — ver
      Seção 0; esta revisão é válida tecnicamente mas condicionada a
      reconfirmação pós-QA se o código auditado mudar
