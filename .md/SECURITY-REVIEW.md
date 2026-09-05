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

### 1.7 — `static-security-analysis` sobre o lote "Fundação Técnica & Infraestrutura" — 2026-09-03

**Escopo desta rodada** (dispara em paralelo ao QA, sobre código real, não sobre achados
de terceiros): `supabase/functions/backup-export/` (`index.ts`, `lib.ts`, `lib.test.ts`),
migration `20260902100000_be_m01_budget_and_rn08_rn09_guards.sql` (`BE-M-01`), migration
`20260903090000_be_m10_backup_export.sql` (`BE-M-10`), scaffolding de `frontend/`
(`vite.config.ts`, `index.html`, `.env.example`, `package.json`, `src/components/base/*`,
Tailwind/PWA — `FE-M-00`/`01`/`02`, sem lógica de negócio de domínio nesta camada).
Fora de escopo, propositalmente: `auth-email-mfa`, WebAuthn, FK ownership de
`transactions` fora de `budget` — pertencem a outras tarefas/lotes já triados
(Achados #1/#2/#5 acima).

**`backup-export` (`BE-M-10`) — nenhum achado novo, boas práticas confirmadas por
leitura direta do código**:
- Segredos (`BACKUP_CRON_SECRET`, `BACKUP_ENCRYPTION_KEY`, credenciais S3, URL da
  function) vêm 100% de `Deno.env`/Supabase Vault — nenhum valor hardcoded no
  código ou na migration (grep dedicado não encontrou literal nenhum além de nomes
  de variável). Conforme DIR-30.
- Autenticação do endpoint (`isAuthorizedCronRequest`, `lib.ts:139-146`) é
  fail-closed (nega se segredo ausente ou header ausente) e usa comparação em
  tempo constante (`timingSafeEqual`) — mesmo padrão de boa prática já usado em
  `auth-email-mfa` (Achado #1 original).
- Criptografia AES-256-GCM com IV aleatório de 12 bytes por chamada, nunca
  reaproveitado (`encryptPayload`, `lib.ts:96-113`) — correto e adequado para o
  requisito DIR-31 ("armazenado criptografado" antes de sair do perímetro
  Supabase).
- `public.backup_export_log` tem RLS habilitada sem nenhuma policy para
  `anon`/`authenticated` (deny-by-default) — metadado operacional não é exposto
  via PostgREST a usuário nenhum, correto.
- `trigger_backup_export()`/`check_backup_health()` são `SECURITY DEFINER` com
  `search_path` explícito (`'public', 'net', 'vault', 'pg_temp'`) — mitiga
  search_path hijacking, boa prática correta para função `SECURITY DEFINER`.
- Nota menor, não registrada como débito por ser doc/operacional, não código:
  `error_message` de falha é enviado por e-mail via Resend
  (`sendAlertEmail`) — conteúdo são mensagens de erro do Postgres/S3 (nomes de
  tabela, código HTTP), não dado de linha; risco de exposição de PII nesse canal
  é desprezível, mas destino do e-mail de alerta (`ALERT_EMAIL_TO`) deve
  permanecer restrito ao operador (ver Seção 4).

**`BE-M-01` (migration `budget` + triggers RN-08/RN-09) — nenhum achado novo além
do já registrado como Achado #2/SEC-DEBT-002/Bloqueio 010**: confirmei por leitura
direta que `budget_insert_own`/`budget_update_own`
(linhas 43-50 da migration) ainda não validam ownership de `category_id`
— exatamente o gap já triado. Cross-referenciei `API-CONTRACT.yaml` (`/budget`,
linhas 316-323): a correção já está formalmente planejada como tarefa `BE-M-13`,
citando este mesmo débito (`Bloqueio 010/SEC-DEBT-002`) — confirmo que a cadeia de
rastreabilidade está íntegra (achado → bloqueio → débito → tarefa de correção
planejada), não preciso abrir um novo registro para o mesmo gap.
`categories_block_delete_when_linked`/`accounts_block_delete_when_linked`
confirmadas não-`SECURITY DEFINER`, mesmo gap já descrito.

**Scaffolding `frontend/` (`FE-M-00`/`01`/`02`) — nenhum achado de severidade
relevante**:
- `vite.config.ts` (Workbox/`vite-plugin-pwa`): `runtimeCaching` exclui
  explicitamente `/rest/`/`/auth/` do cache do Service Worker (`NetworkOnly`) —
  nenhuma resposta de API (dado financeiro, sessão) é cacheada pelo shell PWA;
  só assets estáticos do app (`globPatterns: js/css/html/svg/png/ico/woff2`) são
  precacheados. Correto para RNF de dado sensível não persistir fora do
  Dexie/IndexedDB controlado pela própria aplicação.
- `.env.example`: só variáveis `VITE_*` (públicas por design — `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`), com comentário explícito
  que segredo de provedor externo nunca entra em variável de build do Frontend
  — coerente com DIR-30/G-11.
- `npm audit --omit=dev` sobre `frontend/package.json`/`package-lock.json`:
  **0 vulnerabilidades conhecidas** nas dependências de produção (React 19,
  `@supabase/supabase-js`, `@simplewebauthn/browser`, `dexie`, `react-router-dom`).
- Grep dirigido em `src/components/base/*` por `dangerouslySetInnerHTML`,
  `eval(`, `innerHTML`, `localStorage`/`sessionStorage`: nenhuma ocorrência —
  nenhum vetor de XSS via innerHTML nem persistência de dado sensível em
  `localStorage` nesta camada (consistente com a decisão de usar IndexedDB/Dexie
  para a fila offline, fora do escopo desta camada ainda).
- `index.html`: sem CSP inline, sem script de terceiro/tracking. Recomendação
  operacional (não bloqueia, ver Seção 4): configurar `Content-Security-Policy`
  via header HTTP no provedor de hospedagem (Vercel), não em meta tag — item
  novo na lista de requisitos operacionais.

**Achado novo — corroboração formal da severidade do gap do Bloqueio 012 (DR
incompleto, `schema-baseline-legacy.sql`)**: inspecionei `BLOCKERS.md` Bloqueio 011
(Resolvido, decisão de priorização do CTO) e Bloqueio 012 (Aberto, DevOps→Backend)
na íntegra antes de classificar. Concordo com a classificação de severidade já
aplicada por DevOps no Bloqueio 012 e pelo CTO no Bloqueio 011: os três gaps
remanescentes (extensões `pg_cron`/`pgcrypto`/`uuid-ossp`/`supabase_vault`/
`pg_stat_statements` não capturadas por `CREATE EXTENSION`; trigger
`on_auth_user_created` em `auth.users` ausente do dump; `cron.schedule` do job
legado `fn-clear-due-transactions` não versionado) são, tecnicamente, a mesma
classe de risco do Achado #3 original — **ponto único de falha silencioso de
disaster recovery**, não vulnerabilidade ativamente explorável. Nenhum dos três
gaps afeta a operação corrente de `BE-M-01`/`BE-M-10` (as extensões já estão
ativas no projeto real hoje; `pg_net`, único extension novo desta rodada, é
criado dentro da própria migration `BE-M-10`, não depende do baseline). O
impacto só se manifesta em um cenário de reconstrução completa do projeto do
zero — exatamente o cenário que o drill de restauração (`DEPLOY.md` §6.3) existe
para validar antes que aconteça de verdade.
- **Severidade**: **Alta** para a dimensão de continuidade/DR (mesmo enquadramento
  do Achado #3) — **não** é achado de severidade que bloqueie deploy funcional
  hoje.
- **Veredito para o fechamento deste lote especificamente**: **não bloqueia**.
  Nenhuma tarefa deste lote (`BE-M-00`, `BE-M-01`, `BE-M-10`, `FE-M-00`, `FE-M-01`,
  `FE-M-02`) depende funcionalmente de `schema-baseline-legacy.sql` estar 100%
  completo — `BE-M-10` já opera corretamente sobre o projeto real existente. Fica
  como **débito formal, com dono e condição já definidos** (não calendário
  aberto): registrado abaixo como **SEC-DEBT-005**, espelhando 1:1 a condição já
  fixada por DevOps no Bloqueio 012 (bloqueia especificamente a execução do
  drill de restauração e qualquer comunicação de "backup restaurável ponta a
  ponta"), sem enfraquecer nem endurecer o que já foi decidido — só formalizando
  a leitura de severidade de DevSecOps sobre um achado que já tinha dono
  (Backend) e escalonamento (DevOps) definidos.
- **Escalar para**: nenhuma escalação nova — Backend já é o dono (Bloqueio 012),
  DevOps já aplicou a pré-condição no runbook (`DEPLOY.md` §6.3.4). Sinalizo ao
  CTO em paralelo (Seção 5) só para registro de que DevSecOps corrobora
  formalmente a não-urgência de bloqueio deste lote específico.

---

### 1.8 — `static-security-analysis` sobre o lote "Contas & Formas de Pagamento" — 2026-09-03

**Escopo desta rodada** (dispara em paralelo ao QA, sobre código real; gate de
entrada respeitado — `QA-REPORT.md` já aprovou as 6 tarefas deste lote, ver Seção
2.2/2.5 do relatório, "Aprovado" para `BE-M-02`, `BE-M-03/04/05`, `FE-M-05`,
`FE-M-06`, `FE-M-07`): migration `20260902100100_be_m02_payment_methods_defaults.sql`
(`BE-M-02`, seed idempotente + policies `payment_methods_update_own`/`_delete_own`);
CRUD via PostgREST direto sobre `public.accounts`/`public.payment_methods`
(`BE-M-03`/`BE-M-04`, sem Edge Function nova — nada de código server-side além da
migration acima); `frontend/src/lib/onboarding/OnboardingGate.tsx`,
`pages/onboarding/{FirstAccountPage,TaxonomyReviewPage}.tsx` (`FE-M-05`),
`pages/accounts/AccountsPage.tsx` (`FE-M-06`), `pages/paymentMethods/PaymentMethodsPage.tsx`
(`FE-M-07`), e os módulos de API que essas telas consomem
(`frontend/src/lib/api/{accounts,paymentMethods,errors,request}.ts`). Cross-referenciado
contra `TASK.md` Seção 3.1 (critério de aceite de cada tarefa), `SDD.md` Seção 7
("Autorização" — RLS `auth.uid() = user_id` + gate de MFA; "Isolamento
Multi-Tenant"), `GUARDRAILS.md` (`G-19`, ainda `PROPOSTA — aguardando aprovação do
CTO`, mas já é o critério técnico vigente desde `BLOCKERS.md` Bloqueio 010), e
`API-CONTRACT.yaml` (`/accounts`, `/payment_methods`) para comparar payload real
documentado contra o schema/policy efetivos. `npm audit --omit=dev` reexecutado
sobre `frontend/package.json`/`package-lock.json` (nenhuma dependência nova
introduzida por este lote frente à rodada 1.7): **0 vulnerabilidades**. Nenhum
segredo hardcoded encontrado nos arquivos deste escopo (grep dirigido por padrão de
chave/token/URL de serviço — nenhuma ocorrência; único precedente do projeto,
Achado #5, já triado e não pertence a este lote).

**Achado novo — `payment_methods.account_id` sem validação de ownership de FK,
mesma classe do Bloqueio 010/SEC-DEBT-002, escapou do escopo de `BE-M-13`**:
confirmei por leitura direta que `public.payment_methods.account_id` é FK para
`public.accounts.id` (tabela "ownable", `AUDITORIA-BE-M-00.md` linha 26), mas nenhuma
das policies de `INSERT`/`UPDATE` valida que o `account_id` referenciado pertence ao
mesmo usuário:
- `payment_methods_insert_own` (herdada do schema legado,
  `schema-baseline-legacy.sql:1560`) nunca foi tocada por nenhuma migration deste
  projeto — só `auth.uid() = user_id` + gate de MFA.
- `payment_methods_update_own` foi **reescrita nesta mesma migration do lote**
  (`20260902100100_be_m02_payment_methods_defaults.sql:24-28`, `BE-M-02`), mas só
  para acrescentar `is_system_default = false` — não acrescentou a checagem de
  ownership de `account_id`, apesar de `BE-M-13` (mesma sessão de trabalho,
  `20260903100000_be_m13_...sql`, ver Seção 1.2/SEC-DEBT-002 acima) já ter
  estabelecido exatamente esse padrão de correção para `budget.category_id` e
  `transactions.account_id`/`category_id`/`payment_method_id`/
  `destination_account_id` — só que sem incluir `payment_methods.account_id` no
  escopo. Confirmei lendo a migration de `BE-M-13` linha a linha: o escopo dela é
  literal e explicitamente `budget`/`transactions`, não `payment_methods`.
- Vetor de exploração não depende da UI: `PaymentMethodsPage.tsx` não expõe
  `account_id` no formulário (só `name`/`type`), mas
  `frontend/src/lib/api/paymentMethods.ts` (`createPaymentMethod`/
  `updatePaymentMethod`) aceita `account_id` como campo do payload —
  reflexo direto do contrato real (`API-CONTRACT.yaml` `/payment_methods` `POST`
  referencia o schema `PaymentMethod` completo). Qualquer usuário autenticado com
  JWT válido pode chamar a API PostgREST diretamente (via `supabase-js`, `curl`,
  Postman) com um `account_id` de outro usuário.
- Teste de regressão existente (`be_m03_04_05_crud.test.sql`, Casos 7/8) não cobre
  este cenário — testa só `account_id` próprio (Caso 7) e proteção de
  `is_system_default` (Caso 8), nunca uma referência cruzada de `account_id`.
- **Não é falso positivo nem duplicata de achado já triado**: é uma tabela/coluna
  fora do escopo explícito de `BE-M-13` — a correção sistêmica prometida em
  `SECURITY-REVIEW.md` Seção 1.2 original ("Escalar para: backend — correção de
  código, **sistemática — todas as tabelas com FK para outra tabela 'ownable', não
  só budget**") ficou, na prática, incompleta nesta tabela específica.
- **Análise de exploitabilidade real, hoje**: mesmo contexto já estabelecido para
  SEC-DEBT-002/Bloqueio 010 — produto de usuário único real (`SDD.md` Seção 7,
  RNF-09), allow-list de signup ativa (`BE-M-12`), UUID v4 não enumerável. O
  impacto também é mais restrito que o de `budget`/`transactions`: a linha de
  `payment_methods` criada/alterada continua pertencendo ao próprio atacante
  (`user_id` não muda) — não há leitura de dado de terceiro por esse caminho
  isoladamente, só quebra do invariante referencial (a forma de pagamento do
  atacante passa a "apontar" para uma conta que não é dele). Ainda assim, é a
  mesma classe OWASP API1/API3 (broken object-level/property-level authorization)
  já classificada como Alta em impacto potencial pelo achado original.
- **Severidade**: **Alta em impacto potencial (mesma classe do Bloqueio
  010/SEC-DEBT-002) / baixa exploitabilidade hoje**, pelo mesmo racional de
  contexto já aplicado pelo CTO ao achado-irmão.
- **Veredito**: **Não bloqueia o fechamento deste lote hoje** — mesmo tratamento
  já dado pelo CTO ao Bloqueio 010 original, aplicado aqui por analogia direta
  (mesma tabela de risco, mesmo mecanismo de mitigação primária vigente). Registro
  como débito com **condição de bloqueio automática (não é prazo de calendário)**,
  espelhando 1:1 a condição já fixada pelo CTO — **SEC-DEBT-006**.
- **Condição de bloqueio**: mesma do SEC-DEBT-002/Bloqueio 010 — bloqueia qualquer
  adição de e-mail a `allowed_signup_emails`, remoção/desativação do trigger de
  restrição de signup, ou funcionalidade de compartilhamento/múltiplos usuários,
  até este gap estar corrigido. Recomendo tratar como extensão direta do prazo já
  fixado pelo CTO no Bloqueio 010 (antes de qualquer tarefa `BE-F3-*`), não como
  nova deliberação de risco — o precedente técnico e de negócio já foi decidido;
  só o escopo da correção técnica (uma tabela a mais) é novo.
- **Correção sugerida**: acrescentar `exists (select 1 from public.accounts a
  where a.id = account_id and a.user_id = auth.uid())` (só quando `account_id is
  not null`) às policies `payment_methods_insert_own` e
  `payment_methods_update_own` — mesmo padrão exato já aplicado em `BE-M-13`.
  `payment_methods_select_own`/`_delete_own` não precisam de mudança (não recebem
  valor novo de FK).
- **Escalar para**: `backend` (correção de código) — registrado em `BLOCKERS.md`
  Bloqueio 013.
- **Sinalização ao CTO (paralela, não pré-requisito)**: ver Seção 5 — não é uma
  decisão de risco nova (o CTO já decidiu o "quê" e o "quando" no Bloqueio 010),
  é só o registro de que o escopo de execução de `BE-M-13` não cobriu 100% das
  tabelas que a própria correção sistêmica prometia cobrir.

**Restante do lote — nenhum outro achado de severidade relevante**:
- `payment_methods_update_own`/`_delete_own` (BE-M-02) confirmam corretamente
  `is_system_default = false` como condição de `UPDATE`/`DELETE` — impedem edição/
  exclusão de forma padrão mesmo pelo próprio dono autenticado com MFA (já
  validado por teste real de RLS, Caso 8 de `be_m03_04_05_crud.test.sql`).
- Trigger `accounts_seed_default_payment_methods` (`BE-M-02`) não é `SECURITY
  DEFINER`, mas isso não é um gap — roda `AFTER INSERT ON accounts` inserindo
  `payment_methods` com `user_id = new.user_id` igual ao do próprio usuário que
  está criando a conta (mesmo executor), então a policy `payment_methods_insert_own`
  de quem já está autenticado é suficiente; não há cross-user aqui, diferente do
  padrão que motivou `SECURITY DEFINER` em `accounts_block_delete_when_linked`/
  `categories_block_delete_when_linked` (que precisam enxergar linha de **outro**
  usuário).
- `AccountsPage.tsx`/`PaymentMethodsPage.tsx` tratam o 409 real de RN-08 e o 403
  de `is_system_default` corretamente via `ApiError.kind`, sem expor detalhe
  interno desnecessário na maioria dos casos — só o `kind === "conflict"` (RN-08)
  usa `error.message` bruto do Postgres na UI (`errors.ts:64-66`, `friendlyMessage`),
  que hoje é uma mensagem já escrita para ser lida por humano (`RAISE EXCEPTION` do
  trigger inclui o UUID da própria conta do usuário, não de terceiro) — nota menor,
  não registrada como débito por não expor dado de outro usuário nem segredo, só
  incluir jargão técnico (`RN-08`) e o UUID do próprio recurso do usuário na
  mensagem de erro.
- `createAccount`/`FirstAccountPage.tsx`/`TaxonomyReviewPage.tsx`: nenhum campo de
  FK cross-tenant no payload de `POST /accounts` (accounts não referencia outra
  tabela "ownable") — sem achado análogo ao de `payment_methods` aqui.
- Grep dirigido por `console.log`/`dangerouslySetInnerHTML`/`eval(`/
  `localStorage`/`sessionStorage` nos 6 arquivos de tela deste lote: única
  ocorrência é `console.error` em `OnboardingGate.tsx:24` (falha ao checar contas
  existentes) — loga o objeto `ApiError` local no console do próprio navegador do
  usuário (não enviado a servidor/terceiro), sem dado de outro usuário; não é
  achado de exposição de dado sensível.

---

### 1.9 — Auditoria completa (veredito de lote) — "Contas & Formas de Pagamento" — 2026-09-03

**Gatilho**: `QA-REPORT.md` Seção 4 aprovou (Aprovado, sem ressalva) as 6 tarefas
deste lote (`BE-M-02`, `BE-M-03`, `BE-M-04`, `FE-M-05`, `FE-M-06`, `FE-M-07`) — libera
a auditoria completa de DevSecOps (as 4 skills além de `static-security-analysis`,
já rodada em 1.8), conforme o próprio gatilho de `devsecops.md` ("QA aprovou o
build", "build" mapeado a "lote"). Esta rodada **não repete** o SAST de 1.8 — usa
seus achados como insumo e acrescenta os 3 checks de auditoria propriamente dita
mais a consolidação final.

#### `security-requirement-validation` — SDD.md Seção 7 + GUARDRAILS.md

Verificação direta contra o schema real (`supabase/schema-baseline-legacy.sql`,
regenerado em 2026-09-03 via `supabase db dump --linked` — Achado #3 já resolvido,
ver nota abaixo) e a migration do próprio lote
(`20260902100100_be_m02_payment_methods_defaults.sql`, `BE-M-02`):

| Requisito (`SDD.md` Seção 7 / `GUARDRAILS.md`) | Verificação | Evidência | Resultado |
|---|---|---|---|
| RLS `auth.uid() = user_id` em toda tabela (`Autorização`; `G-04`/`DIR-27`) | `accounts`/`payment_methods`, todas as policies `SELECT`/`INSERT`/`UPDATE`/`DELETE` | `schema-baseline-legacy.sql:1486-1498` (`accounts_*`), `1556-1568` (`payment_methods_*`) — todas com `auth.uid() = user_id` na cláusula `USING`/`WITH CHECK` | Passa |
| Gate de MFA por JWT claim `app_email_mfa_verified` em `accounts`/`payment_methods` (`Autorização`) | Mesmas 8 policies acima incluem `(auth.jwt() ->> 'app_email_mfa_verified') = 'true'` | Mesma evidência — nenhuma policy das duas tabelas omite o claim, incluindo `payment_methods_update_own`/`_delete_own`, reescritas nesta mesma migration do lote (`BE-M-02`, linhas 24-33) para acrescentar `is_system_default = false` sem remover o gate de MFA já existente | Passa |
| `is_system_default` bloqueia `UPDATE`/`DELETE` mesmo pelo dono autenticado com MFA (RF-MVP-02 AC1) | Policy explícita, não só validação de client | `payment_methods_update_own`/`_delete_own` incluem `is_system_default = false` na mesma cláusula RLS — reforçado por teste real de RLS (`be_m03_04_05_crud.test.sql` Caso 8, `SET LOCAL ROLE authenticated`, PASS confirmado por QA nesta sessão) | Passa |
| RN-08 (conta vinculada não é `DELETE` físico) enforced a nível de banco, `SECURITY DEFINER` (`G-05`/`G-19`) | Trigger `accounts_before_delete_block_linked` | `schema-baseline-legacy.sql:160-180` — comentário confirma `SECURITY DEFINER` desde `BE-M-13` (corrige o gap que motivaria G-19 especificamente para `accounts`); teste `be_m01_budget_and_guards.test.sql` Caso 4, PASS | Passa |
| `G-19` (ownership de FK entre tabelas ownable) — `payment_methods.account_id` | `payment_methods_insert_own`/`_update_own` não validam que `account_id` pertence ao mesmo `user_id` | Confirmado em 1.8 (`SEC-DEBT-006`/`BLOCKERS.md` Bloqueio 013) — não re-verificado do zero aqui, só referenciado; `G-19` em si segue `[PROPOSTA — aguardando aprovação do CTO]` em `GUARDRAILS.md` (confirmado, sem mudança desde a leitura de 1.8; `CTO-REVIEW.md` não tem entrada de aprovação de G-19) | **Não passa — já tratado como débito com condição de bloqueio automática (SEC-DEBT-006), não é achado novo** |
| Confirmação de ativação do `custom_access_token_hook` no dashboard Supabase (condição de aceite explícita do `SDD.md` Seção 7) | Não verificável por leitura de código — depende de configuração externa ao repositório | Já registrado como requisito operacional para DevOps na Seção 4 original deste documento; sem mudança nesta rodada | **Pendente de confirmação operacional, não é achado de código deste lote** |

**Nota sobre Achado #3 (DR)**: confirmei, por leitura do cabeçalho de
`schema-baseline-legacy.sql`, que o gap já foi resolvido entre a rodada 1.7 e esta
(regenerado via `supabase db dump --linked`, referenciado em `config.toml`) — não
reabro o achado nem preciso de nova ação aqui; ele não pertence a este lote de
qualquer forma.

**Nenhum requisito de arquitetura de segurança da Seção 7 do `SDD.md` relevante a
este lote está implementado de forma diferente do especificado**, com a única
exceção já conhecida e já tratada (`G-19`/`SEC-DEBT-006`).

#### `compliance-validation` — LGPD

| Verificação | Evidência | Resultado |
|---|---|---|
| Minimização de dado — `accounts`/`payment_methods` não armazenam PII além do necessário para a finalidade (dado financeiro de uso pessoal) | `schema-baseline-legacy.sql:940-953` (`accounts`: `name`, `type`, `currency`, saldo, `color`/`icon`, sem CPF/endereço/telefone/e-mail duplicado) e `:1095-1107` (`payment_methods`: `type`, `name`, `account_id`/`credit_card_id`, sem dado adicional de titular) | Passa |
| Base legal/titular — o dado é do próprio operador do sistema (autoprocessamento), não de terceiro | Mesmo enquadramento já assentado pelo CTO em `CTO-REVIEW.md` (linha 307, citado em 1.5): "lançamentos, saldo, categoria... são dado pessoal do próprio stakeholder... Base/finalidade: uso pessoal" — `accounts`/`payment_methods` são a mesma classe de dado (saldo/forma de pagamento do próprio usuário), não introduzem um segundo titular | Passa |
| Direito ao esquecimento / exclusão | RN-08 impede `DELETE` físico de conta vinculada (inativação em vez de exclusão) — isso é uma regra de integridade de ledger, não um obstáculo ao direito de exclusão: o mecanismo formal de "exclusão de conta a pedido do usuário" (`ADR-011`, `SDD.md` Seção 7 "Retenção e Descarte de Dado") é uma Edge Function privilegiada dedicada, separada do `DELETE` direto de uma `account` isolada — não pertence ao escopo deste lote (nenhuma tarefa `BE-M-02/03/04`/`FE-M-05/06/07` implementa exclusão de conta de usuário, só CRUD de `accounts`/`payment_methods` como registros financeiros) | Passa — sem achado, fora de escopo confirmado, não uma lacuna |
| Payload de API não devolve campo além do documentado em `API-CONTRACT.yaml` | `API-CONTRACT.yaml` linhas 165-256 (`/accounts`, `/payment_methods`) — schemas `Account`/`PaymentMethod` batem com as colunas reais da tabela (checado contra `schema-baseline-legacy.sql` acima); `accounts.ts`/`paymentMethods.ts` usam `select("*")`, mas a tabela não tem coluna sensível fora do documentado | Passa |

**Nenhum achado de compliance obrigatório (LGPD) não resolvido neste lote** — nenhuma
exposição desnecessária de dado pessoal em `accounts`/`payment_methods`, nenhum
gap de base legal.

#### `sensitive-data-exposure-check`

| Superfície | Verificação | Evidência | Resultado |
|---|---|---|---|
| Payload de API (`POST`/`PATCH` de `accounts`/`payment_methods`) | Nenhum campo de segredo/token/dado de outro usuário no request ou response | `frontend/src/lib/api/accounts.ts`, `paymentMethods.ts` — payload é só `NewAccount`/`NewPaymentMethod` (campos de domínio financeiro do próprio usuário), sem token/segredo | Passa |
| Mensagens de erro (`errors.ts`) | Erro `403`/`404` ("forbidden") usa mensagem genérica, sem detalhe de por que a RLS negou (não revela existência/dado de linha de outro usuário); erro `409` ("conflict") usa `error.message` bruto do Postgres, mas as mensagens reais (`RAISE EXCEPTION` de RN-08/RN-09) só citam o UUID do próprio recurso do usuário que fez a chamada, nunca de terceiro (já confirmado em 1.8) | `frontend/src/lib/api/errors.ts:56-68` — `friendlyMessage()` | Passa (nota menor já registrada em 1.8, não é achado novo) |
| Logs client-side | Único `console.*` nas 6 telas do lote é `console.error` em `OnboardingGate.tsx:24`, loga `ApiError` local (mensagem amigável + código), nunca enviado a servidor/terceiro, nunca contém dado de outro usuário | Grep dirigido, reconfirmado nesta rodada | Passa |
| Armazenamento local (`localStorage`/`sessionStorage`/IndexedDB) | Nenhuma das 6 telas/módulos de API deste lote persiste dado fora do fluxo normal de estado do React — sem uso de `localStorage`/`sessionStorage` | Grep dirigido nos 6 arquivos de tela + 2 módulos de API do lote, reconfirmado nesta rodada | Passa |
| Segredos hardcoded | Nenhum token/chave/URL de serviço nos arquivos do lote | Grep dirigido, reconfirmado (já feito em 1.8) | Passa |

**Nenhum vazamento de dado sensível via API, log ou client-side neste lote.**

#### Veredito consolidado do lote — "Contas & Formas de Pagamento"

Consolidando o achado da análise estática (1.8, `SEC-DEBT-006`) com os 3 checks
acima (nenhum achado novo de severidade alta/crítica):

- **Achados que bloqueiam o deploy deste lote hoje: nenhum.**
- **Achado de severidade Alta em impacto (SEC-DEBT-006, `payment_methods.account_id`
  sem validação de ownership de FK)**: já registrado em 1.8, débito com condição de
  bloqueio automática (não calendário), mesmo tratamento já dado pelo CTO ao
  achado-irmão `SEC-DEBT-002`/Bloqueio 010 — não é achado novo desta rodada, apenas
  confirmado e reforçado pela verificação direta de `security-requirement-validation`
  acima (linha `G-19` da tabela).
- **Compliance obrigatório (LGPD)**: nenhum achado — nada fica pendente como débito,
  não há gap a resolver.
- **Exposição de dado sensível**: nenhum achado novo.

**Veredito do lote: Aprovado com débito.** As 6 tarefas (`BE-M-02`, `BE-M-03`,
`BE-M-04`, `FE-M-05`, `FE-M-06`, `FE-M-07`) estão liberadas para o fechamento formal
do lote pelo Tech Lead (`TASK.md` Seção 7) do ponto de vista de segurança — o único
item em aberto (`SEC-DEBT-006`) é débito registrado com dono e condição de bloqueio
automática já fixados, não um achado que impeça o fechamento deste lote
especificamente (mesmo racional já aplicado ao lote anterior e ao achado-irmão).

**Sinalização ao CTO (paralela, não pré-requisito)**: nenhuma nova — a única
sinalização estratégica gerada por este lote (`SEC-DEBT-006`) já foi registrada na
Seção 5, item 5, durante a rodada 1.8. Esta consolidação não adiciona sinalização
nova.

---

---

### 1.10 — `static-security-analysis` sobre o lote "Ledger & Dashboard" — 2026-09-03

**Escopo desta rodada** (dispara em paralelo ao QA, sobre código real, sem esperar
veredito de `QA-REPORT.md` — `EXECUTION-FLOW.md`, "DevSecOps — dois ritmos, ambos
por lote"): `BE-M-06` (CRUD de lançamentos manuais + recálculo de saldo via
`apply_transaction_effect`/`fn_clear_due_transactions`, migrations/policies
associadas — nenhuma migration nova específica de `BE-M-06` além do achado de
citação de RN já resolvido em `BE-M-00`), `BE-M-07` (`get_month_provision`,
`get_monthly_category_summary`, migration nova
`20260902100200_be_m07_month_transaction_count.sql` para `get_month_transaction_count`),
`FE-M-03` (`frontend/src/lib/offline/{db,queue,sync,useOfflineQueue}.ts`, fila
offline Dexie/IndexedDB), `FE-M-09`
(`frontend/src/pages/transactions/{TransactionsPage,TransactionFormModal}.tsx`),
`FE-M-10` (`frontend/src/pages/dashboard/DashboardPage.tsx`,
`frontend/src/lib/api/{transactions,dashboard}.ts`). Cross-referenciado contra
`TASK.md` Seção 3.1 (linhas `BE-M-06`/`BE-M-07`/`FE-M-03`/`FE-M-09`/`FE-M-10`, íntegra
lida antes de avaliar), `GUARDRAILS.md` (G-04, G-05, G-19 — proposta), `API-CONTRACT.yaml`,
e `SECURITY-REVIEW.md` Seção 1.9 (mesmo padrão de rigor).

**Confirmação prévia obrigatória (G-19/BE-M-13) — feita antes de qualquer outra
análise**: verifiquei por leitura direta da migration
`20260903100000_be_m13_fk_ownership_and_security_definer_guards.sql` que
`transactions_insert_own`/`transactions_update_own` **já validam** ownership de
`account_id`/`category_id`/`payment_method_id`/`destination_account_id` via
`EXISTS (...)` (linhas 71-112 da migration) — diferente do gap que
`SEC-DEBT-006`/Bloqueio 013 encontrou em `payment_methods.account_id` (escopo de
`BE-M-13` explicitamente cobriu `budget`/`transactions`, não `payment_methods`).
**Não há gap de G-19 neste lote** — `transactions`, a única tabela "ownable" com FK
para outra tabela "ownable" tocada por este lote, está corrigida. Nenhum novo débito
desta classe.

**`BLOCKERS.md` — confirmação de que nenhum bloqueio aberto toca este lote**: li os
5 bloqueios apontados (004, 007, 009, 012, 013) na íntegra, não presumi a partir do
resumo do orquestrador. Nenhum toca `BE-M-06`/`BE-M-07`/`FE-M-03`/`FE-M-09`/`FE-M-10`
diretamente: 004 (credenciais Vercel/deploy) e 007 (credenciais S3 de backup) são de
infraestrutura/DevOps, sem relação com o código deste lote; 009 é
`auth-email-mfa`/CORS (já SEC-DEBT-001, tarefa `BE-M-09`, outro lote); 012 é DR/
`schema-baseline-legacy.sql` (já SEC-DEBT-005); 013 é `payment_methods.account_id`
(já SEC-DEBT-006, lote "Contas & Formas de Pagamento"). Confirmado — nenhum bloqueio
existente é reaberto ou herdado por este lote.

**`npm audit --omit=dev` sobre `frontend/package.json`/`package-lock.json`**: **0
vulnerabilidades** (mesmo resultado das rodadas 1.7/1.8 — nenhuma dependência nova de
produção introduzida por este lote; `dexie` já presente desde antes). Grep dirigido
por `console.*`/`dangerouslySetInnerHTML`/`eval(`/`localStorage`/`sessionStorage` em
todos os arquivos do escopo: única ocorrência é `console.error` em
`useOfflineQueue.ts:33` (erro do `liveQuery`/Dexie, só no console do próprio
navegador, sem dado de outro usuário — mesmo padrão não-achado já aplicado a
`OnboardingGate.tsx` em 1.8). Nenhum segredo hardcoded nos arquivos do escopo.

**Fila offline (`FE-M-03`) — nenhum achado de severidade relevante**: `PendingTransaction`
(`db.ts`) persiste só campos de domínio financeiro do próprio usuário
(conta/forma/categoria/valor/tipo/data/descrição — mesmo conjunto de campos do form
S-TXN-02), via IndexedDB (Dexie), nunca `localStorage` (confirmado por grep, consistente
com DIR-11). Item só sai da fila após confirmação explícita de sucesso do servidor
(`sync.ts:58-81`, `removePendingTransaction` chamado só dentro do branch `ok:true`) —
sem perda silenciosa nem duplicação otimista. **Nota informacional, não achado**: o
`SDD.md` Seção 7 ("Criptografia") só exige criptografia adicional em nível de aplicação
para "campos especialmente sensíveis" (cita nominalmente só o token de conexão Open
Finance) — a fila de lançamentos em IndexedDB não está coberta por esse requisito
explícito, e seu conteúdo (dado financeiro do próprio usuário, mesma classe de dado já
avaliada pelo CTO como autoprocessamento/LGPD de baixo risco, `CTO-REVIEW.md` linha 307)
não muda essa análise. Não registro como débito.

**Telas de lançamento (`FE-M-09`) e Dashboard (`FE-M-10`) — nenhum achado de
severidade relevante**: `TransactionsPage.tsx`/`TransactionFormModal.tsx`/
`DashboardPage.tsx` consomem `/transactions`, `get_month_provision`,
`get_monthly_category_summary`, `get_month_transaction_count`, `get_budget_status`
reais — nenhum payload com campo de segredo/token/dado de outro usuário. Mensagens de
erro exibidas (`errors.ts`, já auditado em 1.8/1.9, revalidado aqui sem mudança)
seguem o mesmo padrão: `forbidden`/`validation` genéricas, `conflict` usa
`error.message` bruto do Postgres mas só cita o UUID do próprio recurso do usuário
(ex.: bloqueio RN-08 de conta inativa), nunca dado de terceiro.

**Achado novo — `apply_transaction_effect` exposta como RPC pública direta via
PostgREST, fora do caminho de trigger que a legitima (função interna sem gate de
autoria própria)**: confirmado por leitura direta do schema real
(`supabase/schema-baseline-legacy.sql:303-328,1852-1854`) e de `supabase/config.toml`
(`schemas = ["public", ...]`, sem exclusão de função — todo `public` é exposto como API
PostgREST por padrão). `public.apply_transaction_effect(p_row public.transactions,
p_sign smallint)`:
- **Não é `SECURITY DEFINER`** (roda como `SECURITY INVOKER`, papel de quem chama) e
  **tem `GRANT ALL` para `anon` e `authenticated`** — herdado do dump legado, nunca
  revisto por nenhuma migration deste projeto (confirmado via grep — só aparece em
  `20260827170841_baseline_legacy.sql`).
- A função **não valida nada sobre `auth.uid()`** internamente — ela confia
  cegamente em `p_row.account_id`/`p_row.destination_account_id` e aplica
  `UPDATE public.accounts SET current_balance_cents = current_balance_cents + p_sign *
  p_row.amount_cents WHERE id = ...`. Diferente das RPCs de dashboard
  (`get_month_provision`/`get_monthly_category_summary`/`get_month_transaction_count`,
  todas também `SECURITY INVOKER` com `GRANT` a `anon`/`authenticated`, mas
  **desenhadas para exposição direta** — filtram explicitamente por `auth.uid()` no
  corpo da própria função, com comentário confirmando essa intenção: "SECURITY
  INVOKER: respeita a RLS normal de accounts/transactions"), `apply_transaction_effect`
  é uma função auxiliar de uso interno (chamada só por
  `transactions_maintain_account_balance`, o trigger `AFTER INSERT/UPDATE/DELETE` em
  `transactions`) que nunca foi desenhada para ser chamada diretamente — não tem
  `auth.uid()` nem qualquer defesa própria, dependendo inteiramente do RLS incidental
  da tabela `accounts` alvo do `UPDATE` interno para conter o efeito.
- **Análise de exploitabilidade real**: como a função não é `SECURITY DEFINER`, o
  `UPDATE` interno roda sob a RLS do papel chamador — `accounts_update_own` exige
  `auth.uid() = user_id` (+ gate de MFA), então um usuário autenticado só consegue,
  na prática, afetar **a própria conta** ao chamar `POST /rest/v1/rpc/apply_transaction_effect`
  diretamente com um `p_row` forjado (PostgREST aceita parâmetro de tipo composto via
  objeto JSON com os nomes de campo da tabela). **Não há vazamento nem alteração de
  dado de outro usuário** — o mesmo `auth.uid() = user_id` que protege o resto do
  produto também contém este vetor à própria conta do atacante. O risco real não é de
  confidencialidade/autorização cross-tenant (já coberto por RLS), é de **integridade do
  próprio ledger**: um usuário pode inflar/deflacionar `accounts.current_balance_cents`
  arbitrariamente **sem criar nenhum registro em `transactions`** — quebrando
  silenciosamente o invariante central do produto ("saldo consolidado = soma dos
  lançamentos", base de RF-MVP-04/05/06) sem deixar rastro auditável, diferente de
  criar um lançamento manual falso via `POST /transactions` (já hoje permitido por
  design — é dado do próprio usuário, sem verificação de veracidade), que ao menos
  aparece na lista de lançamentos e é consistente com o saldo.
- **Por que ainda assim é um achado, apesar do impacto hoje ser autolimitado**: é uma
  violação de princípio de privilégio mínimo/function-level authorization (uma função
  interna de suporte a trigger não deveria ter superfície de RPC pública nenhuma,
  independente de RLS conter o dano) — mesma classe geral de raciocínio já aplicada
  pelo próprio projeto a `profiles.pin_hash` (Achado 6 de `AUDITORIA-BE-M-00.md`,
  "legível via SELECT direto do cliente", corrigido em `BE-M-09` via `REVOKE` de
  coluna) e aos triggers de bloqueio de `DELETE` promovidos a `SECURITY DEFINER`
  (`BE-M-13`/G-19). O padrão de correção já está estabelecido no próprio repositório;
  só não foi aplicado a esta função porque ela nunca havia sido reavaliada sob a ótica
  "o que este `GRANT` herdado do legado realmente expõe hoje, com `public` sendo o
  schema de API real" — a auditoria original de `BE-M-00` (Seção 4 de
  `AUDITORIA-BE-M-00.md`) testou a corretude funcional (regressão, 9 casos PASS), não
  a superfície de exposição via RPC direto.
- **Severidade**: **Média** — mesma régua já usada para SEC-DEBT-001 (risco real,
  correção de custo baixo, mas exploitabilidade prática limitada hoje: exige sessão
  autenticada + MFA verificado, e o dano fica confinado à própria conta do atacante,
  sem ganho óbvio sobre o que ele já pode fazer via `POST /transactions` legítimo —
  a diferença real é ausência de rastro auditável, não um novo tipo de dano).
- **Veredito**: **Não bloqueia o gate.** Débito registrado — **SEC-DEBT-007**.
- **Prazo/condição**: corrigir no próximo toque em `transactions`/`apply_transaction_effect`
  (custo baixo — sem necessidade de migration destrutiva, é redefinição de function/grant,
  mesmo precedente de `BE-M-13`/DIR-03). Correção sugerida, mesmo padrão já usado no
  projeto: (a) promover `transactions_maintain_account_balance` (a trigger function que
  chama `apply_transaction_effect`) a `SECURITY DEFINER SET search_path TO 'public',
  'pg_temp'` — assim o `perform public.apply_transaction_effect(...)` interno passa a
  rodar sob o papel do dono (`postgres`), que já tem privilégio implícito, sem depender
  de `GRANT` a `authenticated`; (b) `REVOKE EXECUTE ON FUNCTION
  public.apply_transaction_effect(public.transactions, smallint) FROM PUBLIC, anon,
  authenticated;` (manter só para `postgres`/`service_role`), fechando a superfície de
  RPC direto sem afetar o fluxo normal de CRUD de `transactions` (que continua
  funcionando via trigger). Teste de regressão recomendado: confirmar que
  `POST /rest/v1/rpc/apply_transaction_effect` retorna 403/`permission denied` após a
  correção, e que INSERT/UPDATE/DELETE normais em `transactions` continuam recalculando
  o saldo corretamente (reexecutar a suíte de 9 casos já existente,
  `supabase/tests/apply_transaction_effect.test.sql`).
- **Escalar para**: `backend` (correção de código) — registrado em `BLOCKERS.md`
  Bloqueio 014.
- **Sinalização ao CTO**: não aplicável como decisão de risco de negócio (diferente de
  SEC-DEBT-002/006) — é puramente uma correção técnica de privilégio mínimo, sem
  trade-off de produto envolvido; menciono na Seção 5 só por transparência/registro,
  não como pedido de decisão.

**Restante do lote — nenhum outro achado de severidade relevante**:
`get_month_transaction_count` (nova RPC de `BE-M-07`) segue exatamente o padrão correto
já usado por `get_month_provision`/`get_monthly_category_summary` — `SECURITY INVOKER`,
filtro explícito `t.user_id = auth.uid()` no corpo da própria função, `search_path`
fixo — sem o mesmo problema de `apply_transaction_effect` (foi desenhada desde o início
para exposição direta via RPC, ao contrário da função legada). `fn_clear_due_transactions`
confirmado `SECURITY DEFINER` com `search_path` fixo e `REVOKE ALL ... FROM PUBLIC` +
`GRANT` só a `service_role` (fail-closed correto, só o job `pg_cron` chama) — já
adotado como está por `BE-M-00`/`BE-M-06`, sem achado novo aqui. Migration
`20260903110000_dr_bloqueio011_fn_clear_due_transactions_cron.sql` (agendamento do
`cron.schedule` já existente, versionado por DR — Bloqueio 012) não introduz nenhuma
mudança de superfície de segurança, é só DDL declarativo de um estado já ativo em
produção.

**Veredito do lote "Ledger & Dashboard": Aprovado com débito.** Nenhum achado de
severidade alta/crítica; nenhum achado de compliance obrigatório (LGPD); um achado
novo de severidade Média (`SEC-DEBT-007`), não bloqueante, registrado com dono e
correção sugerida. As 5 tarefas (`BE-M-06`, `BE-M-07`, `FE-M-03`, `FE-M-09`, `FE-M-10`)
estão liberadas, do ponto de vista desta rodada de `static-security-analysis`, para
seguir o fluxo normal do pipeline — a auditoria completa (5 skills) deste lote fica
condicionada ao gate de `QA-REPORT.md` aprovando funcionalmente, conforme
`EXECUTION-FLOW.md` e meu próprio guardrail de não auditar build não validado pelo QA.

---

### 1.11 — Auditoria completa (veredito final de lote) — "Ledger & Dashboard" — 2026-09-03

**Gatilho**: `QA-REPORT.md` Seção 5 aprovou (**Aprovado com ressalvas**) as 5 tarefas
deste lote (`BE-M-06` Aprovado; `BE-M-07` Aprovado, nota `QA-DEBT-008`; `FE-M-03`
Aprovado; `FE-M-09` **Aprovado com ressalva**, `QA-DEBT-007`; `FE-M-10` Aprovado, nota
`QA-DEBT-008`) — libera a auditoria completa de DevSecOps (as 4 skills além de
`static-security-analysis`, já rodada em 1.10), conforme meu próprio gatilho de "não
audito build que o QA ainda não validou funcionalmente". Nenhuma das duas ressalvas
de QA (`QA-DEBT-007`, gap de validação `onBlur`; `QA-DEBT-008`, canal Realtime
cross-tab não implementado) toca superfície de segurança — confirmado por leitura
direta: `QA-DEBT-007` é um gap de timing de feedback de UI, a submissão continua
rejeitando corretamente dado inválido/incompleto (nenhum caminho novo de persistência
sem validação); `QA-DEBT-008` é ausência de um mecanismo (nada novo exposto, só uma
funcionalidade não implementada). Esta rodada **não repete** o SAST de 1.10 — usa seu
achado (`SEC-DEBT-007`) como insumo e acrescenta os 4 checks restantes mais a
consolidação final.

#### `security-requirement-validation` — SDD.md Seção 7 + GUARDRAILS.md

Verificação direta contra o schema real (`supabase/schema-baseline-legacy.sql`) e o
código-fonte das 5 tarefas do lote:

| Requisito (`SDD.md` Seção 7 / `GUARDRAILS.md`) | Verificação | Evidência | Resultado |
|---|---|---|---|
| RLS `auth.uid() = user_id` em `transactions` (`Autorização`; `G-04`) | `transactions_select_own`/`_insert_own`/`_update_own`/`_delete_own` | `schema-baseline-legacy.sql:1586-1609` — todas com `auth.uid() = user_id` na cláusula `USING`/`WITH CHECK` | Passa |
| Gate de MFA por JWT claim `app_email_mfa_verified` em `transactions` (`Autorização` — uma das 4 tabelas exigidas) | Mesmas 4 policies acima | Mesma evidência — `(auth.jwt() ->> 'app_email_mfa_verified') = 'true'` presente nas 4, sem exceção | Passa |
| `G-19` — ownership de FK (`account_id`/`category_id`/`payment_method_id`/`destination_account_id`) em `transactions` | `transactions_insert_own`/`_update_own` | `schema-baseline-legacy.sql:1590-1609` — `EXISTS(...)` valida `account.user_id = auth.uid()` e `category.user_id IN (auth.uid(), NULL)` para cada FK | Passa (já confirmado em 1.10, reconfirmado aqui como parte formal da checagem de requisito, não só de SAST) |
| RPCs de dashboard (`get_month_provision`/`get_monthly_category_summary`/`get_month_transaction_count`) respeitam RLS por design, não só por herança | Corpo das 3 funções (`LANGUAGE sql`, sem `SECURITY DEFINER`) filtra explicitamente `user_id = auth.uid()`/`a.user_id = auth.uid()` na própria query, além de rodar como `SECURITY INVOKER` (dupla barreira) | `schema-baseline-legacy.sql:544-632` — lidas linha a linha nesta rodada | Passa |
| **Nota de escopo — `budget` não é tocada por este lote**: verifiquei as 3 RPCs de `BE-M-07` linha a linha; nenhuma referencia `public.budget` (só `accounts`/`transactions`/`categories`). A menção a "`budget` indiretamente via RPCs de dashboard" no escopo desta rodada não se confirma no código real — registro aqui para não deixar a checagem implícita, sem gerar achado (não há requisito de `budget` a violar porque `budget` não é lida/escrita por nenhum artefato deste lote) | — | — | Não aplicável (confirmado, não é lacuna) |
| Fila offline (`FE-M-03`) não trata "fila sincronizada" como autorização (`G-07`) | `sync.ts`/`queue.ts` — todo item da fila só é persistido no servidor via `POST /transactions` real (PostgREST + JWT de sessão + RLS), nunca por um caminho que dispense a chamada de rede autenticada | `sync.ts:37-45` (`realSyncClient` chama `createTransaction`, que usa o client `supabase-js` autenticado) | Passa |
| Ausência de `SECURITY DEFINER`/gate próprio em `apply_transaction_effect` (função interna exposta como RPC) | Já triado em 1.10 | `SEC-DEBT-007`/Bloqueio 014 | Não passa — já tratado como débito Média, não é achado novo aqui |

**Nenhum requisito de arquitetura de segurança da Seção 7 do `SDD.md` relevante a
este lote está implementado de forma diferente do especificado**, com a única
exceção já conhecida e já tratada (`SEC-DEBT-007`).

#### `compliance-validation` — LGPD

| Verificação | Evidência | Resultado |
|---|---|---|
| Minimização de dado — `transactions` não armazena PII além do necessário para a finalidade (dado financeiro de uso pessoal) | Schema real de `transactions` (`amount_cents`, `kind`, `description` livre, `transaction_date`, FKs de domínio) — sem CPF/documento/dado de terceiro; `description` é texto livre digitado pelo próprio usuário sobre o próprio lançamento (ex. "Mercado", "Salário"), mesma classe de autoprocessamento já avaliada pelo CTO | Passa |
| Base legal/titular — dado é do próprio operador do sistema (autoprocessamento) | Mesmo enquadramento já assentado em `CTO-REVIEW.md` linha 307 (citado em 1.5/1.9) — lançamento/saldo são a mesma classe de dado pessoal do próprio stakeholder, sem introduzir segundo titular | Passa |
| Retenção (`ADR-011`/`SDD.md` Seção 7 "Retenção e Descarte de Dado") não contradita antecipadamente | Tabela de retenção do `ADR-011`: "Ledger (lançamentos...) — Indefinida, enquanto a conta estiver ativa; descarte só por exclusão de conta". Nenhum artefato deste lote (`BE-M-06`/`BE-M-07`/`FE-M-03`/`FE-M-09`/`FE-M-10`) implementa expurgo automático, TTL, ou qualquer mecanismo que descarte `transactions` antes da exclusão de conta — grep dirigido por `DELETE FROM transactions`/`pg_cron` tocando `transactions` fora de `fn_clear_due_transactions` (que só faz `UPDATE status`, nunca `DELETE`): nenhuma ocorrência | Passa — nenhuma contradição |
| Direito ao esquecimento / exclusão | Mecanismo formal de exclusão de conta (`ADR-011`, Edge Function privilegiada dedicada) não pertence a este lote — nenhuma tarefa `BE-M-06/07`/`FE-M-03/09/10` implementa exclusão de conta de usuário, só CRUD de lançamentos e leitura agregada | Passa — fora de escopo confirmado, não uma lacuna |
| Payload de API não devolve campo além do documentado em `API-CONTRACT.yaml` | `API-CONTRACT.yaml` linhas 356-425 (`Transaction`) batem com as colunas reais de `transactions` (campos `readOnly` de Fase 2 — `card_invoice_id`/`recurring_rule_id`/`installment_plan_id`/`fixed_bill_id` — presentes no contrato mas não gravados por nenhum caminho deste lote, `source: "manual"` sempre); `frontend/src/lib/api/transactions.ts`/`dashboard.ts` não usam `select("*")` sem necessidade além do já documentado | Passa |
| Consentimento/finalidade | Não aplicável — nenhuma integração de terceiro (Open Finance/OCR/STT) é tocada por este lote; dado é 100% inserido manualmente pelo próprio usuário | Passa |

**Nenhum achado de compliance obrigatório (LGPD) não resolvido neste lote** —
nenhuma exposição desnecessária de dado pessoal em `transactions`/dashboard, nenhum
gap de base legal, nenhuma contradição com a política de retenção já aprovada.

#### `sensitive-data-exposure-check`

| Superfície | Verificação | Evidência | Resultado |
|---|---|---|---|
| Fila offline (IndexedDB/Dexie, `FE-M-03`) | Campos persistidos são só domínio financeiro do próprio usuário (`accountId`, `paymentMethodId`, `categoryId`, `subcategoryId`, `amountCents`, `type`, `description`, `date`, `status`, `lastError`, `createdAt`, `updatedAt`) — nenhum campo de token/sessão/PIN/segredo na tabela `pendingTransactions` | `frontend/src/lib/offline/db.ts:15-33` (`PendingTransaction` interface), única tabela Dexie do banco `mymoney-offline` | Passa — confirma explicitamente a pergunta do escopo desta rodada (ausência de token/PIN/segredo na fila) |
| `lastError` da fila offline não vaza detalhe interno | `lastError` recebe `ApiError.message`/`Error.message` (mesma função `friendlyMessage`/fallback genérico usados na UI, ver linha abaixo) — mensagens amigáveis pré-formatadas ou genéricas, nunca stack trace/query SQL bruta | `sync.ts:42` (`error.message` de `ApiError`, que já passou por `friendlyMessage()` em `errors.ts`) | Passa |
| Mensagens de erro do Dashboard (`DashboardPage.tsx`) e Lançamentos (`TransactionsPage.tsx`/`TransactionFormModal.tsx`) não vazam detalhe interno (stack trace, query SQL) | `errors.ts` (`toApiError`/`friendlyMessage`) mapeia `forbidden`/`validation` para texto genérico fixo; `conflict` usa `error.message` do Postgres, mas (já confirmado em 1.8/1.9) essas mensagens só citam o UUID do próprio recurso do usuário, nunca de terceiro, nunca stack trace | `frontend/src/lib/api/errors.ts:57-68`; `DashboardPage.tsx:62`, `TransactionsPage.tsx:56,106`, `TransactionFormModal.tsx:139` — todos usam `cause.message` de `ApiError`, nunca `error.stack`/objeto bruto do driver | Passa (com nota abaixo) |
| **Nota informacional, não achado**: o fallback `kind === "unknown"` de `friendlyMessage()` (`errors.ts:67`, `return error.message \|\| "Ocorreu um erro inesperado..."`) devolve `error.message` do PostgREST bruto para qualquer erro que não seja `400`/`409`/`403`/`404` (ex.: um `500` genuíno de timeout/conexão) — em teoria poderia incluir texto de erro interno do Postgres não pensado para exibição a usuário final. Não registro como débito novo: (a) é o mesmo módulo `errors.ts` já auditado em 1.8/1.9 sob o mesmo critério ("nunca dado de outro usuário"), sem mudança de código nesta rodada; (b) mensagens de erro do PostgREST/Postgres para falhas genuínas de infraestrutura (timeout, conexão) não incluem valor de linha de outro usuário nem segredo — o pior caso realista é nome de tabela/coluna/constraint, informação de schema já pública via `API-CONTRACT.yaml`; (c) as 3 RPCs deste lote são `STABLE`/consultas simples, sem caminho de exceção de negócio conhecido além dos já mapeados. Recomendo ao Frontend, como melhoria de higiene (não bloqueante), usar sempre uma mensagem genérica fixa para `kind === "unknown"` em vez de repassar `error.message`, reservando o passthrough só para `conflict` (que já é uma mensagem pensada para leitura humana via `RAISE EXCEPTION`) | — | — | Observação registrada, não débito |
| Segredos hardcoded nos arquivos do lote | Nenhum token/chave/URL de serviço | Grep dirigido, reconfirmado nesta rodada nos 5 conjuntos de arquivos do lote | Passa |
| `localStorage`/`sessionStorage` | Nenhum uso nos arquivos do lote (fila usa exclusivamente IndexedDB via Dexie, conforme DIR-11) | Grep dirigido, reconfirmado | Passa |

**Nenhum vazamento de dado sensível via fila offline, API ou mensagem de erro neste
lote** — confirmado que a fila offline não persiste token/PIN/segredo, só dado
financeiro do próprio usuário, conforme perguntado explicitamente no escopo desta
rodada.

#### `finding-severity-classification`

Nenhum achado novo de severidade nesta rodada (as 4 skills acima não geraram achado
adicional a `SEC-DEBT-007`, já classificado em 1.10). Reconfirmo a classificação já
aplicada: **Média**, não bloqueante, débito com dono (`backend`) e correção de baixo
custo sugerida — critério idêntico ao já usado para `SEC-DEBT-001` (mesma régua:
risco real, exploitabilidade prática limitada, custo de correção baixo). A observação
sobre `kind === "unknown"` em `errors.ts` (acima) fica registrada como nota, não como
débito formal — mesmo tratamento já dado a notas equivalentes em 1.8/1.9 (ex.:
`kind === "conflict"` expor `error.message`), por não atender ao limiar mínimo de
"achado" (nenhuma exposição de dado de outro usuário ou segredo confirmada, é um
risco teórico de higiene de mensagem, não uma vulnerabilidade concreta).

#### Veredito consolidado final do lote — "Ledger & Dashboard"

Consolidando o achado da análise estática (1.10, `SEC-DEBT-007`) com os 4 checks
acima (nenhum achado novo de qualquer severidade):

- **Achados que bloqueiam o deploy deste lote hoje: nenhum.**
- **Achado de severidade Média (`SEC-DEBT-007`, `apply_transaction_effect` exposta
  como RPC pública sem gate próprio)**: já registrado em 1.10, débito com dono
  (`backend`) e correção sugerida de baixo custo — não é achado novo desta rodada,
  apenas confirmado e reforçado pela verificação direta de
  `security-requirement-validation` acima.
- **Compliance obrigatório (LGPD)**: nenhum achado — nada fica pendente como débito,
  nenhuma contradição com `ADR-011`.
- **Exposição de dado sensível**: nenhum achado novo — fila offline confirmada livre
  de token/PIN/segredo (pergunta explícita do escopo desta rodada, respondida
  positivamente); uma observação de higiene de mensagem de erro registrada sem
  virar débito formal.
- **Requisitos operacionais para o DevOps**: nenhum requisito novo específico deste
  lote — a Seção 4 já cobre o que é aplicável (CORS, Auth Hook, drill de DR, etc.);
  nenhuma mudança de superfície operacional introduzida por `BE-M-06`/`BE-M-07`/
  `FE-M-03`/`FE-M-09`/`FE-M-10`.

**Veredito do lote: Aprovado com débito.** As 5 tarefas (`BE-M-06`, `BE-M-07`,
`FE-M-03`, `FE-M-09`, `FE-M-10`) estão liberadas para o fechamento formal do lote pelo
Tech Lead (`TASK.md` Seção 7) do ponto de vista de segurança — o único item em
aberto (`SEC-DEBT-007`/Bloqueio 014) é débito registrado com dono e correção
sugerida, de severidade Média, não bloqueante, consistente com o mesmo padrão já
aplicado aos lotes anteriores.

**Sinalização ao CTO (paralela, não pré-requisito)**: nenhuma nova — a única
sinalização estratégica gerada por este lote (`SEC-DEBT-007`) já foi registrada na
Seção 5, item 6, durante a rodada 1.10. Esta consolidação não adiciona sinalização
nova (a correção é puramente técnica, sem trade-off de produto/negócio).

---

### 1.12 — `static-security-analysis` sobre o lote "Categorização" — 2026-09-03

**Escopo desta rodada** (dispara em paralelo ao QA, sobre código real, sem esperar
veredito de `QA-REPORT.md` — `EXECUTION-FLOW.md`, "DevSecOps — dois ritmos, ambos
por lote"): `BE-M-05` (CRUD de categorias/subcategorias + bloqueio de exclusão
vinculada, RN-09, hierarquia de 2 níveis via `validate_category_hierarchy` —
reaproveita `public.categories`/RLS/trigger já existentes, nenhuma migration nova
específica de `BE-M-05`) e `FE-M-08`
(`frontend/src/pages/categories/CategoriesPage.tsx`,
`frontend/src/lib/api/categories.ts`, telas S-CAT-01/02/03). Cross-referenciado
contra `TASK.md` Seção 3.1 (linhas `BE-M-05`/`FE-M-08`, íntegra lida antes de
avaliar), `GUARDRAILS.md` (G-04, G-19 — proposta), `API-CONTRACT.yaml`
(`/categories`), e `SECURITY-REVIEW.md` Seções 1.9/1.10/1.11 (mesmo padrão de
rigor).

**Confirmação prévia obrigatória (gap análogo a `payment_methods.account_id`,
Bloqueio 013/`SEC-DEBT-006`) — feita antes de qualquer outra análise**: o
orquestrador apontou que `categories.parent_category_id` é uma FK auto-referente
("ownable" apontando para a própria tabela "ownable") e pediu confirmação explícita
sobre se o mesmo gap de ownership de FK existe aqui. Verifiquei por leitura direta
de `supabase/schema-baseline-legacy.sql:815-867`
(`public.validate_category_hierarchy`, trigger `BEFORE INSERT OR UPDATE` em
`categories`) — **não há gap**. Diferente do padrão que causou os Bloqueios
010/013 (policy de `INSERT`/`UPDATE` que só checa `auth.uid() = user_id` da própria
linha, sem validar a proveniência da FK), aqui a validação de ownership do pai é
feita **explicitamente dentro do próprio trigger de negócio**, não delegada só à
RLS: `select user_id ... from public.categories where id = new.parent_category_id`
seguido de `if v_parent_user_id is distinct from new.user_id then raise
exception...`. Dois mecanismos independentes fecham o gap, não apenas um:
1. **Comparação explícita de `user_id`** — se `new.parent_category_id` apontar para
   uma categoria de outro usuário (não-sistema), a comparação falha e o `INSERT`/
   `UPDATE` é rejeitado com exceção própria ("parent category must belong to the
   same user"), independente de RLS.
2. **Efeito colateral correto da ausência de `SECURITY DEFINER`** — a função roda
   como `SECURITY INVOKER` (papel de quem chama), então o próprio `SELECT` interno
   já está sujeito a `categories_select` (`user_id = auth.uid() OR user_id IS
   NULL`). Se a categoria-pai referenciada pertencer a outro usuário, o `SELECT`
   simplesmente não a enxerga — cai no ramo `if not found` e a exceção "parent_category_id
   % does not reference an existing category" bloqueia do mesmo jeito. **Fails
   safe nos dois caminhos possíveis.**

Diferente de `categories_block_delete_when_linked` (que **precisa** ser `SECURITY
DEFINER` porque a checagem de bloqueio de `DELETE` tem que enxergar vínculo de
QUALQUER usuário — direção oposta, "alguém mais depende deste registro") e já foi
corrigido nesse sentido por `BE-M-13` (confirmado, ainda vigente, ver Seção 1.10),
`validate_category_hierarchy` está do lado "o que EU estou referenciando", onde
`SECURITY INVOKER` + RLS restritiva já produz o resultado correto por construção.
Adicionalmente, `categories_insert_own`/`categories_update_own` (RLS,
`schema-baseline-legacy.sql:1538-1546`) exigem `is_system_default = false` no
`WITH CHECK`, impedindo que qualquer usuário crie/edite uma linha se passando por
categoria de sistema. **Nenhum débito novo desta classe.** `NewCategory`
(`frontend/src/lib/api/types.ts:59`) também não expõe `user_id`/`is_system_default`
no payload que a tela monta, consistente com o contrato.

**`BLOCKERS.md` — confirmação de que nenhum bloqueio aberto toca este lote**: li os
6 bloqueios apontados (004, 007, 009, 012, 013, 014) na íntegra, não presumi a
partir do resumo do orquestrador. Nenhum toca `BE-M-05`/`FE-M-08` diretamente: 004
(credenciais Vercel/deploy) e 007 (credenciais S3 de backup) são de
infraestrutura/DevOps; 009 é `auth-email-mfa`/CORS (`SEC-DEBT-001`, outro lote);
012 é DR/`schema-baseline-legacy.sql` (`SEC-DEBT-005`); 013 é
`payment_methods.account_id` (`SEC-DEBT-006`, lote "Contas & Formas de
Pagamento"); 014 é `apply_transaction_effect` (`SEC-DEBT-007`, lote "Ledger &
Dashboard"). Confirmado — nenhum bloqueio existente é reaberto ou herdado por
este lote.

**`npm audit --omit=dev` sobre `frontend/package.json`/`package-lock.json`**:
`package.json`/`package-lock.json` **sem diff** neste lote (`git diff --stat`
vazio) — nenhuma dependência nova de produção introduzida por `FE-M-08`. Reexecutei
mesmo assim (rede lenta neste ambiente, execução em segundo plano): **0
vulnerabilidades**, mesmo resultado das rodadas 1.7/1.8/1.10 sobre o mesmo
lockfile. Grep dirigido por `console.*`/`dangerouslySetInnerHTML`/`eval(`/
`localStorage`/`sessionStorage` em `CategoriesPage.tsx`/`categories.ts`: **nenhuma
ocorrência**. Nenhum segredo hardcoded nos arquivos do escopo.

**Telas de categoria (`FE-M-08`) — nenhum achado de severidade relevante isolado a
este lote**: `CategoriesPage.tsx` consome `/categories`/`GET
/transactions?category_id=eq.{id}` reais, payload sem campo de segredo/token;
fluxo de bloqueio de exclusão (409 real de RN-09) segue o mesmo padrão de erro já
auditado em 1.8/1.9/1.10 (`errors.ts`, `friendlyMessage` para `kind === "conflict"`
usa `error.message` bruto do Postgres, mas as mensagens que
`validate_category_hierarchy`/`categories_block_delete_when_linked` emitem citam
só UUID do próprio recurso do usuário e texto de regra de negócio, nunca dado de
outro usuário). Consistente com o contrato publicado (`API-CONTRACT.yaml`
`/categories`, `/categories?id=eq.{id}`).

**Achado novo, de severidade crítica e escopo muito mais amplo que este lote —
`user_id` nunca é incluído em nenhum payload de `INSERT` do Frontend, para
NENHUMA tabela "ownable" do produto, e o banco não tem mecanismo (`DEFAULT`/
trigger) para preenchê-lo**: encontrado ao ler `frontend/src/lib/api/categories.ts`
(`createCategory`) linha a linha contra o contrato de `POST /categories`, ao
confirmar exatamente o que o `.insert(input)` da chamada `supabase-js` realmente
envia. Achado corroborado por 3 evidências independentes, não uma suposição:
1. **Coluna sem `DEFAULT`**: `public.categories.user_id` (`schema-baseline-legacy.sql:1024-1034`)
   é declarada só `"user_id" "uuid"` (nullable, mas sem `DEFAULT`); as demais
   tabelas "ownable" (`accounts:942`, `transactions:230`, `budget`,
   `payment_methods:1097`, e toda tabela nova de Fase 2 — `credit_cards`,
   `goals`, `contributions`, `fixed_bills`, `recurring_templates`,
   `installment_purchases`) têm `"user_id" "uuid" NOT NULL`, também sem
   `DEFAULT`. Confirmei com grep dedicado (`DEFAULT auth.uid`, `SET DEFAULT`) em
   `schema-baseline-legacy.sql` e em todas as migrations de
   `supabase/migrations/`: **nenhum resultado** — não existe, em lugar nenhum do
   repositório, uma coluna `user_id` com valor default. Também confirmei que não
   há trigger `BEFORE INSERT` que atribua `new.user_id := auth.uid()` em nenhuma
   tabela (grep por `new.user_id` só retorna comparações, nunca atribuições), nem
   um `db.pre_request` configurado em `supabase/config.toml` que pudesse
   preencher isso por outro caminho.
2. **Nenhum arquivo de API do Frontend inclui `user_id` no payload de `insert`**:
   grep em todo `frontend/src/lib/api` por `user_id` retorna só comentário/tipos —
   `categories.ts`, `accounts.ts`, `transactions.ts`, `budget.ts`,
   `paymentMethods.ts`, `creditCards.ts`, `goals.ts`, `fixedBills.ts`,
   `recurring.ts` chamam todos `.from("<tabela>").insert(input)` onde `input` é
   exatamente o objeto que a tela monta a partir do formulário — nenhum desses
   objetos (`NewCategory`, `NewAccount`, `NewTransaction`, etc., `types.ts`) inclui
   `user_id` no seu tipo. `getSupabaseClient()` (`lib/supabase/client.ts`) é um
   `createClient` puro do `@supabase/supabase-js`, sem nenhum wrapper/interceptor
   que injete `user_id` a partir da sessão antes de enviar a requisição.
3. **Confirmação por contraste com o teste SQL que passa de fato**:
   `supabase/tests/be_m03_04_05_crud.test.sql` — o único teste que exercita RLS
   real contra o schema real (`SET LOCAL ROLE authenticated`) — só passa porque
   **cada `INSERT INTO public.categories`/`accounts`/`payment_methods` do próprio
   teste inclui `user_id` explicitamente na lista de colunas** (linhas 30, 40, 60,
   64, 71, 95, 104, 115). Isso prova, por construção, que a camada de banco exige
   que o `user_id` seja fornecido pelo chamador — ela não preenche sozinha — e que
   o teste SQL só passa porque foi escrito para fornecê-lo manualmente, ao
   contrário do código real do Frontend.
   - **Consequência concreta**: `WITH CHECK (user_id = auth.uid() AND ...)` de
     `categories_insert_own` avalia `NULL = auth.uid()` como `NULL` (falso em
     contexto de `WITH CHECK`) quando `user_id` não é enviado — o `INSERT` é
     rejeitado pela RLS (`42501`), nunca aceito silenciosamente como categoria de
     sistema ou de outro usuário. Para as tabelas onde `user_id` é `NOT NULL`
     (`accounts`, `transactions`, `budget`, `payment_methods`, e toda tabela nova
     de Fase 2), a rejeição ocorreria por violação de `NOT NULL` (`23502`) antes
     mesmo de a RLS ser avaliada. **Em nenhum dos dois casos há vazamento ou
     escrita indevida em dado de outro usuário — o efeito é sempre falha da
     escrita, nunca autorização incorreta (fail-closed, não fail-open).** Por
     isso este achado não é uma vulnerabilidade de confidencialidade/integridade
     cross-tenant — é uma quebra total, hoje, da função de criação/edição em
     TODA tabela "ownable" do produto quando exercida pelo caminho real (browser
     → `supabase-js` → PostgREST → Postgres), não pelos testes SQL diretos nem
     pelos testes Vitest (que mockam a resposta do `supabase-js` e por isso nunca
     exerceriam este caminho).
   - **Por que isto escapou de todas as rodadas anteriores de QA/DevSecOps**: os
     140 testes Vitest citados em `QA-REPORT.md` mockam o cliente Supabase (não
     tocam o banco real); os 12-23 testes SQL citados (`be_m0X_*.test.sql`)
     exercitam RLS/triggers reais, mas com `INSERT`s escritos manualmente pelo
     próprio autor do teste, sempre incluindo `user_id`; e o próprio
     `QA-REPORT.md` (linha 177) registra explicitamente que o smoke test de
     navegador ponta a ponta contra o backend real **não foi executado** por
     falta de `VITE_SUPABASE_ANON_KEY`/`VITE_SUPABASE_URL` reais na sessão. As
     três camadas de evidência automatizada existentes, portanto, nunca
     exercitaram conjuntamente "código real do Frontend" + "banco real" no
     caminho de escrita — exatamente o gap onde este achado vive. Não é uma
     crítica aos agentes anteriores (a limitação de credencial já era conhecida e
     documentada); é a confirmação de por que um defeito desta magnitude
     permaneceu invisível até uma leitura linha a linha do payload real de
     `insert()`.
   - **Escopo real do achado**: não é específico de `BE-M-05`/`FE-M-08` — encontrado
     durante a auditoria deste lote (via `categories.ts`), mas confirmado por
     grep como idêntico em **todos** os módulos de API do Frontend já existentes
     (Fundação, Contas & Formas de Pagamento, Ledger & Dashboard, e toda a Fase 2
     já marcada "Concluída": cartões, faturas, recorrências, parcelamentos,
     contas fixas, metas, notificações). Se confirmado ao vivo, nenhuma dessas
     funcionalidades de criação/edição funciona hoje contra o Supabase real.
   - **Severidade**: **Crítica** — não pela dimensão CIA clássica (não há
     confidencialidade/integridade comprometida, RLS falha fechado), mas pela
     dimensão de disponibilidade/prontidão de release: se confirmado, **nenhuma
     operação de escrita do produto funciona hoje fora de teste**, o que
     invalida a leitura prática de "Concluída"/"Aprovado" de toda tarefa que
     depende de `INSERT` via Frontend contra o banco real. Aplico aqui o mesmo
     princípio já usado para achados de alto impacto com exploitabilidade/
     mecanismo de contenção diferente (SEC-DEBT-002/006 — Alta severidade,
     bloqueio condicional apesar de baixa exploitabilidade hoje): a escala do
     impacto, não só o vetor de ataque, justifica a classificação — aqui a escala
     é maior ainda (produto inteiro, não uma tabela), por isso a classificação
     sobe para Crítica e o veredito é bloqueio incondicional, não condicional.
   - **Veredito**: **BLOQUEIA — pausa obrigatória do orquestrador.** Diferente
     de todos os achados anteriores deste documento (SEC-DEBT-001 a 007, todos
     não-bloqueantes ou com bloqueio condicional futuro), este não tem
     mecanismo de contenção que permita tratá-lo como débito de prazo — se a
     hipótese estiver correta, o produto não pode ser considerado
     funcionalmente pronto para nenhum ambiente real até corrigido e
     verificado ao vivo. **Registrado como `SEC-DEBT-008`.**
   - **Ressalva de confiança, por transparência**: não tenho, neste ambiente,
     `VITE_SUPABASE_ANON_KEY`/`VITE_SUPABASE_URL` reais nem
     `SUPABASE_SERVICE_ROLE_KEY` para reproduzir isto ao vivo num navegador ou
     via chamada HTTP direta — a mesma limitação já registrada por `QA-REPORT.md`
     linha 177 e por Frontend/Backend em rodadas anteriores. Este achado é de
     **altíssima confiança por leitura de código** (3 evidências convergentes,
     nenhuma inferida), mas não é uma reprodução ao vivo. Recomendo que a
     primeira ação, antes de qualquer outra correção, seja um smoke test manual
     mínimo (criar 1 conta e 1 categoria via navegador contra o projeto real
     `xrcxbzrglndetrrhavhc`) assim que credenciais estiverem disponíveis, para
     confirmar ou refutar a hipótese de forma definitiva — se refutada (por
     exemplo, se existir algum mecanismo real no projeto Supabase ao vivo, criado
     via Dashboard, que não está capturado em nenhum arquivo deste repositório),
     este achado deve ser rebaixado/fechado com a mesma transparência com que foi
     aberto.
   - **Correção sugerida (dupla camada, não mutuamente exclusiva)**: (a)
     — recomendada como correção primária, mais barata e sistêmica — migration
     aditiva `ALTER TABLE public.<tabela> ALTER COLUMN user_id SET DEFAULT
     auth.uid();` para cada uma das tabelas "ownable" (`accounts`, `categories`,
     `payment_methods`, `budget`, `transactions`, `credit_cards`, `goals`,
     `contributions`, `fixed_bills`, `recurring_templates`,
     `recurring_template_adjustments`, `installment_purchases`, e demais tabelas
     de Fase 2 com a mesma coluna) — resolve todos os pontos de chamada de uma
     vez, sem tocar arquivo de Frontend nenhum, aditivo/não-destrutivo (G-03,
     DIR-03); (b) — defesa em profundidade complementar, não substituta — cada
     `create*`/função de `insert` do Frontend passa a incluir
     `user_id: (await getSupabaseClient().auth.getUser()).data.user?.id` de forma
     explícita no payload, para que o comportamento não dependa silenciosamente
     de um `DEFAULT` de banco que poderia ser removido/esquecido numa migration
     futura. Teste de regressão recomendado: reexecutar toda a suíte SQL
     existente (confirma que fornecer `user_id` explicitamente continua
     funcionando) e adicionar 1 caso novo por tabela confirmando que `INSERT`
     **sem** `user_id` na lista de colunas também é aceito e resolve para
     `auth.uid()` corretamente após a correção (a).
   - **Escalar para**: `backend` (correção primária — migration de `DEFAULT`) e
     `frontend` (correção complementar — inclusão explícita de `user_id`, e
     validação do smoke test manual assim que credenciais existirem) —
     registrado em `BLOCKERS.md` Bloqueio 015.
   - **Sinalização ao CTO**: sim, com urgência — ver Seção 5, item 7. Não é uma
     decisão de risco de negócio (é puramente técnico), mas a escala do impacto
     (produto inteiro, não uma tabela) justifica visibilidade imediata, fora do
     ritmo normal de "registro de transparência" já usado para achados
     anteriores.
   - **Atualização (Frontend, 2026-09-03) — defesa em profundidade (b) aplicada**:
     confirmado por leitura direta (Grep + revisão linha a linha) dos 9 módulos
     listados acima — nenhum `.insert(input)` enviava `user_id`. Corrigido: as 12
     funções `create*` afetadas (`createCategory`, `createAccount`,
     `createTransaction`, `createBudget`, `createPaymentMethod`,
     `createCreditCard`, `createGoal`, `createContribution`, `createFixedBill`,
     `createRecurringTemplate`, `createRecurringTemplateAdjustment`,
     `createInstallmentPurchase`) agora passam o payload por um helper novo,
     `withOwnerId` (`frontend/src/lib/api/request.ts`), que lê
     `getSupabaseClient().auth.getUser()` **no momento da chamada** (nunca estado
     local possivelmente obsoleto) e mescla `user_id` explicitamente antes do
     `.insert(...)`; se a sessão estiver inválida/ausente, lança `ApiError kind:
     "forbidden"` antes de qualquer `INSERT` ser disparado. Esta é só a camada (b)
     — complementar/independente da correção primária (a), que é responsabilidade
     do Backend (migration `DEFAULT auth.uid()`); as duas não competem, se
     `user_id` já vier preenchido pelo client o `DEFAULT` simplesmente não é
     usado. Testes automatizados novos/atualizados (Vitest, `vi.mock` do cliente
     Supabase, helper `testSupabaseClient.ts` estendido com `auth.getUser`
     mockável) em `categories.test.ts`, `accounts.test.ts`, `budget.test.ts`,
     `paymentMethods.test.ts`, `creditCards.test.ts`, `goals.test.ts`,
     `fixedBills.test.ts`, `recurring.test.ts` e `transactions.test.ts` — cada um
     confirma (i) o payload do `.insert()` inclui `user_id` correto da sessão
     mockada e (ii) sessão inválida lança `forbidden` sem nenhum `INSERT`
     disparado. Suíte completa: `npm test` (196/196 passando) e `npm run build`
     (`tsc -b` + `vite build`, zero erro) — regressão zero. Ainda não fechado:
     smoke test manual ao vivo contra o projeto real (`xrcxbzrglndetrrhavhc`)
     segue pendente de credencial, e a correção primária (a) é acompanhamento do
     Backend — este achado permanece `SEC-DEBT-008` em aberto até que ambas as
     camadas sejam confirmadas e o Bloqueio 015 seja fechado (ver
     `BLOCKERS.md`).
   - **Atualização (Backend, 2026-09-03) — correção primária (a) aplicada e
     verificada; `SEC-DEBT-008` CORRIGIDO nesta camada.** Confirmação por
     leitura direta do schema ao vivo (`supabase db dump --linked --schema
     public`, projeto real `xrcxbzrglndetrrhavhc`) antes de corrigir: grep por
     `DEFAULT auth.uid`/`SET DEFAULT` no dump, nenhum resultado — achado
     confirmado, não presumido. Migration aditiva aplicada
     (`supabase/migrations/20260903260000_be_m14_user_id_default_auth_uid.sql`,
     down-pair em `supabase/migrations_down/`): `ALTER TABLE public.<tabela>
     ALTER COLUMN user_id SET DEFAULT auth.uid();` nas 12 tabelas do achado
     original **mais `push_subscriptions`** (achado adicional confirmado
     durante esta verificação — mesmo padrão em
     `frontend/src/lib/api/notifications.ts`/`createPushSubscription`, fora da
     lista original do Bloqueio 015, pequeno desvio de escopo resolvido e
     documentado, não escalado). Aplicada via `supabase db push --linked` e
     confirmada ao vivo por novo dump pós-migration (as 13 colunas agora
     mostram `DEFAULT auth.uid()`). Teste de regressão SQL novo
     (`supabase/tests/be_m14_user_id_default_auth_uid.test.sql`, 5 casos,
     `categories`/`transactions`/`accounts`) rodado contra o projeto real via
     `supabase db query --linked`, com `SET LOCAL ROLE authenticated` +
     `request.jwt.claims` (RLS real) e **sem** enviar `user_id` — RED→GREEN
     confirmado: `INSERT` que seria rejeitado por `42501`(RLS)/`23502`(NOT
     NULL) antes da migration agora é aceito e resolve `user_id = auth.uid()`
     corretamente; casos de spoofing (user_id explícito de outro usuário)
     continuam rejeitados pela RLS — defesa não enfraquecida. **PASS (5/5)**.
     Regressão completa da suíte SQL existente: 24/24
     `supabase/tests/*.test.sql` **PASS**, nenhuma regressão. **Ressalva de
     transparência, item pendente**: não consegui obter
     `VITE_SUPABASE_ANON_KEY` real neste ambiente (`supabase projects
     api-keys` bloqueado pelo classificador de permissões do sandbox; sem
     `.env` real nem variável exportada no shell) — não fiz o `INSERT` real
     via REST/`supabase-js`/navegador recomendado pelo achado original. A
     verificação feita (`supabase db query --linked` contra o Postgres real,
     role `authenticated`, RLS real, sem fornecer `user_id`) é a reprodução
     mais próxima disponível e cobre exatamente a camada onde o defeito
     vivia, mas não é a reprodução HTTP ponta a ponta — recomendo a QA/
     DevSecOps como primeiro passo assim que uma credencial acessível
     existir. Detalhe completo em `BLOCKERS.md` Bloqueio 015, atualização
     (backend). **`SEC-DEBT-008`: corrigido na camada de banco (causa raiz),
     com a ressalva de reprodução HTTP ponta a ponta acima ainda pendente,
     não bloqueante para a correção em si.**

**Veredito do lote "Categorização": Bloqueado.** A confirmação pontual pedida pelo
orquestrador (gap de ownership de FK em `categories.parent_category_id`, mesma
classe do Bloqueio 013) está **resolvida — não há gap, `validate_category_hierarchy`
já fecha os dois caminhos possíveis**. Mas esta rodada de `static-security-analysis`
encontrou, no mesmo arquivo que implementa `BE-M-05`/`FE-M-08`
(`categories.ts`), um achado novo de severidade crítica (`SEC-DEBT-008`) cujo
escopo real ultrapassa este lote — `user_id` nunca é enviado por nenhum `INSERT`
do Frontend contra nenhuma tabela "ownable" do produto, e o banco não tem `DEFAULT`
que resolva isso. Diferente de todo achado anterior deste documento, este **não**
tem uma condição de contenção que permita "Aprovado com débito" — recomendo ao
orquestrador pausar o avanço deste lote (e, por extensão, reconsiderar a leitura de
"pronto para produção" de todo lote anterior já marcado "Aprovado com débito", já
que o mesmo padrão de código se repete neles) até uma destas duas condições: (1) o
achado é refutado por uma reprodução ao vivo mostrando que a escrita funciona de
fato contra o projeto Supabase real; ou (2) a correção (a) (`DEFAULT auth.uid()`)
é aplicada e validada. **As tarefas `BE-M-05`/`FE-M-08` em si permanecem
tecnicamente corretas** (hierarquia, RLS, bloqueio de exclusão, telas) — o bloqueio
não é sobre o mérito da implementação destas duas tarefas específicas, é sobre uma
pré-condição de plataforma que as afeta como afeta todo o resto do produto.

**Atualização (Backend, 2026-09-03) sobre este veredito**: a condição (2) acima —
correção (a), `DEFAULT auth.uid()` — está aplicada e validada (ver atualização
Backend em `SEC-DEBT-008` acima). A causa raiz que motivou "Bloqueado" está
corrigida e verificada contra o banco real. Não reabro nem reescrevo o veredito
do DevSecOps aqui (não é papel do Backend decidir o veredito de outro agente) —
registro a evidência para que o orquestrador/DevSecOps reavalie o lote
"Categorização" (e, por extensão, os lotes anteriores "Aprovado com débito"
suspensos pela mesma pré-condição) na próxima rodada de auditoria, com a
ressalva de transparência já registrada (reprodução HTTP/`supabase-js` ponta a
ponta ainda pendente de credencial acessível, `BLOCKERS.md` Bloqueio 015).

**Atualização (DevSecOps, 2026-09-03) — verificação independente, veredito
final.** Não presumi o relato de Backend/Frontend — refiz cada verificação
diretamente contra o projeto real (`xrcxbzrglndetrrhavhc`): (1)
`supabase migration list --linked` confirma `20260903260000` aplicada
(local=remote); (2) `supabase db dump --linked --schema public` confirma as
13 colunas `user_id` (12 do achado original + `push_subscriptions`) com
`DEFAULT auth.uid()` ao vivo; (3) executei eu mesmo (não apenas li)
`supabase/tests/be_m14_user_id_default_auth_uid.test.sql` via `supabase db
query --linked --file` contra o projeto real — resultado `PASS`, os 5 casos
(RED→GREEN + 2 casos de spoofing rejeitados pela RLS) rodam dentro de um
único bloco que aborta no primeiro `RAISE EXCEPTION`, então `PASS` só é
possível com os 5 passando; (4) li `frontend/src/lib/api/request.ts`
(`withOwnerId`) e confirmei, por grep dedicado, que é usado em exatamente 12
chamadas `.insert()` nos 9 módulos declarados. Detalhe completo, incluindo o
racional sobre a ressalva de reprodução HTTP/`supabase-js`/navegador (por que
a evidência via Postgres real + RLS real já é suficiente, e não apenas uma
conclusão sem justificativa), em `BLOCKERS.md` Bloqueio 015, atualização
(devsecops).

**Achado novo, menor, não bloqueante, encontrado durante esta verificação**:
`frontend/src/lib/api/notifications.ts` (`createPushSubscription`) não usa
`withOwnerId` — `push_subscriptions` não estava no escopo original do
Bloqueio 015 (foi adicionada só pelo Backend, na camada de banco); a camada
(b) do Frontend nunca cobriu essa tabela. Não impede o fechamento: a causa
raiz (ausência de `DEFAULT`) já está corrigida para `push_subscriptions` na
camada de banco (item 2 acima), que é suficiente por si só — a defesa em
profundidade do Frontend é complementar, não pré-condição. Registrado como
`SEC-DEBT-010` (ver Seção 2).

**`SEC-DEBT-008`: FECHADO.** Bloqueio 015 formalmente **Resolvido**
(`BLOCKERS.md`). Dois débitos residuais de baixa severidade, não bloqueantes,
registrados em substituição: `SEC-DEBT-009` (reprodução HTTP/`supabase-js`/
navegador ponta a ponta ainda pendente de credencial acessível — item de
fechamento do smoke test ao vivo já pendente desde `QA-REPORT.md` linha 177,
não condição de correção da causa raiz) e `SEC-DEBT-010` (gap de defesa em
profundidade do Frontend em `push_subscriptions`, ver acima).

**Veredito final do lote "Categorização": Aprovado com débito**
(`SEC-DEBT-009`, `SEC-DEBT-010` — ambos baixa severidade, sem condição de
bloqueio automático, dono e critério registrados na Seção 2). A confirmação
pontual de FK (`categories.parent_category_id`) permanece resolvida (sem
gap). As tarefas `BE-M-05`/`FE-M-08` permanecem tecnicamente corretas. Por
extensão, os lotes anteriores "Aprovado com débito" que estavam suspensos
pela mesma pré-condição comum (Fundação, Contas & Formas de Pagamento,
Ledger & Dashboard) voltam à leitura normal de "pronto para produção",
sujeitos aos próprios débitos já registrados para cada um deles
individualmente (Seção 2).

---

### 1.13 — Auditoria completa (veredito final de lote) — "Categorização" — 2026-09-03

**Gatilho**: `QA-REPORT.md` Seção 6 aprovou o lote (Aprovado com ressalva —
`BE-M-05` Aprovado, `FE-M-08` Aprovado com ressalva, `QA-DEBT-009`) — libera as 4
skills de auditoria propriamente dita restantes sobre este lote
(`security-requirement-validation`, `compliance-validation`,
`sensitive-data-exposure-check`, `finding-severity-classification`) mais a
consolidação (`security-report-drafting`). `static-security-analysis` já rodou em
1.12 e está fechada nesta data (`SEC-DEBT-008` corrigido e verificado
independentemente; veredito daquela rodada: Aprovado com débito, `SEC-DEBT-009`/
`SEC-DEBT-010`) — não repito esse trabalho aqui, uso como insumo.

#### `security-requirement-validation` — `SDD.md` Seção 7 + `GUARDRAILS.md`, escopo `categories`

| Requisito | Verificação | Evidência | Resultado |
|---|---|---|---|
| RLS `auth.uid() = user_id` em `SELECT`/`INSERT`/`UPDATE`/`DELETE` (Seção 7 "Autorização") | `categories_select`/`categories_insert_own`/`categories_update_own` | `schema-baseline-legacy.sql:1538-1546` — todas com `user_id = auth.uid()` na cláusula `USING`/`WITH CHECK`; `categories_select` também permite `user_id IS NULL` (categoria de sistema, por design) | Passa |
| Gate adicional de MFA (`app_email_mfa_verified`) nas 4 tabelas de dado mais sensível, `categories` incluída (Seção 7 "Autorização") | Mesmas 3 policies acima | `(auth.jwt() ->> 'app_email_mfa_verified') = 'true'` presente nas 3 — nenhuma omite o claim | Passa |
| Hierarquia de 2 níveis + ownership do pai (`SDD.md` §2.5, `validate_category_hierarchy`) | Trigger dedicado, independente de RLS | Já confirmado em 1.12 (leitura linha a linha) — dois mecanismos independentes (`SECURITY INVOKER` + comparação explícita de `user_id`), fails safe nos dois caminhos; reconfirmado nesta rodada sem mudança de código desde 1.12 | Passa |
| `DEFAULT auth.uid()` recém-aplicado (`BE-M-14`/Bloqueio 015) não introduz regressão de autorização especificamente em `categories` | Verificação direta pedida pelo orquestrador: (1) `DEFAULT` só se aplica quando a coluna é **omitida** da lista de `INSERT`, nunca sobrescreve um valor explícito — confirmado por leitura da migration `20260903260000` e do comportamento padrão do Postgres; a seed de categorias de sistema (`user_id = NULL`) sempre envia o valor explicitamente, então o `DEFAULT` nunca a afeta (comentário da própria coluna, linha 57, formaliza essa garantia); (2) `categories_insert_own` continua exigindo `is_system_default = false` no `WITH CHECK` — um usuário autenticado que omitir `user_id` do payload (e por isso receber `auth.uid()` via `DEFAULT`) não ganha nenhum caminho novo para criar categoria de sistema, porque `is_system_default` não tem `DEFAULT` equivalente nem é afetado por esta migration; (3) `DEFAULT` é resolvido **antes** do `BEFORE INSERT` disparar — `validate_category_hierarchy` sempre enxerga `new.user_id` já preenchido, então a comparação de ownership do pai (`new.user_id` vs. `parent.user_id`) não fica vulnerável a um `user_id` nulo/tardio; (4) `UPDATE` não é afetado por `DEFAULT` (só se aplica a `INSERT`) — `categories_update_own` continua avaliando o `user_id` real da linha, sem mudança de comportamento | Grep dedicado (`DEFAULT auth.uid`) confirma a coluna; leitura direta de `categories_insert_own`/`categories_update_own`/`validate_category_hierarchy`/comentário da coluna (todas nesta sessão) | Passa — nenhuma regressão |
| `GUARDRAILS.md` G-19 (ownership de FK cruzada entre tabelas ownable) aplicável a `categories.parent_category_id` | Já confirmado sem gap em 1.12 (dois mecanismos independentes) | Reconfirmado nesta rodada — `G-19` em si segue `[PROPOSTA — aguardando aprovação do CTO]` (`GUARDRAILS.md` linha 217), sem mudança desde 1.9; não bloqueia porque `categories` já cumpre o padrão que `G-19` formalizaria, independentemente do veredito de aprovação pendente | Passa |

**Nenhum requisito de arquitetura de segurança da Seção 7 do `SDD.md` ou regra do
`GUARDRAILS.md` relevante a este lote está implementado de forma diferente do
especificado.** A confirmação pontual pedida pelo orquestrador (regressão de
autorização introduzida pelo `DEFAULT auth.uid()` em `categories` especificamente)
não encontrou nenhum gap novo.

#### `compliance-validation` — LGPD

| Verificação | Evidência | Resultado |
|---|---|---|
| Minimização de dado — `categories` não coleta/armazena PII além do necessário (taxonomia de classificação de lançamento) | `schema-baseline-legacy.sql:1015-1037` — colunas são `name`, `kind` (income/expense), `parent_category_id`, `is_system_default`, `user_id`; nenhum campo de titular, documento, contato ou dado de terceiro | Passa |
| Base legal/titular — mesmo enquadramento já assentado (autoprocessamento, dado do próprio operador) | `categories.user_id` identifica só o dono da taxonomia (o próprio stakeholder); nenhuma categoria carrega dado de um segundo titular — mesmo racional já usado para `accounts`/`payment_methods` em 1.9 e para `transactions`/dashboard em 1.11 | Passa |
| `NewCategory`/payload de `POST`/`PATCH /categories` não expõe campo além do documentado em `API-CONTRACT.yaml` | `API-CONTRACT.yaml` linhas 529-568 (schema `Category`) batem com as colunas reais; `frontend/src/lib/api/types.ts` (`NewCategory`) e `categories.ts` (`createCategory`/`updateCategory`) não incluem `is_system_default` no payload que a tela monta — coerente com a RLS já exigir `is_system_default = false` | Passa |
| Direito ao esquecimento / retenção | `categories` não tem mecanismo de exclusão de dado pessoal próprio — é taxonomia de classificação, não dado do titular por si só; o mecanismo formal de exclusão de conta (`ADR-011`) é escopo de uma Edge Function dedicada, fora do escopo de `BE-M-05`/`FE-M-08` (mesma leitura já aplicada a `accounts`/`payment_methods` em 1.9) | Passa — sem achado, fora de escopo confirmado |

**Nenhum achado de compliance obrigatório (LGPD) neste lote** — taxonomia de
categoria não é dado sensível de terceiro, minimização confirmada, nada fica
pendente como débito.

#### `sensitive-data-exposure-check` — foco no fluxo de exclusão bloqueada (`QA-DEBT-009`)

| Superfície | Verificação | Evidência | Resultado |
|---|---|---|---|
| Mensagens de erro do backend (`categories_block_delete_when_linked`, os 2 ramos — lançamento e orçamento) | Nenhuma expõe stack trace, texto de query SQL, nome de schema/tabela interna além do já documentado publicamente em `API-CONTRACT.yaml`, ou dado de outro usuário — só cita `old.id` (UUID da própria categoria do usuário que está tentando excluir, já visível a ele) + texto de regra de negócio (RN-09) | `schema-baseline-legacy.sql:368-374` — `'category % has linked transactions and cannot be deleted; reclassify them first (RN-09)'` / `'category % has budgets defined and cannot be deleted; remove the budgets first (RN-09, extensão RF-MVP-07)'` | Passa |
| Propagação ao client (`errors.ts`) | `friendlyMessage()` usa `error.message` bruto do Postgres só para `kind === "conflict"` — já auditado como aceitável em 1.8/1.9/1.10/1.12 (mensagem escrita para leitura humana, sem segredo/PII) | `frontend/src/lib/api/errors.ts:64-67` | Passa |
| **`QA-DEBT-009` (mensagem incorreta quando o bloqueio é por orçamento, não por lançamento) tem implicação de segurança?** | **Não.** Verificação direta de `CategoriesPage.tsx.confirmDelete()` (linhas 107-126): a UI **nunca lê `cause.message`** para montar o texto do modal de bloqueio — o texto ("Esta categoria tem {count} lançamentos vinculados...") é 100% hardcoded na tela, e `{count}` vem de uma segunda chamada real (`listTransactionsByCategory`), não de um parsing do texto de erro do Postgres. O bug é a UI **ignorar** a informação real (`cause.message`, que já contém o motivo correto — "budgets defined", sem que a tela chegue a inspecioná-lo) e assumir sempre o cenário "lançamento", nunca um vazamento de informação a mais — é o oposto: informação a menos/incorreta é mostrada ao próprio usuário dono do recurso, sobre o próprio recurso dele. Não há stack trace, SQL, nem dado de outro usuário em nenhum ponto do fluxo, nos dois cenários (lançamento e orçamento) | `frontend/src/pages/categories/CategoriesPage.tsx:107-126, 243-258` (lido linha a linha nesta rodada) | **Confirmado sem implicação de segurança — puramente UX/correção factual, já corretamente classificado pelo QA como não-bloqueante** |
| Logs client-side / armazenamento local | Grep dedicado em `CategoriesPage.tsx`/`categories.ts` por `console.*`/`localStorage`/`sessionStorage`: nenhuma ocorrência (já confirmado em 1.12, reconfirmado) | — | Passa |

**Nenhum vazamento de dado sensível via API, log ou client-side neste lote — e o
achado de UX `QA-DEBT-009` não tem, de fato, nenhuma dimensão de segurança**, como
o próprio pedido do orquestrador antecipava ("não deveria, mas verifique").

#### `finding-severity-classification`

Nenhum achado novo de segurança nesta rodada (as 3 skills acima não geraram
nenhum item além do que já estava registrado em 1.12 — `SEC-DEBT-009`/
`SEC-DEBT-010`, ambos já classificados como Baixa). `QA-DEBT-009` permanece
classificado pelo QA como Média, mas não é reclassificado aqui como achado de
segurança — confirmado que pertence inteiramente ao domínio de UX/correção de
mensagem, sem componente de confidencialidade/integridade/disponibilidade.

#### Veredito consolidado do lote — "Categorização"

- **Achados que bloqueiam o deploy deste lote hoje: nenhum.**
- **Achados de severidade alta/crítica em aberto: nenhum** — `SEC-DEBT-008`
  (o único achado Crítico já levantado sobre este lote) foi corrigido e fechado
  em 1.12, verificado independentemente por mim antes desta rodada.
- **Compliance obrigatório (LGPD)**: nenhum achado — nada pendente.
- **Exposição de dado sensível**: nenhum achado novo; `QA-DEBT-009` confirmado
  sem implicação de segurança.
- **Débitos em aberto que tocam este lote**: `SEC-DEBT-009` (evidência de
  reprodução HTTP ponta a ponta pendente de credencial, baixa severidade, dono
  `qa`/`devsecops`), `SEC-DEBT-010` (gap de defesa em profundidade em
  `push_subscriptions`, fora do escopo de `categories`, baixa severidade, dono
  `frontend`) — ambos já registrados em 1.12/Seção 2, sem mudança nesta rodada.

**Veredito do lote: Aprovado com débito.** As 2 tarefas (`BE-M-05`, `FE-M-08`)
estão liberadas, do ponto de vista de segurança, para o fechamento formal do lote
pelo Tech Lead (`TASK.md` Seção 7) — `SEC-DEBT-009`/`SEC-DEBT-010` são débitos
registrados com dono e critério (Seção 2), sem condição de bloqueio automática,
não impedem o fechamento deste lote especificamente. Nenhum achado de compliance
obrigatório pendente. `QA-DEBT-009` permanece rastreado pelo QA como débito de
UX, confirmado nesta rodada sem nenhuma dimensão de segurança.

**Sinalização ao CTO (paralela, não pré-requisito)**: nenhuma nova. `SEC-DEBT-008`
(item 7, Seção 5) já foi sinalizado com urgência em 1.12 e está resolvido; nenhum
achado desta rodada tem relevância estratégica que exija nova sinalização.

---

## 2. Resumo — Débitos registrados

| ID | Achado | Severidade | Bloqueia? | Prazo/condição | Dono da correção |
|---|---|---|---|---|---|
| SEC-DEBT-001 | CORS wildcard em `auth-email-mfa` | ~~Média~~ **Baixa (reclassificado em 1.25, 2026-09-05)** | Não | ~~Antes do próximo deploy que tocar o arquivo~~ **Recomendação atualizada (1.25): decommissioning da function (preferencial, já que é código órfão sem manutenção de rotina prevista) ou, alternativamente, o patch trivial de CORS se a function for mantida** | coordenador/devops (decommissioning) ou executor (patch de CORS, se mantida) |
| SEC-DEBT-002 | Sem validação de ownership de FK (`category_id`/`account_id`/etc.) em INSERT/UPDATE de `budget`/`transactions`; trigger RN-09 não `SECURITY DEFINER` | Alta (impacto) / baixa exploitabilidade hoje | Não hoje — **bloqueio automático condicional** (ver 1.2) | Antes de 2º e-mail em `allowed_signup_emails`, antes de remover o trigger de signup, ou antes de qualquer feature multiusuário; recomendado corrigir antes da Fase 3 | backend |
| SEC-DEBT-003 | E-mail do stakeholder hardcoded em migration | Baixa | Não | Confirmar repo privado; corrigir antes de tornar público/compartilhar acesso | devops (confirmação) / backend (correção se necessário) |
| SEC-DEBT-004 | Rótulo desatualizado em G-01/G-02 (`GUARDRAILS.md`) | Baixa | Não | Próximo toque no documento | tech-lead / cto |
| SEC-DEBT-005 | DR incompleto — 3 gaps em `schema-baseline-legacy.sql` (extensões, trigger `on_auth_user_created`, `cron.schedule` legado não versionados) — `BLOCKERS.md` Bloqueio 012 | Alta (dimensão DR) / não explorável | Não hoje — **condicional**, espelha Bloqueio 012 | Bloqueia execução do drill de restauração (`DEPLOY.md` §6.3) e qualquer comunicação de "backup restaurável ponta a ponta"; não bloqueia este lote | backend (correção) / devops (drill) |
| SEC-DEBT-006 | `payment_methods.account_id` sem validação de ownership de FK (mesma classe de SEC-DEBT-002, escapou do escopo de `BE-M-13`) — `BLOCKERS.md` Bloqueio 013 | Alta (impacto) / baixa exploitabilidade hoje | Não hoje — **bloqueio automático condicional**, espelha SEC-DEBT-002/Bloqueio 010 (ver 1.8) | Antes de 2º e-mail em `allowed_signup_emails`, antes de remover o trigger de signup, ou antes de qualquer feature multiusuário; recomendado corrigir junto do mesmo prazo já fixado pelo CTO para SEC-DEBT-002 (antes de qualquer tarefa `BE-F3-*`) | backend |
| SEC-DEBT-007 | `apply_transaction_effect` exposta como RPC pública direta (GRANT herdado do legado, sem `SECURITY DEFINER`/gate próprio) — permite ao próprio usuário autenticado alterar `accounts.current_balance_cents` sem criar `transactions` correspondente (quebra de integridade do ledger, autolimitado à própria conta por RLS) — `BLOCKERS.md` Bloqueio 014 | Média | Não | Próximo toque em `transactions`/`apply_transaction_effect`; correção de baixo custo (SECURITY DEFINER no trigger + REVOKE na função), recomendado não esperar prazo | backend |
| SEC-DEBT-008 | `user_id` nunca é enviado por nenhum `INSERT` do Frontend em nenhuma tabela "ownable" do produto; nenhuma coluna `user_id` tem `DEFAULT`/trigger de preenchimento — toda escrita via caminho real (browser→supabase-js→PostgREST) falharia hoje (RLS/NOT NULL fail-closed, sem vazamento cross-tenant, mas sem escrita nenhuma) — `BLOCKERS.md` Bloqueio 015 | **Crítica** (escala de impacto — produto inteiro) | **FECHADO (2026-09-03, verificado independentemente por devsecops)** — não bloqueia mais | Correção (a) backend aplicada e verificada ao vivo por devsecops (migration `20260903260000`, 13/13 tabelas com `DEFAULT auth.uid()` confirmadas via `supabase db dump --linked`, teste SQL executado pelo próprio devsecops via `supabase db query --linked` com resultado PASS); correção (b) frontend (`withOwnerId`) verificada por leitura de código, 12/12 chamadas confirmadas. Bloqueio 015 formalmente Resolvido | backend (migration `DEFAULT auth.uid()` — feito e verificado) / frontend (inclusão explícita defensiva — feito e verificado) |
| SEC-DEBT-009 | Reprodução HTTP/`supabase-js`/navegador ponta a ponta da correção de `SEC-DEBT-008` ainda não executada, por falta de credencial acessível no ambiente (`VITE_SUPABASE_ANON_KEY`) — mesma limitação já registrada em `QA-REPORT.md` linha 177 | Baixa (evidência via Postgres real + RLS real já validou a causa raiz — ver racional em `BLOCKERS.md` Bloqueio 015, atualização devsecops) | Não | Assim que credencial acessível existir; item de fechamento do smoke test ao vivo, não de correção de causa raiz | qa / devsecops |
| SEC-DEBT-010 | `frontend/src/lib/api/notifications.ts` (`createPushSubscription`) não usa `withOwnerId` — gap de defesa em profundidade isolado a `push_subscriptions` (tabela fora do escopo original do Bloqueio 015, adicionada só na camada de banco pelo Backend) | Baixa (causa raiz já corrigida na camada de banco — `DEFAULT auth.uid()` confirmado em `push_subscriptions`, suficiente por si só) | Não | Próximo toque em `notifications.ts`; recomendado por consistência, sem urgência dado que a camada de banco já cobre | frontend |
| SEC-DEBT-011 | Bypass temporário do gate de MFA por e-mail (`custom_access_token_hook` sempre emite `app_email_mfa_verified=true`; `SKIP_EMAIL_MFA=true` no frontend) — remove o 2º fator de 12 tabelas de dado financeiro, mitigado por cadastro travado a 1 e-mail (`allowed_signup_emails`) e ausência de movimentação de dinheiro real neste MVP; agravado por `minimum_password_length=6`/`password_requirements=""` — `BLOCKERS.md` Bloqueio 018 (ver 1.16) | Média | Não (aprovado como risco temporário — ver 1.16) — reversão condicional, não bloqueio | O que vier primeiro: `auth-email-mfa` voltar a funcionar, ou **7 dias corridos** do deploy (extensão além disso exige nova confirmação explícita do stakeholder); política de senha fraca sem prazo fixo, mas recomendado corrigir junto | stakeholder/backend (reversão do bypass) / backend (política de senha) |
| SEC-DEBT-012 | `categories.color` (coluna `text` livre, sem `CHECK` de formato) renderizado pela primeira vez como valor de CSS inline em `CategoryCard.tsx` (`style={{ backgroundColor: color }}`), sem validação de formato hexadecimal — hoje sem exploitabilidade prática (nenhuma UI expõe campo para o usuário definir essa cor; RLS impede leitura cross-tenant) | Baixa | Não | Antes de qualquer funcionalidade futura que exponha um campo de UI para definir `categories.color`/`accounts.color` livremente — adicionar validação de formato (regex/`CHECK` constraint); sem urgência hoje | frontend / backend |

**Achado #3 (schema baseline não referenciado)** e **SEC-DEBT-005** (gaps
remanescentes do mesmo achado, `BLOCKERS.md` Bloqueio 012) não entram na leitura
de débito "leve, calendário flexível" — são tratados como bloqueio específico da
capacidade de DR (Seção 1.3 e 1.7), não como item de prazo aberto.

**Achado #4** descartado (falso positivo, verificado contra schema real).

**Atualização 1.9 (auditoria completa de lote, "Contas & Formas de Pagamento")**:
`security-requirement-validation`, `compliance-validation` e
`sensitive-data-exposure-check` não geraram nenhum débito novo — o único item em
aberto para este lote continua sendo `SEC-DEBT-006` (já listado acima, achado da
rodada 1.8/SAST). Veredito do lote: **Aprovado com débito** (ver 1.9).

**Atualização 1.12 (lote "Categorização")**: `SEC-DEBT-008` é o primeiro achado
deste documento sem condição de contenção — não é "leve, calendário flexível" nem
"bloqueio automático condicional futuro" (padrão de SEC-DEBT-002/005/006). É
bloqueio incondicional hoje. Ver 1.12 e Seção 3 para detalhe completo.

**Atualização 1.14/1.15 (lote "Orçamento")**: `security-requirement-validation`,
`compliance-validation`, `sensitive-data-exposure-check` e
`finding-severity-classification` não geraram nenhum débito novo — nenhum item
fica em aberto especificamente para este lote. Veredito do lote: **Aprovado, sem
débito novo** (ver 1.15). `SEC-DEBT-002` permanece corrigido para `budget`
especificamente desde `BE-M-13`, sem gap residual (reverificado nesta rodada).

**Atualização 1.16 (revisão pontual, bypass temporário de MFA por e-mail,
`BLOCKERS.md` Bloqueio 018)**: `SEC-DEBT-011` registrado — severidade Média,
**não bloqueia** o deploy desta mudança (aprovado como risco temporário com
prazo/condição de reversão, ver 1.16 para o racional completo). Diferente de
todo achado anterior "Aprovado com débito" (que descrevia código já concluído
de um lote normal), este débito nasce de uma decisão de risco aceito já em
produção — o prazo de 7 dias/condição de causa-raiz-resolvida é o mecanismo de
controle, não uma correção de código pendente de agendamento.

**Atualização 1.25 (auditoria completa de lote, primeira aplicação formal —
"Autenticação & Segurança")**: `SEC-DEBT-001` reclassificado de Média para
Baixa — o `ADR-014` (remoção definitiva do 2º fator por e-mail) confirma que
explorar `auth-email-mfa` hoje não produz nenhum efeito na postura de
segurança real do produto (`custom_access_token_hook` já emite
`app_email_mfa_verified=true` incondicionalmente, independente do resultado
desse endpoint). Recomendação de correção atualizada de "corrigir no próximo
toque no arquivo" para "avaliar decommissioning" (ver 1.25 e `BLOCKERS.md`
Bloqueio 009). Nenhum débito novo gerado por esta rodada —
`security-requirement-validation`, `compliance-validation` e
`sensitive-data-exposure-check` não encontraram nenhum achado novo sobre
`BE-M-09`/`11`/`12`/`13`/`14`/`FE-M-04`/`12`/`13`/`QA-M-02`. Veredito do lote:
**Aprovado com débito** (`SEC-DEBT-001`, Baixa, não bloqueante).

## 3. Achados que bloqueiam algo

| Achado | O que bloqueia | O que NÃO bloqueia |
|---|---|---|
| #3 — `schema-baseline-legacy.sql` não referenciado | Fechamento do requisito de DR de `BE-M-10`/ADR-009 — não pode ser tratado como "disaster recovery funcional" até resolvido | Deploy das funcionalidades do produto (CRUD, telas) |
| SEC-DEBT-005 (1.7) — 3 gaps remanescentes de DR (Bloqueio 012: extensões, trigger `auth.users`, `cron.schedule` legado) | Execução do drill de restauração (`DEPLOY.md` §6.3) e qualquer comunicação de "backup restaurável ponta a ponta" | Fechamento deste lote ("Fundação Técnica & Infraestrutura" — `BE-M-00`/`01`/`10`/`FE-M-00`/`01`/`02`); deploy funcional do produto |
| SEC-DEBT-008 (1.12) — `user_id` nunca enviado por nenhum `INSERT` do Frontend em nenhuma tabela "ownable"; sem `DEFAULT`/trigger no banco para preencher — **FECHADO (2026-09-03, verificado independentemente por devsecops)**, Bloqueio 015 Resolvido | Não bloqueia mais nada — correção (a) e (b) verificadas ao vivo/por leitura de código pelo próprio devsecops (não só relato); residual é `SEC-DEBT-009`/`SEC-DEBT-010`, ambos baixa severidade, não bloqueantes | Nenhum — corrigido e fechado |

**Nenhum achado desta rodada bloqueia o deploy funcional do produto hoje, nem o
fechamento deste lote especificamente.** Os bloqueios reais são de escopo
restrito (capacidade de DR — Achado #3 original + SEC-DEBT-005), e o achado #2
carrega um bloqueio condicional futuro (não hoje).

**Atualização 1.8 (lote "Contas & Formas de Pagamento")**: SEC-DEBT-006
(`payment_methods.account_id`) segue o mesmo padrão — não bloqueia o fechamento
deste lote hoje, mas herda a mesma condição de bloqueio automático futuro já
fixada pelo CTO para SEC-DEBT-002/Bloqueio 010 (ver 1.8).

**Atualização 1.9 (auditoria completa de lote)**: com o gate de QA satisfeito
(`QA-REPORT.md` Seção 4, Aprovado), rodei as 3 skills de auditoria restantes
(`security-requirement-validation`, `compliance-validation`,
`sensitive-data-exposure-check`) sobre este mesmo lote — nenhum achado novo de
qualquer severidade. **Veredito final do lote "Contas & Formas de Pagamento":
Aprovado com débito** (`SEC-DEBT-006`, condição de bloqueio automática, não
bloqueia o fechamento deste lote hoje). Nenhum achado de compliance obrigatório
(LGPD) pendente.

**Atualização 1.11 (auditoria completa de lote, "Ledger & Dashboard")**: com o gate
de QA satisfeito (`QA-REPORT.md` Seção 5, Aprovado com ressalvas — nenhuma ressalva
tocando segurança), rodei as 4 skills restantes sobre este lote — nenhum achado novo
de qualquer severidade. **Veredito final do lote "Ledger & Dashboard": Aprovado com
débito** (`SEC-DEBT-007`, débito simples com dono e correção sugerida, não
bloqueante). Nenhum achado de compliance obrigatório (LGPD) pendente.

**Atualização 1.12 (lote "Categorização") — supera a leitura "nenhum achado bloqueia
o deploy funcional do produto" registrada acima para as rodadas 1.7-1.11**:
`SEC-DEBT-008` (ver 1.12) é o primeiro achado deste documento que bloqueia
efetivamente o deploy funcional do produto — não uma capacidade lateral (DR) nem
uma condição futura (multiusuário). Se confirmado ao vivo, todo lote anterior
"Aprovado com débito" continua correto **no mérito de segurança avaliado
naquele momento** (nenhum dos achados anteriores muda de classificação), mas a
leitura de "pronto para produção" de cada um deles precisa ser suspensa até
`SEC-DEBT-008` ser refutado ou corrigido — a escrita via Frontend contra o banco
real é uma pré-condição comum a todos eles, não um achado isolado deste lote.
**Veredito do lote "Categorização": Bloqueado** (ver 1.12) — as tarefas
`BE-M-05`/`FE-M-08` em si (hierarquia, RLS, RN-09) estão corretas; o bloqueio é
sobre a pré-condição de plataforma comum a todo o produto.

**Atualização 1.12 (DevSecOps, 2026-09-03) — veredito revisado após verificação
independente**: `SEC-DEBT-008` foi refutado como bloqueio incondicional —
verifiquei eu mesmo, ao vivo contra o projeto real, que a correção (a)
(migration `20260903260000`, 13/13 tabelas com `DEFAULT auth.uid()`) e a
correção (b) (`withOwnerId`, 12/12 chamadas) estão de fato aplicadas, e
executei pessoalmente o teste de regressão SQL com resultado `PASS`. Bloqueio
015 formalmente Resolvido (`BLOCKERS.md`). Detalhe completo do racional
(inclusive por que a ressalva de reprodução HTTP/`supabase-js` não impede o
fechamento) na atualização "Achado novo" acima e em `BLOCKERS.md` Bloqueio
015. **Veredito revisado do lote "Categorização": Aprovado com débito**
(`SEC-DEBT-009`, `SEC-DEBT-010` — ambos baixa severidade, não bloqueantes).
Por extensão, os lotes anteriores "Aprovado com débito" suspensos pela mesma
pré-condição comum (Fundação, Contas & Formas de Pagamento, Ledger &
Dashboard) voltam à leitura normal de "pronto para produção".

**Atualização 1.16 (revisão pontual, `SEC-DEBT-011`, bypass temporário de MFA por
e-mail)**: não bloqueia o deploy da mudança em produção — aprovado como risco
temporário, com reversão condicional (causa raiz resolvida ou 7 dias corridos,
o que vier primeiro; extensão do prazo exige nova confirmação explícita do
stakeholder). Diferente de `SEC-DEBT-002`/`006` (condição de bloqueio automática
amarrada a um evento de produto futuro — 2º usuário), a condição aqui é de
**tempo/causa-raiz**, não de evento de produto. Ver 1.16 para o racional
completo, incluindo por que isto não é o mesmo padrão de risco de `SEC-DEBT-008`
(que bloqueava incondicionalmente porque quebrava função do produto para todo
mundo — este achado reduz defesa em profundidade, não quebra função nenhuma).

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
- **Drill de restauração de DR**: uma vez que SEC-#3 (schema baseline) **e**
  SEC-DEBT-005 (`BLOCKERS.md` Bloqueio 012 — extensões, trigger `auth.users`,
  `cron.schedule` legado) estejam ambos corrigidos, agendar ao menos um teste
  real de restauração (não só "o job de backup roda com sucesso") para validar
  que o par schema+dado realmente reconstrói um ambiente funcional. `DEPLOY.md`
  §6.3.4 já trata isso como pré-condição explícita — confirmado, sem alteração
  necessária.
- **Destino do e-mail de alerta de backup** (`BACKUP_ALERT_EMAIL_TO`/`EMAIL_FROM`,
  `backup-export`): confirmar que a caixa de destino é exclusivamente do
  operador/stakeholder — mensagens de falha carregam nome de tabela/código HTTP
  de erro, baixo risco, mas não devem ir a uma lista ampla.
- **Bypass temporário de MFA por e-mail (`SEC-DEBT-011`, `BLOCKERS.md` Bloqueio
  018)**: DevOps só publica esta mudança específica em produção depois deste
  registro (já satisfeito) — confirmar no deploy: (a) a comment tag da migration
  `20260904090000` e a nota em `AuthContext.tsx` seguem versionadas e visíveis
  (não squash/scrub do histórico); (b) monitorar/registrar a data real de deploy
  em produção para contar os 7 dias corridos da condição de reversão a partir
  dessa data, não da data desta revisão; (c) ao reverter (causa raiz resolvida ou
  prazo vencido), aplicar a down migration
  (`supabase/migrations_down/20260904090000_temp_bypass_email_mfa_gate.down.sql`)
  e reverter `SKIP_EMAIL_MFA` no mesmo deploy — nunca um sem o outro, ficariam
  inconsistentes (frontend exigindo MFA que o backend não valida, ou vice-versa).
  - **Atualização — 2026-09-04, encerramento de `SEC-DEBT-011`**: as condições de
    reversão acima (prazo de 7 dias, causa raiz resolvida) **não se aplicam
    mais** — o stakeholder decidiu remover o 2º fator por e-mail definitivamente
    da arquitetura, não restaurá-lo, formalizado em
    `adr/014-remocao-definitiva-do-segundo-fator-por-email.md` e em
    `BLOCKERS.md` Bloqueio 018 (atualização final). `custom_access_token_hook`
    segue emitindo `app_email_mfa_verified=true` sempre, agora como
    comportamento definitivo (não bypass sob prazo); o código morto do lado do
    frontend (`EmailMfaStep.tsx`, `emailMfa.ts`, estágio `needs-mfa`) foi
    removido, não só desativado por flag. **`SEC-DEBT-011` está encerrado** — o
    risco residual de autenticação de fator único passa a ser risco aceito de
    arquitetura (documentado no ADR-014, não mais um débito com prazo de
    reversão). O item de política de senha fraca abaixo continua válido e
    aberto por conta própria (não dependia do MFA para ser relevante).
- **Política de senha do Supabase Auth** (achado agravante, originalmente
  levantado junto de `SEC-DEBT-011`, permanece aberto independentemente do
  encerramento acima):
  `minimum_password_length = 6`/`password_requirements = ""` em
  `supabase/config.toml` — recomendo aumentar para ao menos 8 caracteres com
  `lower_upper_letters_digits` assim que uma janela de manutenção permitir
  (requer `supabase config push`, mesmo risco de sobrescrita total de config já
  registrado no comentário de `BE-M-12` — coordenar com DevOps antes de aplicar
  para não perder nenhum outro campo de Auth já configurado em produção).
- **Content-Security-Policy do Frontend**: `frontend/index.html` não define CSP
  (esperado — CSP correto vive em header HTTP, não meta tag). Recomendo
  configurar `Content-Security-Policy` (e headers correlatos —
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`) no nível do provedor de
  hospedagem (Vercel, `vercel.json` `headers`) quando o deploy real for
  configurado (`BLOCKERS.md` Bloqueio 004) — não bloqueante hoje, scaffolding
  ainda não tem lógica de domínio para justificar CSP restritiva definitiva.

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
4. **SEC-DEBT-005 (1.7, gaps remanescentes de DR — `BLOCKERS.md` Bloqueio 012)**:
   registro de corroboração, não pedido de decisão nova — já existe veredito de
   priorização seu no Bloqueio 011 para o achado-mãe (Achado #3), e este é
   tecnicamente a mesma classe de risco. Sinalizo por transparência de que a
   auditoria desta rodada (SAST sobre o lote "Fundação Técnica &
   Infraestrutura") confirma, por leitura direta do código/migrations, que os
   três gaps do Bloqueio 012 permanecem em aberto e não bloqueiam este lote —
   sem pedir reabertura do seu veredito de priorização já dado.
5. **SEC-DEBT-006 (1.8, `payment_methods.account_id` sem validação de ownership de
   FK — `BLOCKERS.md` Bloqueio 013)**: também registro de corroboração/extensão de
   escopo, não pedido de decisão nova. O senhor já decidiu integralmente o "quê" e
   o "quando" para esta classe de risco no veredito do Bloqueio 010 (correção antes
   de qualquer tarefa `BE-F3-*`, mesmo gatilho de bloqueio automático) — esta
   rodada de `static-security-analysis` sobre o lote "Contas & Formas de Pagamento"
   só confirma, por leitura direta da migration real de `BE-M-13`, que a correção
   sistêmica prometida (Seção 1.2 original: "todas as tabelas com FK para outra
   tabela 'ownable', não só budget") não cobriu `payment_methods.account_id`.
   Recomendo tratar como extensão direta do mesmo prazo já fixado, sem nova
   deliberação — mas sinalizo porque é o tipo de lacuna de execução (escopo de
   migration menor que o escopo do achado original) que vale o senhor saber que
   aconteceu, não só que foi corrigida depois.
6. **SEC-DEBT-007 (1.10, `apply_transaction_effect` exposta como RPC pública —
   `BLOCKERS.md` Bloqueio 014)**: registro por transparência, não pedido de decisão —
   é correção puramente técnica (privilégio mínimo em função interna), sem trade-off
   de produto/negócio envolvido, diferente de SEC-DEBT-002/006/G-19. Sinalizo porque é
   um padrão de risco (função auxiliar de trigger herdando `GRANT` amplo do dump
   legado, nunca reavaliado sob a ótica de que `public` é hoje o schema de API real)
   que pode se repetir em outras funções internas ainda não auditadas sob essa ótica
   específica — recomendo ao Backend uma varredura pontual de todas as funções de
   `public` com `GRANT` a `anon`/`authenticated` herdado do legado, confirmando quais
   foram de fato desenhadas para RPC direto (como as de dashboard) versus quais são
   helpers internos de trigger sem gate próprio (como esta).
7. **SEC-DEBT-008 (1.12, `user_id` nunca enviado por nenhum `INSERT` do Frontend —
   `BLOCKERS.md` Bloqueio 015) — sinalização com urgência, não pedido de decisão
   de negócio, mas com pedido explícito de visibilidade imediata dado o escopo**:
   diferente dos itens 2/3 (onde a decisão de risco é do senhor) e dos itens 4/5/6
   (registro de transparência de rotina), este item não exige decisão de trade-off
   — a correção é puramente técnica (migration de `DEFAULT auth.uid()`), sem
   ambiguidade sobre o "o quê" ou o "quando" (o quando é "agora", não há condição
   de contenção que justifique esperar). Sinalizo mesmo assim, fora do ritmo
   normal, porque a escala do achado (se confirmado ao vivo) significa que
   **nenhuma tarefa de criação/edição de dado do produto, em nenhum lote já
   marcado "Concluída"/"Aprovado" até hoje, foi de fato exercida com sucesso
   contra o ambiente real** — informação que julgo do senhor precisar ter antes
   de qualquer comunicação externa (stakeholder, deploy) que descreva o MVP como
   funcionalmente pronto. Recomendo, como próximo passo mais barato, um smoke
   test manual mínimo (1 conta + 1 categoria via navegador) assim que
   `VITE_SUPABASE_ANON_KEY`/`VITE_SUPABASE_URL` reais estiverem disponíveis nesta
   sessão — antes mesmo de aplicar a correção, para confirmar definitivamente a
   hipótese com uma reprodução ao vivo, não só leitura de código.
8. **`SEC-DEBT-011` (1.16, bypass temporário do gate de MFA por e-mail —
   `BLOCKERS.md` Bloqueio 018) — registro de transparência, decisão já tomada
   dentro da minha alçada técnica, não pedido de decisão de negócio**: o
   stakeholder já decidiu, fora da cadeia de agentes, aceitar o risco de rodar
   com 1 fator só enquanto `auth-email-mfa` está fora do ar — essa parte não é
   minha para decidir de novo. O que avaliei e decidi, dentro da minha
   autoridade de bloquear/liberar deploy por achado de segurança, foi se o
   risco técnico resultante é aceitável e por quanto tempo: **é, com prazo de 7
   dias corridos ou causa-raiz resolvida (o que vier primeiro)**. Sinalizo ao
   senhor porque o gate de MFA por e-mail foi formalizado como decisão
   arquitetural relevante o bastante para um ADR próprio (`ADR-013`) no seu
   próprio parecer de Gate 2 — julgo que o senhor deve saber que está
   temporariamente desativado em produção, mesmo sem precisar aprovar a
   decisão técnica em si. Se o prazo de 7 dias vencer sem a causa raiz
   resolvida, a decisão de estender deixa de ser só minha (registrado
   explicitamente em `SECURITY-REVIEW.md` 1.16 e `BLOCKERS.md` Bloqueio 018) —
   nesse ponto sim, uma confirmação explícita do stakeholder (ou do senhor, se
   for o canal disponível) passa a ser pré-requisito para não reverter.

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

**Atualização 1.9 — checklist específico do lote "Contas & Formas de Pagamento"
(gate de QA satisfeito, `QA-REPORT.md` Seção 4, Aprovado)**:

- [x] Nenhum achado de severidade alta/crítica ativamente explorável em aberto
      sem tratamento (`SEC-DEBT-006` é Alta em impacto, com bloqueio condicional
      já aplicado, não deixado em aberto sem controle)
- [x] Nenhum achado de compliance obrigatório (LGPD) não resolvido —
      `compliance-validation` (1.9) não encontrou achado nenhum, obrigatório ou não
- [x] Achado de baixa/média severidade registrado como débito com prazo —
      não aplicável a este lote especificamente (o único achado, `SEC-DEBT-006`,
      é Alta, já tratado com condição de bloqueio automática, não prazo de
      calendário)
- [x] Requisitos de segurança operacional definidos para o DevOps (Seção 4,
      já cobre este lote — nenhum requisito operacional novo específico surgiu
      desta rodada)
- [x] Achado de relevância estratégica sinalizado ao CTO — `SEC-DEBT-006` já
      sinalizado na Seção 5, item 5 (rodada 1.8); nenhuma sinalização nova em 1.9
- [x] Auditoria completa do lote (as 5 skills de `devsecops.md`, gate de QA
      satisfeito) — **concluída, veredito: Aprovado com débito** (ver 1.9)

**Atualização 1.10 — checklist específico do lote "Ledger & Dashboard"
(`static-security-analysis` em paralelo ao QA — gate de QA ainda não necessário para
esta skill, `EXECUTION-FLOW.md`)**:

- [x] Nenhum achado de severidade alta/crítica em aberto — único achado novo
      (`SEC-DEBT-007`) é Média, exploitabilidade autolimitada à própria conta do
      atacante (RLS contém o dano), sem componente de compliance
- [x] Nenhum achado de compliance obrigatório (LGPD) pendente — não avaliado
      formalmente nesta rodada (skill fora de escopo, aguarda gate de QA), mas
      nenhum indício levantado durante o SAST
- [x] Achado de baixa/média severidade registrado como débito com prazo —
      `SEC-DEBT-007`, dono `backend`, correção de baixo custo sugerida, próximo
      toque no arquivo
- [x] Nenhum requisito operacional novo para o DevOps surgiu desta rodada (Seção 4
      já cobre o que é aplicável)
- [x] Achado de relevância estratégica sinalizado ao CTO — `SEC-DEBT-007`
      sinalizado na Seção 5, item 6, como registro de transparência (não decisão de
      negócio)
- [x] Auditoria completa do lote (as 5 skills) — **concluída em 1.11**, gate de QA
      satisfeito (`QA-REPORT.md` Seção 5, Aprovado com ressalvas, nenhuma das duas
      ressalvas — `QA-DEBT-007`/`QA-DEBT-008` — toca superfície de segurança).

**Veredito do lote (parcial, só `static-security-analysis`): Aprovado com débito**
(ver acima). **Superado pelo veredito final em 1.11** — ver checklist e veredito
abaixo.

**Atualização 1.11 — checklist final do lote "Ledger & Dashboard" (auditoria completa,
gate de QA satisfeito)**:

- [x] Nenhum achado de severidade alta/crítica em aberto — `SEC-DEBT-007` (único
      achado do lote) é Média, exploitabilidade autolimitada à própria conta do
      atacante, sem componente de compliance ou cross-tenant
- [x] Nenhum achado de compliance obrigatório (LGPD) não resolvido —
      `compliance-validation` (1.11) não encontrou achado nenhum, obrigatório ou não;
      nenhuma contradição com a política de retenção do `ADR-011`
- [x] Achado de baixa/média severidade registrado como débito com prazo —
      `SEC-DEBT-007`, dono `backend`, correção de baixo custo sugerida, próximo
      toque no arquivo (já registrado em 1.10, reconfirmado em 1.11)
- [x] Requisitos de segurança operacional definidos para o DevOps (Seção 4, já
      cobre este lote — nenhum requisito operacional novo específico surgiu desta
      rodada)
- [x] Achado de relevância estratégica sinalizado ao CTO — `SEC-DEBT-007` já
      sinalizado na Seção 5, item 6 (rodada 1.10); nenhuma sinalização nova em 1.11
- [x] Auditoria completa do lote (as 5 skills de `devsecops.md`, gate de QA
      satisfeito) — **concluída, veredito: Aprovado com débito** (ver 1.11)

**Veredito final do lote "Ledger & Dashboard": Aprovado com débito.** Cobre as 5
skills completas (`static-security-analysis` em 1.10 + `security-requirement-validation`/
`compliance-validation`/`sensitive-data-exposure-check`/`finding-severity-classification`/
`security-report-drafting` em 1.11). Nenhum achado de severidade alta/crítica; nenhum
achado de compliance obrigatório (LGPD) pendente; um único débito em aberto
(`SEC-DEBT-007`, Média, não bloqueante, dono `backend`). As 5 tarefas
(`BE-M-06`, `BE-M-07`, `FE-M-03`, `FE-M-09`, `FE-M-10`) estão liberadas, do ponto de
vista de segurança, para o fechamento formal do lote pelo Tech Lead.

---

**Checklist — rodada 1.12 (`static-security-analysis`, lote "Categorização", em
paralelo ao QA — gate de QA ainda não necessário para esta skill,
`EXECUTION-FLOW.md`)**:

- [ ] **Nenhum achado de severidade alta/crítica em aberto** — **NÃO satisfeito**:
      `SEC-DEBT-008` é Crítica, em aberto, sem condição de contenção
- [x] Nenhum achado de compliance obrigatório (LGPD) pendente — não avaliado
      formalmente nesta rodada (skill fora de escopo, aguarda gate de QA); nenhum
      indício de natureza LGPD levantado durante o SAST (o achado novo é de
      disponibilidade/correção de escrita, não de tratamento de dado pessoal)
- [x] Achado de baixa/média severidade registrado como débito com prazo — não
      aplicável a achado novo desta rodada (o único achado novo é Crítico, tratado
      como bloqueio incondicional, não débito de prazo)
- [x] Nenhum requisito operacional novo para o DevOps surgiu desta rodada (Seção 4
      já cobre o que é aplicável — a correção de `SEC-DEBT-008` é de Backend/
      Frontend, não de infraestrutura/DevOps)
- [x] Achado de relevância estratégica sinalizado ao CTO — `SEC-DEBT-008`
      sinalizado na Seção 5, item 7, com urgência explícita (não apenas registro
      de rotina)
- [x] Confirmação pontual pedida pelo orquestrador (gap de ownership de FK em
      `categories.parent_category_id`, classe G-19/Bloqueio 013) — **concluída,
      sem gap encontrado** (ver 1.12, "Confirmação prévia obrigatória")

**Veredito do lote "Categorização": Bloqueado — pausa obrigatória do
orquestrador.** `BE-M-05`/`FE-M-08` estão tecnicamente corretas no que este round
avaliou (hierarquia de categoria, RLS, RN-09, telas) — nenhuma correção é exigida
nas duas tarefas em si. O bloqueio é `SEC-DEBT-008`: `user_id` nunca é enviado por
nenhum `INSERT` do Frontend em nenhuma tabela "ownable" do produto (não só
`categories`), e o banco não tem `DEFAULT`/trigger para preenchê-lo — achado de
severidade Crítica, sem exploitabilidade cross-tenant (RLS falha fechado), mas com
impacto de disponibilidade total sobre toda operação de escrita do produto via
Frontend contra o ambiente real, nunca antes exercitada com sucesso por nenhuma
evidência automatizada disponível neste repositório. Diferente de todo achado
anterior (`SEC-DEBT-001` a `007`), este não tem condição de contenção que permita
"Aprovado com débito". Recomendo ao orquestrador: (1) pausar o avanço deste lote e
reconsiderar a leitura de "pronto para produção" dos lotes anteriores já aprovados,
que compartilham a mesma pré-condição de plataforma; (2) priorizar um smoke test
manual ao vivo (1 conta + 1 categoria via navegador, `xrcxbzrglndetrrhavhc`) assim
que credenciais reais estiverem disponíveis, para confirmar ou refutar a hipótese
antes de qualquer correção; (3) se confirmado, aplicar a migration `DEFAULT
auth.uid()` (correção primária) nas colunas `user_id` de todas as tabelas
"ownable" do produto. Detalhe completo, evidência e correção sugerida em 1.12.
Registrado em `BLOCKERS.md` Bloqueio 015, escalado para `backend` e `frontend`, com
sinalização paralela ao `cto` (Seção 5, item 7).

---

**Atualização 1.13 — checklist final do lote "Categorização" (auditoria completa,
gate de QA satisfeito — `QA-REPORT.md` Seção 6, Aprovado com ressalva,
`QA-DEBT-009` sem implicação de segurança)**:

- [x] Nenhum achado de severidade alta/crítica em aberto — `SEC-DEBT-008` (único
      achado Crítico já levantado sobre este lote) foi corrigido e fechado em 1.12,
      reverificado como fechado nesta rodada
- [x] Nenhum achado de compliance obrigatório (LGPD) não resolvido —
      `compliance-validation` (1.13) não encontrou achado nenhum, obrigatório ou
      não
- [x] Achado de baixa/média severidade registrado como débito com prazo —
      `SEC-DEBT-009`/`SEC-DEBT-010`, já registrados em 1.12/Seção 2, sem achado
      novo nesta rodada
- [x] Requisitos de segurança operacional definidos para o DevOps (Seção 4, já
      cobre o que é aplicável — nenhum requisito operacional novo específico deste
      lote)
- [x] Achado de relevância estratégica sinalizado ao CTO — nenhum novo nesta
      rodada (`SEC-DEBT-008`, item 7 da Seção 5, já sinalizado com urgência em
      1.12 e resolvido)
- [x] Confirmação pontual pedida pelo orquestrador (regressão de autorização do
      `DEFAULT auth.uid()` recém-aplicado, especificamente em `categories`) —
      concluída, sem regressão encontrada (ver 1.13,
      `security-requirement-validation`)
- [x] Verificação pontual pedida pelo orquestrador (`QA-DEBT-009` tem implicação
      de segurança?) — concluída, **confirmado que não tem** (ver 1.13,
      `sensitive-data-exposure-check`)
- [x] Auditoria completa do lote (as 5 skills de `devsecops.md`, gate de QA
      satisfeito) — **concluída, veredito: Aprovado com débito** (ver 1.13)

**Veredito do lote: Aprovado com débito.** Cobre as 5 skills completas
(`static-security-analysis` em 1.12 + `security-requirement-validation`/
`compliance-validation`/`sensitive-data-exposure-check`/
`finding-severity-classification`/`security-report-drafting` em 1.13). Nenhum
achado de severidade alta/crítica em aberto; nenhum achado de compliance
obrigatório (LGPD) pendente; dois débitos residuais de baixa severidade sem
condição de bloqueio (`SEC-DEBT-009`, `SEC-DEBT-010`). As 2 tarefas (`BE-M-05`,
`FE-M-08`) estão liberadas, do ponto de vista de segurança, para o fechamento
formal do lote pelo Tech Lead.

---

**Atualização 1.15 — checklist final do lote "Orçamento" (auditoria completa,
gate de QA satisfeito — `QA-REPORT.md` Seção 7, Aprovado, sem ressalva de lote;
`QA-DEBT-010` sem implicação de segurança)**:

- [x] Nenhum achado de severidade alta/crítica em aberto — nenhum achado novo
      desta rodada; `SEC-DEBT-002` (única questão de severidade Alta com origem
      histórica na superfície de `budget`) está corrigido especificamente para
      `budget`/`get_budget_status` desde `BE-M-13`, reverificado linha a linha
      nesta rodada (1.14/1.15), sem gap residual
- [x] Nenhum achado de compliance obrigatório (LGPD) não resolvido —
      `compliance-validation` (1.15) não encontrou achado nenhum, obrigatório ou
      não; `budget` não introduz dado pessoal além do já avaliado para o ledger
      (mesmo titular/base legal já assentados pelo CTO)
- [x] Achado de baixa/média severidade registrado como débito com prazo — não
      aplicável, nenhum achado novo nesta rodada
- [x] Requisitos de segurança operacional definidos para o DevOps (Seção 4, já
      cobre o que é aplicável — nenhum requisito operacional novo específico
      deste lote)
- [x] Achado de relevância estratégica sinalizado ao CTO — nenhum novo nesta
      rodada
- [x] Confirmação pontual pedida pelo orquestrador (Bloqueio 010/013/014
      aplicado a `budget`/`get_budget_status`) — concluída em 1.14, reconfirmada
      nesta rodada, sem gap residual
- [x] Auditoria completa do lote (as 5 skills de `devsecops.md`, gate de QA
      satisfeito) — **concluída, veredito: Aprovado, sem débito novo** (ver 1.15)

**Veredito do lote: Aprovado, sem débito novo.** Cobre as 5 skills completas
(`static-security-analysis` em 1.14 + `security-requirement-validation`/
`compliance-validation`/`sensitive-data-exposure-check`/
`finding-severity-classification`/`security-report-drafting` em 1.15). Nenhum
achado de severidade alta/crítica em aberto; nenhum achado de compliance
obrigatório (LGPD) pendente; nenhum débito novo registrado. As 2 tarefas
(`BE-M-08`, `FE-M-11`) estão liberadas, do ponto de vista de segurança, para o
fechamento formal do lote pelo Tech Lead.

---

### 1.14 — `static-security-analysis` sobre o lote "Orçamento" — 2026-09-03

**Escopo desta rodada** (dispara em paralelo ao QA, que está validando o mesmo lote
agora — não esperei o veredito dele, conforme `EXECUTION-FLOW.md`; as 5 skills de
auditoria propriamente dita seguem condicionadas ao gate de QA, como em toda rodada
anterior de `static-security-analysis` pontual): migration
`supabase/migrations/20260902100300_be_m08_budget_status.sql` (`BE-M-08`, RPC
`get_budget_status`); `frontend/src/pages/budget/BudgetPage.tsx`,
`frontend/src/components/domain/ProgressBar.tsx`, `frontend/src/lib/api/budget.ts`
(`FE-M-11`, telas + módulo de API consumidos). Cross-referenciado contra `SDD.md`
Seção 7 (padrão `auth.uid() = user_id` + gate de MFA), `GUARDRAILS.md` (`G-19`),
`API-CONTRACT.yaml` (`/budget`, `/rpc/get_budget_status`) e `BLOCKERS.md` (Bloqueios
010/013/014/015, para checar aplicabilidade residual a este lote especificamente,
conforme pedido do orquestrador).

**Confirmação prévia pedida pelo orquestrador — Bloqueio 010/013/014 (ownership de
FK cross-tabela, classe G-19) aplicado a `budget`/`get_budget_status`: sim,
suficiente, sem gap residual.** Verifiquei linha a linha:
- `budget_insert_own`/`budget_update_own`
  (`supabase/migrations/20260903100000_be_m13_fk_ownership_and_security_definer_guards.sql:34-59`,
  `BE-M-13`) já incluem `EXISTS (select 1 from public.categories c where c.id =
  category_id and (c.user_id = auth.uid() or c.user_id is null))` — exatamente o
  gap original do Achado #2/`SEC-DEBT-002`/Bloqueio 010, corrigido para `budget`
  especificamente (diferente do gap residual de `payment_methods.account_id`
  encontrado em 1.8, que ficou fora do escopo de `BE-M-13` — `budget` **estava** no
  escopo original e foi de fato coberto).
- `categories_block_delete_when_linked` (mesma migration, linhas 146-171) já é
  `SECURITY DEFINER` e passou a checar `EXISTS (select 1 from public.budget where
  category_id = old.id)` além de `transactions` — a segunda parte do Achado #2
  (RN-09 bypassável via `budget` malicioso) também está corrigida.
- `get_budget_status` (`BE-M-08`) roda `SECURITY INVOKER` (default — nenhuma
  cláusula `SECURITY DEFINER` na função, confirmado por leitura direta), com dupla
  filtragem por `auth.uid()` — tanto no CTE `v_spent` (`t.user_id = auth.uid()`)
  quanto na cláusula final (`bu.user_id = auth.uid()`) — redundante com a RLS de
  `budget`/`transactions` já aplicada por baixo (defesa em profundidade, mesmo
  padrão de cautela já visto em outras RPCs de leitura agregada do projeto), não
  um substituto dela. O `JOIN` com `categories` não tem filtro de usuário, mas não
  precisa: categoria de sistema é compartilhada por design e categoria privada só
  aparece no resultado se já pertencer à mesma linha de `budget` do usuário
  (garantido pela RLS/`WITH CHECK` de `BE-M-13` no momento da escrita, não pela
  leitura). Nenhum vetor de leitura cross-tenant via este `JOIN`.
- **Bloqueio 015/`SEC-DEBT-008`** (`user_id` nunca enviado pelo `INSERT` do
  Frontend) também não se repete aqui: `createBudget`
  (`frontend/src/lib/api/budget.ts:19-21`) usa `withOwnerId(input)` (mesmo helper
  de defesa em profundidade padronizado após o Bloqueio 015), e a correção primária
  (`alter table public.budget alter column user_id set default auth.uid()`,
  `supabase/migrations/20260903260000_be_m14_user_id_default_auth_uid.sql:45`,
  `BE-M-14`) já cobre `budget` no escopo original — não é uma tabela nova que
  ficou de fora, como `push_subscriptions`/`contributions` ficaram em rodadas
  anteriores (`SEC-DEBT-009`).

**Nenhum achado novo de severidade relevante nesta rodada**:
- `updateBudget` (`budget.ts:24-26`) só aceita `limit_cents`/`alert_threshold_pct`
  no payload — não expõe `category_id` como campo editável (o formulário em
  `BudgetPage.tsx:167` desabilita o `Select` de categoria em modo edição,
  `disabled={Boolean(editingBudget)}`), então não há vetor de reatribuição de
  `category_id` via `UPDATE` a explorar aqui além do que a policy `budget_update_own`
  já bloqueia no banco (defesa em profundidade client-side coerente com o que a
  RLS já garante, não uma dependência nova em validação client).
- `search_path` de `get_budget_status` fixado (`set search_path to 'public'`) —
  mitiga search_path hijacking; risco residual é baixo mesmo sem isso por ser
  `SECURITY INVOKER` (não herda privilégio elevado), mas a função segue a boa
  prática already-established no projeto mesmo não sendo estritamente necessária
  aqui.
- `ProgressBar.tsx`: `label`/`detailText` renderizados via JSX puro (nenhum
  `dangerouslySetInnerHTML`) — React escapa por padrão, sem vetor de XSS mesmo que
  `category_name` viesse com caractere malicioso.
- Grep dirigido por `console.log`/`dangerouslySetInnerHTML`/`eval(`/
  `localStorage`/`sessionStorage` em `BudgetPage.tsx`, `ProgressBar.tsx`,
  `budget.ts`: nenhuma ocorrência.
- `npm audit --omit=dev` não reexecutado nesta rodada por não haver mudança em
  `frontend/package.json`/`package-lock.json` frente à última execução (1.8/1.10/
  1.12, 0 vulnerabilidades) — confirmado via `git diff --stat` que nenhum dos dois
  arquivos mudou neste lote; nenhuma dependência nova introduzida por `FE-M-11`.
- Migration `BE-M-08` tem down migration correspondente
  (`supabase/migrations_down/20260902100300_be_m08_budget_status.down.sql`, DIR-04)
  e é 100% aditiva (só `CREATE OR REPLACE FUNCTION`, nenhum `DROP`/`ALTER`
  destrutivo sobre `budget`/`transactions`).

**Veredito para o fechamento deste lote (só `static-security-analysis`,
`EXECUTION-FLOW.md` — as 4 skills restantes seguem aguardando o veredito do QA
sobre este lote especificamente): nenhum achado, nem novo débito.** `BE-M-08`/
`FE-M-11` não introduzem nenhum gap de autorização, exposição de dado sensível ou
dependência vulnerável — inclusive fecham corretamente, para a superfície de
`budget`, os dois padrões sistêmicos de risco já mapeados em rodadas anteriores
(G-19/ownership de FK; `user_id` ausente em `INSERT`).

**Checklist — rodada 1.14 (`static-security-analysis`, lote "Orçamento", em
paralelo ao QA)**:

- [x] Nenhum achado de severidade alta/crítica em aberto — nenhum achado novo
- [x] Nenhum achado de compliance obrigatório (LGPD) pendente — não avaliado
      formalmente nesta rodada (skill fora de escopo, aguarda gate de QA); nenhum
      indício levantado durante o SAST
- [x] Achado de baixa/média severidade registrado como débito com prazo — não
      aplicável, nenhum achado novo
- [x] Nenhum requisito operacional novo para o DevOps surgiu desta rodada (Seção 4
      já cobre o que é aplicável)
- [x] Achado de relevância estratégica sinalizado ao CTO — não aplicável, nenhum
      achado novo
- [x] Confirmação pontual pedida pelo orquestrador (Bloqueio 010/013/014 aplicado a
      `budget`/`get_budget_status`) — concluída, **confirmado suficiente, sem gap
      residual** (ver acima)

**Veredito do lote (parcial, só `static-security-analysis`): Aprovado, sem
ressalva.** Fica condicionado, como em toda rodada anterior deste padrão, à
auditoria completa (as 4 skills restantes) assim que o QA aprovar
(Aprovado/Aprovado com ressalvas) `BE-M-08`/`FE-M-11` em `QA-REPORT.md`.

---

### 1.15 — Auditoria completa (veredito final de lote) — "Orçamento" — 2026-09-03

**Gatilho**: `QA-REPORT.md` Seção 7 aprovou (Aprovado, sem ressalva de lote) as 2
tarefas deste lote (`BE-M-08`, `FE-M-11`) — o único achado da rodada de QA
(`QA-DEBT-010`, `aria-valuenow` > `aria-valuemax` no `ProgressBar` em estado de
estouro) é de severidade Baixa e, por natureza, de conformidade ARIA, não de
segurança (avaliado explicitamente abaixo, `finding-severity-classification`).
Libera a auditoria completa de DevSecOps (as 4 skills além de
`static-security-analysis`, já rodada em 1.14, sobre o mesmo escopo: migration
`20260902100300_be_m08_budget_status.sql`, `frontend/src/pages/budget/BudgetPage.tsx`,
`frontend/src/components/domain/ProgressBar.tsx`,
`frontend/src/lib/api/budget.ts`). Esta rodada **não repete** o SAST de 1.14 — usa
seus achados como insumo (nenhum achado novo lá) e acrescenta os 3 checks de
auditoria propriamente dita mais a consolidação final.

#### `security-requirement-validation` — SDD.md Seção 7 + GUARDRAILS.md

Verificação direta contra o código-fonte real (migrations `20260902100000_be_m01_...`,
`20260902100300_be_m08_budget_status.sql`, `20260903100000_be_m13_fk_ownership_...`):

| Requisito (`SDD.md` Seção 7 / `GUARDRAILS.md`) | Verificação | Evidência | Resultado |
|---|---|---|---|
| RLS `auth.uid() = user_id` em `budget` (`Autorização`; `G-04`/`DIR-27`) | 4 policies (`budget_select_own`/`_insert_own`/`_update_own`/`_delete_own`) | `20260902100000_be_m01_...sql:39-54` — todas com `auth.uid() = user_id` na cláusula `USING`/`WITH CHECK` | Passa |
| Gate de MFA por JWT claim `app_email_mfa_verified` | Mesmas 4 policies | Mesma evidência — todas incluem `(auth.jwt() ->> 'app_email_mfa_verified') = 'true'`. Nota: o texto literal de `SDD.md` Seção 7 ("Autorização") lista só `accounts`/`categories`/`payment_methods`/`transactions` como as 4 tabelas com gate de MFA — `budget` não está nominalmente citada nessa lista, mas a implementação real aplica o mesmo gate a `budget` (dado financeiro de teto/gasto, mesma classe de sensibilidade). Não é um gap de segurança (a proteção existe e é mais estrita que o mínimo documentado) — é uma imprecisão pontual de completude do texto do `SDD.md`, mesma classe (baixa severidade, documentação desatualizada) do já registrado em `SEC-DEBT-004`; não abro débito novo para isso porque não há risco de má leitura prática (ninguém precisa "saber" que o gate existe para ele continuar protegendo — é enforced no banco, não uma convenção que dependa de ser lida) | Passa (implementação; nota de completude documental, não bloqueante) |
| `G-19` (ownership de FK entre tabelas ownable) — `budget.category_id` | `budget_insert_own`/`budget_update_own` | `20260903100000_be_m13_fk_ownership_and_security_definer_guards.sql:34-59` — `EXISTS (select 1 from public.categories c where c.id = category_id and (c.user_id = auth.uid() or c.user_id is null))` presente em ambas | Passa — corrigido especificamente para `budget` desde `BE-M-13` (já confirmado em 1.14, reconfirmado por leitura direta nesta rodada) |
| RN-09 (categoria com orçamento vinculado não é `DELETE` físico), `SECURITY DEFINER` (`G-19`) | Trigger `categories_block_delete_when_linked` | `20260903100000_be_m13_...sql:146-171` — `SECURITY DEFINER`, `search_path` fixo, checa `EXISTS (... budget ...)` além de `transactions` | Passa |
| `get_budget_status` não é vetor de leitura cross-tenant | `SECURITY INVOKER` (default), dupla filtragem por `auth.uid()` (CTE `v_spent` e cláusula final), `JOIN` com `categories` sem filtro de usuário mas sem necessidade (categoria de sistema é compartilhada por design; categoria privada só aparece se já pertencer à linha de `budget` do próprio usuário, garantido na escrita pela RLS de `BE-M-13`) | `20260902100300_be_m08_budget_status.sql:5-57`, leitura linha a linha | Passa |
| `search_path` fixo em função `SECURITY INVOKER` de leitura agregada (boa prática, não requisito estrito) | `set search_path to 'public'` | `20260902100300_be_m08_budget_status.sql:19` | Passa |
| Migration aditiva + down migration (`G-03`/DIR-04) | `CREATE OR REPLACE FUNCTION`, nenhum `DROP`/`ALTER` destrutivo sobre `budget`/`transactions`; down migration existe | `supabase/migrations_down/20260902100300_be_m08_budget_status.down.sql` (já confirmado em 1.14) | Passa |
| Confirmação de ativação do `custom_access_token_hook` no dashboard Supabase (condição de aceite explícita do `SDD.md` Seção 7) | Não verificável por leitura de código — depende de configuração externa ao repositório | Já registrado como requisito operacional para DevOps na Seção 4 deste documento; sem mudança nesta rodada | Pendente de confirmação operacional, não é achado de código deste lote |

**Nenhum requisito de arquitetura de segurança da Seção 7 do `SDD.md` relevante a
este lote está implementado de forma diferente do especificado.** O único ponto
levantado (`budget` não citada nominalmente na lista de 4 tabelas com gate de MFA)
é uma imprecisão de completude do texto do `SDD.md`, não uma lacuna de
implementação — a proteção real é mais ampla que o mínimo documentado, não mais
estreita.

#### `compliance-validation` — LGPD

| Verificação | Evidência | Resultado |
|---|---|---|
| Minimização de dado — `budget` não armazena PII além do necessário para a finalidade (teto de gasto por categoria/mês) | `20260902100000_be_m01_...sql:14-27` — colunas `user_id`, `category_id`, `month`, `limit_cents`, `alert_threshold_pct`, sem nenhum dado adicional de titular; `get_budget_status` só agrega `category_name`/valores monetários, nada de identificação pessoal além do já avaliado para o ledger | Passa |
| Base legal/titular — o dado é do próprio operador do sistema (autoprocessamento), não de terceiro | Mesmo enquadramento já assentado pelo CTO em `CTO-REVIEW.md` (linha 307, citado em 1.5/1.9): "lançamentos, saldo, categoria... são dado pessoal do próprio stakeholder... Base/finalidade: uso pessoal" — `budget` é a mesma classe de dado financeiro do próprio usuário (teto de gasto), não introduz um segundo titular | Passa |
| Retenção — `budget` se enquadra em qual categoria da política do `ADR-011`? | `BLOCKERS.md` Bloqueio 002 (resolução), categoria "Ledger (lançamentos e demais entidades de planejamento): retenção indefinida enquanto a conta estiver ativa" — `budget` é uma entidade de planejamento financeiro do usuário, mesma natureza de `RecurringTemplate`/`InstallmentPurchase` já enquadradas nessa categoria; nenhuma contradição com `ADR-011`, nenhuma retenção de prazo fixo aplicável (diferente de foto de recibo/export/candidato de importação) | Passa — sem achado, entidade coberta pela categoria "planejamento" da política já formalizada |
| Direito ao esquecimento / exclusão | `DELETE /budget` remove o próprio registro do usuário livremente (sem bloqueio de RN-08/RN-09 análogo — `budget` não é referenciada por FK de nenhuma outra tabela); exclusão de conta a pedido do usuário (mecanismo formal do `ADR-011`, fora do escopo deste lote) removeria `budget` via `ON DELETE CASCADE` de `user_id` (`references auth.users(id) on delete cascade`, linha 16 da migration) | Passa |
| Payload de API não devolve campo além do documentado em `API-CONTRACT.yaml` | `API-CONTRACT.yaml` linhas 570-616 (`/budget`), 1192-1224 (`/rpc/get_budget_status`) — schemas batem 1:1 com as colunas/retorno reais (checado contra a migration acima); `budget.ts` usa `select("*")`/`.rpc(...)`, mas nem a tabela nem a função têm coluna/campo sensível fora do documentado | Passa |

**Nenhum achado de compliance obrigatório (LGPD) não resolvido neste lote** —
nenhuma exposição desnecessária de dado pessoal em `budget`, nenhum gap de base
legal ou de retenção.

#### `sensitive-data-exposure-check`

| Superfície | Verificação | Evidência | Resultado |
|---|---|---|---|
| Payload de API (`POST`/`PATCH /budget`, `POST /rpc/get_budget_status`) | Nenhum campo de segredo/token/dado de outro usuário no request ou response | `frontend/src/lib/api/budget.ts` — payload é só `NewBudget`/`Partial<...>` (categoria/teto/limiar, campos de domínio financeiro do próprio usuário), sem token/segredo; `getBudgetStatus` não recebe nenhum parâmetro sensível (só `p_month`, data) | Passa |
| Mensagens de erro (`errors.ts`, reaproveitado sem mudança por este lote) | 403 (`forbidden`, novo em `BE-M-13` para `category_id` de outro usuário) usa mensagem genérica (`friendlyMessage`), sem revelar existência/dado de linha de outro usuário; 409 (`conflict`, `budget_user_category_month_unique`) usa `error.message` bruto do Postgres, mas a violação de unique constraint só referencia colunas/valores do próprio usuário que fez a chamada (`user_id`/`category_id`/`month` da própria requisição), nunca de terceiro | `frontend/src/lib/api/errors.ts:56-68` — mesmo padrão já auditado e aprovado para outros endpoints (1.8/1.9) | Passa |
| Logs client-side | Nenhum `console.*` em `BudgetPage.tsx`/`ProgressBar.tsx`/`budget.ts` | Grep dirigido nesta rodada (`console.log`/`console.error`/`console.warn`) — zero ocorrências | Passa |
| Armazenamento local (`localStorage`/`sessionStorage`/IndexedDB) | Nenhum uso nos 3 arquivos do lote — estado 100% em memória (React `useState`), sem persistência local de dado de orçamento | Grep dirigido nesta rodada — zero ocorrências | Passa |
| Renderização de dado dinâmico (XSS) | `label`/`detailText`/`category_name` renderizados via JSX puro, nenhum `dangerouslySetInnerHTML` | `ProgressBar.tsx` (leitura direta, já confirmado em 1.14) | Passa |
| Segredos hardcoded | Nenhum token/chave/URL de serviço nos 3 arquivos do lote | Grep dirigido, reconfirmado nesta rodada | Passa |
| `get_budget_status` — vazamento cross-tenant via agregação | Dupla filtragem por `auth.uid()`, sem vetor de leitura de `spent_cents`/`category_name` de outro usuário | Já confirmado em `security-requirement-validation` acima | Passa |

**Nenhum vazamento de dado sensível via API, log, armazenamento local ou renderização
neste lote.**

#### `finding-severity-classification` — achado de QA (`QA-DEBT-010`) tem implicação de segurança?

Verificação pontual, mesmo padrão já aplicado em 1.13 para `QA-DEBT-009`:
`QA-DEBT-010` (`aria-valuenow` > `aria-valuemax` em `ProgressBar.tsx` no estado de
estouro, `frontend/src/pages/budget/BudgetPage.tsx`/`components/domain/ProgressBar.tsx:41`)
é uma violação de conformidade WAI-ARIA (o valor programático do `role="progressbar"`
pode exceder o máximo declarado) — não expõe dado de outro usuário, não permite
bypass de autorização, não vaza segredo, e não é uma superfície de XSS (o valor é
numérico, nunca renderizado via `dangerouslySetInnerHTML`). **Confirmado: nenhuma
implicação de segurança.** Permanece corretamente classificado como débito de
acessibilidade sob responsabilidade do QA (`QA-DEBT-010`), não duplicado neste
documento como achado de segurança.

Nenhum achado novo de qualquer severidade nesta rodada.

#### `security-report-drafting` — veredito consolidado do lote

Consolidando o achado da análise estática (1.14 — nenhum achado novo) com os 3
checks acima (nenhum achado novo de severidade alta/crítica, nenhum achado de
compliance obrigatório, nenhum vazamento de dado sensível):

- **Achados que bloqueiam o deploy deste lote hoje: nenhum.**
- **Achados de severidade Alta/Crítica em aberto tocando este lote: nenhum.**
  `SEC-DEBT-002` (origem histórica na mesma classe de risco de `budget`) está
  corrigido especificamente para `budget`/`get_budget_status` desde `BE-M-13`,
  reverificado sem gap residual em 1.14 e novamente nesta rodada.
- **Compliance obrigatório (LGPD)**: nenhum achado — nada fica pendente como
  débito, não há gap a resolver.
- **Exposição de dado sensível**: nenhum achado novo.
- **Achado de QA (`QA-DEBT-010`)**: sem implicação de segurança, confirmado acima.

**Veredito do lote: Aprovado, sem débito novo.** As 2 tarefas (`BE-M-08`,
`FE-M-11`) estão liberadas para o fechamento formal do lote pelo Tech Lead
(`TASK.md` Seção 7) do ponto de vista de segurança — nenhum item em aberto
específico deste lote, diferente de todo lote anterior (que fechou com ao menos
um débito registrado).

**Sinalização ao CTO (paralela, não pré-requisito)**: nenhuma nova — este lote não
gera achado de relevância estratégica. As sinalizações já registradas na Seção 5
(itens 1-7) permanecem válidas e não são reabertas por esta rodada.

---

### 1.16 — Revisão pontual (não é auditoria completa de lote): bypass temporário
do 2º fator de e-mail (RF-MVP-08) — `BLOCKERS.md` Bloqueio 018 — 2026-09-04

**Natureza desta entrada**: diferente de 1.1-1.15, isto não é uma auditoria de
lote sobre código que o QA validou funcionalmente — é uma avaliação de risco
pontual e urgente sobre uma mudança já implementada e já aplicada no banco real
(migration `20260904090000_temp_bypass_email_mfa_gate.sql`), pedida diretamente
pelo stakeholder fora da cadeia formal de agentes, documentada em `BLOCKERS.md`
Bloqueio 018. O DevOps corretamente recusou publicar em produção sem este
registro. Escopo: só o bypass em si, não uma reauditoria completa do produto.

#### O que o bypass remove, exatamente

`custom_access_token_hook` (`SECURITY DEFINER`) passa a emitir
`app_email_mfa_verified=true` sempre, sem consultar
`public.email_mfa_challenges`. Esse claim não é "só auditoria em rota" — é
consultado diretamente na cláusula `USING`/`WITH CHECK` de toda policy de RLS
das tabelas de dado financeiro, em conjunto com `auth.uid() = user_id`. Grep
direto contra `supabase/migrations/*.sql` confirma o claim usado como segundo
requisito de autorização (não só de leitura, também de escrita) em **12
tabelas**: `accounts`, `budget`, `categories`, `payment_methods`,
`transactions` (gate original, `SDD.md` Seção 7 "Autorização"), mais
`credit_cards`/tabela de cartão-padrão, `invoices`, `recurring_templates`,
`recurring_template_adjustments`, `installment_purchases`, `fixed_bills` e
`goals` (mesmo padrão copiado em Fase 2, confirmado por
`security-requirement-validation` em rodadas anteriores deste documento, ex.
1.15 para `budget`).

**Correção de enquadramento em relação ao pedido**: o 1º fator (Supabase Auth,
e-mail/senha) e a RLS por `auth.uid() = user_id` continuam intactos — isso é
verdade e seu efeito prático apurado abaixo. Mas o `app_email_mfa_verified` **é
uma autorização de servidor de fato** (segundo requisito dentro da própria
policy de RLS que decide se a query passa ou não), não um mecanismo de log/
auditoria em paralelo. O que o bypass efetivamente remove é a exigência do 2º
fator (posse da caixa de e-mail) para qualquer chamada autenticada ler/escrever
dado financeiro — não é cosmético. O texto de `BLOCKERS.md` Bloqueio 018 (item
1 da decisão do stakeholder) já registra isso corretamente ("isso é o que de
fato libera RLS... não só a tela"); a formulação do pedido desta rodada
subestimava esse ponto, mas a implementação e o registro em `BLOCKERS.md` não.

O desbloqueio local (PIN/WebAuthn, `AuthGate`) não compensa a perda — por
`GUARDRAILS.md` `G-07` e `SDD.md` Seção 7 ("Autenticação"), esse gesto é
inteiramente local ao dispositivo e **nunca** é tratado como autorização
suficiente para uma chamada de servidor; a única autorização de servidor real
que resta, após o bypass, é sessão válida (JWT) + `auth.uid() = user_id`.

#### Superfície de risco real dado o contexto do produto

| Fator | Verificação | Evidência | Efeito no risco |
|---|---|---|---|
| Cadastro de novo usuário está aberto? | Não, na prática — `enable_signup = true` no projeto Supabase, mas mitigado por allow-list de e-mail via trigger `BEFORE INSERT` em `auth.users` | `supabase/migrations/20260902100400_be_m12_restrict_signup.sql` — `public.allowed_signup_emails` contém exatamente **1 e-mail** (`leandrosegheto17@gmail.com`, o próprio stakeholder), `RLS` habilitada sem nenhuma policy (nega tudo a `anon`/`authenticated`), gerenciável só via `service_role`/migration | Reduz muito a superfície — não existe (nem pode existir hoje) uma segunda conta real através da qual um atacante monte um cenário cross-tenant; o único alvo possível é a própria conta do stakeholder |
| O que um atacante ganha se só souber a senha (sem acesso à caixa de e-mail)? | Acesso de leitura/escrita completo ao ledger financeiro pessoal do stakeholder (contas, transações, categorias, cartões, faturas, metas, orçamento) — exatamente o que o gate de MFA existia para impedir nesse cenário específico | `custom_access_token_hook` original só emitia o claim após desafio consumido em `email_mfa_challenges`; SDD.md Seção 7 descreve isso explicitamente como "camada adicional de defesa em profundidade" contra este cenário | Este é o risco real e concreto introduzido pelo bypass — não é hipotético, é exatamente o cenário de ameaça para o qual o MFA por e-mail foi desenhado |
| O app move dinheiro real (pagamento, transferência, Open Finance ativo)? | Não neste MVP — `GUARDRAILS.md` `G-08` bloqueia habilitar Open Finance em produção até condições específicas (não satisfeitas); todo lançamento é entrada manual do próprio usuário | `SDD.md` linha 834 (lote de compliance mais recente): "nenhuma integração de terceiro... é tocada"; `GUARDRAILS.md` G-08 | Limita o pior caso a exposição/adulteração de dado financeiro pessoal (confidencialidade/integridade), não a fraude monetária direta — reduz a severidade do pior cenário, não o elimina |
| Fator agravante independente, já existente antes deste bypass | Política de senha fraca no projeto Supabase: `minimum_password_length = 6`, `password_requirements = ""` (sem exigência de maiúscula/número/símbolo) | `supabase/config.toml:189-192` | Aumenta o valor real que o 2º fator estava agregando — com 1º fator fraco, a chance de comprometimento por senha vazada/reutilizada é maior que o baseline; registrado como achado novo abaixo (`SEC-DEBT-011`), não bloqueante em si, mas relevante para o prazo do bypass |
| Rate limiting de tentativa de login continua ativo? | Sim, inalterado pelo bypass | `supabase/config.toml:214` — `sign_in_sign_ups = 30` por IP/5min (limite global de tentativas de login/cadastro, não específico de senha, mas mitiga força bruta trivial) | Mitigação parcial independente do MFA, não removida |
| Mudança é tecnicamente reversível com baixo atrito? | Sim | Down migration (`supabase/migrations_down/20260904090000_..._gate.down.sql`) já escrita e testável, restaura a checagem original linha a linha; flag do frontend é um único booleano (`SKIP_EMAIL_MFA`); teste correspondente marcado `it.skip` com comentário, não apagado | Reduz o custo/risco de manter o bypass por um prazo curto e monitorado — reverter não é um projeto, é um `supabase db push` + 1 linha de código |
| Achado de compliance obrigatório (LGPD) diretamente causado pelo bypass? | Não | Dado é autoprocessamento do próprio titular (mesmo enquadramento já assentado pelo CTO, `CTO-REVIEW.md` linha 307, citado em 1.9/1.15); LGPD não prescreve MFA como controle técnico obrigatório — é boa prática de segurança, não requisito legal específico deste caso | Este achado é de segurança (perda de defesa em profundidade), não de compliance obrigatório — não cai na regra de "compliance obrigatório nunca vira débito", cai na regra normal de classificação de severidade |

#### `finding-severity-classification`

- **Classificação**: achado de segurança **Média** (não Alta/Crítica) neste
  contexto específico. Justificativa: seria Alta/Crítica em um produto
  multiusuário, com dado de terceiros, ou com movimentação de dinheiro real —
  nenhuma dessas três condições se aplica hoje (cadastro travado a 1 e-mail,
  dado é só do próprio titular, sem capacidade de mover fundos reais). O que
  resta é exposição de confidencialidade/integridade do próprio dado financeiro
  do stakeholder caso a senha dele especificamente vaze/seja reutilizada/
  phishada — real, mas um cenário de ameaça estreito (1 credencial, 1 conta, 1
  titular, mesma pessoa que decidiu aceitar o risco).
- **Por que não bloqueio incondicional apesar de tocar 12 tabelas de dado
  financeiro**: a severidade de um achado de segurança não é só "quantas
  tabelas toca" — é "qual o cenário de ameaça real e qual a probabilidade/
  impacto dado o contexto". `SEC-DEBT-008` (Bloqueio 015, já fechado) foi
  bloqueio incondicional porque quebrava a própria função do produto para todo
  mundo. Este achado não quebra função nenhuma — reduz uma camada de defesa em
  profundidade documentada como tal desde a origem (`SDD.md` Seção 7: "não
  substitui, complementa").

#### Veredito

**Aceitável como risco temporário, com prazo e condições de reversão —
não bloqueio.** Decisão dentro da minha alçada técnica de segurança (achado de
severidade Média, não Alta/Crítica; nenhum compliance obrigatório em jogo;
nenhuma decisão de trade-off de negócio genuína — é uma decisão técnica de
"quanto tempo é seguro tolerar a ausência de uma camada de defesa em
profundidade", não uma decisão sobre para quem o produto serve ou que dado ele
trata). Libero o DevOps para publicar esta mudança em produção, sob as
condições abaixo.

**Condições de reversão (qualquer uma delas dispara a reversão, o que vier
primeiro)**:
1. `auth-email-mfa` voltar a funcionar (causa raiz do Bloqueio 018 resolvida) —
   reversão deve acontecer no mesmo ciclo de deploy que corrige a causa raiz,
   não depois;
2. **7 dias corridos** a partir da data de deploy desta mudança em produção,
   mesmo que a causa raiz siga não identificada — nesse ponto, se o 2º fator
   ainda não puder ser restaurado, a decisão de estender o prazo deixa de ser
   minha sozinho e precisa de nova confirmação explícita do stakeholder
   (mesmo canal desta decisão original), registrada como atualização deste
   bloqueio;
3. Qualquer indício de tentativa de login anômala/comprometimento de
   credencial no período — reversão imediata, sem esperar prazo.

**Controles compensatórios recomendados durante a janela** (baixo custo,
recomendados mas não bloqueantes para o deploy de hoje):
- Trocar/confirmar que a senha do Supabase Auth do stakeholder é forte e
  exclusiva deste serviço (mitiga o achado agravante de `minimum_password_length
  = 6` enquanto o 2º fator está fora do ar) — ação de 2 minutos, maior
  mitigação isolada disponível agora.
- Monitorar os logs de Auth do projeto Supabase (Dashboard → Auth → Logs)
  por login não reconhecido durante a janela, já que não há alerta automático
  de novo sign-in configurado.
- Não estender o escopo do bypass além do já implementado (não replicar o
  padrão `SKIP_EMAIL_MFA`/hook sempre-verdadeiro para nenhum outro controle
  enquanto este estiver ativo).

**Débito registrado**: `SEC-DEBT-011` (ver Seção 2) — cobre tanto o próprio
bypass (com prazo/condição acima) quanto o achado agravante independente da
política de senha fraca (`minimum_password_length = 6`), útil corrigir mesmo
depois do 2º fator voltar, já que reduz a dependência do produto num único
fator forte.

**Sinalização ao CTO**: registrada na Seção 5 como item de transparência
(paralelo, não pré-requisito) — não escalo como pedido de decisão de negócio,
porque não identifiquei nenhum trade-off de escopo/produto genuíno aqui (é
disponibilidade vs. defesa em profundidade num produto de usuário único já
com signup travado, decisão técnica de segurança dentro da minha alçada), mas
o CTO já tratou o gate de MFA como decisão arquitetural relevante o bastante
para formalizar em ADR (`ADR-013`) — justifica visibilidade ativa, não só
constar em log.

---

### 1.17 — `static-security-analysis` sobre o lote "Lançamentos — Hierarquia & Atalhos" (Fase 2.1) — 2026-09-04

**Escopo desta rodada** (dispara em paralelo ao QA, que está validando `QA-REF-02`
agora — não esperei o veredito dele, conforme `EXECUTION-FLOW.md`; as 5 skills de
auditoria propriamente dita seguem condicionadas ao gate de QA, mesmo padrão de
1.7/1.8/1.10/1.12/1.14): migration
`supabase/migrations/20260904120000_be_ref_02_transaction_shortcuts.sql` (`BE-REF-02`
— RPC `get_transaction_shortcuts()` + coluna `transactions.created_via_shortcut`),
teste `supabase/tests/be_ref_02_transaction_shortcuts.test.sql`;
`frontend/src/lib/api/shortcuts.ts`, `frontend/src/components/domain/ShortcutBar.tsx`,
`ShortcutChip.tsx`, e as mudanças em `TransactionsPage.tsx`/`TransactionFormModal.tsx`
(`FE-REF-02`/`FE-REF-03`). Cross-referenciado contra `SDD.md` Seção 7, `GUARDRAILS.md`
(`G-04`, `G-19`), `ADR-015` e o schema real do projeto Supabase linkado.

**Não repito aqui** a revisão de spec-compliance/qualidade já feita no fix-loop de
`BE-REF-02`/`FE-REF-02`/`FE-REF-03` (`TASK.md` Seção 3.4) — meu foco é exclusivamente
segurança, sobre o resultado já corrigido dessa rodada.

#### Confirmação dos 4 pontos de atenção pedidos pelo orquestrador

**1. Isolamento cross-user real (RLS de `transactions`/`categories`/`payment_methods`
aplicada de fato, não só o filtro `WHERE user_id = auth.uid()` do corpo da função)**:
confirmado suficiente. `get_transaction_shortcuts()` é `SQL`, `STABLE`, sem cláusula
`SECURITY DEFINER` (roda `SECURITY INVOKER`, padrão implícito do Postgres para função
sem essa cláusula — mesma convenção documentada em 1.10 para `get_month_transaction_count`/
`get_income_expense_report`). Rodando como invocador, toda leitura de
`public.transactions`/`public.categories` dentro do corpo da função passa pela RLS
real da sessão que chama, **em cima** do filtro explícito `t.user_id = auth.uid()` —
não em vez dele:
- `transactions_select_own` (`20260827170841_baseline_legacy.sql:1620`) exige
  `auth.uid() = user_id` + `app_email_mfa_verified = 'true'` — confirmado `ENABLE ROW
  LEVEL SECURITY` na tabela (`:1601`).
- `categories_select` (`:1560`) exige `(user_id = auth.uid() OR user_id IS NULL)` +
  MFA — o `JOIN public.categories c ON c.id = cc.category_id` (usado só para o
  desempate alfabético do nome) nunca pode expor categoria de outro usuário: `category_id`
  já vem exclusivamente de `transactions` do próprio `auth.uid()` (a agregação anterior
  já filtrou por isso), e por integridade referencial toda categoria referenciada por
  uma transação própria só pode ser própria ou de sistema (`user_id IS NULL`) — nunca de
  terceiro. Mesmo num cenário hipotético de dado corrompido, a RLS de `categories`
  simplesmente removeria a linha do `JOIN` (inner join, sem match → categoria cai do
  ranking), nunca vazaria dado de outro usuário.
- Não há leitura de `payment_methods` nesta função — `payment_method_id` é lido
  diretamente de `transactions` (já escopado por `auth.uid()`), não há `JOIN` contra a
  tabela de formas de pagamento, então G-19 (ownership de FK cross-tabela) não se
  aplica aqui por não haver essa referência cruzada nesta função especificamente.
- Confirmado por teste automatizado real, não só leitura de código: CASO 5 de
  `be_ref_02_transaction_shortcuts.test.sql` roda a RPC sob `v_attacker` (usuário
  sintético que **nunca existe em `auth.users`**, mesmo padrão de isolamento já usado
  em `BE-M-11`), contra uma massa de dados de `v_user` com 7 categorias na janela + 1
  via fallback — resultado: `0 linhas`, provando ao mesmo tempo AC2 (usuário sem
  histórico) e ausência de vazamento cross-user pela mesma chamada. `SET LOCAL ROLE
  authenticated` + JWT simulado (não `postgres`/owner) — o teste roda sob o mesmo
  papel restrito de produção, não sob um papel privilegiado que mascararia um gap de
  RLS real.

**2. Ausência de SQL dinâmico/injeção**: confirmado. A função é `language sql` com um
único corpo estático (CTEs + `SELECT` final), sem `EXECUTE`, `format()`,
concatenação de string ou qualquer construção de query em tempo de execução. Não há
parâmetro de entrada nenhum (`get_transaction_shortcuts()` não recebe argumento) —
não há superfície de injeção possível por falta de input do cliente para essa função
especificamente.

**3. Superfície de `GRANT`/`EXECUTE` segue o mesmo padrão das RPCs irmãs (não é uma
repetição de `SEC-DEBT-007`/Bloqueio 014)**: confirmado, é o mesmo padrão, e por
razão correta. Nenhuma das 3 migrations (`get_month_transaction_count`,
`get_income_expense_report`, `get_transaction_shortcuts`) tem `GRANT`/`REVOKE`
explícito — todas dependem do mesmo `ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN
SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon"/"authenticated"/"service_role"`
herdado do baseline (`20260827170841_baseline_legacy.sql:2117-2120`), que se aplica a
toda função nova criada pelo mesmo role de deploy. A distinção que importa (e que já
foi tracejada em 1.10, ao classificar `SEC-DEBT-007`) não é "tem `GRANT` amplo ou
não" — é **se a função foi desenhada para exposição direta via RPC**:
`get_transaction_shortcuts()` foi, desde o `ADR-015`, desenhada para ser chamada
diretamente pelo Frontend (`ADR-015` Decisão 1: "SECURITY INVOKER... calculada sob
demanda"), filtra por `auth.uid()` explicitamente no próprio corpo, e mesmo uma
chamada `anon` (sem sessão, `auth.uid()` retorna `NULL`) resulta em `t.user_id =
NULL`, que nunca é verdadeiro em SQL — retorna vazio, sem side-effect e sem
exposição, reforçado pela RLS por baixo. Isto é o oposto do padrão que gerou
`SEC-DEBT-007` (`apply_transaction_effect`, função **auxiliar interna de trigger**,
nunca desenhada para chamada direta, sem filtro de `auth.uid()` próprio, que só
"escapou" por herdar o `GRANT` sem ninguém ter revisado a superfície de exposição).
Não é uma nova instância da mesma classe de achado — é o padrão correto já
estabelecido pelas RPCs de dashboard, replicado corretamente aqui. **Não-achado.**

**4. `created_via_shortcut` gravável pelo client — falsificação de proveniência é
risco de segurança ou só um campo informativo?** Confirmado: **campo informativo,
sem implicação de segurança — não-achado, nenhuma severidade inventada.**
- `created_via_shortcut boolean NOT NULL DEFAULT false` (migration, linha 48-49) é uma
  coluna comum de `transactions`, sujeita às mesmas policies `transactions_insert_own`/
  `transactions_update_own` de qualquer outra coluna da tabela — o client só pode
  gravá-la em linha que já é sua própria (`auth.uid() = user_id`), nunca na de
  terceiro. Um usuário mal-intencionado poderia, no limite, enviar `created_via_shortcut:
  true` num `POST /transactions` manual sem ter clicado em nenhum `ShortcutChip` — mas
  isso só falsificaria **a própria** métrica de produto (M6, `RNF-12`), não altera
  saldo, não contorna nenhuma policy de RLS, não interfere em `RN-16`/resolução de
  `card_invoice_id`/`apply_transaction_effect`, e não tem relação nenhuma com a
  barreira de confirmação humana de RNF-01/RNF-08 (que continua definida
  exclusivamente sobre `source`, intocado por este ADR — confirmado por leitura do
  `ADR-015` Decisão 2 e por grep: nenhuma consulta/policy/trigger no repositório lê
  `created_via_shortcut` para decidir autorização, só o dashboard de métrica de
  produto o consumiria).
  - Comparação com o padrão real de "quebra de garantia de auditoria" que o projeto já
    trata como achado (`SEC-DEBT-007`, `apply_transaction_effect`): lá, o vetor
    permitia alterar `accounts.current_balance_cents` **sem criar `transactions`
    correspondente**, quebrando o invariante central do produto sem deixar rastro.
    Aqui, o pior caso é um bit de metadado de analytics levemente impreciso na própria
    linha que o próprio usuário já tem direito de criar do jeito que quiser (o mesmo
    usuário já pode hoje inventar `description`, `amount_cents` ou qualquer outro
    campo de um lançamento manual falso — isso é comportamento aceito por design,
    "dado é autoprocessamento do próprio titular", mesmo enquadramento já usado em
    1.16/1.9/1.15). Não há garantia de auditoria/confiança estabelecida em nenhum
    lugar do produto (`SDD.md`, `PRD-TECNICO.md`, `GUARDRAILS.md`) que dependa de
    `created_via_shortcut` ser inviolável — RNF-12 só pede "mecanismo auditável para
    medir M6", não "mecanismo à prova de adulteração pelo próprio titular do dado".

#### Achados adicionais (fora dos 4 pontos pedidos)

Nenhum. Verificações de rotina sem achado:
- `search_path` fixado (`set search_path to 'public'`) na função nova, mesma boa
  prática já usada nas RPCs irmãs.
- `frontend/src/lib/api/shortcuts.ts`: sem lógica de ranking/ordenação duplicada
  client-side (`DIR-34`), sem log de erro que vaze payload (falha tratada como "0
  atalhos" silenciosamente, ver `TransactionsPage.tsx:88-89`).
  Grep dirigido por `console.log`/`dangerouslySetInnerHTML`/`eval(`/`localStorage`/
  `sessionStorage` em `shortcuts.ts`, `ShortcutBar.tsx`, `ShortcutChip.tsx`: nenhuma
  ocorrência.
- Migration é 100% aditiva (`ADD COLUMN ... DEFAULT false NOT NULL`, `CREATE OR
  REPLACE FUNCTION`), com down migration correspondente
  (`supabase/migrations_down/20260904120000_be_ref_02_transaction_shortcuts.down.sql`),
  G-02/G-03 satisfeitos.
- `npm audit --omit=dev` reexecutado nesta rodada (`0 vulnerabilities`). O diff atual
  de `frontend/package.json`/`package-lock.json` adiciona 1 dependência nova
  (`lucide-react@^1.41.0`), mas confirmado por grep que ela **não** é consumida por
  nenhum dos 3 arquivos deste lote (`ShortcutBar.tsx`, `ShortcutChip.tsx`,
  `shortcuts.ts`) — os únicos consumidores hoje são `AppLayout.tsx` e
  `CategoriesPage.tsx`, fora do escopo `BE-REF-02`/`FE-REF-02`/`FE-REF-03`. Fica
  fora do veredito deste lote especificamente; recomendo que a rodada de
  `static-security-analysis` do lote que de fato introduz/consome `lucide-react`
  (Dashboard `FE-REF-01` ou Categorização `FE-REF-06`, a confirmar por quem tocou o
  arquivo primeiro) registre essa dependência nova explicitamente.

#### Veredito

**Veredito para o fechamento deste lote (só `static-security-analysis`,
`EXECUTION-FLOW.md` — as 4 skills restantes seguem aguardando o veredito do QA sobre
`QA-REF-02` especificamente): nenhum achado, nem novo débito.** `BE-REF-02`/
`FE-REF-02`/`FE-REF-03` não introduzem gap de autorização, exposição de dado
sensível, dependência vulnerável, nem repetem a classe de achado já registrada em
`SEC-DEBT-007`/Bloqueio 014.

**Checklist — rodada 1.17 (`static-security-analysis`, lote "Lançamentos —
Hierarquia & Atalhos", em paralelo ao QA)**:

- [x] Nenhum achado de severidade alta/crítica em aberto — nenhum achado novo
- [x] Nenhum achado de compliance obrigatório (LGPD) pendente — não avaliado
      formalmente nesta rodada (skill fora de escopo, aguarda gate de QA); nenhum
      indício levantado durante o SAST
- [x] Achado de baixa/média severidade registrado como débito com prazo — não
      aplicável, nenhum achado novo
- [x] Nenhum requisito operacional novo para o DevOps surgiu desta rodada (Seção 4
      já cobre o que é aplicável)
- [x] Achado de relevância estratégica sinalizado ao CTO — não aplicável, nenhum
      achado novo
- [x] Os 4 pontos de atenção pedidos pelo orquestrador — todos confirmados (ver
      acima): isolamento cross-user real via RLS (não só filtro de corpo de função);
      ausência de SQL dinâmico; superfície de `GRANT` consistente com o padrão
      correto das RPCs irmãs (não uma repetição de `SEC-DEBT-007`); `created_via_shortcut`
      é campo informativo sem implicação de segurança

**Veredito do lote (parcial, só `static-security-analysis`): Aprovado, sem
ressalva.** Fica condicionado, como em toda rodada anterior deste padrão, à
auditoria completa (as 4 skills restantes) assim que o QA aprovar (Aprovado/Aprovado
com ressalvas) `BE-REF-02`/`FE-REF-02`/`FE-REF-03` em `QA-REPORT.md` (`QA-REF-02`).

---

### 1.18 — Auditoria completa (veredito final de lote) — "Lançamentos — Hierarquia & Atalhos" (Fase 2.1) — 2026-09-04

**Gatilho**: `QA-REPORT.md` Seção 10 aprovou (Aprovado, sem ressalva bloqueante em
nenhuma das 3 tarefas) `BE-REF-02`/`FE-REF-02`/`FE-REF-03` — o único achado da
rodada de QA (`QA-DEBT-011`, ausência de credencial para smoke test de rede real +
limitação de replay local de migrations) é de severidade Baixa e, por natureza, de
processo/tooling, não de segurança (avaliado explicitamente abaixo,
`finding-severity-classification`). Libera a auditoria completa de DevSecOps (as 4
skills além de `static-security-analysis`, já rodada em 1.17, sobre o mesmo escopo:
`supabase/migrations/20260904120000_be_ref_02_transaction_shortcuts.sql`,
`supabase/tests/be_ref_02_transaction_shortcuts.test.sql`,
`frontend/src/lib/api/shortcuts.ts`,
`frontend/src/components/domain/ShortcutBar.tsx`/`ShortcutChip.tsx`,
`frontend/src/pages/transactions/TransactionsPage.tsx`/`TransactionFormModal.tsx`).
Esta rodada **não repete** o SAST de 1.17 — usa seus 4 achados/não-achados como
insumo (isolamento cross-user real via RLS; ausência de SQL dinâmico;
`created_via_shortcut` é campo informativo; superfície de `GRANT`/`EXECUTE`
consistente com as RPCs irmãs, não é repetição de `SEC-DEBT-007`/Bloqueio 014) e
acrescenta os 3 checks de auditoria propriamente dita mais a consolidação final.

#### `security-requirement-validation` — `SDD.md` Seção 7 + Seção A.7 (delta do Adendo A) + `GUARDRAILS.md`

Verificação direta contra o código-fonte real e contra o que o próprio Software
Architect já registrou em `SDD.md` Seção A.7 (item 3) e o CTO já confirmou em
`CTO-REVIEW.md` "Gate 2 — Pós-SDD (Pacote de Refinamento)" (`risk-and-compliance-check`
transversal) — não aceito nenhuma das duas afirmações às cegas, reverifico linha a
linha contra a migration real:

| Requisito (`SDD.md` Seção 7/A.7 / `GUARDRAILS.md`) | Verificação | Evidência | Resultado |
|---|---|---|---|
| RLS `auth.uid() = user_id` em `transactions`/`categories` (`Autorização`; `G-04`) — nenhuma tabela nova exige policy nova (`SDD.md` A.7 confirma isso explicitamente) | `transactions_select_own`, `categories_select` | `20260827170841_baseline_legacy.sql:1601-1620` (`transactions`), `:1549-1560` (`categories`) — `ENABLE ROW LEVEL SECURITY` + `auth.uid() = user_id`/`(user_id = auth.uid() OR user_id IS NULL)` na cláusula `USING` | Passa — nenhuma tabela nova criada por este lote, confirmado que nenhuma policy precisou mudar |
| `get_transaction_shortcuts()` é `SECURITY INVOKER`, filtra por `auth.uid()` no próprio corpo (`SDD.md` A.7, item 3, literal) | Leitura direta da função | `20260904120000_be_ref_02_transaction_shortcuts.sql:122-237` — sem cláusula `SECURITY DEFINER` (implícito INVOKER), `t.user_id = auth.uid()` nos 4 CTEs de agregação | Passa — reconfirma o que `SDD.md` A.7 já afirmava, por leitura de código, não por aceitar a afirmação do documento |
| Gate de MFA por JWT claim `app_email_mfa_verified` nas tabelas que a função lê | `transactions_select_own`/`categories_select` | Mesma evidência da 1ª linha — ambas incluem `(auth.jwt() ->> 'app_email_mfa_verified') = 'true'`; a função em si não precisa checar isso explicitamente porque roda `SECURITY INVOKER` (a RLS por baixo já exige) | Passa |
| `G-19` (ownership de FK entre tabelas ownable) | Não aplicável a este lote | `get_transaction_shortcuts()` não faz `JOIN` com nenhuma tabela ownable referenciada por FK de outra (o `JOIN categories` é só para nome de desempate, sobre `category_id` já escopado por `auth.uid()` na CTE anterior — ver 1.17, ponto 1); nenhuma tabela/coluna nova com FK para tabela ownable é criada | Não aplicável, sem gap |
| `created_via_shortcut` não introduz mecanismo de bypass de RNF-01/RNF-08 (confirmação humana obrigatória) | Grep dirigido por leitura/uso da coluna em policy/trigger/RPC | Nenhuma policy, trigger ou função consome `created_via_shortcut` para decidir autorização — a barreira de RNF-01/RNF-08 segue definida exclusivamente sobre `transactions.source`, intocado por este lote (`ADR-015` Decisão 2, `DIR-35`) | Passa |
| Migration aditiva + down migration (`G-02`/`G-03`) | `ALTER TABLE ... ADD COLUMN ... DEFAULT false NOT NULL`, `CREATE OR REPLACE FUNCTION` | `supabase/migrations_down/20260904120000_be_ref_02_transaction_shortcuts.down.sql` existe (`DROP COLUMN`/reversão da função) | Passa |
| Pré-condição de deploy do Bloqueio 013 (`ADR-016` Decisão 5) se aplica a este lote? | Não | `TASK.md` Seção 4.4, "Lote: Lançamentos — Hierarquia & Atalhos" confirma explicitamente que este lote **não depende** do lote "Formas de Pagamento Unificadas" (bounded context diferente, `DET-10`); Bloqueio 013 é `payment_methods.account_id`, tabela não tocada por `BE-REF-02`/`FE-REF-02`/`FE-REF-03` | Não aplicável a este lote — confirmado, sem gap de sequenciamento |

**Nenhum requisito de arquitetura de segurança da Seção 7/A.7 do `SDD.md` relevante
a este lote está implementado de forma diferente do especificado.** Confirmo por
leitura de código, não por aceitar a afirmação do Software Architect/CTO, o mesmo
ponto que ambos já haviam registrado: nenhuma RLS nova, nenhuma criptografia nova,
nenhum mecanismo de isolamento novo é necessário para este lote.

#### `compliance-validation` — LGPD

| Verificação | Evidência | Resultado |
|---|---|---|
| Dado pessoal/sensível novo | `created_via_shortcut boolean` é metadado de uso (ponto de entrada da captura manual), não dado financeiro/identificador novo; `get_transaction_shortcuts()` retorna só `(category_id, payment_method_id)` — dois UUIDs internos, sem PII | Passa — confirma `CTO-REVIEW.md` "Gate 2 — Pós-SDD", `risk-and-compliance-check` transversal ("Nenhum campo novo de dado sensível") |
| Minimização | Nenhuma coluna além da estritamente necessária ao `ADR-015` | Passa |
| Retenção/descarte (`ADR-011`) | `created_via_shortcut` segue o mesmo ciclo de vida de `transactions` (categoria "Ledger", retenção indefinida enquanto a conta estiver ativa, só descartada por exclusão de conta); `get_transaction_shortcuts()` não persiste nada, é leitura pura | Passa — nenhuma entidade nova sujeita a prazo de retenção diferente do já coberto |
| Base legal/titular | Mesmo enquadramento já assentado pelo CTO (`CTO-REVIEW.md` linha 307, reconfirmado em 1.9/1.15): dado é autoprocessamento do próprio titular, sem segundo titular envolvido | Passa |
| Direito ao esquecimento | Exclusão de conta (mecanismo formal do `ADR-011`, fora do escopo deste lote) remove `transactions` via `ON DELETE CASCADE` de `user_id`, arrastando `created_via_shortcut` junto — nenhum mecanismo novo necessário | Passa |
| Payload de API não devolve campo além do documentado em `API-CONTRACT.yaml` | `API-CONTRACT.yaml` v0.18.0, linhas 432-442 (`Transaction.created_via_shortcut`), 1684-1694 (`/rpc/get_transaction_shortcuts`) — schemas batem 1:1 com a migration real | Passa |

**Nenhum achado de compliance obrigatório (LGPD) não resolvido neste lote.**

#### `sensitive-data-exposure-check`

| Superfície | Verificação | Evidência | Resultado |
|---|---|---|---|
| Payload de API (`POST /rpc/get_transaction_shortcuts`, `POST`/`PATCH /transactions`) | Nenhum campo de segredo/token/dado de outro usuário no request ou response | `shortcuts.ts` (RPC sem parâmetro), `TransactionFormModal.tsx:150-159` (payload só com campos de domínio financeiro do próprio usuário) | Passa |
| Mensagens de erro | Falha da RPC de atalhos tratada como "0 atalhos" silenciosamente, sem `Banner`/log (`TransactionsPage.tsx:88-89`); erro de submissão do formulário usa `cause.message` de `ApiError` — mesmo padrão já auditado em lotes anteriores (1.8/1.9/1.15), sem mudança introduzida aqui | `TransactionsPage.tsx`, `TransactionFormModal.tsx:183` | Passa |
| Logs client-side | Nenhum `console.*` em `shortcuts.ts`/`ShortcutBar.tsx`/`ShortcutChip.tsx`; `TransactionsPage.tsx`/`TransactionFormModal.tsx` idem | Grep dirigido nesta rodada (`console.log`/`console.error`/`console.warn`) — zero ocorrências nos arquivos deste lote | Passa |
| Armazenamento local (`localStorage`/`sessionStorage`/IndexedDB) | Nenhum uso nos arquivos deste lote além do já existente/auditado (`enqueueTransaction`/fila offline, pré-existente, fora do escopo desta mudança) | Grep dirigido — zero ocorrências novas | Passa |
| Renderização de dado dinâmico (XSS) | `label`/`icon`/subcategoria renderizados via JSX puro em `ShortcutChip.tsx`/`TransactionsPage.tsx`, nenhum `dangerouslySetInnerHTML` | Leitura direta, já confirmado em 1.17 | Passa |
| Segredos hardcoded | Nenhum token/chave/URL de serviço nos arquivos deste lote | Grep dirigido, reconfirmado nesta rodada | Passa |
| `get_transaction_shortcuts()` — vazamento cross-tenant via agregação | Já confirmado em 1.17 e reconfirmado em `security-requirement-validation` acima (RLS real + CASO 5 do teste automatizado) | — | Passa |

**Nenhum vazamento de dado sensível via API, log, armazenamento local ou
renderização neste lote.**

#### `finding-severity-classification` — achado de QA (`QA-DEBT-011`) tem implicação de segurança?

Verificação pontual, mesmo padrão já aplicado em 1.13/1.15 para `QA-DEBT-009`/
`QA-DEBT-010`: `QA-DEBT-011` (ausência de smoke test manual real contra o Supabase
linkado + `supabase start` local falhando antes de `BE-REF-02` por limitação
pré-existente de replay de migrations, `BLOCKERS.md` Bloqueio 011) é uma lacuna de
**verificação/processo/tooling**, não um comportamento incorreto observado — não
expõe dado de outro usuário, não permite bypass de autorização, não vaza segredo, e
não é evidência de que a RLS/isolamento falhe (a suíde SQL de `BE-REF-02` já rodou
com sucesso contra o projeto real via `supabase db query --linked`, `BEGIN`/
`ROLLBACK`, confirmado em `TASK.md`/1.17 — o que faltou foi só a chamada de rede real
ponta a ponta do clique no navegador, não a validação de segurança em si).
**Confirmado: nenhuma implicação de segurança.** Permanece corretamente classificado
como débito de processo/tooling sob responsabilidade compartilhada (Backend/DevOps
para o item 1; ambiente do projeto como um todo para o item 2), não duplicado neste
documento como achado de segurança.

Nenhum achado novo de qualquer severidade nesta rodada.

#### `security-report-drafting` — veredito consolidado do lote

Consolidando o achado da análise estática (1.17 — nenhum achado novo, 4 pontos de
atenção do orquestrador todos confirmados sem gap) com os 3 checks acima (nenhum
achado novo de severidade alta/crítica, nenhum achado de compliance obrigatório,
nenhum vazamento de dado sensível):

- **Achados que bloqueiam o deploy deste lote hoje: nenhum.**
- **Achados de severidade Alta/Crítica em aberto tocando este lote: nenhum.**
- **Compliance obrigatório (LGPD)**: nenhum achado — nada fica pendente como
  débito, não há gap a resolver.
- **Exposição de dado sensível**: nenhum achado novo.
- **Achado de QA (`QA-DEBT-011`)**: sem implicação de segurança, confirmado acima.
- **Dependência nova (`lucide-react@^1.41.0`)**: já registrada em 1.17 como fora do
  escopo deste lote especificamente (não consumida por nenhum dos 3 arquivos
  auditados) — não repetido aqui, sem impacto no veredito deste lote.

**Veredito do lote: Aprovado, sem débito novo.** As 3 tarefas (`BE-REF-02`,
`FE-REF-02`, `FE-REF-03`) estão liberadas para o fechamento formal do lote pelo Tech
Lead (`TASK.md` Seção 7) do ponto de vista de segurança — nenhum item em aberto
específico deste lote. Nenhuma pré-condição de deploy pendente (o gate do Bloqueio
013/`ADR-016` Decisão 5 pertence ao lote irmão "Formas de Pagamento Unificadas",
confirmado não aplicável aqui).

**Sinalização ao CTO (paralela, não pré-requisito)**: nenhuma nova — este lote não
gera achado de relevância estratégica. As sinalizações já registradas na Seção 5
permanecem válidas e não são reabertas por esta rodada.

---

### 1.19 — `static-security-analysis` (SAST + dependências) — "Categorização — Grade de Cards" (`FE-REF-06`, Fase 2.1) — em paralelo ao QA — 2026-09-04

**Escopo desta rodada**: `frontend/src/components/domain/CategoryCard.tsx` (novo) e
`frontend/src/pages/categories/CategoriesPage.tsx` (reescrito), mais os respectivos
`CategoryCard.test.tsx`/`CategoriesPage.test.tsx`. Mudança puramente de apresentação
— nenhum endpoint/RPC novo (`GET /categories` e `get_monthly_category_summary()`
já existentes, reaproveitados sem alteração de contrato); confirmado por leitura de
`TASK.md` Seção 3.4 (nota de evidência de `FE-REF-06`) e diff real. Rodada só de
`static-security-analysis`, em paralelo ao QA (`QA-REF-04`) — não espera o veredito
dele; as 4 skills de auditoria completa (`security-requirement-validation`,
`compliance-validation`, `sensitive-data-exposure-check`,
`finding-severity-classification`) ficam para quando o QA aprovar.

| Ponto verificado | Verificação | Evidência | Resultado |
|---|---|---|---|
| XSS via nome de categoria / interpolação insegura | Grep dirigido por `dangerouslySetInnerHTML`/`innerHTML`/`eval(`/`document.write` nos 2 arquivos + no componente base `Card` que `CategoryCard` envolve | Zero ocorrências; `name`/`icon`/total/contagem são todos filhos de JSX puro (`{name}`, `{formatCentsToBRL(...)}`, `{subcategoryCount} {subcategoryLabel}`) — React escapa por padrão | Passa |
| Dependência nova em `package.json` | `git diff frontend/package.json` | `lucide-react@^1.41.0` é a única dependência nova no working tree, mas **não é consumida por nenhum dos 2 arquivos deste lote** (`grep` confirma uso só em `frontend/src/layout/AppLayout.tsx`, fora do escopo de `FE-REF-06`) — já registrada como tal em 1.17/1.18 (lote "Lançamentos"), não duplico o achado aqui. `npm audit --omit=dev` → **0 vulnerabilidades** | Passa — nenhuma dependência nova introduzida por este lote especificamente |
| Informação sensível de outro usuário via `aria-label`/`aria-describedby`/props | Leitura direta de `CategoryCard.tsx` (`aria-label`, `aria-describedby` apontam só para `name`/total gasto/contagem de subcategorias, todos vindos de `GET /categories`/`get_monthly_category_summary()` já escopados por RLS `auth.uid() = user_id` — nenhuma categoria de outro usuário chega ao componente) | `CategoryCard.tsx:45-46,63,66`; RLS de `categories`/`get_monthly_category_summary()` já auditada em rodadas anteriores (1.9, 1.11, 1.12) | Passa |

**Achado novo (baixa severidade, não bloqueante) — `SEC-DEBT-012`**: `category.color`
é renderizado pela primeira vez no DOM nesta rodada, como valor de CSS inline
(`style={color ? { backgroundColor: color } : undefined}`, `CategoryCard.tsx:54`) —
a versão anterior da tela (lista em árvore) nunca usava esse campo. A coluna
`categories.color` é `text` livre no schema, sem `CHECK` de formato (confirmado em
`supabase/migrations/20260827170841_baseline_legacy.sql`), e hoje **não existe
nenhum campo de UI para o usuário definir/alterar essa cor** (o modal de
criar/editar categoria em `CategoriesPage.tsx` só expõe Nome/Tipo/Categoria pai) —
ou seja, exploitabilidade prática hoje é próxima de zero (só categorias
semeadas pelo sistema têm `color` preenchido, presumivelmente valores confiáveis).
Ainda assim, é um gap real de defesa em profundidade: o `style` do React não
executa JS a partir do valor (não é um vetor de XSS), mas aceita qualquer string
como valor de propriedade CSS sem validação — se uma futura funcionalidade
(picker de cor para categoria, ou escrita direta via PostgREST fora da UI atual)
gravar um valor não-hexadecimal, ele chega ao DOM sem sanitização. Impacto,
mesmo nesse cenário futuro, fica limitado ao próprio usuário (RLS impede que a
`color` de outro usuário seja lida) — nunca cross-tenant.
- **Severidade**: Baixa.
- **Veredito**: Não bloqueia. Débito registrado — **SEC-DEBT-012**.
- **Prazo/condição**: antes de qualquer funcionalidade futura que exponha um campo
  de UI para o usuário definir `categories.color`/`accounts.color` livremente,
  adicionar validação de formato (regex `^#[0-9a-fA-F]{6}$` no client e/ou `CHECK`
  constraint no banco). Sem urgência hoje — nenhuma via de escrita real expõe o
  campo a valor arbitrário do usuário.
- **Escalar para**: `frontend`/`backend` (correção futura, condicional — não é
  tarefa deste lote).

**Nenhum outro achado.** Confirmo os 3 pontos de atenção pedidos para esta rodada:
XSS — sem gap; dependência nova — fora do escopo deste lote (já registrada em
1.17/1.18); dado sensível via `aria-*`/props — sem gap (só dado do próprio
usuário, já escopado por RLS).

**Checklist — rodada 1.19 (`static-security-analysis`, lote "Categorização — Grade
de Cards", em paralelo ao QA)**:

- [x] Nenhum achado de severidade alta/crítica em aberto — nenhum achado desta
      severidade
- [x] Nenhum achado de compliance obrigatório (LGPD) pendente — não avaliado
      formalmente nesta rodada (skill fora de escopo, aguarda gate de QA); nenhum
      indício levantado durante o SAST
- [x] Achado de baixa/média severidade registrado como débito com prazo —
      `SEC-DEBT-012` (ver acima)
- [x] Nenhum requisito operacional novo para o DevOps surgiu desta rodada
- [x] Achado de relevância estratégica sinalizado ao CTO — não aplicável,
      `SEC-DEBT-012` é achado técnico de baixa severidade e exploitabilidade
      próxima de zero, sem decisão de negócio envolvida

**Veredito do lote (parcial, só `static-security-analysis`): Aprovado com
débito** (`SEC-DEBT-012`, baixa severidade, não bloqueante). Fica condicionado,
como em toda rodada anterior deste padrão, à auditoria completa (as 4 skills
restantes) assim que o QA aprovar (Aprovado/Aprovado com ressalvas) `FE-REF-06`
em `QA-REPORT.md` (`QA-REF-04`).

---

### 1.20 — Auditoria completa (veredito final de lote) — "Categorização — Grade de Cards" (`FE-REF-06`, Fase 2.1) — 2026-09-04

**Gatilho**: `QA-REPORT.md` Seção 11 aprovou (Aprovado, sem ressalva) `FE-REF-06`/
`QA-REF-04` — nenhum bug de nenhuma severidade, nenhum débito técnico novo de QA.
Libera a auditoria completa de DevSecOps (as 4 skills além de
`static-security-analysis`, já rodada em 1.19, sobre o mesmo escopo:
`frontend/src/components/domain/CategoryCard.tsx`,
`frontend/src/pages/categories/CategoriesPage.tsx`, testes correspondentes). Esta
rodada **não repete** o SAST de 1.19 — usa seu resultado como insumo (sem XSS;
`lucide-react` fora do escopo deste lote; sem dado sensível via `aria-*`/props;
achado `SEC-DEBT-012` já registrado) e acrescenta os 3 checks de auditoria
propriamente dita mais a consolidação final.

#### `security-requirement-validation` — `SDD.md` Seção 7 + `GUARDRAILS.md`

Este lote não contém nenhuma migration — reaproveita 100% do que já está em
produção (`categories`, `get_monthly_category_summary()`). Reverifico, por leitura
direta do schema real (não por aceitar o que rodadas anteriores já haviam
concluído), que nada relevante mudou:

| Requisito (`SDD.md` Seção 7 / `GUARDRAILS.md`) | Verificação | Evidência | Resultado |
|---|---|---|---|
| RLS `auth.uid() = user_id` (categoria própria) / `user_id IS NULL` (categoria de sistema) em `categories` (`Autorização`; `G-04`) | `categories_select`/`categories_insert_own`/`categories_update_own` | `supabase/migrations/20260827170841_baseline_legacy.sql:1556-1568` — todas as 3 policies exigem `user_id = auth.uid()` (ou `user_id IS NULL` só em `SELECT`, categoria de sistema) | Passa — nenhuma tabela/policy nova, nenhuma mudança |
| Gate de MFA por JWT claim `app_email_mfa_verified` em `categories` | Mesma evidência acima | As 3 policies incluem `(auth.jwt() ->> 'app_email_mfa_verified') = 'true'` | Passa |
| `get_monthly_category_summary()` é `SECURITY INVOKER`, filtra por `auth.uid()` no próprio corpo (mesmo padrão já exigido para `get_transaction_shortcuts()` em 1.18) | Leitura direta da função | `20260827170841_baseline_legacy.sql:622-644` — `LANGUAGE "sql" STABLE` sem `SECURITY DEFINER` (INVOKER implícito), `where t.user_id = auth.uid()` na CTE principal | Passa |
| Trigger `categories_before_delete_block_linked` (RN-09) `SECURITY DEFINER` com `search_path` fixo (`G-19`) | Leitura direta da função (reconfirmação, não nova para este lote) | `categories_block_delete_when_linked()` — `SECURITY DEFINER`, correção de `BE-M-13`/Bloqueio 010 já auditada em rodadas anteriores; comportamento inalterado, `FE-REF-06` só reorganiza onde o botão "Excluir categoria" aparece na UI, não toca o trigger | Passa — sem regressão |
| `G-19` (ownership de FK entre tabelas ownable) | Não aplicável | Nenhuma tabela/coluna nova criada por este lote — puramente front-end | Não aplicável |
| Nenhuma migration nova (`G-02`/`G-03`) | `git diff --stat` do lote | Confirmado: só `.tsx`/`.test.tsx` modificados, nenhum arquivo em `supabase/migrations/` | Passa |

**Nenhum requisito de arquitetura de segurança da Seção 7 do `SDD.md` relevante a
este lote está implementado de forma diferente do especificado.** Confirmo, por
leitura de código e não por aceitar a nota de evidência do Frontend às cegas, que
nenhuma RLS nova, criptografia nova ou mecanismo de isolamento novo é necessário —
o lote reaproveita integralmente o que já estava auditado.

#### `compliance-validation` — LGPD

| Verificação | Evidência | Resultado |
|---|---|---|
| Dado pessoal/sensível novo | Nenhum campo novo — `CategoryCard` só exibe `name`/`icon`/`color`/total gasto/contagem de subcategorias, todos já existentes; nenhuma coluna nova, nenhum dado de terceiro exposto | Passa |
| Minimização | Nenhum dado além do estritamente necessário à exibição (mesmo conjunto de campos que a lista em árvore anterior já expunha, exceto `color`, que é decorativo — ver `SEC-DEBT-012`) | Passa |
| Retenção/descarte (`ADR-011`) | Nenhuma entidade nova; `categories` segue o ciclo de vida já auditado (retenção enquanto a conta estiver ativa) | Passa |
| Base legal/titular | Mesmo enquadramento já assentado em rodadas anteriores (autoprocessamento do próprio titular) | Passa |
| Direito ao esquecimento | Sem mudança — mecanismo formal de exclusão de conta (`ADR-011`) intocado por este lote | Passa |
| Payload de API não devolve campo além do documentado em `API-CONTRACT.yaml` | `API-CONTRACT.yaml` linhas 542-548 (`GET /categories` → `Category`), 1162-1185 (`POST /rpc/get_monthly_category_summary` → `category_id`/`category_name`/`kind`/`total_cents`) — schemas batem 1:1 com o que `CategoriesPage.tsx` consome (`types.ts`, `MonthlyCategorySummaryItem`) | Passa |

**Nenhum achado de compliance obrigatório (LGPD) não resolvido neste lote.**

#### `sensitive-data-exposure-check`

| Superfície | Verificação | Evidência | Resultado |
|---|---|---|---|
| Payload de API (`GET /categories`, `POST /rpc/get_monthly_category_summary`) | Nenhum campo de segredo/token/dado de outro usuário no request ou response | Confirmado contra `API-CONTRACT.yaml` acima; ambas as chamadas são as mesmas já existentes, sem alteração de contrato | Passa |
| Mensagens de erro | `loadError`/`saveError` usam `cause.message` de `ApiError` ou mensagem genérica fixa ("Não foi possível carregar as categorias.", "Não foi possível salvar a categoria — verifique a hierarquia (RN-09).") — mesmo padrão já auditado em lotes anteriores, sem mudança introduzida aqui | `CategoriesPage.tsx:57,141` | Passa |
| Logs client-side | Nenhum `console.*` em `CategoryCard.tsx`/`CategoriesPage.tsx`/`lib/api/categories.ts`/`lib/api/dashboard.ts` | Grep dirigido (`console.log`/`console.error`/`console.warn`) — zero ocorrências | Passa |
| Armazenamento local (`localStorage`/`sessionStorage`/IndexedDB) | Nenhum uso nos 4 arquivos deste lote | Grep dirigido — zero ocorrências | Passa |
| Renderização de dado dinâmico (XSS) | Já confirmado em 1.19 — `name`/`icon`/total/contagem via JSX puro, sem `dangerouslySetInnerHTML` | — | Passa |
| Segredos hardcoded | Nenhum token/chave/URL de serviço nos arquivos deste lote | Grep dirigido, reconfirmado nesta rodada | Passa |
| `category.color` como valor de CSS inline sem validação de formato | Já confirmado em 1.19 (`SEC-DEBT-012`) — sem exploitabilidade prática hoje (nenhuma UI expõe campo para defini-lo), impacto sempre self-scoped por RLS mesmo num cenário futuro | — | Débito já registrado, não repetido |

**Nenhum vazamento de dado sensível via API, log, armazenamento local ou
renderização neste lote**, além do já registrado (`SEC-DEBT-012`, baixa
severidade, sem exploitabilidade prática).

#### `finding-severity-classification`

`QA-REPORT.md` Seção 11.4/11.6 não registrou nenhum bug de nenhuma severidade
nesta rodada — não há achado de QA para reclassificar quanto à implicação de
segurança (diferente de `QA-DEBT-009`/`010`/`011` em rodadas anteriores). Reavalio
`SEC-DEBT-012` (único achado deste lote, já classificado em 1.19): mantenho
**Baixa** — não há fato novo que eleve a severidade (nenhuma UI expõe o campo
`color` a valor arbitrário do usuário hoje; RLS impede vazamento cross-tenant
mesmo num cenário futuro; `style` do React não executa código a partir do valor).
**Confirmado: nenhum achado de severidade alta/crítica, nesta rodada nem
herdado.**

#### `security-report-drafting` — veredito consolidado do lote

Consolidando o achado da análise estática (1.19 — `SEC-DEBT-012`, baixa
severidade, único achado) com os 3 checks acima (nenhum achado novo de
severidade alta/crítica, nenhum achado de compliance obrigatório, nenhum
vazamento de dado sensível além do já registrado):

- **Achados que bloqueiam o deploy deste lote hoje: nenhum.**
- **Achados de severidade Alta/Crítica em aberto tocando este lote: nenhum.**
- **Compliance obrigatório (LGPD)**: nenhum achado — nada fica pendente como
  débito, não há gap a resolver.
- **Exposição de dado sensível**: nenhum achado novo além de `SEC-DEBT-012`
  (já registrado, baixa severidade, sem exploitabilidade prática hoje).
- **Requisitos de segurança operacional para o DevOps**: nenhum novo — este
  lote não introduz Edge Function, secret, configuração de rede/firewall nem
  storage novo; Seção 4 já cobre o que é aplicável ao projeto.

**Veredito do lote: Aprovado com débito** (`SEC-DEBT-012`, baixa severidade,
não bloqueante, sem prazo urgente — condicionado a uma funcionalidade futura
ainda não planejada). `FE-REF-06`/`QA-REF-04` estão liberadas para o fechamento
formal do lote pelo Tech Lead (`TASK.md` Seção 7) do ponto de vista de
segurança. Nenhuma pré-condição de deploy pendente.

**Sinalização ao CTO (paralela, não pré-requisito)**: nenhuma nova — este lote
não gera achado de relevância estratégica (severidade Baixa, sem decisão de
negócio envolvida). As sinalizações já registradas na Seção 5 permanecem
válidas e não são reabertas por esta rodada.

**Checklist — Critérios de Pronto desta rodada**:

- [x] Nenhum achado de severidade alta/crítica em aberto
- [x] Todo achado de compliance obrigatório (LGPD) resolvido — nenhum achado
      de compliance nesta rodada
- [x] Achado de baixa/média severidade registrado como débito com prazo —
      `SEC-DEBT-012` (Seção 2)
- [x] Requisitos de segurança operacional para o DevOps definidos — nenhum
      novo exigido por este lote, Seção 4 já cobre o projeto
- [x] Achado de relevância estratégica sinalizado ao CTO — não aplicável,
      nenhum achado desta natureza

---

### 1.21 — `static-security-analysis` (SAST + dependências) — "Orçamento — Grade de Cards" (`FE-REF-07`, Fase 2.1) — em paralelo ao QA — 2026-09-04

**Escopo desta rodada**: `frontend/src/components/domain/BudgetCard.tsx` (novo, +
`BudgetCard.test.tsx`), `frontend/src/pages/budget/BudgetPage.tsx` (reescrito, +
`BudgetPage.test.tsx`), `frontend/src/components/domain/ProgressBar.tsx` (mudança
pequena aditiva — prop `detailTextClassName`, + `ProgressBar.test.tsx`),
`frontend/src/index.css` (novo token `--color-danger-soft`). Mudança puramente de
apresentação — nenhum endpoint/RPC novo (`getBudgetStatus()`/`listBudgets()`/
`listCategories()` já existentes, reaproveitados sem alteração de contrato);
confirmado por leitura de `TASK.md` Seção 3.4 (nota de evidência de `FE-REF-07`,
incluindo o fix-loop) e diff real. Passou por 1 rodada de fix-loop corrigindo um
bug funcional (dependência frágil de `budgets.find` removida) e um problema de
contraste WCAG — ambos já corrigidos antes desta auditoria, revisados abaixo do
ponto de vista de segurança (não repito a validação funcional/WCAG, já feita pelo
próprio Frontend e será revisada pelo QA em `QA-REF-05`). Rodada só de
`static-security-analysis`, em paralelo ao QA — não espera o veredito dele; as 4
skills de auditoria completa (`security-requirement-validation`,
`compliance-validation`, `sensitive-data-exposure-check`,
`finding-severity-classification`) ficam para quando o QA aprovar.

| Ponto verificado | Verificação | Evidência | Resultado |
|---|---|---|---|
| XSS via nome de categoria não sanitizado | Grep dirigido por `dangerouslySetInnerHTML`/`innerHTML`/`eval(`/`document.write` nos 4 arquivos de produção do lote (`BudgetCard.tsx`, `BudgetPage.tsx`, `ProgressBar.tsx`, mais o `Card` base que `BudgetCard` envolve, já auditado em rodadas anteriores) | Zero ocorrências; `categoryName`/`label` chegam ao DOM só como filho de JSX puro (`{categoryName}`, `{label}`) ou como valor de atributo (`aria-label`, `title`) — React escapa ambos por padrão | Passa |
| Informação sensível de outro usuário via props/`aria-*` | Leitura direta de `BudgetCard.tsx` (`aria-label="Editar orçamento de {categoryName}"`, `aria-describedby` aponta só para o bloco visível: categoria + `ProgressBar` com `spentCents`/`limitCents`/`pctSpent`) — todos os dados vêm de `getBudgetStatus()` (`get_budget_status`, RPC já auditada em rodadas anteriores como escopada por RLS `auth.uid() = user_id`, mesmo padrão de `categories`/`get_monthly_category_summary()` confirmado em 1.9/1.11/1.12/1.19) | `BudgetCard.tsx:79-80,84-89`; `frontend/src/lib/api/budget.ts:34-36` (`getBudgetStatus`); RLS de `budget` confirmada em `supabase/migrations/20260902100000_be_m01_budget_and_rn08_rn09_guards.sql:39-54` (`auth.uid() = user_id` nas 4 policies select/insert/update/delete) | Passa |
| Correção do bug de `budgets.find` não introduziu caminho de edição/exclusão cross-user | Leitura de `BudgetPage.tsx` (`openEditForm`/`confirmDelete`/`requestDeleteFromForm`) confirmando que `editingBudget`/`deleteTarget` são 100% dirigidos por `BudgetStatusItem` (já escopado por RLS via `getBudgetStatus()`), e que `updateBudget(id, ...)`/`deleteBudget(id)` (`frontend/src/lib/api/budget.ts:24-31`) enviam só o `budget_id` — a barreira de autorização real não é o client filtrar por usuário, é a policy `budget_update_own`/`budget_delete_own` (`USING (auth.uid() = user_id ...)`) recusar a linha no servidor caso um `budget_id` de outro usuário chegasse ali (nenhuma via de UI hoje permite isso, mas mesmo que chegasse, a RLS barra) | `BudgetPage.tsx:96-105,133-151`; `frontend/src/lib/api/budget.ts:24-31`; RLS confirmada acima | Passa — a correção do fix-loop trocou a fonte do dado (`budgets.find` → `status` direto), não o mecanismo de autorização, que continua sendo a RLS do backend, não confiança no client |
| Dependência nova em `package.json` | `git diff frontend/package.json` | `lucide-react@^1.41.0` é a única dependência nova no working tree, mas **não é consumida por nenhum dos 4 arquivos deste lote** (nenhum import em `BudgetCard.tsx`/`BudgetPage.tsx`/`ProgressBar.tsx`) — já registrada e endereçada (fora do escopo, uso real em `AppLayout.tsx`) em 1.17/1.18/1.19, não duplico o achado aqui. `npm audit --omit=dev` → **0 vulnerabilidades** | Passa — nenhuma dependência nova introduzida por este lote especificamente |
| Novo token CSS (`--color-danger-soft`) | Leitura de `frontend/src/index.css:24-30` | Valor hexadecimal estático (`#f8e8e8`), sem interpolação de dado de usuário, sem `url()`/`expression()` — superfície de ataque nula | Passa |

**Nenhum achado novo nesta rodada.** Confirmo os 3 pontos de atenção pedidos:
XSS via nome de categoria — sem gap (React escapa por padrão, sem
`dangerouslySetInnerHTML` em nenhum dos 4 arquivos); informação sensível de outro
usuário via props/`aria-*` — sem gap (dado sempre pré-escopado por RLS antes de
chegar ao componente); correção do bug de `budgets.find` — sem gap (nenhum novo
caminho de edição/exclusão cross-user; RLS do backend continua sendo a barreira
real de autorização, `updateBudget`/`deleteBudget` seguem operando só sobre
`budget_id`, sem tentativa nem necessidade de o client provar ownership).

**Checklist — rodada 1.21 (`static-security-analysis`, lote "Orçamento — Grade de
Cards", em paralelo ao QA)**:

- [x] Nenhum achado de severidade alta/crítica em aberto — nenhum achado nesta
      rodada
- [x] Nenhum achado de compliance obrigatório (LGPD) pendente — não avaliado
      formalmente nesta rodada (skill fora de escopo, aguarda gate de QA);
      nenhum indício levantado durante o SAST
- [x] Achado de baixa/média severidade registrado como débito com prazo — não
      aplicável, nenhum achado nesta rodada
- [x] Nenhum requisito operacional novo para o DevOps surgiu desta rodada
- [x] Achado de relevância estratégica sinalizado ao CTO — não aplicável,
      nenhum achado desta natureza

**Veredito do lote (parcial, só `static-security-analysis`): Aprovado, sem
débito.** Fica condicionado, como em toda rodada anterior deste padrão, à
auditoria completa (as 4 skills restantes) assim que o QA aprovar (Aprovado/
Aprovado com ressalvas) `FE-REF-07` em `QA-REPORT.md` (`QA-REF-05`).

---

### 1.22 — Auditoria completa (veredito final de lote) — "Orçamento — Grade de Cards" (`FE-REF-07`, Fase 2.1) — 2026-09-04

**Gatilho**: `QA-REPORT.md` Seção 12.6 aprovou (Aprovado, sem ressalva) `FE-REF-07`/
`QA-REF-05` — nenhum bug de severidade alta/crítica, 1 débito registrado
(`QA-DEBT-012`, contraste WCAG do texto de percentual do `ProgressBar` no estado
`warning`, problema de token de design pré-existente ao app inteiro, não
introduzido por `FE-REF-07`, sem componente de segurança — carregado aqui só como
contexto, não reclassificado). Libera a auditoria completa de DevSecOps (as 4
skills além de `static-security-analysis`, já rodada em 1.21, sobre o mesmo
escopo: `frontend/src/components/domain/BudgetCard.tsx`,
`frontend/src/pages/budget/BudgetPage.tsx`,
`frontend/src/components/domain/ProgressBar.tsx`, `frontend/src/index.css`, testes
correspondentes). Esta rodada **não repete** o SAST de 1.21 — usa seu resultado
como insumo (sem XSS; sem dado sensível via `aria-*`/props; correção do bug de
`budgets.find` confirmada sem abrir caminho cross-user; `lucide-react` fora do
escopo deste lote; nenhum achado de segurança) e acrescenta os 3 checks de
auditoria propriamente dita mais a consolidação final.

#### `security-requirement-validation` — `SDD.md` Seção 7 + `GUARDRAILS.md`

Este lote não contém nenhuma migration — reaproveita 100% do que já está em
produção (`budget`, `get_budget_status()`, `categories`). Reverifico, por leitura
direta do schema real (não por aceitar a nota de evidência do Frontend/QA às
cegas), que nada relevante mudou:

| Requisito (`SDD.md` Seção 7 / `GUARDRAILS.md`) | Verificação | Evidência | Resultado |
|---|---|---|---|
| RLS `auth.uid() = user_id` nas 4 policies de `budget` (`Autorização`; `G-04`) | `budget_select_own`/`budget_insert_own`/`budget_update_own`/`budget_delete_own` | `supabase/migrations/20260902100000_be_m01_budget_and_rn08_rn09_guards.sql:39-54` — as 4 policies exigem `auth.uid() = user_id` | Passa — nenhuma tabela/policy nova, nenhuma mudança nesta rodada |
| Gate de MFA por JWT claim `app_email_mfa_verified` em `budget` | Mesma evidência acima | As 4 policies incluem `(auth.jwt() ->> 'app_email_mfa_verified') = 'true'` | Passa |
| `get_budget_status()` filtra por `auth.uid()` no próprio corpo, resolve mês corrente no servidor (não confia em fuso do client) | Leitura direta da função (`BE-M-08`) + rastreio já feito por QA na Seção 12.2 | `supabase/migrations/20260902100300_be_m08_budget_status.sql` — `STABLE`, filtra por usuário autenticado; `date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))` | Passa |
| `G-19` (ownership de FK `budget.category_id` → `categories`) — já corrigido em `BE-M-13`, não tocado por este lote | Leitura direta de `budget_insert_own`/`budget_update_own` | `supabase/migrations/20260903100000_be_m13_fk_ownership_and_security_definer_guards.sql:34-58` — `EXISTS (SELECT 1 FROM categories c WHERE c.id = category_id AND (c.user_id = auth.uid() OR c.user_id IS NULL))` nas 2 policies; `BudgetPage.tsx` sequer envia `category_id` em `updateBudget` (campo desabilitado na edição), então a superfície de ataque desta FK nem é exercitada pelo fluxo de edição do card | Passa |
| Correção do fix-loop (Achado 1, `budgets.find` → `BudgetStatusItem`) não abriu caminho de edição/exclusão cross-user | Já auditado em 1.21 (ponto dedicado), reconfirmado aqui à luz da aprovação de QA — `updateBudget(editingBudget.budget_id, ...)`/`deleteBudget(deleteTarget.budget_id)` seguem operando só sobre `id` de `budget`, com a RLS acima como única barreira real | `BudgetPage.tsx:96-105,133-151`; `frontend/src/lib/api/budget.ts:24-31` | Passa |
| Nenhuma migration nova (`G-01`/`G-02`/`G-03`) | `git diff --stat` do lote | Confirmado: só `.tsx`/`.test.tsx`/`index.css` modificados, nenhum arquivo em `supabase/migrations/` | Passa |
| `G-05` a `G-18` (retenção Fase 3, vendor externo, Storage, backup, autenticação/PIN, HA/cache) | Leitura do escopo do lote | Nenhum desses guardrails toca renderização de card de orçamento — nenhum código de automação Fase 3, integração externa, Storage, backup, autenticação ou infraestrutura foi tocado | Não aplicável |

**Nenhum requisito de arquitetura de segurança da Seção 7 do `SDD.md` relevante a
este lote está implementado de forma diferente do especificado.** O card de
orçamento é puramente derivado de uma RPC já auditada como corretamente escopada
por RLS; a correção funcional do fix-loop reforçou (não enfraqueceu) essa
dependência, eliminando um cruzamento client-side que não tinha relação com
autorização real.

#### `compliance-validation` — LGPD

| Verificação | Evidência | Resultado |
|---|---|---|
| Dado pessoal/sensível novo | Nenhum campo novo — `BudgetCard` exibe `categoryName`/`spentCents`/`limitCents`/`pctSpent`/`alertLevel`, todos já existentes em `BudgetStatusItem` (`get_budget_status`, `BE-M-08`); nenhuma coluna nova, nenhum dado de terceiro | Passa |
| Minimização | Nenhum dado além do estritamente necessário à exibição (mesmo conjunto de campos que a lista/`ProgressBar` solto anterior já expunha) | Passa |
| Retenção/descarte (`ADR-011`) | Nenhuma entidade nova; `budget` é dado de planejamento (`SDD.md` Seção 7, tabela de retenção — "Ledger... e demais entidades de planejamento", retenção indefinida enquanto a conta estiver ativa, descarte só por exclusão de conta) — ciclo de vida já auditado, inalterado por este lote | Passa |
| Base legal/titular | Mesmo enquadramento já assentado em rodadas anteriores (autoprocessamento do próprio titular, produto de usuário único) | Passa |
| Direito ao esquecimento | Sem mudança — mecanismo formal de exclusão de conta (`ADR-011`) intocado por este lote; exclusão pontual de orçamento (`deleteBudget`) preserva o mesmo fluxo/`ConfirmationDialog` já existente, só reposicionado dentro de `S-BUD-02` | Passa |
| Payload de API não devolve campo além do documentado em `API-CONTRACT.yaml` | `API-CONTRACT.yaml:343-354` (`Budget`), `1205-1237` (`POST /rpc/get_budget_status` → `budget_id`/`category_id`/`category_name`/`month`/`limit_cents`/`spent_cents`/`alert_threshold_pct`/`pct_spent`/`alert_level`) — schema bate 1:1 com o que `BudgetCard.tsx`/`BudgetPage.tsx` consomem, nenhum campo extra renderizado nem enviado | Passa |

**Nenhum achado de compliance obrigatório (LGPD) não resolvido neste lote.**

#### `sensitive-data-exposure-check`

| Superfície | Verificação | Evidência | Resultado |
|---|---|---|---|
| Payload de API (`POST /rpc/get_budget_status`, `GET/POST/PATCH/DELETE /budget`) | Nenhum campo de segredo/token/dado de outro usuário no request ou response | Confirmado contra `API-CONTRACT.yaml` acima; as 6 chamadas usadas por `BudgetPage.tsx` são as mesmas já existentes, sem alteração de contrato (reconfirmado por `git diff HEAD -- .md/API-CONTRACT.yaml`, únicas mudanças da sessão são de `BE-REF-02`, lote diferente) | Passa |
| Mensagens de erro | `loadError`/`saveError` usam `cause.message` de `ApiError` ou mensagem genérica fixa ("Não foi possível carregar os orçamentos.", "Não foi possível salvar o orçamento.", "Não foi possível remover.") — mesmo padrão já auditado em lotes anteriores, sem mudança introduzida aqui | `BudgetPage.tsx:75,126,148` | Passa |
| Logs client-side | Nenhum `console.*` em `BudgetCard.tsx`/`BudgetPage.tsx`/`ProgressBar.tsx`/`lib/api/budget.ts` | Grep dirigido (`console.log`/`console.error`/`console.warn`) — zero ocorrências (já confirmado em 1.21, reconfirmado aqui) | Passa |
| Armazenamento local (`localStorage`/`sessionStorage`/IndexedDB) | Nenhum uso nos 4 arquivos deste lote | Grep dirigido — zero ocorrências | Passa |
| Renderização de dado dinâmico (XSS) | Já confirmado em 1.21 — `categoryName`/`label`/`detailText` via JSX puro, sem `dangerouslySetInnerHTML` | — | Passa |
| Segredos hardcoded | Nenhum token/chave/URL de serviço nos arquivos deste lote; `--color-danger-soft` é hexadecimal estático | Grep dirigido, reconfirmado nesta rodada | Passa |
| `aria-label`/`aria-describedby` do card não vaza dado de outro usuário | `BudgetCard.tsx:79-89` — só reflete `categoryName`/valores monetários já escopados por RLS via `getBudgetStatus()` | Já confirmado em 1.21 | Passa |

**Nenhum vazamento de dado sensível via API, log, armazenamento local ou
renderização neste lote.**

#### `finding-severity-classification`

`QA-REPORT.md` Seção 12.4/12.6 registrou 1 achado nesta rodada — `QA-DEBT-012`
(contraste WCAG do texto de percentual do `ProgressBar` no estado `warning`,
`text-warning` sobre `warning-soft` ≈2.86:1, FAIL). Avalio explicitamente a
implicação de segurança deste achado, como exigido pelo meu escopo (toda vez que
o QA registra um achado sobre um componente deste lote, mesmo não rotulado como
segurança pelo próprio QA):

- **Classificação de segurança**: nenhuma. É um problema de contraste de cor
  (acessibilidade/WCAG), não uma falha de autorização, exposição de dado ou
  qualquer categoria de achado deste agente — o texto em baixo contraste ainda
  contém exatamente o mesmo dado (percentual) que o restante do card já exibe
  com contraste adequado (`detailText` em `text-neutral-600`, 6.81:1/6.39:1,
  achado da própria revisão de qualidade de `FE-REF-07`); não há informação
  vazando nem sendo ocultada de forma que comprometa confidencialidade,
  integridade ou disponibilidade.
- **Causa raiz confirmada por QA como pré-existente** (`--color-warning`
  insuficiente contra qualquer fundo claro do design system, não introduzido
  nem agravado por `FE-REF-07`) — não gera novo débito de segurança
  (`SEC-DEBT-*`), fica só como `QA-DEBT-012` no dono correto (design
  tokens/Frontend), sem duplicação neste documento.

**Confirmado: nenhum achado de severidade alta/crítica, nesta rodada nem
herdado, em nenhum dos 4 arquivos do lote.**

#### `security-report-drafting` — veredito consolidado do lote

Consolidando o achado da análise estática (1.21 — nenhum achado, único ponto de
atenção sendo a confirmação de que `lucide-react` está fora de escopo) com os 3
checks acima (nenhum achado novo de severidade alta/crítica, nenhum achado de
compliance obrigatório, nenhum vazamento de dado sensível, `QA-DEBT-012`
reclassificado como sem componente de segurança):

- **Achados que bloqueiam o deploy deste lote hoje: nenhum.**
- **Achados de severidade Alta/Crítica em aberto tocando este lote: nenhum.**
- **Compliance obrigatório (LGPD)**: nenhum achado — nada fica pendente como
  débito, não há gap a resolver.
- **Exposição de dado sensível**: nenhum achado.
- **Requisitos de segurança operacional para o DevOps**: nenhum novo — este
  lote não introduz Edge Function, secret, configuração de rede/firewall nem
  storage novo; Seção 4 já cobre o que é aplicável ao projeto.

**Veredito do lote: Aprovado, sem débito de segurança.** `FE-REF-07`/`QA-REF-05`
estão liberadas para o fechamento formal do lote pelo Tech Lead (`TASK.md` Seção
7) do ponto de vista de segurança. `QA-DEBT-012` permanece como débito de UX/
acessibilidade sob responsabilidade do Frontend (próxima revisão de design
tokens), não um débito deste agente. Nenhuma pré-condição de deploy pendente.

**Sinalização ao CTO (paralela, não pré-requisito)**: nenhuma nova — este lote
não gera achado de relevância estratégica (nenhum achado de segurança, e
`QA-DEBT-012` não tem componente de segurança nem decisão de negócio envolvida).
As sinalizações já registradas na Seção 5 permanecem válidas e não são
reabertas por esta rodada.

**Checklist — Critérios de Pronto desta rodada**:

- [x] Nenhum achado de severidade alta/crítica em aberto
- [x] Todo achado de compliance obrigatório (LGPD) resolvido — nenhum achado
      de compliance nesta rodada
- [x] Achado de baixa/média severidade registrado como débito com prazo — não
      aplicável, nenhum achado de segurança nesta rodada (`QA-DEBT-012` é débito
      de UX/acessibilidade, já registrado e detido pelo QA/Frontend, sem
      componente de segurança)
- [x] Requisitos de segurança operacional para o DevOps definidos — nenhum
      novo exigido por este lote, Seção 4 já cobre o projeto
- [x] Achado de relevância estratégica sinalizado ao CTO — não aplicável,
      nenhum achado desta natureza

---

### 1.23 — `static-security-analysis` (SAST + dependências + secrets) — "Lote 0 — Design System (Redesign v2.0)" (`FE-RS-01`, `02`, `03`, `04`, `14`) — em paralelo ao QA — 2026-09-04

**Escopo desta rodada**: `frontend/src/index.css` (nova paleta de tokens v2.0 —
substituição integral do bloco `@theme`), `frontend/src/components/base/Num.tsx`
(novo primitivo de renderização numérica), `frontend/src/components/base/
{Alert,Badge,Button}.tsx` (migração de cor para tokens `-soft`/`danger-hover`),
`frontend/src/components/domain/OfflineSyncBadge.tsx` (idem),
`frontend/src/layout/AppLayout.tsx` (reestruturação de navegação — sidebar
desktop de 4 grupos, bottom nav mobile, botão "+" fixo no cabeçalho). Duas
dependências novas: `@fontsource/public-sans`, `@fontsource/newsreader`. Rodada
só de `static-security-analysis`, em paralelo ao QA (`QA-RS-01`/`02`/`03`) — não
espera o veredito dele; as 4 skills de auditoria completa
(`security-requirement-validation`, `compliance-validation`,
`sensitive-data-exposure-check`, `finding-severity-classification`) ficam para
quando o QA aprovar (Aprovado/Aprovado com ressalvas) as 5 tarefas deste lote em
`QA-REPORT.md`.

**Verificação de conformidade com `GUARDRAILS.md` G-20/G-21 (RN-19/RN-20/RNF-15,
`ADR-018`) — pré-condição estrutural desta iniciativa, checada antes do resto**:
`git status`/`git diff --stat` confirmam que o working tree deste lote toca
exclusivamente `frontend/src/components/base/**`, `frontend/src/components/
domain/OfflineSyncBadge.tsx`, `frontend/src/layout/AppLayout.tsx`,
`frontend/src/index.css`, `frontend/package.json`/`package-lock.json` — nenhum
arquivo em `supabase/migrations/**`, `supabase/functions/**`,
`frontend/src/lib/api/**`, `frontend/src/lib/auth/**` ou `.md/API-CONTRACT.yaml`
(grep dirigido confirmou zero ocorrência desses caminhos no `git status`).
**G-20/G-21 respeitados**: nenhuma mudança de regra de negócio, modelo de dado
ou contrato de API; PR contém exclusivamente arquivos de apresentação.

| Ponto verificado | Verificação | Evidência | Resultado |
|---|---|---|---|
| RN-20 (nenhuma rota/permissão/comportamento de navegação muda) | Comparei as 13 rotas referenciadas pelos 5 grupos de `DESKTOP_NAV_GROUPS` + 4 `MOBILE_DESTINATIONS` de `AppLayout.tsx` contra `frontend/src/router/router.tsx` | Todas as rotas (`/`, `/lancamentos`, `/contas`, `/formas-pagamento`, `/categorias`, `/orcamento`, `/recorrencias`, `/contas-fixas`, `/metas`, `/cartoes`, `/parcelamentos`, `/relatorios/entradas-saidas`, `/configuracoes`) já existiam identicamente em `router.tsx` antes desta rodada — nenhuma rota nova, removida ou redirecionada | Passa |
| XSS via nome de categoria/descrição/valor renderizado nos 5 componentes tocados | Grep dirigido por `dangerouslySetInnerHTML`/`innerHTML`/`eval(`/`document.write` em `index.css`, `Num.tsx`, `Alert.tsx`, `Badge.tsx`, `Button.tsx`, `OfflineSyncBadge.tsx`, `AppLayout.tsx` | Zero ocorrências; todo texto dinâmico (`children`, `statusText`, `item.description`, `item.date`, `label`) chega ao DOM só como filho de JSX puro — React escapa por padrão | Passa |
| Segredos/tokens/URLs de serviço hardcoded | Grep dirigido por padrão de chave/token/`Bearer`/URL de serviço (`sk_`, `api[_-]?key`, `secret`, `password`, `supabase\.co`, `https?://`) nos 7 arquivos do lote | Zero ocorrências | Passa |
| Armazenamento local (`localStorage`/`sessionStorage`) | Grep dirigido nos 7 arquivos | Zero ocorrências — `OfflineSyncBadge` continua delegando a fila offline ao Dexie/IndexedDB via `useOfflineQueue` (módulo fora do escopo deste lote, comportamento não tocado) | Passa |
| Logs client-side (`console.*`) | Grep dirigido nos 7 arquivos | Zero ocorrências | Passa |
| Service worker (Workbox) ainda exclui `/rest/`/`/auth/` do cache após a mudança de fonte/navegação | Leitura direta de `vite.config.ts` (não modificado por este lote, mas revalidado porque `FE-RS-02` exige que os novos `.woff2` entrem no pré-cache) | `globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"]` já cobre os novos arquivos de fonte; `runtimeCaching` mantém `NetworkOnly` para `/rest/`/`/auth/`, inalterado — nenhuma resposta de API passa a ser cacheada pelo shell PWA por causa da fonte nova | Passa |
| Fonte self-hosted (`@fontsource/*`) em vez de CDN de terceiro (Google Fonts) | Leitura de `index.css:1-18` | `@import "@fontsource/public-sans/*.css"`/`"@fontsource/newsreader/*.css"` — pacotes ficam no bundle da própria aplicação; nenhuma requisição de rede a `fonts.googleapis.com`/`fonts.gstatic.com` no runtime | Passa — nota positiva: elimina o vazamento de IP/user-agent do usuário a um CDN de terceiro a cada carregamento de tela (superfície de exposição de dado a terceiro a menos, alinhado à minimização de dado ainda que este lote não processe PII) |
| `Alert`/`Badge`/`Button` migrados por `FE-RS-14` não introduzem vetor novo de leitura cross-tenant via `aria-*`/props | Leitura direta dos 3 componentes — são primitivos puros, recebem `children`/`variant`/`tone` do chamador, sem chamada a API/RPC própria | `Alert.tsx`, `Badge.tsx`, `Button.tsx` não importam nenhum módulo de `lib/api/**` — apenas renderizam o que o componente pai já filtrou (RLS já auditada em rodadas anteriores para cada tela consumidora) | Passa |

**Análise de dependência — `@fontsource/public-sans`, `@fontsource/newsreader`
(as 2 dependências novas pedidas nesta rodada)**:

- **Procedência**: ambas resolvem em `package-lock.json` diretamente de
  `https://registry.npmjs.org/` (não um mirror/fork de terceiro), com hash
  `integrity` (`sha512`) presente e íntegro. `license: "OFL-1.1"` (SIL Open Font
  License) — licença padrão e esperada para pacote de distribuição de fonte,
  sem termo restritivo a uso comercial. `funding.url` aponta para
  `github.com/sponsors/ayuhito` — mantenedor real e conhecido do projeto
  Fontsource (`fontsource.org`), não uma conta anônima/recém-criada; nome do
  pacote (`@fontsource/public-sans`, `@fontsource/newsreader`) é o escopo oficial
  do projeto, não há indício de typosquat (nome com escopo `@fontsource/`
  consistente com dezenas de outras fontes já publicadas pelo mesmo autor).
- **Superfície de supply-chain**: inspecionei o `package.json` publicado de cada
  pacote (via `require.resolve`, não só o manifesto do projeto) — **nenhum script
  de ciclo de vida npm** (`postinstall`/`preinstall`/`prepare`) e **zero
  dependências transitivas** (`dependencies: {}`) em ambos. Superfície de
  supply-chain mínima possível para uma dependência de terceiro — não executa
  código algum na instalação, não puxa nenhum pacote adicional.
- **Vulnerabilidade conhecida**: `npm audit --omit=dev` sobre
  `frontend/package.json`/`package-lock.json` → **0 vulnerabilidades** em toda a
  árvore de produção, incluindo as duas dependências novas.
- **Conteúdo**: ambos os pacotes distribuem exclusivamente arquivos estáticos
  (`.css` + `.woff2`) — nenhum arquivo `.js` executável no pacote além de
  metadados; consistente com o propósito declarado (fonte self-hosted, `DIR-43`).
- **Resultado**: **sem achado.** Procedência legítima, superfície de
  supply-chain mínima (zero scripts, zero transitivos), zero vulnerabilidade
  conhecida.

**Nota sobre `lucide-react@^1.41.0` (dependência já introduzida em rodada
anterior, 1.17/1.18/1.19/1.21, sempre classificada como "fora do escopo" por não
ser consumida pelos arquivos auditados naquelas rodadas)**: nesta rodada, pela
primeira vez, `lucide-react` **é de fato consumida dentro do escopo auditado**
(`AppLayout.tsx` importa `Home`/`FileText`/`Target`/`MoreHorizontal`/`Plus` —
`FE-RS-03`, substituição de emoji por ícone line-style). Verifiquei agora o que
as rodadas anteriores não precisavam verificar: `package-lock.json` resolve de
`registry.npmjs.org` com `integrity` presente, `license: "ISC"` (permissiva),
`dependencies: {}` (zero transitivo); `package.json` publicado só declara
scripts de build interno do próprio repositório-fonte da lib (não hooks de
ciclo de vida do npm — nenhum `postinstall`/`preinstall`); `npm audit` já
confirmou 0 vulnerabilidades para esta dependência (parte da mesma árvore
auditada acima). **Resultado: sem achado** — mesmo padrão de baixo risco das
duas dependências pedidas nesta rodada, agora formalmente verificado por estar,
de fato, em uso dentro de um lote auditado.

**Nenhum achado nesta rodada, de nenhuma severidade.** Confirmo os pontos
pedidos: RN-19/RN-20/G-20 (zero mudança de backend/schema/RLS/auth, zero mudança
de rota/comportamento de navegação); dependências novas (`@fontsource/*`) —
procedência legítima, zero vulnerabilidade conhecida, superfície de supply-chain
mínima; nenhum vetor de XSS, segredo hardcoded ou exposição de dado sensível
introduzido pelos 7 arquivos do lote.

**Sem achado de severidade alta/crítica — nenhuma pausa obrigatória do
orquestrador é acionada por esta rodada.**

**Checklist — rodada 1.23 (`static-security-analysis`, "Lote 0 — Design System
(Redesign v2.0)", em paralelo ao QA)**:

- [x] Nenhum achado de severidade alta/crítica em aberto — nenhum achado nesta
      rodada
- [x] Nenhum achado de compliance obrigatório (LGPD) pendente — não avaliado
      formalmente nesta rodada (skill fora de escopo, aguarda gate de QA);
      nenhum indício levantado durante o SAST (lote não introduz/altera dado
      pessoal, confirmado por G-20)
- [x] Achado de baixa/média severidade registrado como débito com prazo — não
      aplicável, nenhum achado nesta rodada
- [x] Nenhum requisito operacional novo para o DevOps surgiu desta rodada —
      fontes self-hosted não exigem configuração de rede/CDN externa
- [x] Achado de relevância estratégica sinalizado ao CTO — não aplicável,
      nenhum achado desta natureza

**Veredito do lote (parcial, só `static-security-analysis`): Aprovado, sem
débito.** Fica condicionado, como em toda rodada anterior deste padrão, à
auditoria completa (as 4 skills restantes) assim que o QA aprovar (Aprovado/
Aprovado com ressalvas) as 5 tarefas deste lote (`FE-RS-01`, `02`, `03`, `04`,
`14`) em `QA-REPORT.md`.

---

### 1.24 — Auditoria completa (veredito de lote) — "Lote 0 — Design System
(Redesign v2.0)" — 2026-09-05

**Gatilho**: `QA-REPORT.md` Seção 14.8 (revalidação pontual, 2026-09-05) aprovou
(Aprovado, 5/5 — `FE-RS-01`/`02`/`03`/`04`/`14`) o lote, fechando o **Reprovado**
anterior da Seção 14.6 (`QA-BUG-001`, Alta — regressão de contraste WCAG 2.1 AA em
`--color-neutral-500`, introduzida por `FE-RS-01`, propagada a 29 arquivos de
produção). A correção (`#6E726B`, recalculado e confirmado ≥4,5:1 sobre `--surface`
e `--bg` pelo próprio QA de forma independente, com ordem monotônica da rampa
400/500/600 preservada) libera a auditoria completa de DevSecOps — as 4 skills além
de `static-security-analysis`, já rodada na Seção 1.23 — respeitando meu próprio gate
de entrada (não auditar um build que o QA ainda não validou funcionalmente).

**Reconfirmação de escopo antes de auditar**: `git status`/`git log` sobre os 7
caminhos do lote (`frontend/src/index.css`,
`frontend/src/components/base/{Num,Alert,Badge,Button}.tsx`,
`frontend/src/components/domain/OfflineSyncBadge.tsx`,
`frontend/src/layout/AppLayout.tsx`) não mostram nenhum arquivo adicional tocado
entre a rodada 1.23 e este fechamento — a correção de `QA-BUG-001` foi aplicada
dentro do próprio `index.css` já capturado no diff original do lote, não abriu
escopo novo. Reexecutei o grep dirigido (`dangerouslySetInnerHTML`/`innerHTML`/
`eval(`/`console\.*`/`localStorage`/`sessionStorage`/padrão de segredo) nos 7
arquivos: **zero ocorrências**, mesmo resultado de 1.23. Li o valor final de
`--color-neutral-500` diretamente em `index.css` (`#6e726b`) e confirmei que bate
com o que o QA reporta como corrigido.

#### `security-requirement-validation` — `SDD.md` Seção 7 + `GUARDRAILS.md` G-20/G-21

| Requisito | Verificação | Evidência | Resultado |
|---|---|---|---|
| `SDD.md` Seção 7 — Autenticação/Autorização/Criptografia/Isolamento Multi-Tenant | Nenhum dos 4 requisitos é tocado por este lote (camada de apresentação pura) | `git diff --stat` do lote não contém `supabase/**`, `frontend/src/lib/api/**`, `frontend/src/lib/auth/**` | Passa (fora de escopo, confirmado por diff, não presumido) |
| `G-20` (nenhuma mudança de regra de negócio, modelo de dado ou contrato de API) | Reconfirmado nesta rodada, não só herdado de 1.23 | Zero arquivo em `supabase/migrations/**`, `supabase/functions/**` ou `.md/API-CONTRACT.yaml` no diff do lote | Passa |
| `G-21` (PR só arquivos de apresentação, correspondência 1:1 PR↔lote) | 100% dos 7 arquivos tocados são `components/**`, `layout/**`, `index.css` ou dependência de fonte (`package.json`/`package-lock.json`) | Mesmo `git diff --stat` | Passa |
| RN-19/RN-20 (nenhuma rota/permissão/comportamento de navegação muda) | Já verificado linha a linha em 1.23 (13 rotas de `AppLayout.tsx` idênticas a `router.tsx`); reconfirmado sem mudança nesta rodada | Seção 1.23, tabela, linha 1 | Passa |

**Nenhum requisito de arquitetura de segurança da Seção 7 do `SDD.md` é relevante a
este lote** — natureza 100% de apresentação confirmada de forma verificável (diff),
não presumida a partir da descrição da tarefa.

#### `compliance-validation` — LGPD

| Verificação | Evidência | Resultado |
|---|---|---|
| Minimização de dado — nenhum campo novo de PII introduzido | `Num.tsx` só formata valores numéricos já existentes (moeda em centavos, percentual, contagem) recebidos do componente chamador — não acrescenta coleta nem armazenamento de dado novo; `Alert`/`Badge`/`Button`/`OfflineSyncBadge` são primitivos de apresentação, recebem `children`/`variant`/props do chamador | Passa |
| Base legal/titular do dado exibido | Não aplicável — nenhuma mudança em captura, processamento ou finalidade de dado pessoal; o dado financeiro exibido pelos componentes (já do próprio stakeholder, mesmo enquadramento de `CTO-REVIEW.md` linha 307) não muda de mãos nem de forma de tratamento | Passa |
| Direito ao esquecimento / exclusão de conta | Não aplicável — nenhuma tela ou fluxo de exclusão de conta tocado por este lote | Passa (fora de escopo) |
| Consentimento | Não aplicável — nenhuma coleta de dado novo | Passa (fora de escopo) |

**Nenhum achado de compliance obrigatório (LGPD) neste lote** — nada fica pendente
como débito, não há gap a resolver.

#### `sensitive-data-exposure-check`

| Superfície | Verificação | Evidência | Resultado |
|---|---|---|---|
| Payload de API | Nenhum dos 7 arquivos deste lote importa `lib/api/**` | Grep de `^import` nos 5 componentes tocados (Alert/Badge/Button sem import de módulo de domínio; `OfflineSyncBadge` só importa `lib/offline/useOfflineQueue`/`lib/offline/sync` — módulos não tocados por este lote, já auditados em rodada anterior) | Passa |
| Mensagens de erro | `Alert.tsx`/`Badge.tsx` são primitivos puros — recebem texto já formatado pelo chamador, não geram nem formatam mensagem de erro própria | Leitura direta dos 2 arquivos | Passa |
| Logs client-side | Zero `console.*` nos 7 arquivos | Grep dirigido, reconfirmado nesta rodada (mesmo resultado de 1.23) | Passa |
| Armazenamento local (`localStorage`/`sessionStorage`/IndexedDB) | Zero ocorrência nos 7 arquivos; `OfflineSyncBadge` continua delegando à fila offline (Dexie/IndexedDB) via `useOfflineQueue`, módulo não tocado por este lote | Grep dirigido, reconfirmado | Passa |
| Renderização de dado dinâmico (XSS) | Zero `dangerouslySetInnerHTML`/`innerHTML`/`eval(`/`document.write` nos 7 arquivos | Grep dirigido, reconfirmado | Passa |
| Fonte self-hosted (`@fontsource/*`) | Já avaliado em 1.23 como redução líquida de superfície de exposição — elimina requisição de rede a CDN de terceiro (Google Fonts) a cada carregamento de tela | Seção 1.23 | Passa (nota positiva, não achado) |

**Nenhum vazamento de dado sensível via API, log, armazenamento local ou
renderização neste lote.**

#### `finding-severity-classification`

O QA registrou 2 achados sobre este lote (`QA-REPORT.md` Seção 14.4/14.6/14.8).
Avalio explicitamente a implicação de segurança de cada um, como exigido pelo meu
escopo:

- **`QA-BUG-001`** (Alta, WCAG — regressão de contraste em `--color-neutral-500`):
  **classificação de segurança: nenhuma.** É um achado de acessibilidade/contraste
  de cor, não de autorização, exposição de dado ou integridade — o texto em baixo
  contraste continha exatamente o mesmo dado (rótulo/valor) que o resto da UI já
  exibia com contraste adequado; não há informação oculta, vazada ou exposta de
  forma que comprometa confidencialidade, integridade ou disponibilidade. **Já
  corrigido e revalidado de forma independente pelo QA** (Seção 14.8 —
  `#6E726B`, ≥4,5:1 confirmado sobre os 2 fundos onde o token é usado, ordem
  monotônica da rampa preservada) antes de chegar a esta auditoria — nenhum achado
  em aberto herdado, nenhum novo débito de segurança gerado.
- **`QA-DEBT-014`** (Baixa, `--shadow-elevation-md` com parâmetro `spread-radius`
  divergente do valor literal de `UX-SPEC.md`): **classificação de segurança:
  nenhuma.** É imprecisão de valor de token visual (sombra), sem qualquer
  implicação de autorização/exposição/integridade de dado. **Já corrigido e
  fechado pelo QA** no mesmo ciclo da correção de `QA-BUG-001` (Seção 14.8.4).

**Confirmado: nenhum achado de severidade alta/crítica, nesta rodada nem herdado,
em nenhum dos 7 arquivos do lote.**

#### `security-report-drafting` — veredito consolidado do lote

Consolidando o achado da análise estática (1.23 — nenhum achado) com os 3 checks
acima (nenhum achado novo de severidade alta/crítica, nenhum achado de compliance
obrigatório, nenhum vazamento de dado sensível, os 2 achados do QA reclassificados
como sem componente de segurança e já fechados):

- **Achados que bloqueiam o deploy deste lote hoje: nenhum.**
- **Achados de severidade Alta/Crítica em aberto tocando este lote: nenhum.**
- **Compliance obrigatório (LGPD)**: nenhum achado — nada fica pendente como
  débito, não há gap a resolver.
- **Exposição de dado sensível**: nenhum achado.
- **Requisitos de segurança operacional para o DevOps**: nenhum novo — este lote
  não introduz Edge Function, secret, dependência de rede externa (fonte
  self-hosted elimina, não adiciona, dependência de CDN de terceiro) nem storage
  novo; Seção 4 já cobre o que é aplicável ao projeto.

**Veredito do lote: Aprovado, sem débito de segurança.** As 5 tarefas
(`FE-RS-01`, `02`, `03`, `04`, `14`) estão liberadas para o fechamento formal do
lote pelo Tech Lead (`TASK.md` Seção 7) do ponto de vista de segurança.
`QA-BUG-001`/`QA-DEBT-014` permanecem débitos de UX/acessibilidade sob
responsabilidade do Frontend/QA, já fechados por eles — não geram nenhum
`SEC-DEBT-*` novo neste documento.

**Sinalização ao CTO (paralela, não pré-requisito)**: nenhuma — este lote não gera
achado de relevância estratégica (nenhum achado de segurança, e os 2 achados do QA
não têm componente de segurança nem decisão de negócio envolvida). As sinalizações
já registradas na Seção 5 permanecem válidas e não são reabertas por esta rodada.

**Checklist — Critérios de Pronto desta rodada**:

- [x] Nenhum achado de severidade alta/crítica em aberto
- [x] Todo achado de compliance obrigatório (LGPD) resolvido — nenhum achado de
      compliance nesta rodada
- [x] Achado de baixa/média severidade registrado como débito com prazo — não
      aplicável, nenhum achado de segurança nesta rodada (`QA-BUG-001`/
      `QA-DEBT-014` são débitos de UX/acessibilidade, já corrigidos e fechados
      pelo QA/Frontend, sem componente de segurança)
- [x] Requisitos de segurança operacional para o DevOps definidos — nenhum novo
      exigido por este lote, Seção 4 já cobre o projeto
- [x] Achado de relevância estratégica sinalizado ao CTO — não aplicável, nenhum
      achado desta natureza

**Veredito final do Lote 0 ("Design System, Redesign v2.0") do ponto de vista de
DevSecOps: Aprovado, sem débito.** Nenhuma pré-condição de deploy pendente por
parte de segurança/compliance.

---

### 1.25 — Auditoria completa (veredito de lote, primeira aplicação formal como
unidade) — "Autenticação & Segurança" — 2026-09-05

**Gatilho**: `QA-REPORT.md` Seção 15 aprovou (Aprovado, 9/9, nenhuma reprovação)
`BE-M-09`, `BE-M-11`, `BE-M-12`, `BE-M-13`, `BE-M-14`, `FE-M-04`, `FE-M-12`,
`FE-M-13`, `QA-M-02`. Libera minha auditoria completa, respeitando meu próprio
gate de entrada.

**Nota de processo — validação retroativa, mesma natureza da Seção 15 do
`QA-REPORT.md`**: este build já está em produção desde antes de qualquer gate
formal de lote existir (`DEPLOY.md` Seção 9.6, decisão consciente do
stakeholder). Esta rodada é uma auditoria *a posteriori*, não um gate pré-deploy
— trato com o mesmo rigor de qualquer outra (leitura direta de código-fonte
real, nunca a nota do Executor como prova), mas nenhuma ação de rollback é
sugerida por si só; se um achado crítico aparecesse, o protocolo seria o mesmo
de qualquer bloqueio (reverter a tarefa a `Em andamento`, escalar ao Executor),
com a nota adicional de que o código já está live.

**Nota de escopo — por que esta rodada não repete a auditoria geral já feita
peça por peça em rodadas anteriores**: diferente de todo lote anterior deste
documento (que recebia sua primeira auditoria de segurança junto do primeiro
`/validar`), as tarefas deste lote já foram tocadas, individualmente, pela
Seção 0 (achados #1/#2/#5, triagem de um `code-review` anterior) e por
`BLOCKERS.md` Bloqueios 006/010/015 (mitigação de replay, `SEC-DEBT-002`/G-19,
`SEC-DEBT-008`/`DEFAULT auth.uid()`) — todos já resolvidos e reconfirmados em
rodadas subsequentes (1.9/1.10/1.13/1.14/1.15/1.18). Não relI-los aqui; uso como
insumo e só reconfirmo o que muda. O que esta rodada faz de **novo**: (a) a
primeira leitura de código-fonte real, linha a linha, das duas Edge Functions
de WebAuthn (`webauthn-register`/`webauthn-authenticate`) e da camada de
autenticação do Frontend (`AuthContext.tsx`, `pin.ts`, `lockout.ts`,
`webauthn.ts`, `UnlockPage.tsx`, `PinSetupPage.tsx`, `SettingsPage.tsx`,
`request.ts`) — nenhuma delas tinha sido lida integralmente por mim em uma
rodada de `static-security-analysis` formal (a Seção 1.7 excluiu
explicitamente "WebAuthn" do escopo, remetendo para os Achados #1/#2 que não
cobrem a lógica de verificação em si); (b) o veredito de lote formal com as 4
skills de auditoria completa, nunca feito para este conjunto de 9 tarefas como
unidade; (c) reavaliação do efeito do `ADR-014` (remoção definitiva do 2º
fator por e-mail) sobre a classificação de `SEC-DEBT-001`.

#### `static-security-analysis` — primeira leitura formal de `webauthn-register`/`webauthn-authenticate` e da camada de auth do Frontend

Li integralmente `supabase/functions/webauthn-register/index.ts` e
`supabase/functions/webauthn-authenticate/index.ts` (não apenas o trecho de
CORS já triado no Achado #1) e `frontend/src/lib/auth/{AuthContext,pin,lockout,
webauthn}.ts`, `frontend/src/pages/auth/{UnlockPage,PinSetupPage}.tsx`,
`frontend/src/pages/settings/SettingsPage.tsx`, `frontend/src/lib/api/
request.ts`.

| Ponto verificado | Verificação | Evidência | Resultado |
|---|---|---|---|
| Mitigação de replay de challenge (Bloqueio 006) é atômica e ocorre antes de qualquer validação criptográfica | `consumeChallenge()` — `UPDATE ... WHERE consumed_at IS NULL AND expires_at > now() RETURNING id`, chamado antes de `verifyRegistrationResponse`/`verifyAuthenticationResponse` em ambas as functions | `webauthn-register/index.ts:478-509`, `webauthn-authenticate/index.ts:531-564` — nenhuma linha afetada retorna 409 sem sequer tentar validar a assinatura | Passa |
| Origem (CORS/`expectedOrigin`) e RP ID validados por allowlist, nunca wildcard, em ambas as functions WebAuthn (diferente de `auth-email-mfa`, já triado no Achado #1) | `ALLOWED_ORIGINS` (array de `WEBAUTHN_ORIGIN`), usado tanto em `corsHeaders()` quanto em `expectedOrigin` de `verify*Response` | `webauthn-register/index.ts:65-70,106-114,516`, `webauthn-authenticate/index.ts:52-56,92-100,572` | Passa |
| Credencial pertence ao usuário autenticado antes de aceitar a assertion (`webauthn-authenticate`) | Lookup por `credential_id`, depois checagem explícita `credentialRowTyped.user_id !== user.id` → 404 genérico (não vaza se a credencial existe e pertence a outro usuário) | `webauthn-authenticate/index.ts:472-513` | Passa |
| Contador anti-clonagem (`sign_count`) persistido após verificação bem-sucedida | `verifyAuthenticationResponse` retorna `newCounter`; `UPDATE ... sign_count = newCounter` | `webauthn-authenticate/index.ts:599-609` — biblioteca `@simplewebauthn/server` rejeita internamente uma assertion cujo `newCounter` não avança quando o autenticador reporta contador não-zero (comportamento padrão da lib, não reimplementado aqui) | Passa |
| Falha ao atualizar `sign_count`/`last_used_at` não derruba um desbloqueio já validado criptograficamente | Erro da `UPDATE` final é só logado, resposta ainda `200 {success:true}` | `webauthn-authenticate/index.ts:611-624`, comentário explícito no código | Passa — decisão de disponibilidade correta (a assinatura já provou posse da chave privada; falha de auditoria não deveria travar o usuário) |
| Nenhum dado sensível (`public_key`/`attestationResponse`/`assertionResponse` brutos) vai a log estruturado | `log()` só recebe `requestId`/`userId`/`credential_id`/`db_error_code` como `extra` em todo `call site` das duas functions | Grep dirigido (`log(` — todas as chamadas) nas duas functions | Passa |
| `handle_new_user()` só roda para e-mail já aprovado (`BE-M-12`) | Trigger `auth_users_before_insert_restrict_signup` (`BEFORE INSERT`) roda e pode abortar antes do `AFTER INSERT` que dispara `handle_new_user()` | `20260902100400_be_m12_restrict_signup.sql:44-58` — `SECURITY DEFINER`, `search_path` fixo, `raise exception` com `errcode 42501` se e-mail fora de `allowed_signup_emails` | Passa — reconfirma o Achado #5 original, sem gap novo |
| PIN local — algoritmo/parâmetros de hashing | `crypto.subtle.deriveBits` PBKDF2-SHA256, salt aleatório 16 bytes por dispositivo, 100.000 iterações, nunca transmitido (100% local, `IndexedDB`) | `frontend/src/lib/auth/pin.ts:5,15-22,36-49` | Passa, com observação não-bloqueante: 100.000 iterações está abaixo da recomendação atual da OWASP Password Storage Cheat Sheet para PBKDF2-HMAC-SHA256 (≥600.000) — mitigado integralmente pelo modelo de ameaça real (verificação 100% local, sem endpoint de rede para força bruta remota; DIR-18/G-17 já limita tentativa física a 5/5min). Não registro como `SEC-DEBT` novo — é um parâmetro de robustez adicional, não um gap de requisito do `SDD.md` (que não especifica contagem de iteração), e o vetor de exploração (acesso físico ao dispositivo já desbloqueado no SO) já é o mesmo cenário que `ADR-005`/Bloqueio 001 tratam como fora do modelo de ameaça deste produto |
| `console.*` na camada de auth do Frontend | Um resultado: `UnlockPage.tsx:77`, loga a `ApiError` (mensagem amigável + `status`/`code`, nunca o `assertionResponse` bruto) quando a autenticação WebAuthn falha por motivo inesperado (não "sem credencial") | `frontend/src/pages/auth/UnlockPage.tsx:70-79`; `ApiError`/`toEdgeFunctionError` (`errors.ts`, `edgeFunctions.ts`) confirmam que o objeto logado contém só `message`/`status`/`code`/`kind`, nunca payload de credencial | Passa — visível só no console do próprio dispositivo do usuário, sem dado sensível; nota, não achado |
| Dependências novas deste lote (`@simplewebauthn/server`, `@simplewebauthn/browser`) | `npm audit --omit=dev` (frontend) e `deno.lock` (Edge Functions) | `npm audit`: 0 vulnerabilidades na árvore de produção do Frontend; `deno.lock` das duas functions resolve `@simplewebauthn/server` da mesma versão/hash, sem lockfile divergente entre as duas | Passa |

**Nenhum achado novo de severidade alta/crítica.** A implementação de
`webauthn-register`/`webauthn-authenticate` é sólida: replay mitigado de forma
atômica antes de qualquer verificação criptográfica, origem/RP ID por
allowlist (nunca wildcard, ao contrário de `auth-email-mfa`), ownership de
credencial verificado antes de aceitar assertion, contador anti-clonagem
persistido, timeouts explícitos em toda chamada de Auth/Postgres, e nenhum
segredo/payload bruto em log estruturado.

#### `security-requirement-validation` — `SDD.md` Seção 7 + `GUARDRAILS.md` G-04/G-05/G-07/G-17/G-19

| Requisito | Verificação | Evidência | Resultado |
|---|---|---|---|
| `G-07`/DIR-19 — `unlocked` nunca substitui `session`; API sem `session` falha por RLS independente do PIN local | `AuthContext.tsx` deriva `stage` de duas fontes independentes (`session`, `pinConfigured`+`unlocked`); nenhum módulo de `lib/api/**` consulta `stage`/`unlocked` para decidir se envia a requisição | `frontend/src/lib/auth/AuthContext.tsx:1-21,60-68`; grep de `useAuth()`/`stage` em `lib/api/**` — zero ocorrência | Passa |
| `G-17` — lockout 5 tentativas/5min, 100% local/offline, número não alterável por Backend/Frontend | `MAX_ATTEMPTS = 5`, `LOCKOUT_MS = 5*60*1000`, comentário cita G-17 explicitamente; nenhuma chamada de rede em `lockout.ts` | `frontend/src/lib/auth/lockout.ts:9-10` | Passa — valor não foi alterado desde a aprovação original |
| `G-19` (ownership de FK cruzada) aplicável a `BE-M-13` — origem desta própria regra | `budget_insert_own`/`_update_own`/`transactions_insert_own`/`_update_own` com `EXISTS(...)` de ownership; triggers RN-08/RN-09 `SECURITY DEFINER` | `20260903100000_be_m13_fk_ownership_and_security_definer_guards.sql` — já confirmado em 1.10/1.13/1.14/1.15/1.18, reconfirmado por leitura direta nesta rodada, sem regressão | Passa. **Nota de governança, não achado novo**: `GUARDRAILS.md` G-19 segue `[PROPOSTA — aguardando aprovação do Coordenador/Gestor]` (linha 231), 2 dias após a proposta original e depois de 6 lotes subsequentes já terem sido auditados assumindo o padrão como vigente — já registrado em rodadas anteriores (1.9, 1.13) sem gerar bloqueio; não repito a escalada, só reconfirmo que o *código* cumpre o padrão que a regra formalizaria, independentemente do veredito de aprovação formal pendente |
| `DEFAULT auth.uid()` (`BE-M-14`, origem `SEC-DEBT-008`/Bloqueio 015) em toda coluna `user_id` "ownable" | 13/13 tabelas confirmadas | `20260903260000_be_m14_user_id_default_auth_uid.sql` — já verificado ao vivo pelo próprio DevSecOps em rodada anterior (Bloqueio 015, Resolvido); reconfirmado por leitura da migration nesta rodada, sem regressão | Passa |
| `withOwnerId()` (`FE-M-13`) nas 12 chamadas `create*` dos 9 módulos citados no `TASK.md` | `grep withOwnerId` nos 9 módulos + leitura de `request.ts` — sempre lê `auth.getUser()` no momento da chamada, nunca estado em memória potencialmente obsoleto | `frontend/src/lib/api/{accounts,budget,categories,creditCards,fixedBills,goals,paymentMethods,recurring,transactions}.ts`, `frontend/src/lib/api/request.ts:38-55` | Passa — reconfirma `QA-REPORT.md` Seção 15.1/15.3 por leitura própria, não aceito a nota do Executor/QA como prova única |
| `SDD.md` Seção 7, "Isolamento Multi-Tenant" (RNF-09, allow-list de signup como mitigação primária) | `allowed_signup_emails` com 1 único e-mail (o stakeholder); trigger `BEFORE INSERT` bloqueia qualquer outro | `20260902100400_be_m12_restrict_signup.sql:20-58` — sem alteração desde a auditoria original (Achado #5) | Passa |

**Nenhum requisito de arquitetura de segurança da Seção 7 do `SDD.md`/
`GUARDRAILS.md` aplicável a este lote está implementado de forma diferente do
especificado.**

#### `compliance-validation` — LGPD

| Verificação | Evidência | Resultado |
|---|---|---|
| Dado pessoal novo introduzido por este lote | Nenhum campo de PII novo — `webauthn_credentials` (`credential_id`/`public_key`/`sign_count`/`device_label`) é dado de dispositivo/segurança, não dado financeiro; `allowed_signup_emails` já triado (Achado #5/`SEC-DEBT-003`) | Passa |
| Minimização | `device_label` é opcional, truncado a 255 chars (`webauthn-register/index.ts:457`); nenhuma coluna além do necessário para a cerimônia WebAuthn | Passa |
| Base legal/titular | Mesmo enquadramento já assentado (autoprocessamento do próprio titular, produto de usuário único) — nenhuma mudança | Passa |
| Retenção/descarte (`ADR-011`) | `webauthn_credentials`/`webauthn_challenges` seguem o ciclo de vida de exclusão de conta (`ON DELETE CASCADE` por `user_id`, mesmo mecanismo já auditado para as demais tabelas); `webauthn_challenges` consumidos/expirados não têm job de expurgo próprio ainda — volume desprezível (linhas de 90s de vida útil, usuário único) para justificar prioridade, mas registro para consistência futura, não como débito de segurança (é higiene de armazenamento, não exposição) | Passa, com observação de baixa prioridade não registrada como `SEC-DEBT` (sem exposição de dado, só acúmulo de linhas já expiradas) |
| Direito ao esquecimento | Exclusão de conta remove `webauthn_credentials` via `ON DELETE CASCADE` de `user_id` | Passa |

**Nenhum achado de compliance obrigatório (LGPD) não resolvido neste lote.**

#### `sensitive-data-exposure-check`

| Superfície | Verificação | Evidência | Resultado |
|---|---|---|---|
| Payload de API (`webauthn-register`/`webauthn-authenticate`) | Resposta nunca inclui `public_key`/chave privada — só `{options}` (dados públicos da cerimônia) ou `{success, credentialId}` | Leitura direta dos `jsonResponse(...)` de ambas as functions | Passa |
| Mensagens de erro | Genéricas (`"Sessão inválida ou expirada."`, `"Credencial não reconhecida."`) — nunca distinguem "credencial não existe" de "credencial de outro usuário" (ambas retornam 404 idêntico) | `webauthn-authenticate/index.ts:495-513` | Passa — evita enumeração de credenciais de terceiro |
| Logs client-side/servidor | Já coberto na tabela de `static-security-analysis` acima — zero payload bruto | — | Passa |
| Armazenamento local (PIN) | Hash PBKDF2 + salt em IndexedDB, nunca o PIN em texto puro, nunca transmitido | `frontend/src/lib/auth/pin.ts:36-49` | Passa |
| Sessão Supabase (JWT) | Persistida pelo próprio `@supabase/supabase-js` (comportamento padrão da lib, não modificado por este lote) — fora do escopo de mudança de `FE-M-04`/`FE-M-12`/`FE-M-13`, já aceito como modelo de ameaça do produto (Bloqueio 001/`ADR-005`: acesso físico ao dispositivo desbloqueado já está fora do perímetro que PIN/WebAuthn se propõem a mitigar) | Passa (sem mudança, fora de escopo) |

**Nenhum vazamento de dado sensível via API, log, armazenamento local ou
mensagem de erro neste lote.**

#### `finding-severity-classification` — reavaliação de `SEC-DEBT-001`/Bloqueio 009 à luz do `ADR-014`

`QA-REPORT.md` Seção 15.4 confirmou, por leitura de código nesta mesma janela
de tempo, que `auth-email-mfa` está de fato órfã (zero chamada real no
caminho de execução do app) desde o `ADR-014` — mas **segue implantada em
produção** como Edge Function ativa (`ADR-014`, item 3: "não removida... fica
órfã... remover é limpeza opcional futura, sem urgência"), continuando
alcançável por qualquer requisição HTTP com um JWT válido de sessão (Bearer
AAL1), exatamente como na análise original da Seção 1.1.

Reavaliei a exploitabilidade sob essa luz nova:

- **O que não mudou**: o modelo de autenticação por Bearer token (não cookie)
  continua limitando a exploitabilidade de CORS wildcard — um invasor
  precisaria já ter o JWT por outro canal (o próprio CORS wildcard não
  "empresta" a sessão automaticamente).
- **O que mudou, a favor de menor severidade**: hoje, mesmo que um invasor
  com um JWT já obtido explore o CORS wildcard e complete `action:"request"`/
  `"verify"` contra `auth-email-mfa`, **isso não produz nenhum efeito
  funcional na postura de segurança do produto** — `custom_access_token_hook`
  já emite `app_email_mfa_verified=true` sempre, incondicionalmente, como
  comportamento definitivo do `ADR-014` (não depende mais do resultado de
  `auth-email-mfa`). O endpoint hoje só consome `email_mfa_challenges`
  (leitura/escrita de linhas em uma tabela que não gate nenhuma outra),
  sem nenhum caminho de escalonamento de privilégio ou acesso a dado
  adicional resultante de explorá-lo.
- **Reclassificação**: rebaixo `SEC-DEBT-001` de **Média** para **Baixa** —
  o achado técnico (inconsistência de padrão de CORS num endpoint ainda
  ativo) continua real e vale corrigir, mas o impacto de uma exploração
  bem-sucedida hoje é efetivamente nulo (função sem efeito colateral de
  segurança), não só "de baixa probabilidade" como antes. Isto é uma
  reclassificação técnica baseada em fato novo (decisão de arquitetura do
  `ADR-014`), não uma diluição de critério.
- **Recomendação atualizada, substituindo a anterior**: como o arquivo está
  formalmente órfão e não deve receber manutenção de rotina (ninguém "vai
  tocá-lo de novo" no curso normal do trabalho, ao contrário do que a
  condição original de `SEC-DEBT-001` assumia — "corrigir no próximo toque no
  arquivo"), recomendo ao Coordenador/DevOps avaliar **decommissioning**
  (`supabase functions delete auth-email-mfa` + remoção do diretório, com o
  contrato em `API-CONTRACT.yaml` mantido só como registro histórico, já
  `deprecated: true`) como a correção definitiva, em vez de aplicar o patch
  de CORS num arquivo que será descartado de qualquer forma. Se a decisão for
  manter a function por mais tempo (ex.: valor de referência/rollback), o
  patch trivial de CORS (`_shared/cors.ts`) continua válido como alternativa
  de menor esforço. Detalhe completo da atualização em `BLOCKERS.md` Bloqueio
  009 (não fechado — reclassificado e com recomendação atualizada).
- **`QA-DEBT-015`** (cobertura de teste ausente para o branch WebAuthn de
  `PinSetupPage.tsx`/`webauthn.ts`, `QA-REPORT.md` Seção 15.4): **classificação
  de segurança: nenhuma.** É lacuna de cobertura de teste automatizado sobre
  um branch opcional já lido/auditado por mim nesta rodada (linha a linha,
  tabela de `static-security-analysis` acima) sem achado de comportamento
  incorreto — não há exposição, bypass ou vazamento associado. Permanece
  corretamente classificado como débito de QA/processo, não gera `SEC-DEBT`
  novo.

#### `security-report-drafting` — veredito consolidado do lote

- **Achados que bloqueiam o deploy deste lote hoje: nenhum.**
- **Achados de severidade Alta/Crítica em aberto tocando este lote: nenhum.**
- **Compliance obrigatório (LGPD)**: nenhum achado — nada pendente como débito.
- **Exposição de dado sensível**: nenhum achado.
- **Débito reclassificado nesta rodada**: `SEC-DEBT-001` (CORS wildcard em
  `auth-email-mfa`) rebaixado de Média para Baixa, recomendação atualizada
  para decommissioning como opção preferencial (ver
  `finding-severity-classification` acima e Seção 2, atualização 1.25).
  `BLOCKERS.md` Bloqueio 009 atualizado no mesmo sentido, **não fechado**.
- **Débitos de outras rodadas que tocam este lote, reconfirmados sem
  regressão**: `SEC-DEBT-002`/G-19 (corrigido para `budget`/`transactions`
  desde `BE-M-13`), `SEC-DEBT-008`/`009`/`010` (`DEFAULT auth.uid()`/
  `withOwnerId()`, `BE-M-14`/`FE-M-13` — `009` segue com a mesma limitação de
  ambiente sem credencial de rede real para o smoke test HTTP ponta a ponta,
  não é achado novo; `010` não toca nenhuma tarefa deste lote).
- **Requisitos de segurança operacional para o DevOps**: nenhum novo — a
  recomendação de decommissioning de `auth-email-mfa` (acima) é a única ação
  operacional nova sugerida por esta rodada, já registrada em `BLOCKERS.md`
  Bloqueio 009 e na Seção 4 (não duplico aqui).

**Veredito do lote: Aprovado, com débito (`SEC-DEBT-001`, agora Baixa, não
bloqueante).** As 9 tarefas (`BE-M-09`, `BE-M-11`, `BE-M-12`, `BE-M-13`,
`BE-M-14`, `FE-M-04`, `FE-M-12`, `FE-M-13`, `QA-M-02`) estão liberadas para o
fechamento formal do lote pelo Coordenador (`TASK.md` Seção 7) do ponto de
vista de segurança. Nenhuma pré-condição de deploy pendente — nota de
release-readiness igual à do QA (Seção 15): esta aprovação não "libera" um
deploy que já aconteceu (`DEPLOY.md` Seção 9.6); fecha a lacuna de auditoria
de segurança formal por lote que faltava para este conjunto de 9 tarefas.

**Sinalização ao Gestor (paralela, não pré-requisito)**: nenhuma nova. A
reclassificação de `SEC-DEBT-001` é decisão técnica dentro da minha alçada
(severidade de achado), não uma questão de risco de negócio — não presume
nenhuma anuência de bloqueio anterior do Gestor, já que o achado nunca
bloqueou nada. As sinalizações já registradas na Seção 5 permanecem válidas e
não são reabertas por esta rodada.

**Checklist — Critérios de Pronto desta rodada**:

- [x] Todo critério de aceite de segurança relevante às 9 tarefas testado
      contra o código real (não a nota do Executor) — tabelas acima
- [x] Nenhum achado de severidade alta/crítica em aberto
- [x] Todo achado de compliance obrigatório (LGPD) resolvido — nenhum achado
      de compliance nesta rodada
- [x] Achado de baixa/média severidade registrado como débito com prazo/dono —
      `SEC-DEBT-001` (reclassificado, Baixa, dono Coordenador/DevOps via
      `BLOCKERS.md` Bloqueio 009)
- [x] Requisitos de segurança operacional para o DevOps definidos — nenhum
      novo além da recomendação de decommissioning já registrada
- [x] Achado de relevância estratégica sinalizado ao Gestor — não aplicável,
      nenhum achado desta natureza nesta rodada

**Veredito final do lote "Autenticação & Segurança" do ponto de vista de
DevSecOps: Aprovado, com débito de baixa severidade (`SEC-DEBT-001`,
reclassificado nesta rodada), não bloqueante.**
