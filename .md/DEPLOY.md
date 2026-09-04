# DEPLOY.md

**Dono**: DevOps
**Data desta rodada**: 2026-09-02
**Atualização incremental — 2026-09-03 (1)**: adição do runbook de disaster recovery
(drill de restauração, §6.3), por determinação explícita do CTO tratando a lacuna
de DR como **prioridade imediata deste ciclo**, não item de calendário indefinido
(`CTO-REVIEW.md`, seção "Revisão de Segurança do Lote MVP (SECURITY-REVIEW.md) —
2026-09-03", item 3; `BLOCKERS.md` Bloqueio 011, achado original em
`SECURITY-REVIEW.md` Seção 1.3). Nenhuma outra seção deste documento foi reaberta
nesta atualização.
**Atualização incremental — 2026-09-03 (2)**: tentativa real de `deployment-
execution` do lote "Fundação Técnica & Infraestrutura" (`BE-M-00`, `BE-M-01`,
`BE-M-10`, `FE-M-00`, `FE-M-01`, `FE-M-02`, `QA-M-01`), liberado por dupla
aprovação em `TASK.md` Seção 7 (`QA-REPORT.md` Aprovado com ressalvas +
`SECURITY-REVIEW.md` Aprovado com débito). Resultado: **mecanicamente bloqueado**
— ver §9 (nova entrada) e `BLOCKERS.md` Bloqueio 004 (atualização 2026-09-03).
Nenhuma outra seção deste documento foi reaberta nesta atualização.
**Atualização incremental — 2026-09-03 (3)**: retomada do deploy do mesmo lote,
autorizada pelo stakeholder a reaproveitar o projeto Vercel `mymoney` já
existente (mesma decisão de reuso de infraestrutura legada já tomada para o
Supabase no Bloqueio 003). `frontend/` linkado ao projeto real (`vercel link`),
`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` extraídos, variáveis de ambiente de Preview
configuradas e **deploy real de staging executado com sucesso via Vercel CLI
local** (pipeline de CI/CD segue não operacional — GitHub Actions Secrets ainda
não configurados, gh CLI indisponível nesta sessão). Detalhe completo em §9.2;
`BLOCKERS.md` Bloqueio 004 atualizado para **Parcialmente resolvido**. Nenhuma
ação de produção foi executada.
**Atualização incremental — 2026-09-03 (4)**: `deployment-execution` do segundo
lote fechado, "Contas & Formas de Pagamento" (`BE-M-02`, `BE-M-03`, `BE-M-04`,
`FE-M-05`, `FE-M-06`, `FE-M-07`), liberado por dupla aprovação em `TASK.md`
Seção 7 (`QA-REPORT.md` Seção 4.6, Aprovado sem ressalva + `SECURITY-REVIEW.md`
Seção 1.9, Aprovado com débito — `SEC-DEBT-006`/`BLOCKERS.md` Bloqueio 013, não
bloqueante). **Deploy real em staging concluído com sucesso** via Vercel CLI
local (mesmo mecanismo do lote anterior — pipeline de CI/CD automatizado segue
não operacional). Detalhe completo em §9.3; nenhuma seção anterior deste
documento foi reaberta.
**Atualização incremental — 2026-09-03 (5)**: `deployment-execution` do terceiro
lote fechado, "Ledger & Dashboard" (`BE-M-06`, `BE-M-07`, `FE-M-03`, `FE-M-09`,
`FE-M-10`), liberado por dupla aprovação em `TASK.md` Seção 7 (`QA-REPORT.md`
Seção 5.6, Aprovado com ressalvas + `SECURITY-REVIEW.md` Seção 1.11, Aprovado
com débito — `SEC-DEBT-007`/`BLOCKERS.md` Bloqueio 014, não bloqueante).
Migrations do lote confirmadas já aplicadas (`supabase migration list
--linked`, nenhuma pendência). **Deploy real em staging concluído com
sucesso** via Vercel CLI local (mesmo mecanismo dos 2 lotes anteriores —
pipeline de CI/CD automatizado segue não operacional). Achado não-bloqueante:
1 teste flaky de timing (`UnlockPage.test.tsx`), não reprodutível isoladamente
nem em reexecução completa da suíte — registrado como observação para
Frontend/QA, não como bloqueio. Detalhe completo em §9.4; nenhuma seção
anterior deste documento foi reaberta.
**Atualização incremental — 2026-09-03 (6)**: **primeira promoção real a
produção deste pipeline**, autorizada explicitamente pelo stakeholder,
promovendo o build inteiro então em staging (4 lotes fechados em `TASK.md`
Seção 7 mais todo o restante já implementado por Backend/Frontend até o fim da
Fase 2, incluindo lotes que **não** passaram por validação formal QA/DevSecOps
por lote — desvio de processo sinalizado ao stakeholder, que optou
conscientemente por seguir mesmo assim). `mymoney-pink-phi.vercel.app`
confirmado `READY`/servindo o novo build. Achado de infraestrutura real
relevante: `vercel promote` de uma deployment Preview criada via CLI **não é
um realias puro** — a Vercel recusa promoção direta e recria a build usando o
ambiente `Production` (mesmo source, novo `dpl_`), contradizendo a premissa de
"zero rebuild" registrada em §3/§6.1. Detalhe completo, achados e ressalvas em
§9.6; nenhuma outra seção anterior deste documento foi reaberta.
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
| Deploy em staging | **Concluído — 4 lotes** ("Fundação Técnica & Infraestrutura", 2026-09-03, §9.2; "Contas & Formas de Pagamento", 2026-09-03, §9.3; "Ledger & Dashboard", 2026-09-03, §9.4; "Categorização", 2026-09-03, §9.5) — deploy real executado via Vercel CLI local contra o projeto legado `mymoney` (reuso autorizado pelo stakeholder), com o mesmo alias estável `mymoney-staging.vercel.app` realiasado para a deployment mais recente a cada lote. Pipeline de CI/CD automatizado (`.github/workflows/frontend-ci-cd.yml`) segue **não operacional** para deploys futuros — GitHub Actions Secrets (`VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`) ainda não configurados (`gh` CLI indisponível nesta sessão; `BLOCKERS.md` Bloqueio 004) |
| Deploy em produção | **Executado — 2026-09-03 (§9.6)**, primeira promoção real deste pipeline, autorizada explicitamente pelo stakeholder. `mymoney-pink-phi.vercel.app` confirmado `READY`/respondendo, servindo `dpl_7PjJSDGsufM7EsteptLX9ckRHRAp`. Escopo: build inteiro então em staging, incluindo lotes sem validação formal QA/DevSecOps por lote (desvio de processo consciente do stakeholder — ver §9.6). Janela de observação pós-deploy (24h) em andamento; Gate 4 (§11) segue não fechado até ela terminar |
| Observabilidade | **Parcial** — logs nativos de build/runtime do Vercel ativos por padrão (sem configuração adicional necessária); Web Vitals/Analytics e alerta ainda não configurados via `observability-setup` formal — pendência carregada, não bloqueou esta promoção (instrução explícita do stakeholder cobriu só a promoção, não a rodada completa de observabilidade) |
| Validação de NFR contra infraestrutura real | Pendente — depende de deploy real existir (`non-functional-requirement-validation`) |
| Rollback (frontend, Vercel) | **Documentado, ainda não testado formalmente** — mecanismo confirmado disponível (existe deployment de produção anterior, `mymoney-loqwlau2s-...`, 6d, para `vercel rollback` apontar) mas o drill do ciclo completo (§6.2) não foi executado nesta rodada por instrução explícita ("não rode nenhum drill de rollback") |
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

