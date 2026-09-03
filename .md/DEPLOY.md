# DEPLOY.md

**Dono**: DevOps
**Data desta rodada**: 2026-09-02
**Atualização incremental — 2026-09-03**: adição do runbook de disaster recovery
(drill de restauração, §6.3), por determinação explícita do CTO tratando a lacuna
de DR como **prioridade imediata deste ciclo**, não item de calendário indefinido
(`CTO-REVIEW.md`, seção "Revisão de Segurança do Lote MVP (SECURITY-REVIEW.md) —
2026-09-03", item 3; `BLOCKERS.md` Bloqueio 011, achado original em
`SECURITY-REVIEW.md` Seção 1.3). Nenhuma outra seção deste documento foi reaberta
nesta atualização.
**Gate de entrada**: `SDD.md` aprovado com ressalvas no Gate 2 do CTO (2026-09-02).
Conforme `EXECUTION-FLOW.md` ("DevOps prepara desde o início, deploya só no fim") e
`devops.md`, `infrastructure-as-code-provisioning` e `cicd-pipeline-configuration`
disparam no instante zero da execução, em paralelo à implementação — **não esperam
nenhum build terminar**.
**Gate de saída (desta rodada)**: nenhum — este documento é atualizado
incrementalmente a cada execução real de deploy. A seção "Execuções de Deploy"
(§9) só ganha entradas depois da dupla aprovação (QA + DevSecOps) do mesmo build,
conforme `deployment-execution`.
**Fonte**: `SDD.md` Seção 3 (Stack Tecnológica), Seção 6 (Riscos e Dívida
Técnica), Seção 7 (Segurança); `GUARDRAILS.md` (G-11, G-14, G-15); `TASK.md`
Seção 1 (DIR-07, DIR-08, DIR-30) e Seção 3 (FE-M-00); `ADR-002`, `ADR-003`,
`ADR-009`.
**Consumidor**: `cto` (Gate 4, ao final do ciclo).

---

## 0. Status desta rodada

Esta é a rodada de **preparação** (`infrastructure-as-code-provisioning` +
`cicd-pipeline-configuration`), rodando em paralelo à implementação (Backend está
em `SPK-001`, Frontend ainda não iniciou `FE-M-00`). **Nenhum deploy real
aconteceu ainda** — não há dupla aprovação (QA + DevSecOps) de nenhum build.
Nada nesta rodada envolve o schema/tabelas do Supabase (fora do meu escopo e do
escopo do spike em andamento); o trabalho aqui é inteiramente sobre hospedagem do
frontend estático e pipeline de CI/CD, conforme `SDD.md` Seção 3.

| Item | Status |
|---|---|
| IaC de hospedagem do frontend (`vercel.json`) | Provisionado (código) |
| Pipeline de CI/CD (`.github/workflows/frontend-ci-cd.yml`) | Configurado (código) |
| Deploy em staging | Pendente — pipeline pronto, aguarda `frontend/package.json` existir (FE-M-00) e credenciais reais do Vercel (ver `BLOCKERS.md`) |
| Deploy em produção | Pendente — bloqueado por definição até dupla aprovação (QA + DevSecOps) do mesmo build |
| Observabilidade | Pendente — será configurada em `observability-setup`, junto ao primeiro deploy real |
| Validação de NFR contra infraestrutura real | Pendente — depende de deploy real existir (`non-functional-requirement-validation`) |
| Rollback (frontend, Vercel) | **Documentado, ainda não testado** — teste real só é possível após o primeiro deploy em staging (ver §6.1/6.2) |
| Disaster Recovery (banco de dados, Supabase) — drill de restauração | **Runbook documentado (§6.3). Execução real bloqueada** — depende de `BLOCKERS.md` Bloqueio 011 (Backend ainda não conectou `schema-baseline-legacy.sql`/`config.toml`, verificado nesta rodada) e Bloqueio 007 (credenciais reais de bucket S3, pendentes do stakeholder); ver também Bloqueio 012 (novo, achados de completude do dump de schema) |

---

## 1. Infraestrutura como Código — Hospedagem do Frontend

### 1.1 Escolha de provedor

`SDD.md` Seção 3 deixa a hospedagem do frontend como "CDN estático (Vercel/
Cloudflare Pages, free tier)" sem decidir entre os dois (linha "Gate 2? Não" —
não foi tratada como decisão estrutural que exigisse ADR). Como DevOps, escolhi
**Vercel** como provedor primário para esta rodada, por:

- Suporte nativo de primeira classe a deploy via CLI dentro de GitHub Actions
  (`vercel pull` / `vercel build` / `vercel deploy` / `vercel promote` /
  `vercel rollback`), o que permite estágios explícitos de staging → produção
  controlados pelo pipeline (em vez de depender só do auto-deploy implícito do
  Git integration nativo).
- Rollback instantâneo por realiasing de deployment imutável, disponível no
  tier gratuito (Hobby) — sem rebuild, dentro do requisito de "rollback testado,
  não só documentado" (ver §6).
- Enquadra-se em free tier, RNF-09 (usuário único, custo mínimo), sem violar
  G-14/G-15 (nenhum servidor de aplicação dedicado, nenhuma infraestrutura
  multi-região é introduzida — é hospedagem estática pura).