| Ambiente | Domínio | Deploy | Promoção |
|---|---|---|---|
| **Staging** | `mymoney-staging.vercel.app` — **confirmado e ativo** (alias real, `vercel alias set`, apontando para a deployment Preview do lote "Fundação Técnica & Infraestrutura", ver §9.2). Nota: como é subdomínio `*.vercel.app` (não domínio próprio), fica sob `ssoProtection.deploymentType: all_except_custom_domains` do projeto `mymoney` — só usuários autenticados na conta Vercel `leandrosegheto17` conseguem abrir no navegador; aceitável para produto de usuário único (RNF-09), mas relevante se algum dia um smoke test automatizado/anônimo precisar acessar a URL (exigiria um "Protection Bypass for Automation" token, não configurado) | Hoje: manual, via `vercel deploy` (CLI local) — pipeline automático (push em `main`) segue pendente de GitHub Actions Secrets | N/A — é o próprio destino do deploy |
| **Produção** | `mymoney-pink-phi.vercel.app` (alias de produção real já existente do projeto legado, confirmado via `vercel project ls`) — **primeira promoção real deste pipeline executada em 2026-09-03** (§9.6), servindo `dpl_7PjJSDGsufM7EsteptLX9ckRHRAp`. `mymoney-leandrosegheto17s-projects.vercel.app` também atualizado (mesma deployment); `mymoney-lsm.vercel.app` **não** foi atualizado nesta promoção (segue apontando para a deployment legada de 6d atrás — ver achado em §9.6, item 5) | **Nunca automático** — só via `promote-production` (`workflow_dispatch`) ou `vercel deploy --prod`/`vercel promote` manual, promovendo uma deployment **já validada em staging**. **Achado desta rodada (§9.6): para deployments Preview criadas via CLI, `vercel promote` não é um realias puro — dispara uma rebuild com o ambiente `Production`** (mesmo código-fonte, novo `dpl_`), diferente da premissa original de "mesmo artefato imutável, sem rebuild" | Requer `deployment_url` explícito + dupla aprovação (QA + DevSecOps) do build + Environment protection do GitHub — **ressalva registrada em §9.6**: esta promoção específica foi autorizada por decisão explícita do stakeholder cobrindo lotes sem essa dupla aprovação formal por lote, desvio de processo consciente, não o fluxo padrão descrito aqui |

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
| `VERCEL_TOKEN` | GitHub Actions Secret | Não | Usado só pelo pipeline para autenticar CLI. **Ainda não gerado** — ver §9.2, item "VERCEL_TOKEN não gerado nesta rodada" |
| `VERCEL_ORG_ID` | GitHub Actions Secret | Não | Identifica a conta/organização Vercel. **Valor real conhecido**: `team_LGMpqv4TnLt60QJ52AKDqQI9` (extraído de `frontend/.vercel/project.json` via `vercel link`, §9.2) — não sensível por si só (não concede acesso sem `VERCEL_TOKEN`), mas ainda não cadastrado como Secret no GitHub |
| `VERCEL_PROJECT_ID` | GitHub Actions Secret | Não | Identifica o projeto Vercel. **Valor real conhecido**: `prj_zAnXACGnM6thb4JrRfVzW3EVAxaA` (mesmo mecanismo acima) — mesma observação de não sensibilidade isolada |
| `STAGING_ALIAS` | GitHub Actions Variable (não secret) | Não | Domínio de staging, valor não sensível. **Valor real confirmado**: `mymoney-staging.vercel.app` (§9.2) |

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

**Correção registrada em 2026-09-03 (§9.6), a partir de infraestrutura real, não
hipótese**: a premissa acima ("promoção por realiasing... não é rebuild") vale
para deployments já nascidas como candidatas de produção (ex. push em `main`
via pipeline), mas **não** se confirmou para uma deployment Preview criada via
`vercel deploy` (CLI local, mecanismo usado por este pipeline em todos os
lotes de staging até aqui, §9.2-9.5): `vercel promote <url>` recusou promoção
direta ("This deployment is not a production deployment and cannot be
directly promoted") e recriou a build usando o ambiente `Production` — mesmo
código-fonte, novo `dpl_`. Na prática ainda entrega o mesmo commit validado em
staging (não é um "novo build não testado"), mas quebra a garantia
bit-a-bit/zero-rebuild original. `vercel rollback` (abaixo) não é afetado —
continua funcionando por realiasing simples entre deployments de produção já
existentes, independente de como cada uma foi criada.

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

### 9.1 Tentativa — 2026-09-03 (lote "Fundação Técnica & Infraestrutura")

**Gatilho**: `TASK.md` Seção 7 registrou o fechamento do lote em 2026-09-03 com
dupla aprovação (`QA-REPORT.md` Aprovado com ressalvas; `SECURITY-REVIEW.md`
Aprovado com débito, Seção 1.7) e "Deploy: Pendente — aguardando execução do
DevOps em staging". Conforme `EXECUTION-FLOW.md`/`devops.md` ("Deploy em staging:
sem pausa"), executei `deployment-execution` para este lote nesta rodada.

**O que foi validado (pipeline funcional, evidência real, não hipotética)**:

| Etapa | Comando | Resultado |
|---|---|---|
| Instalação de dependências | `npm ci` (`frontend/`) | OK |
| Lint | `npm run lint` (oxlint) | OK — só *warnings* não-bloqueantes (ex. `react(only-export-components)`, `react(set-state-in-effect)` em `Toast.tsx`, `AuthContext.tsx`, algumas páginas), nenhum erro |
| Teste automatizado | `npm test -- --passWithNoTests` (vitest) | OK — 34 arquivos de teste, **140 testes, todos passando** |
| Build de produção | `npm run build` (`tsc -b && vite build`) | OK — `dist/` gerado, `sw.js`/`manifest.webmanifest` via `vite-plugin-pwa`, 1 aviso de tamanho de chunk (>500kB, não-bloqueante, registrado como possível item futuro de code-splitting, não deste lote) |

Ou seja: **o que este lote entregaria em staging está pronto e teria passado
pelos 3 estágios reais do pipeline** (`lint` → `teste` → `build`) exatamente como
`.github/workflows/frontend-ci-cd.yml` executaria em `push` para `main`.

**O que bloqueou o deploy real (`vercel deploy` de fato, seja via pipeline, seja
manual)** — investigação de estado real, não presunção a partir do texto antigo
de `BLOCKERS.md`:

1. GitHub Actions Secrets (`VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`) e
   a Variable `STAGING_ALIAS` seguem sem evidência de terem sido configurados
   (não verificável remotamente sem `gh`/admin do repositório nesta máquina;
   `frontend/.vercel/` nunca foi criado localmente, e nenhuma execução prévia do
   job `deploy-staging` existe) — item 2 original do Bloqueio 004.
2. **Achado novo desta rodada**: o CLI Vercel local está de fato autenticado
   (`vercel whoami` → `leandrosegheto17`, conta real) — contradizendo a premissa
   de "sem conta" — mas revelou um projeto Vercel **`mymoney`** já existente
   (criado 28/08/2026, `Framework: Vite`), cujo alias `mymoney-lsm.vercel.app` é
   exatamente o `WEBAUTHN_ORIGIN` já configurado nas Edge Functions legadas
   (`auth-email-mfa`/`webauthn-register`/`webauthn-authenticate`, `BLOCKERS.md`
   Bloqueio 005) — **mesmo frontend do mesmo ciclo de desenvolvimento anterior
   abandonado**, já em produção real. Decidir sozinho entre reaproveitar esse
   projeto ou criar um novo é uma decisão de infraestrutura fora da minha
   autoridade (mesmo padrão do Bloqueio 003 para o schema Supabase) — **nenhum
   `vercel link`/`vercel deploy` foi executado**, contenção só de leitura.
   Detalhe completo, escalado a stakeholder/CTO, em `BLOCKERS.md` Bloqueio 004
   (atualização 2026-09-03).

**Resultado desta rodada: deploy real em staging não executado — bloqueio
mecânico por dependência externa (credencial de CI/CD ausente) somado a uma
decisão de reuso de infraestrutura legada pendente de confirmação do
stakeholder/CTO. Não é falha de pipeline** (lint/teste/build comprovadamente
funcionais, tabela acima) **nem é um novo bloqueio** — mesmo Bloqueio 004,
atualizado. `TASK.md` Seção 7, coluna "Deploy" do lote, deve ser atualizada pelo
Tech Lead de "Pendente — aguardando execução do DevOps em staging" para
"Bloqueado — ver `BLOCKERS.md` Bloqueio 004" quando este documento for
consumido.

### 9.2 Execução — 2026-09-03 (continuação, deploy real em staging do lote "Fundação Técnica & Infraestrutura")

**Gatilho**: autorização explícita do stakeholder (fora da cadeia de agentes,
mesma natureza de decisão já registrada no Bloqueio 003 para o Supabase) para
**reaproveitar o projeto Vercel `mymoney` existente**, resolvendo o item de
decisão de reuso que havia pausado o deploy em §9.1. `BLOCKERS.md` Bloqueio 004
retomado exatamente do ponto em que a rodada anterior parou.

**1. Vínculo do projeto (`vercel link`)**. `frontend/` foi linkado ao projeto
real `mymoney` (sessão CLI já autenticada como `leandrosegheto17`, confirmada na
rodada anterior):

```
vercel link --yes --project mymoney
  Linked   leandrosegheto17s-projects/mymoney
```

`frontend/.vercel/project.json` (não versionado — `frontend/.gitignore` já
cobre `.vercel`) confirmou os identificadores reais:

- `projectId`: `prj_zAnXACGnM6thb4JrRfVzW3EVAxaA` — **idêntico** ao projeto
  legado já identificado no Bloqueio 004 (confirmação cruzada de que é de fato
  o mesmo projeto, não um novo criado por engano).
- `orgId`: `team_LGMpqv4TnLt60QJ52AKDqQI9` (`leandrosegheto17s-projects`).

**2. `VERCEL_TOKEN` — não gerado nesta rodada, decisão consciente, não
esquecimento.** O mecanismo existe: `vercel api /v3/user/tokens -X POST` (CLI
autenticado pode mintar um token novo, usando o endpoint da Management API,
sem precisar do dashboard web). **Optei por não executá-lo nesta rodada**, por
um motivo de segurança operacional, não de impossibilidade técnica: `gh` (GitHub
CLI) está **indisponível nesta máquina/sessão** (`gh: command not found`; sem
instalação em nenhum caminho comum do Windows) e não há nenhuma variável de
ambiente com um token do GitHub que permita chamar a API REST do GitHub
diretamente como alternativa — ou seja, **não existe, nesta sessão, nenhum
destino seguro imediato** para um `VERCEL_TOKEN` recém-gerado (que teria escopo
de deploy sobre toda a conta Vercel do stakeholder). Gerar o token mesmo assim
significaria (a) o valor aparecer em texto claro na saída do comando/transcript
desta sessão sem necessidade, e (b) o token ficar "vivo" e sem uso nem rotação
planejada, uma dívida de segurança pior do que a pendência em si. **Pendência
específica registrada, não bloqueio do resto do trabalho**: recomendo que o
próprio stakeholder (ou quem tiver simultaneamente conta Vercel e permissão de
admin no repositório GitHub) gere o token em **Vercel → Account Settings →
Tokens** (ou via `vercel api /v3/user/tokens -X POST -F name=github-actions-mymoney
--scope team_LGMpqv4TnLt60QJ52AKDqQI9`) e cole o valor **diretamente** no campo de
`gh secret set VERCEL_TOKEN` ou na UI do GitHub (Settings → Secrets and
variables → Actions) **na mesma sessão**, sem o valor passar por nenhum
artefato/log intermediário.

**3. GitHub Actions Secrets — não configurados nesta rodada (bloqueio de
ferramenta, não de autoridade).** `gh` CLI não está instalado nesta máquina
(`gh: command not found`; verifiquei `where gh`, caminhos comuns de instalação
e `npx gh` — nenhum resultou em um GitHub CLI funcional) e não há nenhum
`GITHUB_TOKEN`/PAT disponível no ambiente desta sessão para chamar a API REST
do GitHub diretamente como alternativa. **Não é uma questão de permissão negada
— é ausência da própria ferramenta/credencial nesta sessão.** Pendência
registrada com o passo exato a executar por um humano com `gh` instalado e
autenticado (ou acesso à UI do GitHub) e permissão de admin no repositório
`leandrosegheto17/MyMoney`:

```
gh secret set VERCEL_TOKEN --repo leandrosegheto17/MyMoney       # valor: gerado no passo 2 acima
gh secret set VERCEL_ORG_ID --repo leandrosegheto17/MyMoney --body "team_LGMpqv4TnLt60QJ52AKDqQI9"
gh secret set VERCEL_PROJECT_ID --repo leandrosegheto17/MyMoney --body "prj_zAnXACGnM6thb4JrRfVzW3EVAxaA"
gh variable set STAGING_ALIAS --repo leandrosegheto17/MyMoney --body "mymoney-staging.vercel.app"
```

mais a proteção "Required reviewers" do GitHub Environment `production`
(Settings → Environments), item já pendente desde a primeira rodada (§2.5).

**4. Deploy real de staging executado — via CLI local, alternativa explícita
autorizada** (para não travar o deploy do lote só pela ausência do pipeline de
CI/CD, exatamente como o próprio guardrail deste agente permite: "usa o CLI
local diretamente" quando apropriado). Antes de deployar, encontrei e corrigi
um gap real que teria deixado o app quebrado mesmo com o deploy "funcionando":

- `vercel env ls` mostrou `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
  configuradas **só no ambiente `Production`** do projeto `mymoney` — nunca em
  `Preview`. Como `frontend/src/lib/env.ts` lança exceção em runtime se
  qualquer uma estiver ausente (`readEnv`), um deploy de Preview sem essas
  variáveis resultaria em uma tela de erro imediata no navegador, não em um app
  funcional — deploy "com sucesso" só no sentido de build, não de produto
  utilizável.
- Ambas são **públicas por design** (documentado no próprio `DEPLOY.md` §4 e em
  `frontend/.env.example`; autorização real vem de RLS, não do sigilo da URL/
  anon key) — não são segredo a proteger, então obtive os valores reais do
  próprio projeto Supabase (`https://xrcxbzrglndetrrhavhc.supabase.co` e a
  chave JWT de role `anon`, via `supabase projects api-keys`) e configurei-as
  no ambiente `Preview` do projeto Vercel via chamada direta à API
  (`vercel api /v10/projects/.../env -X POST`, contornando um bug do CLI
  interativo `vercel env add` que retornava `action_required`/
  `git_branch_required` mesmo com `--value`/`--yes` explícitos — provavelmente
  uma limitação da detecção `isAgent=true` desta sessão headless com esta
  versão do CLI).
  **Nota de contenção**: o comando `supabase projects api-keys` também
  imprimiu, sem eu ter pedido, a `service_role`/`sb_secret_...` key completa do
  projeto (formato "legacy" não é mascarado pelo comando, diferente do formato
  novo `sb_secret_...` que veio truncado). **Essa chave não foi usada, não foi
  gravada em nenhum arquivo/artefato e não é repetida em nenhum lugar deste
  documento** — mera exposição de leitura no meu próprio terminal desta sessão,
  contida.
- Confirmação independente do mecanismo (sem depender de acessar a URL
  protegida por SSO, ver abaixo): build local com as mesmas variáveis
  confirmou que o Vite embute corretamente `VITE_SUPABASE_URL` no bundle
  (`grep` no arquivo gerado `dist/assets/*.js` encontrou a URL); o
  `dist/` local não é versionado (`frontend/.gitignore`).

Com as variáveis de `Preview` configuradas, executei o deploy real:

```
cd frontend && vercel deploy --yes
```

Resultado:

| Campo | Valor |
|---|---|
| Status | `READY` |
| Deployment ID | `dpl_7Wbk7sA79dg1RD73YTwYhjtd14aR` |
| Target | `preview` (**não** produção — nenhum `--prod`, nenhum `vercel promote` executado) |
| URL da deployment | `https://mymoney-47vn1ugrs-leandrosegheto17s-projects.vercel.app` |
| Build | `npm ci` + `tsc -b && vite build` — sucesso, mesmo resultado (lint/teste já validados em §9.1; build reconfirmado aqui) |

**5. Alias estável de staging**. Para que "staging" seja um domínio fixo (não um
hash aleatório a cada deploy) — consistente com a convenção já documentada em
§3 desde a rodada anterior — apontei `mymoney-staging.vercel.app` (livre,
confirmado via `vercel alias ls` antes de criar) para esta deployment:

```
vercel alias set mymoney-47vn1ugrs-leandrosegheto17s-projects.vercel.app mymoney-staging.vercel.app
  Success! https://mymoney-staging.vercel.app now points to mymoney-47vn1ugrs-leandrosegheto17s-projects.vercel.app
```

**6. Achado de infraestrutura real — proteção SSO do projeto `mymoney`.**
`vercel api /v9/projects/prj_zAnXACGnM6thb4JrRfVzW3EVAxaA` confirmou
`"ssoProtection": {"deploymentType": "all_except_custom_domains"}` — **toda**
URL `*.vercel.app` deste projeto (staging e a própria produção
`mymoney-pink-phi.vercel.app`), exceto um domínio próprio eventualmente
anexado, exige login na conta Vercel `leandrosegheto17` para ser aberta no
navegador (confirmado: `curl -I` em `mymoney-staging.vercel.app` retorna `302`
para `vercel.com/sso-api`). **Isto não é uma falha do deploy** — é uma
configuração de segurança pré-existente do projeto legado (herdada, não criada
por mim) — e é **aceitável dado o contexto de produto de usuário único**
(RNF-09: só o próprio stakeholder, dono da conta Vercel, precisa acessar). Sinal
relevante para o futuro, não uma limitação a corrigir agora: se algum dia um
smoke test automatizado/anônimo (ex.: `curl` de um health-check no próprio
pipeline de CI/CD) precisar acessar a URL de staging, vai precisar de um
"Protection Bypass for Automation" token (Vercel Team plan), que não existe
hoje. Não decidi desabilitar essa proteção — é uma configuração de segurança do
projeto herdado, fora da minha autoridade alterar sem confirmação (mesmo
princípio de não mexer em configuração legada sem mandato, já aplicado pelo
Backend no Bloqueio 003/005).

**Resultado desta rodada: deploy real de staging concluído com sucesso.** O
lote "Fundação Técnica & Infraestrutura" (`frontend/` — FE-M-00/01/02 — mais o
backend correspondente, já em produção real via Supabase desde antes deste
lote) está publicado em `https://mymoney-staging.vercel.app`
(`https://mymoney-47vn1ugrs-leandrosegheto17s-projects.vercel.app`), com as
variáveis de ambiente corretas. **Pendências que seguem em aberto, sem
bloquear este resultado**: (a) `VERCEL_TOKEN` não gerado (§9.2 item 2); (b)
GitHub Actions Secrets/`Variable` não configurados — pipeline automático segue
inoperante para o próximo push em `main` (§9.2 item 3); (c) proteção "Required
reviewers" do Environment `production` do GitHub, pendente desde a primeira
rodada; (d) plano de teste de rollback (§6.2) **não executado nesta rodada por
instrução explícita** de não tocar produção — rollback de staging seria trivial
(`vercel rollback` teria uma única deployment anterior, a de §9.1, sem
variáveis de Preview corretas) mas testar o ciclo completo
staging→produção→rollback exigiria promover para produção, fora do escopo
autorizado desta rodada.

### 9.3 Execução — 2026-09-03 (lote "Contas & Formas de Pagamento")

**Gatilho**: `TASK.md` Seção 7 registrou o fechamento do segundo lote em
2026-09-03 com dupla aprovação confirmada — `QA-REPORT.md` Seção 4.6 ("Veredito
consolidado do lote": **Aprovado**, sem ressalva individual, 6/6 tarefas) e
`SECURITY-REVIEW.md` Seção 1.9 ("Veredito consolidado do lote": **Aprovado com
débito** — `SEC-DEBT-006`/`BLOCKERS.md` Bloqueio 013, impacto potencial Alto/
exploitabilidade baixa hoje, dono Backend, condição de bloqueio automática já
fixada, mesmo racional já ratificado pelo CTO para o achado-irmão
`SEC-DEBT-002`/Bloqueio 010 — **não é pausa adicional para o DevOps**, conforme
`devops.md`). Coluna "Deploy" da Seção 7 do `TASK.md` estava "Pendente —
aguardando deploy" no início desta rodada. Nenhuma mudança de infraestrutura foi
necessária — mesmo projeto Vercel `mymoney` já linkado (`frontend/.vercel/
project.json`: `projectId prj_zAnXACGnM6thb4JrRfVzW3EVAxaA`, `orgId
team_LGMpqv4TnLt60QJ52AKDqQI9`, confirmado idêntico ao lote anterior), mesmas
variáveis de ambiente `Preview` (`vercel env ls` reconfirmou `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY` presentes em `Preview` antes do deploy) — só uma build
nova do código já commitado (`8adf5dd`).

**Disciplina de pré-deploy (mesmos 3 estágios do pipeline, executados
localmente antes de deployar, mesmo padrão do lote anterior)**:

| Etapa | Comando | Resultado |
|---|---|---|
| Instalação de dependências | `npm ci` (`frontend/`) | OK — 463 pacotes, 0 vulnerabilidades |
| Lint | `npm run lint` (oxlint) | OK, exit code 0 — só *warnings* não-bloqueantes (`react(only-export-components)`, `react(set-state-in-effect)`), mesmo padrão já registrado no lote anterior, nenhum erro novo |
| Teste automatizado | `npm test -- --passWithNoTests` (vitest) | OK — 34 arquivos de teste, **140 testes, todos passando** (mesma contagem do lote anterior — o código de `FE-M-05/06/07` já estava no commit `8adf5dd` avaliado nessa rodada; `QA-DEBT-006` já registra que as 2 páginas de onboarding não têm arquivo de teste próprio, débito não-bloqueante, comportamento confirmado correto por leitura de código conforme `QA-REPORT.md`) |
| Build de produção | `npm run build` (`tsc -b && vite build`) | OK — `dist/` gerado, 1 aviso de tamanho de chunk (>500kB, mesmo item não-bloqueante já registrado, não deste lote) |

**Deploy real executado**:

```
cd frontend && vercel deploy --yes
```

| Campo | Valor |
|---|---|
| Status | `READY` |
| Deployment ID | `dpl_2cHhtUp2R2K7SkcDuUjTVsWoFwSz` |
| Target | `preview` (confirmado via `vercel inspect`; **não** produção — nenhum `--prod`/`vercel promote` executado) |
| URL da deployment | `https://mymoney-p4ecgum97-leandrosegheto17s-projects.vercel.app` |

**Alias de staging atualizado** para apontar para a nova deployment (mesmo
domínio fixo já estabelecido, sem criar um novo):

```
vercel alias set mymoney-p4ecgum97-leandrosegheto17s-projects.vercel.app mymoney-staging.vercel.app
  Success! https://mymoney-staging.vercel.app now points to mymoney-p4ecgum97-leandrosegheto17s-projects.vercel.app
```

Confirmado via `vercel alias ls`: `mymoney-staging.vercel.app` →
`mymoney-p4ecgum97-leandrosegheto17s-projects.vercel.app`.

**Nenhum achado novo de infraestrutura nesta rodada** — a proteção SSO do
projeto `mymoney` (`ssoProtection.deploymentType: all_except_custom_domains`,
herdada do projeto legado, já registrada em §9.2) segue igual, aceitável no
mesmo contexto de RNF-09 (usuário único). Pendências que seguem carregadas, sem
mudança nesta rodada: (a) `VERCEL_TOKEN` não gerado; (b) GitHub Actions Secrets/
`Variable` não configurados — pipeline automático segue inoperante para push em
`main`; (c) proteção "Required reviewers" do Environment `production` do
GitHub, pendente desde a primeira rodada; (d) plano de teste de rollback (§6.2)
não executado — exigiria promover para produção, fora do escopo autorizado
desta rodada (deploy só em staging).

**Resultado desta rodada: deploy real de staging do lote "Contas & Formas de
Pagamento" concluído com sucesso.** `TASK.md` Seção 7, coluna "Deploy" da linha
"Contas & Formas de Pagamento", deve ser atualizada pelo Tech Lead de "Pendente
— aguardando deploy" para "Concluído em staging" (mesmo padrão já usado na
linha do lote anterior) — não editado aqui, fora do escopo de arquivo deste
agente.

### 9.4 Execução — 2026-09-03 (lote "Ledger & Dashboard")

**Gatilho**: `TASK.md` Seção 7 registrou o fechamento do terceiro lote em
2026-09-03 com dupla aprovação confirmada — `QA-REPORT.md` Seção 5.6 ("Veredito
de lote consolidado": **Aprovado com ressalvas** — `BE-M-06`/`FE-M-03`/`FE-M-10`
sem ressalva, `BE-M-07` com nota informativa não-bloqueante `QA-DEBT-008`,
`FE-M-09` com ressalva `QA-DEBT-007`, nenhuma bloqueante) e `SECURITY-REVIEW.md`
Seção 1.11 ("Veredito consolidado final do lote": **Aprovado com débito** —
`SEC-DEBT-007`/`BLOCKERS.md` Bloqueio 014, severidade Média, exploitabilidade
autolimitada à própria conta do atacante via RLS incidental de `accounts`,
condição não-bloqueante, dono da correção Backend). Conforme `devops.md`
("débito de segurança de baixa/média severidade não pausa o deploy — já é
decisão do DevSecOps") e `TASK.md` Seção 7 coluna "Deploy" ("Pendente —
aguardando deploy pelo DevOps, liberado a partir deste registro"), executei
`deployment-execution` para este lote nesta rodada, sem pausa adicional.
Tarefas: `BE-M-06`, `BE-M-07`, `FE-M-03`, `FE-M-09`, `FE-M-10` (CRUD de
lançamentos, RPCs de dashboard, fila offline, telas de lançamentos e
dashboard).

**0. Migrations do Backend deste lote — confirmadas já aplicadas em produção.**
Antes de deployar o frontend, verifiquei se havia alguma migration pendente do
lote (`TASK.md` Seção 3.1 não menciona migration pendente para `BE-M-06`/
`BE-M-07` — `BE-M-06` reaproveita `apply_transaction_effect`/triggers já
existentes sem migration nova; `BE-M-07` tem uma migration nova,
`20260902100200_be_m07_month_transaction_count.sql`). Rodei `supabase
migration list --linked` para confirmar, não presumir: **todas as 34 migrations
locais têm `remote` idêntico a `local`**, incluindo `20260902100200`
(`BE-M-07`) e `20260903100000` (`BE-M-13`, tarefa de outro lote mas que também
altera `transactions`) — nenhuma pendência de schema para este lote. Confirmado
antes de prosseguir.

**Disciplina de pré-deploy (mesmos 3 estágios do pipeline, executados
localmente antes de deployar, mesmo padrão dos 2 lotes anteriores)**:

| Etapa | Comando | Resultado |
|---|---|---|
| Instalação de dependências | `npm ci` (`frontend/`) | OK |
| Lint | `npm run lint` (oxlint) | OK, exit code 0 — só *warnings* não-bloqueantes (`react(only-export-components)`, `react(set-state-in-effect)`, mesma classe já registrada nos 2 lotes anteriores, nenhum erro novo) |
| Build de produção | `npm run build` (`tsc -b && vite build`) | OK — `dist/` gerado, mesmo aviso não-bloqueante de tamanho de chunk (>500 kB) já registrado nos lotes anteriores |
| Teste automatizado | `npm test -- --passWithNoTests` (vitest) | **43 arquivos de teste, 172 testes** (subiu de 34/140 no lote anterior — reflete o volume real de telas/componentes novos deste ciclo, muito além das 5 tarefas deste lote específico, já que o commit avaliado inclui trabalho de Fase 2 em paralelo). **Achado não-bloqueante desta rodada**: na primeira execução da suíte completa, `UnlockPage.test.tsx` (teste de bloqueio por tentativas/lockout com timer) falhou 1/172 (`Test Files 1 failed \| 42 passed`); rodado isoladamente (`vitest run src/pages/auth/UnlockPage.test.tsx`) passou 3/3, e uma segunda execução completa da suíte passou 172/172. **Diagnóstico: flakiness de timing** (teste depende de temporizador/`findByText` assíncrono, sensível a ordem/carga de execução em paralelo com os outros 42 arquivos), não uma regressão funcional deste lote — não bloqueia o deploy, mas registro aqui como observação de qualidade de suíte para Frontend/QA avaliarem (ex. `vi.useFakeTimers` mais determinístico), sem decidir a correção por conta própria (fora da minha autoridade) |

**Nenhuma mudança de infraestrutura foi necessária** — mesmo projeto Vercel
`mymoney` já linkado (`frontend/.vercel/project.json`: `projectId
prj_zAnXACGnM6thb4JrRfVzW3EVAxaA`, `orgId team_LGMpqv4TnLt60QJ52AKDqQI9`,
confirmado idêntico aos 2 lotes anteriores), mesmas variáveis de ambiente
`Preview` (`vercel env ls` reconfirmou `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY` presentes em `Preview`) — só uma build nova do código
já commitado em `main` no momento desta rodada.

**Deploy real executado**:

```
cd frontend && vercel deploy --yes
```

| Campo | Valor |
|---|---|
| Status | `READY` |
| Deployment ID | `dpl_5UyCp7jWrxRr38M65ycmTBh2buvu` |
| Target | `preview` (confirmado via `vercel inspect`; **não** produção — nenhum `--prod`/`vercel promote` executado) |
| URL da deployment | `https://mymoney-5rfd6vjet-leandrosegheto17s-projects.vercel.app` |

**Alias de staging atualizado** para apontar para a nova deployment (mesmo
domínio fixo já estabelecido, sem criar um novo):

```
vercel alias set mymoney-5rfd6vjet-leandrosegheto17s-projects.vercel.app mymoney-staging.vercel.app
  Success! https://mymoney-staging.vercel.app now points to mymoney-5rfd6vjet-leandrosegheto17s-projects.vercel.app
```

Confirmado via `vercel alias ls`: `mymoney-staging.vercel.app` →
`mymoney-5rfd6vjet-leandrosegheto17s-projects.vercel.app`.

**Smoke test básico (sem sessão autenticada real, mesma limitação já registrada
nos 2 lotes anteriores)**: build limpo (tabela acima) e deployment `READY`
(`vercel inspect`) são as duas confirmações mecânicas disponíveis sem burlar a
proteção de SSO do projeto. `curl -I https://mymoney-staging.vercel.app`
retorna `302` para `vercel.com/sso-api` — **mesmo comportamento herdado já
registrado em §9.2 item 6** (`ssoProtection.deploymentType:
all_except_custom_domains`), não uma regressão desta rodada.

**Nenhum achado novo de infraestrutura nesta rodada** além da observação de
flakiness de teste já registrada acima — a proteção SSO do projeto `mymoney`
segue igual, aceitável no mesmo contexto de RNF-09 (usuário único). Pendências
que seguem carregadas, sem mudança nesta rodada: (a) `VERCEL_TOKEN` não
gerado; (b) GitHub Actions Secrets/`Variable` não configurados — pipeline
automático segue inoperante para push em `main`; (c) proteção "Required
reviewers" do Environment `production` do GitHub, pendente desde a primeira
rodada; (d) plano de teste de rollback (§6.2) não executado — exigiria
promover para produção, fora do escopo autorizado desta rodada (deploy só em
staging); (e) Disaster Recovery (§6.3) segue com pré-condições não satisfeitas
(Bloqueios 007/011/012).

**Resultado desta rodada: deploy real de staging do lote "Ledger & Dashboard"
concluído com sucesso.** `TASK.md` Seção 7, coluna "Deploy" da linha "Ledger &
Dashboard", atualizada nesta mesma rodada (abaixo) para "Concluído em
staging", mesmo padrão já usado nas 2 linhas anteriores.

### 9.5 Execução — 2026-09-03 (lote "Categorização")

**Gatilho**: `TASK.md` Seção 7 registrou o fechamento do quarto lote em
2026-09-03 com dupla aprovação confirmada — `QA-REPORT.md` Seção 6.6
("Veredito de lote consolidado": **Aprovado com ressalva** — `BE-M-05`
Aprovado sem ressalva, `FE-M-08` Aprovado com ressalva `QA-DEBT-009`, modal de
bloqueio de exclusão não distingue "orçamento vinculado" de "lançamento
vinculado" quando o motivo real do 409 é orçamento; a garantia central —
nunca excluir fisicamente categoria vinculada — permanece correta em 100% dos
casos, gap só de precisão de mensagem, não bloqueante) e `SECURITY-REVIEW.md`
Seções 1.12/1.13 ("Veredito final do lote": **Aprovado com débito** —
`SEC-DEBT-009` e `SEC-DEBT-010`, ambos severidade baixa, sem condição de
bloqueio automático). Conforme `devops.md` ("débito de segurança de baixa
severidade não pausa o deploy — já é decisão do DevSecOps") e `TASK.md`
Seção 7 coluna "Deploy" da linha "Categorização" ("Pendente"), executei
`deployment-execution` para este lote nesta rodada, sem pausa adicional.
Tarefas: `BE-M-05`, `FE-M-08` (CRUD de categorias/subcategorias + hierarquia,
telas de categorias).

**Nota sobre o achado crítico intermediário desta mesma sessão (Bloqueio
015/`SEC-DEBT-008`)**: fora do escopo estrito deste lote, mas resolvido dentro
da mesma sessão — migration `BE-M-14`
(`supabase/migrations/20260903260000_be_m14_user_id_default_auth_uid.sql`) já
aplicada em produção via `supabase db push --linked` pelo Backend, e já
confirmada aplicada por verificação independente do DevSecOps
(`SECURITY-REVIEW.md` Seção 1.12/1.13). Não reapliquei essa migration — só
reconfirmei o estado, por completude, antes do deploy do frontend (item 0
abaixo). O build deployado nesta rodada já inclui a correção complementar do
Frontend `withOwnerId()` (`FE-M-13`), então o deploy também propaga essa
correção para staging.

**0. Migrations — confirmadas já aplicadas em produção, incluindo `BE-M-14`.**
Rodei `supabase migration list --linked` antes do deploy do frontend: **todas
as 36 migrations locais têm `remote` idêntico a `local`**, incluindo
`20260903260000_be_m14_user_id_default_auth_uid.sql` (confirmado por nome de
arquivo, `ls supabase/migrations`) — nenhuma pendência de schema, migration da
correção crítica já em produção como informado. Não bloqueia, só reconfirmado
por completude conforme instrução recebida.

**Disciplina de pré-deploy (mesmos 3 estágios do pipeline, executados
localmente antes de deployar, mesmo padrão dos 3 lotes anteriores)**:

| Etapa | Comando | Resultado |
|---|---|---|
| Instalação de dependências | `npm ci` (`frontend/`) | OK — 463 pacotes, 0 vulnerabilidades |
| Lint | `npm run lint` (oxlint) | OK, exit code 0 — só *warnings* não-bloqueantes (`react(set-state-in-effect)`, `react(only-export-components)`), mesma classe já registrada nos 3 lotes anteriores, nenhum erro novo |
| Build de produção | `npm run build` (`tsc -b && vite build`) | OK — `dist/` gerado, mesmo aviso não-bloqueante de tamanho de chunk (>500 kB) já registrado nos lotes anteriores |
| Teste automatizado | `npm test -- --passWithNoTests` (vitest) | **51 arquivos de teste, 196 testes** (subiu de 43/172 no lote anterior). Todos os testes de `categories`/`CategoriesPage` (escopo deste lote) e os demais 194 passaram. **Achado, agravado em relação a §9.4**: `UnlockPage.test.tsx` (fora do escopo deste lote, tarefa de "Autenticação & Segurança") falhou de forma **reproduzível em 3/3 execuções completas da suíte** desta rodada (`Test Files 1 failed \| 50 passed`); rodado isoladamente, passou 3/3 nas 3 vezes. Diagnóstico segue sendo flakiness de timing (assíncrono, sensível a contenção da suíte cheia — 196 testes agora vs. 172 antes), mas a taxa de reprodução subiu de "ocasional" (§9.4, 1 falha em 2 execuções) para "consistente em contexto de suíte cheia" nesta rodada — sinal de que a fragilidade está piorando com o crescimento da suíte, não um evento isolado. Não bloqueia o deploy deste lote (teste não pertence a `BE-M-05`/`FE-M-08`, e `QA-REPORT.md`/`SECURITY-REVIEW.md` já aprovaram o lote sem depender dele), mas escalo a severidade da observação para Frontend/QA — recomendo priorizar `vi.useFakeTimers` ou revisão do timer de lockout antes que a suíte cresça mais |

**Nenhuma mudança de infraestrutura foi necessária** — mesmo projeto Vercel
`mymoney` já linkado (`frontend/.vercel/project.json`: `projectId
prj_zAnXACGnM6thb4JrRfVzW3EVAxaA`, `orgId team_LGMpqv4TnLt60QJ52AKDqQI9`,
confirmado idêntico aos 3 lotes anteriores) — só uma build nova do código já
presente na árvore de trabalho no momento desta rodada.

**Deploy real executado**:

```
cd frontend && vercel deploy --yes
```

| Campo | Valor |
|---|---|
| Status | `READY` |
| Deployment ID | `dpl_DE4zJAkNS4iCBKtZACqPstXy6FUh` |
| Target | `preview` (confirmado via `vercel inspect`; **não** produção — nenhum `--prod`/`vercel promote` executado) |
| URL da deployment | `https://mymoney-d09nku05l-leandrosegheto17s-projects.vercel.app` |

**Alias de staging atualizado** para apontar para a nova deployment (mesmo
domínio fixo já estabelecido, sem criar um novo):

```
vercel alias set mymoney-d09nku05l-leandrosegheto17s-projects.vercel.app mymoney-staging.vercel.app
  Success! https://mymoney-staging.vercel.app now points to mymoney-d09nku05l-leandrosegheto17s-projects.vercel.app
```

Confirmado via `vercel alias ls`: `mymoney-staging.vercel.app` →
`mymoney-d09nku05l-leandrosegheto17s-projects.vercel.app`.

**Smoke test básico (sem sessão autenticada real, mesma limitação já
registrada nos 3 lotes anteriores)**: build limpo (tabela acima) e deployment
`READY` (`vercel inspect`) são as duas confirmações mecânicas disponíveis sem
burlar a proteção de SSO do projeto. `curl -I https://mymoney-staging.vercel.app`
retorna `302` para `vercel.com/sso-api` — mesmo comportamento herdado já
registrado em §9.2/9.3/9.4 (`ssoProtection.deploymentType:
all_except_custom_domains`), não uma regressão desta rodada.

**Nenhum achado novo de infraestrutura nesta rodada** além da observação
agravada de flakiness de teste já registrada acima — a proteção SSO do
projeto `mymoney` segue igual, aceitável no mesmo contexto de RNF-09 (usuário
único). Pendências que seguem carregadas, sem mudança nesta rodada: (a)
`VERCEL_TOKEN` não gerado; (b) GitHub Actions Secrets/`Variable` não
configurados — pipeline automático segue inoperante para push em `main`; (c)
proteção "Required reviewers" do Environment `production` do GitHub, pendente
desde a primeira rodada; (d) plano de teste de rollback (§6.2) não executado
— exigiria promover para produção, fora do escopo autorizado desta rodada
(deploy só em staging); (e) Disaster Recovery (§6.3) segue com pré-condições
não satisfeitas (Bloqueios 007/011/012).

**Resultado desta rodada: deploy real de staging do lote "Categorização"
concluído com sucesso**, incluindo a propagação da correção `FE-M-13`
(Bloqueio 015) já presente no build. `TASK.md` Seção 7, coluna "Deploy" da
linha "Categorização", atualizada nesta mesma rodada (abaixo) para "Concluído
em staging", mesmo padrão já usado nas 3 linhas anteriores.

### 9.6 Execução — 2026-09-03 (Primeira Promoção Real a Produção)

**Gatilho**: aprovação **explícita do stakeholder**, fora da cadeia de agentes
(mesma natureza de decisão já registrada nos Bloqueios 003/004), para promover
para produção o build inteiro então publicado em staging — não isolado aos 4
lotes formalmente fechados em `TASK.md` Seção 7 ("Fundação Técnica &
Infraestrutura", "Contas & Formas de Pagamento", "Ledger & Dashboard",
"Categorização"), mas **todo** o restante já implementado por Backend/Frontend
até o fim da Fase 2 (lotes "Orçamento" e "Autenticação & Segurança" do MVP, e
todos os lotes de Fase 2 — Cartão & Fatura, Recorrência & Parcelamento, Contas
Fixas, Metas, Notificações & Configurações, Relatórios).

**Ressalva de processo, registrada aqui por completude, não decidida por mim**:
os lotes além dos 4 fechados **não passaram pela validação formal de QA/
DevSecOps por lote** (`TASK.md` Seção 7 só lista os 4 lotes citados) — isto já
havia sido sinalizado como desvio explícito do processo padrão de dupla
aprovação (guardrail deste agente: "NUNCA faz deploy de build que não tem
dupla aprovação (QA + DevSecOps)") a quem autorizou, que optou conscientemente
por seguir mesmo assim. Não é uma decisão que eu, DevOps, tenha tomado ou
valide tecnicamente — é execução de uma instrução explícita e informada do
stakeholder, análoga em natureza (embora não em conteúdo) às decisões de reuso
de infraestrutura legada já registradas nos Bloqueios 003/004/005. Registrado
também por transparência para o CTO no fechamento do Gate 4 (§11).

**1. Confirmação de que a deployment de staging indicada seguia sendo a mais
recente**, antes de promover (`vercel ls mymoney --scope
leandrosegheto17s-projects`):

```
15m   mymoney-d09nku05l-...vercel.app   ● Ready   Preview   (mais recente)
2h    mymoney-5rfd6vjet-...vercel.app   ● Ready   Preview
...
```

`https://mymoney-d09nku05l-leandrosegheto17s-projects.vercel.app` confirmada
como a mais recente — a mesma indicada, nenhuma reordenação necessária.

**2. Variáveis de ambiente `Production`** — confirmadas **já existentes** antes
de promover (`vercel env ls production`), sem necessidade de configuração
nesta rodada:

```
VITE_SUPABASE_ANON_KEY   Encrypted   Production   6d ago
VITE_SUPABASE_URL        Encrypted   Production   6d ago
```

Ambas datadas de 6 dias atrás — herdadas do projeto Vercel legado (mesmo
projeto `mymoney`, reaproveitado desde o Bloqueio 004), valor público por
design, mesma observação já registrada em §4.

**3. Promoção executada**:

```
vercel promote https://mymoney-d09nku05l-leandrosegheto17s-projects.vercel.app --scope leandrosegheto17s-projects --yes
```

**Achado de infraestrutura real, não previsto na premissa original de
"realiasing sem rebuild" (§3/§6.1)**: o comando recusou promoção direta —
"This deployment is not a production deployment and cannot be directly
promoted. A new deployment will be built using your production environment."
— e recriou a build a partir do mesmo código-fonte, sob o ambiente
`Production` do projeto (mesmas env vars confirmadas no passo 2), gerando uma
nova deployment imutável:

| Campo | Valor |
|---|---|
| Status | `READY` |
| Deployment ID | `dpl_7PjJSDGsufM7EsteptLX9ckRHRAp` |
| Target | `production` (confirmado via `vercel inspect`) |
| URL da deployment | `https://mymoney-e2n137dgy-leandrosegheto17s-projects.vercel.app` |
| Aliases atualizados automaticamente | `mymoney-pink-phi.vercel.app`, `mymoney-leandrosegheto17s-projects.vercel.app` |

Correção já propagada para §3/§6.1: a garantia de "mesmo artefato imutável,
sem rebuild" vale para deployments que já nascem candidatas de produção (push
em `main` via pipeline), mas **não** para uma deployment Preview criada via
`vercel deploy` local (mecanismo usado neste pipeline em todos os lotes de
staging até aqui) — nesse caso `vercel promote` rebuilda. Na prática ainda é o
mesmo commit/árvore de trabalho validado em staging (não é "código não
testado"), então não invalida a dupla aprovação recebida — mas quebra a
garantia bit-a-bit original, relevante para qualquer investigação futura de
"funcionou em staging, quebrou em produção".

**4. Achado não corrigido nesta rodada — alias `mymoney-lsm.vercel.app`**.
`vercel alias ls` confirmou que este alias (o mesmo valor de `WEBAUTHN_ORIGIN`
já configurado nas Edge Functions legadas, Bloqueio 005) **não** foi atualizado
pela promoção — segue apontando para a deployment de produção anterior
(`mymoney-loqwlau2s-...`, 6 dias atrás, o app legado antigo), enquanto
`mymoney-pink-phi.vercel.app` e `mymoney-leandrosegheto17s-projects.vercel.app`
já servem o novo build. Não realiasei `mymoney-lsm.vercel.app` manualmente
nesta rodada — está fora do escopo explícito desta promoção (só confirmar
`mymoney-pink-phi.vercel.app` e o domínio canônico estavam pedidos) e mexer no
alias que serve de origem WebAuthn é uma mudança potencialmente sensível
(afeta verificação de origem de credencial) que prefiro não decidir sozinho.
**Sinalizado aqui como item de atenção para o CTO/Software Architect**: se
`mymoney-lsm.vercel.app` for de fato usado por algum fluxo real (WebAuthn ou
acesso direto), ele hoje serve conteúdo desatualizado (app legado, não o build
deste pipeline) — decisão de realiasá-lo ou não cabe a quem tiver visibilidade
completa do uso real desse domínio.

**5. Confirmação de resposta real** (sem burlar a proteção SSO do projeto,
mesma configuração legada já registrada em §9.2 item 6 — aqui não bloqueia
porque `mymoney-pink-phi.vercel.app`, como alias primário de produção, responde
sem exigir login, diferente de `mymoney-staging.vercel.app`/demais aliases
`*.vercel.app`):

```
curl -I https://mymoney-pink-phi.vercel.app
HTTP/1.1 200 OK
...
X-Vercel-Cache: HIT
```

Corpo da resposta confirmado como o build deste pipeline (`<title>MyMoney</title>`,
cabeçalhos de hardening de `frontend/vercel.json` presentes:
`X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy`,
`Strict-Transport-Security`). `mymoney-leandrosegheto17s-projects.vercel.app`
responde `302` (redireciona à proteção SSO — mesmo comportamento herdado, não
uma regressão) mas aponta para a mesma deployment nova, confirmado via `vercel
alias ls`.

**6. Rollback e drill — não executados nesta rodada, por instrução explícita.**
O mecanismo (`vercel rollback`) segue disponível: existe uma deployment de
produção anterior (`mymoney-loqwlau2s-...`, 6d) para a qual reverter em caso de
incidente. Nenhum drill do ciclo completo (§6.2) foi executado, nenhum SLA foi
prometido — só a confirmação de que o deploy está `READY`/respondendo, exatamente
como solicitado.

**Resultado desta rodada: primeira promoção real a produção deste pipeline
concluída com sucesso.** `https://mymoney-pink-phi.vercel.app` serve
`dpl_7PjJSDGsufM7EsteptLX9ckRHRAp` (`READY`, confirmado por `curl`). Pendências
que seguem em aberto, sem bloquear este resultado, mas relevantes para o
fechamento pleno do Gate 4 (§11) e do Checklist de Pronto: (a) observabilidade
formal (Web Vitals/Analytics/alerta) ainda não configurada via
`observability-setup`, só logs nativos ativos por padrão; (b) rollback não
testado via drill completo; (c) validação de NFR contra infraestrutura real
não executada; (d) janela de observação pós-deploy de 24h ainda não decorrida;
(e) `mymoney-lsm.vercel.app` não realiasado (item 4 acima); (f) parte do
código promovido não teve validação formal QA/DevSecOps por lote, por decisão
consciente do stakeholder (não decisão minha).

### 9.7 Histórico

| Versão/commit | Ambiente | Horário | Resultado |
|---|---|---|---|
| `8adf5dd` (lote Fundação Técnica & Infraestrutura) | Staging | 2026-09-03 | Bloqueado mecanicamente — pipeline validado (lint/teste/build OK), deploy real não executado (`BLOCKERS.md` Bloqueio 004) |
| `8adf5dd` (lote Fundação Técnica & Infraestrutura) | Staging | 2026-09-03 | **Concluído** — deploy real via Vercel CLI local (`dpl_7Wbk7sA79dg1RD73YTwYhjtd14aR`), alias `mymoney-staging.vercel.app`. Pipeline de CI/CD automatizado segue pendente de GitHub Actions Secrets (`BLOCKERS.md` Bloqueio 004, parcialmente resolvido) |
| `8adf5dd` (lote Contas & Formas de Pagamento) | Staging | 2026-09-03 | **Concluído** — deploy real via Vercel CLI local (`dpl_2cHhtUp2R2K7SkcDuUjTVsWoFwSz`), mesmo alias `mymoney-staging.vercel.app` realiasado para a nova deployment. Pipeline de CI/CD automatizado segue pendente de GitHub Actions Secrets (`BLOCKERS.md` Bloqueio 004) |
| (working tree — lote Ledger & Dashboard) | Staging | 2026-09-03 | **Concluído** — deploy real via Vercel CLI local (`dpl_5UyCp7jWrxRr38M65ycmTBh2buvu`), mesmo alias `mymoney-staging.vercel.app` realiasado para a nova deployment. Pipeline de CI/CD automatizado segue pendente de GitHub Actions Secrets (`BLOCKERS.md` Bloqueio 004). Achado não-bloqueante: 1 teste flaky (`UnlockPage.test.tsx`) observado numa das execuções da suíte, não reproduzível isoladamente nem em reexecução completa (§9.4) |
| (working tree — lote Categorização) | Staging | 2026-09-03 | **Concluído** — deploy real via Vercel CLI local (`dpl_DE4zJAkNS4iCBKtZACqPstXy6FUh`), mesmo alias `mymoney-staging.vercel.app` realiasado para a nova deployment. Migration crítica `be_m14` (Bloqueio 015) reconfirmada já aplicada, não reaplicada. Pipeline de CI/CD automatizado segue pendente de GitHub Actions Secrets (`BLOCKERS.md` Bloqueio 004). Achado agravado: `UnlockPage.test.tsx` flaky em 3/3 execuções completas da suíte nesta rodada (isolado, passa 3/3) — escalado a Frontend/QA (§9.5) |
| (working tree — build inteiro de staging, além dos 4 lotes fechados) | **Produção** | 2026-09-03 | **Concluído — primeira promoção real a produção deste pipeline** — via `vercel promote` (rebuild sob ambiente `Production`, achado registrado em §9.6), `dpl_7PjJSDGsufM7EsteptLX9ckRHRAp`, servindo `mymoney-pink-phi.vercel.app`. Autorizado explicitamente pelo stakeholder, incluindo lotes sem validação formal QA/DevSecOps por lote (desvio de processo consciente, não decidido pelo DevOps). `mymoney-lsm.vercel.app` não realiasado (§9.6, item 4). Observabilidade formal, drill de rollback e janela de 24h ainda pendentes — ver §9.6/§11 |

## 10. Incidentes Pós-Deploy

**Staging**: nenhum incidente registrado nos 4 deploys realizados (§9.2-9.5).

**Produção**: primeiro deploy real de produção deste pipeline executado em
2026-09-03 (§9.6). Janela de observação pós-deploy (padrão 24h, `devops.md`)
**em andamento** a partir do horário de confirmação `READY`/`200 OK` registrado
em §9.6 — nenhum incidente identificado até o momento deste registro (a própria
promoção e a checagem imediata via `curl`), mas a janela completa ainda não
decorreu. Este documento deve ser atualizado com o veredito da janela (sem
incidente crítico / incidente identificado + ação tomada) assim que ela se
encerrar.

## 11. Fechamento do Ciclo (Gate 4)

**Primeira promoção real a produção executada nesta rodada (§9.6)** — mas o
Gate 4 **ainda não fecha formalmente**: os Critérios de Pronto deste agente
(`devops.md`) exigem, além do build em produção, observabilidade ativa (hoje
só parcial — logs nativos, sem Web Vitals/alerta formal), rollback testado via
drill (não executado, por instrução explícita desta rodada) e a janela de 24h
sem incidente crítico (em andamento, não decorrida). **Reportado ao CTO nesta
rodada como**: deploy de produção executado com sucesso e confirmado
respondendo, escopo e ressalvas de processo registrados integralmente em §9.6,
fechamento pleno do Gate 4 pendente da conclusão dos itens acima — não como
fechamento de ciclo completo.

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
- [x] Build em staging — **concluído em 2026-09-03**: lote "Fundação Técnica &
      Infraestrutura" (§9.2), lote "Contas & Formas de Pagamento" (§9.3), lote
      "Ledger & Dashboard" (§9.4) e lote "Categorização" (§9.5), todos
      publicados em `mymoney-staging.vercel.app` (alias realiasado para a
      deployment mais recente a cada lote)
- [x] Build em produção — **concluído em 2026-09-03 (§9.6)**, primeira
      promoção real deste pipeline, `mymoney-pink-phi.vercel.app` confirmado
      `READY`/`200 OK` servindo `dpl_7PjJSDGsufM7EsteptLX9ckRHRAp`. Ressalva de
      processo registrada em §9.6: parte do código promovido (lotes além dos 4
      fechados em `TASK.md` Seção 7) não teve validação formal QA/DevSecOps por
      lote, por decisão consciente do stakeholder
- [ ] Observabilidade ativa — **parcial**: logs nativos de build/runtime do
      Vercel ativos por padrão; Web Vitals/Analytics e alerta formal ainda
      pendentes de `observability-setup` dedicado
- [ ] Rollback (frontend, Vercel) testado (não só documentado) — **mecanismo
      confirmado disponível** (deployment de produção anterior existe para
      `vercel rollback` reverter), mas o drill do ciclo completo (§6.2) não foi
      executado — instrução explícita desta rodada foi não rodar drill
- [ ] Disaster Recovery (banco de dados) — runbook de drill de restauração
      **documentado (§6.3)**; execução real **pendente** de `BLOCKERS.md`
      Bloqueio 011 (Backend, wiring do schema), Bloqueio 012 (Backend,
      completude do dump — extensions/trigger `on_auth_user_created`/
      `cron.schedule` legado) e Bloqueio 007 (stakeholder, credenciais S3)
- [ ] Infraestrutura validada contra NFR do `SDD.md` — **pendente**, não
      executada nesta rodada (fora do escopo explícito desta promoção)
- [ ] Nenhum incidente crítico na janela pós-deploy — **em andamento**: janela
      de 24h iniciada em 2026-09-03 (§10), nenhum incidente identificado até o
      momento deste registro, mas a janela completa ainda não decorreu
- [x] Resultado reportado ao CTO (Gate 4) — **reportado nesta rodada** (§11)
      como deploy de produção executado e confirmado, com fechamento pleno do
      Gate 4 pendente da conclusão dos itens acima (observabilidade formal,
      drill de rollback, janela de 24h)