**Esta escolha é uma decisão de implementação dentro do que `SDD.md` já permite
(ambas as opções eram aceitáveis), não uma mudança de arquitetura.** Ainda assim,
como não há confirmação do stakeholder sobre eventual conta/preferência já
existente em algum dos dois provedores, e como a criação da conta real e das
credenciais de deploy está fora do meu alcance, **isso está registrado como
pendência em `BLOCKERS.md`** (não presumido como resolvido). Se o stakeholder já
tiver conta em um dos dois, ou preferir Cloudflare Pages, a migração é barata:
troca-se `frontend/vercel.json` por `frontend/wrangler.toml` e os steps de deploy
do workflow por `wrangler pages deploy` — o restante do pipeline (lint, teste,
build, gate de dupla aprovação, ambientes) não muda.

### 1.2 Arquivo de configuração

`frontend/vercel.json` (código, versionado):

- `framework: "vite"` — ver §1.3 sobre a assunção de build tool.
- `outputDirectory: "dist"`, `installCommand: "npm ci"`, `buildCommand: "npm run build"`.
- `rewrites`: toda rota que não seja asset estático/service worker cai em
  `/index.html` — necessário para o roteamento client-side de uma SPA React.
- `headers`: cabeçalhos de hardening básico (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` restringindo
  câmera/microfone a same-origin — usados por RF-F3-01/02, EXT-01/EXT-02) e
  cache-control (`sw.js`/`manifest.webmanifest` sempre revalidados; assets com
  hash no nome cacheados agressivamente).
- **Não inclui `Content-Security-Policy`** — CSP depende de quais domínios
  externos o app efetivamente chama (STT/OCR/Pluggy/Supabase), que é uma
  decisão que cruza com o trabalho do DevSecOps (`security-architecture-
  definition`/hardening). Assim que `SECURITY-REVIEW.md` ou um requisito de
  segurança operacional do DevSecOps estiver disponível, incorporo aqui (skill
  `infrastructure-as-code-provisioning`, workflow item 4: "Incorpore requisito
  de segurança operacional do DevSecOps assim que disponível").

### 1.3 Assunção de estrutura de projeto e build tool

Como nenhum código de frontend existe ainda (só `.md/`, `.claude/` e
`supabase/.temp/` no repositório nesta data), assumi, para poder escrever IaC e
pipeline executáveis:

- **Diretório**: app do frontend vive em `frontend/` na raiz do repositório
  (separado de `supabase/`, que é o código do backend-as-code do Tech Lead/
  Backend).
- **Build tool**: **Vite** (não Next.js) — `TASK.md` DIR-30 já cita a convenção
  `VITE_*` para variável de ambiente exposta ao bundle, e Vite é o par natural
  de React + TypeScript + Tailwind + Workbox (`vite-plugin-pwa`) para uma SPA
  100% estática (ADR-003), sem exigir runtime Node de servidor (consistente com
  G-14 — Next.js em modo SSR exigiria isso; Next.js em modo `output: "export"`
  seria equivalente a Vite mas sem necessidade real de suas features de
  servidor).
- Scripts de `package.json` assumidos: `lint`, `test`, `build` — nomes-padrão
  que o pipeline (`.github/workflows/frontend-ci-cd.yml`) invoca via `npm run
  lint` / `npm test` / `npm run build`.

**Esta é uma assunção meu, não uma decisão validada com o Frontend/Tech Lead.**
Se `FE-M-00` (scaffold, `TASK.md`) escolher outro diretório, build tool ou nomes
de script, os únicos arquivos a ajustar são `frontend/vercel.json` e os
`working-directory`/comandos do workflow — nada na infraestrutura de hospedagem
em si muda. Sinalizado como item de atenção não-bloqueante em `BLOCKERS.md`.

---

## 2. Pipeline de CI/CD

Arquivo: `.github/workflows/frontend-ci-cd.yml` (GitHub Actions, já que o
repositório é GitHub).

### 2.1 Estágios

```
bootstrap-check → lint → teste automatizado → build → deploy staging (auto)
                                                     → promote produção (manual, pausa sempre)
                                                     → rollback produção (manual)
```

| Estágio | Gatilho | Falha bloqueia? |
|---|---|---|
| `bootstrap-check` | Todo push/PR/dispatch | Não bloqueia — só decide se os demais jobs rodam (ver §2.2) |
| Lint | Push em `main`, Pull Request | Sim |
| Teste automatizado | Push em `main`, Pull Request | Sim (roda com `--passWithNoTests` — ver §2.3) |
| Build | Push em `main`, Pull Request | Sim |
| Deploy staging | Push em `main`, após lint+teste+build passarem | Sim (não promove build quebrado) |
| Promote produção | Manual (`workflow_dispatch`), nunca automático | Sim, e exige `deployment_url` explícito |
| Rollback produção | Manual (`workflow_dispatch`) | Sim |

### 2.2 Estado de bootstrap (projeto ainda sem código de frontend)

Como `frontend/package.json` ainda não existe, os jobs de lint/teste/build/
deploy ficam com `if: needs.bootstrap-check.outputs.scaffolded == 'true'` — não
rodam ainda, e o job `bootstrap-check` emite um aviso (`::warning::`) explicando
o motivo. **Isso não é o mesmo que um soft-fail de estágio real** (proibido por
`cicd-pipeline-configuration`): nenhum estágio "roda e ignora falha" — o
pipeline inteiro reconhece que o artefato a testar/buildar/deployar ainda não
existe. No momento em que `FE-M-00` for mesclada em `main` com
`frontend/package.json`, o pipeline passa a rodar de verdade em todo push
subsequente, com falha real bloqueando normalmente.

### 2.3 Testes automatizados com cobertura ainda baixa

A tarefa pediu que "o pipeline deve rodar mesmo com poucos testes ainda". A
etapa de teste roda `npm test -- --passWithNoTests` — o estágio existe e é
executado a cada push (não é pulado "porque ainda não tem teste"), mas não
quebra o pipeline só por ausência de arquivo de teste. Assim que houver
qualquer teste que falhe de verdade, o estágio falha normalmente. Justificativa
registrada aqui explicitamente, conforme exigido por `cicd-pipeline-
configuration` ("MUST NOT DO: deixar um estágio soft-fail sem justificativa
explícita registrada").

### 2.4 Gestão de secrets no pipeline

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — GitHub Actions
  **Secrets** (nunca aparecem em log; GitHub mascara automaticamente qualquer
  valor de secret que vaze para stdout).
- `STAGING_ALIAS` (nome do domínio de staging, ex. `mymoney-staging.vercel.app`)
  — GitHub Actions **Variable** (não secret, não é sensível).
- Nenhum segredo de provedor externo de Fase 3 (STT cloud, OCR, Pluggy) passa
  por este pipeline — esses vivem exclusivamente em Supabase Vault/secrets do
  lado do servidor (Edge Functions), nunca em variável de build do Frontend
  (DIR-30 do `TASK.md`, G-11 do `GUARDRAILS.md`). Este pipeline nunca precisa
  conhecê-los.
- Nenhum valor real de secret está commitado neste repositório — `.gitignore`
  cobre `.env`, `.env.local`, `frontend/.vercel/`, `.vercel/`.

### 2.5 Gate de produção — dupla aprovação

`deploy-staging` roda automaticamente a cada push em `main`, sem pausa
(`EXECUTION-FLOW.md`: "Deploy em staging: sem pausa"). `promote-production` e
`rollback-production` só existem como `workflow_dispatch` — **nunca disparam
automaticamente**. Duas camadas reforçam a pausa obrigatória:

1. **Processo**: o job só deve ser disparado manualmente por mim (DevOps) depois
   de confirmar que `QA-REPORT.md` (Aprovado/Aprovado com ressalvas) **e**
   `SECURITY-REVIEW.md` (Aprovado/Aprovado com débito registrado) existem para
   o **mesmo build** — checagem de processo, documentada aqui, não
   automatizável dentro do YAML (esses artefatos são Markdown, não uma API que
   o workflow possa consultar).
2. **Configuração do GitHub Environment `production`**: precisa ter a proteção
   "Required reviewers" habilitada em Settings → Environments → `production` do
   repositório — passo manual de configuração de repositório (não expressável
   em YAML), **pendente**, registrado em `BLOCKERS.md` (requer permissão de
   admin do repositório).

---

## 3. Estratégia de Ambientes

Diferente de um projeto com backend próprio por ambiente, o Supabase deste
projeto é um **único projeto reaproveitado** (`ADR-001`) — **não existe um
Supabase de staging separado**. A separação de ambiente aqui é sobre **qual
build da UI está publicado**, não sobre o dado: staging e produção do frontend
apontam para o mesmo backend Supabase (schema `mymoney`); isolamento por usuário
já é garantido por RLS (`owner_id`), não por ambiente duplicado — coerente com
RNF-09 (usuário único, sem orçamento para infraestrutura duplicada) e com G-15
(nenhuma infraestrutura extra sem revisão do CTO).

| Ambiente | Domínio (convenção, ver `BLOCKERS.md`) | Deploy | Promoção |
|---|---|---|---|
| **Staging** | `mymoney-staging.vercel.app` (placeholder até domínio real ser confirmado) | Automático a cada push em `main`, após lint+teste+build passarem | N/A — é o próprio destino do deploy automático |
| **Produção** | `mymoney.vercel.app` ou domínio próprio (a confirmar) | **Nunca automático** — só via `promote-production` (`workflow_dispatch`), promovendo uma deployment **já validada em staging** (mesmo artefato imutável, sem rebuild) | Requer `deployment_url` explícito + dupla aprovação (QA + DevSecOps) do build + Environment protection do GitHub |

Promoção por realiasing (em vez de rebuild) garante que o que foi validado em
staging é bit-a-bit o que vai para produção — elimina a classe de incidente
"funcionou em staging, quebrou em produção por diferença de build".

---

## 4. Variáveis de Ambiente

Nomes apenas — nenhum valor real de segredo neste documento nem em nenhum
arquivo versionado (`frontend/.env.example` documenta o mesmo, com comentários).

| Variável | Onde vive | Pública no bundle? | Observação |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Painel Vercel, por ambiente | Sim | Pública por design (URL do projeto Supabase) |
| `VITE_SUPABASE_ANON_KEY` | Painel Vercel, por ambiente | Sim | Pública por design — autorização real vem de RLS (G-04), não do sigilo da chave |
| `VITE_APP_ENV` | Painel Vercel, por ambiente | Sim | Só para exibição/telemetria (ex. badge "staging"), nunca para decisão de autorização |
| `VITE_VAPID_PUBLIC_KEY` | Painel Vercel, por ambiente | Sim | Chave pública de Web Push (EXT-05); a chave privada correspondente é secret server-side, fora do escopo deste documento |
| `VERCEL_TOKEN` | GitHub Actions Secret | Não | Usado só pelo pipeline para autenticar CLI |
| `VERCEL_ORG_ID` | GitHub Actions Secret | Não | Identifica a conta/organização Vercel |
| `VERCEL_PROJECT_ID` | GitHub Actions Secret | Não | Identifica o projeto Vercel |
| `STAGING_ALIAS` | GitHub Actions Variable (não secret) | Não | Domínio de staging, valor não sensível |

Segredos de provedor externo de Fase 3 (STT cloud, OCR Google/AWS, Pluggy) **não
aparecem nesta tabela** — são responsabilidade do Backend/Supabase (Edge
Functions + Vault), fora do escopo de hospedagem do frontend (DIR-30, G-11).

---

## 5. Observabilidade

**Pendente nesta rodada** — fora do escopo explícito desta tarefa (que cobriu
`infrastructure-as-code-provisioning` + `cicd-pipeline-configuration`). Será
configurada via `observability-setup` junto ao primeiro deploy real, e inclui no
mínimo:

- Logs de build/deploy do Vercel (nativos, incluídos no free tier).
- Vercel Analytics (Web Vitals) — free tier, sem custo adicional.
- Log de execução do job diário de export lógico de backup (`pg_cron` + Edge
  Function, ADR-009/DIR-31/DIR-32), com alerta se não rodar em >26h — já
  desenhado no `SDD.md`/`TASK.md`, mas a configuração do alerta em si é tarefa
  de `observability-setup`, não desta rodada.
- Logs nativos do Supabase (Edge Functions, Postgres) — já incluídos no plano
  do projeto legado.

Nenhum deploy será considerado "concluído com sucesso" (Critério de Pronto do
`devops.md`) sem essa etapa ativa — registrado aqui como pendência explícita,
não como item esquecido.

---

## 6. Estratégia de Rollback

**Documentada nesta rodada; teste real fica pendente até o primeiro deploy em
staging existir** (não há o que testar rollback de um deployment que ainda não
foi feito) — consistente com o guardrail "rollback 'na teoria' não conta": o
plano abaixo será executado e confirmado na próxima rodada (`deployment-
execution`), antes de qualquer deploy em produção.

### 6.1 Mecanismo

- Toda deployment do Vercel é **imutável** — cada `vercel deploy` gera uma URL
  própria que nunca muda de conteúdo.
- **Staging → Produção**: promoção por realiasing (`vercel promote
  <deployment_url>`) — não é rebuild, é apontar o domínio de produção para uma
  deployment já existente e já validada.
- **Rollback de produção**: `vercel rollback` (sem argumento) volta
  automaticamente para a deployment de produção imediatamente anterior — no
  plano gratuito (Hobby), esse é o único passo disponível (limite documentado
  do free tier: só a deployment anterior, não um histórico arbitrário) —
  suficiente para um produto de usuário único com cadência de deploy baixa.
- Tempo estimado de rollback: segundos (realiasing de DNS/edge, sem rebuild) —
  bem dentro de qualquer RTO razoável para o frontend (o RTO ≤ 24h do `SDD.md`
  Seção 1/ADR-009 é sobre o banco, não sobre o frontend estático).

### 6.2 Plano de teste (a executar na próxima rodada, antes do primeiro deploy em produção)

1. Fazer um deploy de staging.
2. Fazer um segundo deploy de staging com uma mudança trivial e visível (ex.
   alterar um texto).
3. Promover a segunda deployment para produção (`promote-production`).
4. Executar `rollback-production` e confirmar visualmente que a produção volta
   a servir a primeira deployment.
5. Registrar o resultado desse teste em `DEPLOY.md` §9 antes de liberar
   qualquer deploy real de produção — só depois disso o rollback deixa de ser
   "documentado" e passa a ser "testado", conforme exigido pelos Critérios de
   Pronto deste agente.

### 6.3 Disaster Recovery (Banco de Dados, Supabase) — Runbook de Drill de Restauração

**Escopo diferente de §6.1/6.2.** Rollback de frontend (acima) resolve "a última
deployment quebrou" em segundos, por realiasing — não endereça "o projeto Supabase
foi perdido/corrompido". Esta subseção cobre exclusivamente o segundo cenário:
reconstituir schema + dado de um snapshot criptografado de `backup-export`
(`BE-M-10`, ADR-009) do zero, em um projeto novo. É a peça que faltava para o RPO/RTO
≤ 24h do `ADR-009` deixarem de ser "mecanismo implementado" e passarem a ser
"cobertura real comprovada" — nas palavras do próprio CTO ao priorizar isto
(`CTO-REVIEW.md`, "Revisão de Segurança do Lote MVP", item 3).

#### 6.3.1 Por que isto existe agora (rastreabilidade)

- **Achado original**: `SECURITY-REVIEW.md` Seção 1.3 (Achado #3) — `schema-baseline-legacy.sql`
  (schema real herdado: tabelas, functions, triggers, policies) não é referenciado por
  nenhuma migration nem por `supabase/config.toml` (`schema_paths = []`); o backup diário
  de `BE-M-10` captura só **dado** (`select * from` cada tabela), nunca DDL. Mesmo com o
  backup de dado funcionando perfeitamente, não haveria onde restaurá-lo.
- **Decisão de priorização**: `BLOCKERS.md` Bloqueio 011 — o CTO rejeitou tratar isto como
  "resolver só antes do primeiro deploy em produção real" (o banco **já é produção hoje**,
  contém dado real herdado desde o Bloqueio 003) e fixou como prioridade imediata deste
  ciclo, delegando a Backend (fechar a lacuna de schema, a seu critério técnico: `schema_paths`
  vs. estender `backup-export` para `pg_dump` completo) e a mim, DevOps (agendar e executar
  um drill real de restauração assim que resolvido, coordenado com o Bloqueio 007).
- **Dependência externa distinta**: Bloqueio 007 (credenciais reais de bucket S3-compatível,
  só o stakeholder pode provisionar) é uma dependência de terceiro que ninguém deste
  pipeline pode acelerar. Bloqueio 011 não tem essa dependência — é execução interna de
  Backend/DevOps. O CTO registrou explicitamente que "RPO ≤ 24h verdadeiro desde já" só se
  torna literalmente verdadeiro depois que **os dois** (007 e 011) estiverem resolvidos.

#### 6.3.2 Status verificado nesta rodada (2026-09-03) — mecanismo ainda não decidido por Backend

Antes de escrever este runbook, verifiquei diretamente (não presumi) se Backend já havia
resolvido o Bloqueio 011, conforme pedido — procurei em `TASK.md`/`BLOCKERS.md` por uma
atualização, e inspecionei os artefatos reais:

| Verificação | Resultado |
|---|---|
| `supabase/config.toml`, campo `schema_paths` | Ainda `[]` — não referencia `schema-baseline-legacy.sql` |
| `TASK.md`/`BLOCKERS.md` | Nenhuma entrada nova cobrindo a resolução do Bloqueio 011 (última entrada é o próprio veredito de priorização do CTO) |
| Timestamp de `schema-baseline-legacy.sql`/`config.toml` | 2026-09-02, anterior às últimas edições de `TASK.md`/`BLOCKERS.md` (2026-09-03) — nenhuma mudança posterior à decisão do CTO |
| `supabase/functions/backup-export/index.ts`/`lib.ts` | Ainda fazem só `select * from` por tabela (`BACKUP_TABLES`) — nenhuma captura de DDL/`pg_dump` completo |

**Conclusão**: o mecanismo real (`schema_paths` apontando para um dump corrigido vs.
`backup-export` estendido para `pg_dump` completo por snapshot) **ainda não foi escolhido
por Backend** no momento desta rodada. Por isso o runbook abaixo é escrito para funcionar
sob **qualquer um dos dois cenários** (ramificação explícita no Passo 2), em vez de
presumir um deles. **Esta subseção precisa ser revisada e o Passo 2 colapsado para o
cenário real assim que `TASK.md`/`BLOCKERS.md` registrarem a resolução do Bloqueio 011** —
não trato isto como decisão minha (fora da minha autoridade decidir arquitetura de backup,
conforme guardrail deste agente).

#### 6.3.3 Achado adicional desta rodada — Bloqueio 012 (novo, aberto abaixo)

Inspecionei o conteúdo real de `schema-baseline-legacy.sql` (1317 linhas) para poder
escrever um runbook preciso, não hipotético. Confirmei que ele **já contém**
`CREATE TABLE`, `CREATE OR REPLACE FUNCTION`, `CREATE OR REPLACE TRIGGER` (11 triggers
sobre as 7 tabelas legadas) e `CREATE POLICY`/`GRANT` para o schema `public` — mais
completo do que uma leitura superficial sugeriria. Mas **três lacunas concretas**
impediriam uma restauração completa mesmo depois de `schema_paths` ser corrigido, porque
nenhuma delas está no arquivo:

1. **Nenhum `CREATE EXTENSION`** — `pg_cron`, `pgcrypto`, `uuid-ossp`, `supabase_vault`,
   `pg_stat_statements` (confirmadas ativas no projeto real, `AUDITORIA-BE-M-00.md` Seção
   11) não aparecem no dump. `set_pin`/`verify_pin` (`schema-baseline-legacy.sql:389-421,
   574-...`) dependem de `extensions.crypt`/`extensions.gen_salt` (pgcrypto) — falhariam em
   um banco novo sem a extensão instalada primeiro.
2. **Trigger `on_auth_user_created` em `auth.users` não está no arquivo** — só é citado em
   comentário (`schema-baseline-legacy.sql:788`, "Estende auth.users... criada
   automaticamente pelo trigger on_auth_user_created"). É um objeto cross-schema
   (`auth.users`, não `public`) — plausivelmente fora do escopo de um dump `--schema=public`.
   Sem ele, `handle_new_user()` nunca dispara e nenhuma linha nova aparece em
   `public.profiles` para um usuário recriado via Auth.
3. **`cron.schedule` do job legado `fn-clear-due-transactions` (`*/15 * * * *`) não está
   versionado em lugar nenhum do repositório** — existe hoje só como estado ao vivo do
   projeto real (`AUDITORIA-BE-M-00.md` Seção 11), nunca capturado como DDL. Sem
   reagendá-lo manualmente, a promoção `pending`→`cleared` (RN-11) simplesmente não
   aconteceria no ambiente restaurado.

Isto não é uma correção que eu, DevOps, deva fazer sozinho (decidir o conteúdo definitivo
do artefato de schema é competência de Backend, dono do artefato, mesmo princípio já
aplicado ao Bloqueio 011 original). Registro como **Bloqueio 012** em `BLOCKERS.md`
(abaixo), escalado a Backend, para que essas três lacunas sejam fechadas como parte da
mesma correção do Bloqueio 011 — senão o drill vai falhar de forma previsível nesses três
pontos específicos, mesmo depois de `schema_paths`/`config.toml` estarem corrigidos.

#### 6.3.4 Pré-condições para executar o drill (todas devem ser verdadeiras)

- [ ] Bloqueio 011 resolvido — Backend escolheu e implementou um mecanismo real (Passo 2
      abaixo colapsado para o cenário efetivo).
- [ ] Bloqueio 012 resolvido — as três lacunas de §6.3.3 fechadas (extensions, trigger
      `on_auth_user_created`, `cron.schedule` do job legado), ou explicitamente aceitas
      como fora de escopo com um bootstrap manual documentado equivalente.
- [ ] Bloqueio 007 resolvido — credenciais reais de bucket S3-compatível configuradas via
      `supabase secrets set` (nunca commitadas), para o Passo 4 poder baixar um snapshot
      real.
- [ ] Ambiente de teste isolado disponível (Passo 1) — **nunca** o projeto de produção
      real (`xrcxbzrglndetrrhavhc`).

**Status nesta rodada: nenhuma das quatro pré-condições está satisfeita.** Por isso o
drill real **não foi executado** — nem em ambiente isolado, porque a primeira tentativa
falharia de forma já conhecida e não informativa (mesma lacuna de `schema_paths` vazio que
já existe em produção; testar isso de novo localmente não valida nada de novo). Executar
mesmo assim seria simular sucesso sobre uma premissa que eu sei, de antemão, que está
quebrada — o oposto do que este runbook existe para evitar. O que **já está validado**,
por leitura de código, sem precisar de ambiente novo: o par `encryptPayload`/`decryptPayload`
(`supabase/functions/backup-export/lib.ts`) tem teste automatizado de round-trip
(`lib.test.ts:106-118`, AES-256-GCM, IV de 12 bytes nunca reaproveitado) — a camada
criptográfica do backup já está coberta por teste unitário; o que o drill valida é
exatamente o que um teste unitário não alcança (reconstrução de schema real, download de
um bucket real, carga em um Postgres real).

#### 6.3.5 Procedimento passo a passo

**Passo 1 — Provisionar ambiente isolado, nunca produção.**
Duas opções, nenhuma toca o projeto `xrcxbzrglndetrrhavhc`:
- (a) Local: `supabase start` (stack Docker local, `supabase/config.toml` já define as
  portas) — mais rápido, mais barato, mas roda a versão do Postgres/extensions da imagem
  local, não necessariamente idêntica ao tier real do projeto linkado (item 6 do `SPK-001`
  segue não confirmado, `BLOCKERS.md` Bloqueio 003).
- (b) Cloud: criar um projeto Supabase novo, descartável, só para o drill (evita a
  diferença de ambiente de (a), custo marginal dentro do free tier). Recomendado para o
  drill "oficial" que vai virar o registro em §6.3.7; (a) serve para iteração rápida
  durante a correção do Bloqueio 012.
Em nenhum dos dois casos usar `supabase link` para o projeto real durante o drill — evita
qualquer comando destrutivo (`db reset`, `db push`) ser executado contra produção por
engano de contexto.

**Passo 2 — Reconstruir o schema do zero (ramificação conforme o mecanismo real de Backend).**
- **Cenário A (`schema_paths`)**: `supabase db reset` no ambiente isolado — aplica
  `schema_paths` (baseline corrigida) e depois as migrations numeradas em ordem
  cronológica (`20260902100000_be_m01_...` em diante), exatamente como o CLI já faz hoje
  para as migrations reais.
- **Cenário B (`backup-export` com `pg_dump` completo)**: aplicar o `pg_dump` mais recente
  extraído de dentro do snapshot criptografado mais recente (schema + dado juntos) —
  reduz o Passo 3 a um no-op, já que o dado vem embutido no mesmo dump.
- **Bootstrap manual complementar (necessário nos dois cenários, até o Bloqueio 012 ser
  fechado por Backend)**: instalar extensions (`create extension if not exists pg_cron;
  create extension if not exists pgcrypto; create extension if not exists "uuid-ossp";`,
  `supabase_vault`/`pg_stat_statements` já vêm por padrão em projeto Supabase novo),
  recriar o trigger `on_auth_user_created` em `auth.users` executando
  `handle_new_user()`, e reagendar `fn-clear-due-transactions` via `cron.schedule`
  (`*/15 * * * *`) — os três pontos exatos do Bloqueio 012.
- **Validação deste passo**: `\dx` (extensions instaladas), `\d public.<tabela>` para cada
  uma das 7 tabelas legadas + as criadas por migration (`budget`, `allowed_signup_emails`,
  `backup_export_log`, `webauthn_credentials`), `select * from cron.job;` (2+ jobs
  agendados: `fn-clear-due-transactions` e os 2 de `BE-M-10`), confirmar RLS habilitada em
  toda tabela de dado de usuário (`select relrowsecurity from pg_class where
  relname = '<tabela>';`).
- **Confirmar manualmente via dashboard/Management API** (não é SQL, não é capturado por
  nenhum dump): `custom_access_token_hook` habilitado nas configurações de Auth do projeto
  de teste — mesmo item que `SDD.md` Seção 7 já registra como condição de aceite não
  fechada em produção (`BLOCKERS.md`, ressalva (b) do fechamento do Bloqueio 003).

**Passo 3 — Baixar e decifrar o snapshot mais recente (só necessário no Cenário A; no
Cenário B já veio embutido no Passo 2).**
1. Listar objetos do bucket (`GET {S3_ENDPOINT}/{S3_BUCKET}?list-type=2&prefix=mymoney-backups/`,
   mesma chamada que a rotina de rotação da própria Edge Function já faz) e pegar a chave
   mais recente (`sortKeysNewestFirst`, já implementada e testada em `lib.ts`).
2. Baixar o objeto (`GET`, mesmas credenciais `aws4fetch`).
3. Decifrar com um script pequeno reaproveitando `importAesKey`/`decryptPayload` de
   `lib.ts` (mesma chave `BACKUP_ENCRYPTION_KEY` usada para cifrar — nunca gerar uma nova)
   — resultado esperado: `{ generated_at, tables: { <nome>: [...] } }`.
4. **Nunca decifrar em uma máquina/ambiente que não seja o do próprio drill isolado** — o
   payload decifrado contém dado financeiro real (mesmo que de um único usuário);
   descartar o arquivo decifrado ao final do Passo 6.

**Passo 4 — Carregar o dado decifrado no schema reconstruído.**
1. Ordem de carga respeitando FK (evita violação de constraint por causa da ordem):
   `profiles` → `categories`/`accounts`/`payment_methods` → `transactions`/`budget`/
   `webauthn_credentials`/`email_mfa_challenges`/`allowed_signup_emails`.
2. **Ponto de atenção não óbvio, a validar no drill**: `transactions` tem o trigger
   `transactions_maintain_account_balance` (`AFTER INSERT OR DELETE OR UPDATE`) que chama
   `apply_transaction_effect` para manter `accounts.current_balance_cents` — um `INSERT`
   direto das linhas do backup vai **disparar esse trigger normalmente**, o que é o
   comportamento correto (o saldo final deve bater com o snapshot), mas só se
   `accounts.current_balance_cents` tiver sido inicializado por `accounts_init_current_balance`
   (`BEFORE INSERT`) com o `initial_balance_cents` correto **antes** de as transações serem
   inseridas — ou seja, a ordem de carga acima (accounts antes de transactions) não é só
   sobre FK, é sobre o resultado aritmético final estar certo. Validar isso é parte
   explícita do critério de sucesso do drill (Passo 5, item 3), não uma suposição.
3. Carregar via `service_role` (mesmo client que a própria Edge Function usa para
   exportar) — necessário para ignorar RLS na carga (linhas de todos os usuários).

**Passo 5 — Validação pós-restauração (critério de sucesso do drill).**
1. Contagem de linhas por tabela bate exatamente com o `tables.<nome>.length` do payload
   decifrado — nenhuma tabela de `BACKUP_TABLES` (`lib.ts:12-22`) ficou de fora.
2. RLS segue de fato aplicada — testar uma query autenticada como o usuário restaurado
   contra uma tabela de outro `user_id` sintético (não deve retornar linha nenhuma).
3. `accounts.current_balance_cents` de cada conta bate com o valor esperado (soma de
   `initial_balance_cents` + efeito de todas as `transactions` `cleared`/`pending`
   restauradas) — valida o ponto de atenção do Passo 4.2.
4. RPCs de dashboard (`get_month_provision`, `get_monthly_category_summary`) executam sem
   erro e retornam valor coerente com o dado restaurado.
5. Um login de teste (usuário sintético, nunca a credencial real do stakeholder) consegue
   passar pelo fluxo completo (login → MFA por e-mail → desbloqueio → tela de dashboard)
   contra o ambiente restaurado — confirma que `custom_access_token_hook` e o trigger de
   `auth.users` (Passo 2) estão de fato funcionais, não só presentes.
6. Tempo total decorrido do Passo 1 ao Passo 5 registrado e comparado contra RTO ≤ 24h
   (`ADR-009`) — deve ficar ordens de grandeza abaixo disso; se não ficar, é um achado a
   reportar ao Software Architect (RTO real diferente do estimado), não a ignorar.

**Passo 6 — Encerramento e limpeza.**
1. Apagar o arquivo decifrado local (Passo 3.3) e qualquer cópia temporária do payload em
   texto claro.
2. Destruir o projeto/ambiente isolado do Passo 1 (ou, se local via `supabase stop`, sem
   deixar volume Docker órfão com dado real).
3. Registrar o resultado em §6.3.7 (tabela de execuções) — sucesso, falha parcial (com o
   passo exato que falhou) ou falha total, nunca "presumido OK" sem os 6 itens do Passo 5
   confirmados individualmente.

#### 6.3.6 Cadência recomendada

Não é um evento único. Recomendo repetir o drill: (a) sempre que `schema-baseline-legacy.sql`
ou o mecanismo de captura de schema mudar de forma material; (b) a cada nova migration que
altere trigger/function citado no Passo 5.3 (risco de saldo); (c) no mínimo trimestralmente,
mesmo sem mudança de schema, para capturar drift silencioso (ex.: extension nova instalada
manualmente no projeto real e nunca versionada). Este documento é o registro vivo — cada
execução vira uma linha nova em §6.3.7, nunca substitui a anterior.

#### 6.3.7 Execuções do Drill de DR

Nenhuma execução ocorreu ainda — pré-condições de §6.3.4 não satisfeitas nesta rodada.

| Data | Ambiente | Cenário (A/B) | Resultado | RTO medido | Achados |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

---

## 7. Validação de Requisitos Não Funcionais (pendente)

Fora do escopo desta rodada (skill `non-functional-requirement-validation`,
disparada junto ao deploy real). Fica registrado aqui como lembrete do que
precisa ser confirmado assim que houver infraestrutura real:

- Disponibilidade "melhor esforço" (sem SLA formal, `ADR-009`) — compatível com
  o SLA público do Vercel free tier; nada a provisionar além do já feito.
- RPO ≤ 24h / RTO ≤ 24h (`ADR-009`) — dizem respeito ao banco (Supabase), não ao
  frontend estático; fora do escopo de hospedagem do frontend, mas a
  confirmação de que o job diário de export (DIR-31/DIR-32) está de fato
  rodando com alerta ativo é pré-requisito para eu considerar qualquer deploy
  de produção "seguro" — acompanhar quando o Backend implementar essa peça.
- Volume de referência (RNF-09, 60–120 lançamentos/mês) — não impõe exigência
  de escala sobre a hospedagem estática do frontend (CDN serve o mesmo shell
  estático independente de volume de lançamento).

---

## 8. Limites e Guardrails Respeitados Nesta Rodada

- Nenhum servidor de aplicação dedicado introduzido (G-14/DIR-07) — hospedagem
  é puramente estática (CDN), toda lógica de servidor continua em Supabase
  Edge Functions/`pg_cron`, fora do escopo deste documento.
- Nenhuma infraestrutura multi-região ou cache dedicado (Redis) introduzida
  (G-15/DIR-08).
- Nenhum secret em texto plano em nenhum arquivo versionado — só nomes/
  placeholders (§4).
- Nenhuma migration/schema do Supabase foi tocada ou assumida nesta rodada —
  fora do escopo deste agente e ainda bloqueado por G-01/DIR-02 (SPK-001 em
  andamento pelo Backend).
- Nenhum deploy de produção foi executado ou agendado automaticamente —
  `promote-production`/`rollback-production` só existem como ação manual.

---

## 9. Execuções de Deploy

Nenhuma execução de deploy real ocorreu nesta rodada — pipeline provisionado,
aguardando (a) `frontend/package.json` existir (FE-M-00) e (b) credenciais reais
do Vercel (ver `BLOCKERS.md`). Tabela preenchida a partir da primeira execução
real de `deployment-execution`.

| Versão/commit | Ambiente | Horário | Resultado |
|---|---|---|---|
| — | — | — | — |

## 10. Incidentes Pós-Deploy

Nenhum ainda — não há deploy em produção.

## 11. Fechamento do Ciclo (Gate 4)

**Não aplicável nesta rodada.** Gate 4 só fecha depois de um deploy de produção
real, sua janela de observação (padrão 24h) e o veredito final. Esta rodada é
reportada ao CTO como **preparação concluída, deploy pendente de dupla
aprovação** — não como fechamento de ciclo.

---

## Checklist de Pronto — status nesta rodada

- [x] Todo componente da Seção 3 do `SDD.md` relevante à hospedagem do
      frontend tem definição de IaC correspondente (`frontend/vercel.json`)
- [x] Staging e produção derivam da mesma base de IaC (mesmo `vercel.json`,
      mesmo pipeline; diferença é só o momento de promoção, sem rebuild)
- [x] Todos os estágios (build, lint, teste, deploy) configurados no pipeline
- [x] Nenhum segredo em texto plano na definição de infraestrutura/pipeline
- [x] Gate de produção exige ação manual (`workflow_dispatch`) + Environment
      protection pendente de configuração (registrado em `BLOCKERS.md`) — nunca
      deploy automático
- [ ] Build em produção — **pendente**, aguarda dupla aprovação
- [ ] Observabilidade ativa — **pendente**, próxima rodada
- [ ] Rollback (frontend, Vercel) testado (não só documentado) — **pendente**,
      plano em §6.2
- [ ] Disaster Recovery (banco de dados) — runbook de drill de restauração
      **documentado nesta rodada (§6.3)**; execução real **pendente** de
      `BLOCKERS.md` Bloqueio 011 (Backend, wiring do schema), Bloqueio 012 (novo,
      Backend, completude do dump — extensions/trigger `on_auth_user_created`/
      `cron.schedule` legado) e Bloqueio 007 (stakeholder, credenciais S3)
- [ ] Infraestrutura validada contra NFR do `SDD.md` — **pendente**, depende de
      deploy real
- [ ] Nenhum incidente crítico na janela pós-deploy — **N/A**, sem deploy ainda
- [ ] Resultado reportado ao CTO (Gate 4) — **N/A nesta rodada**; este
      documento em si é o reporte de status da preparação
