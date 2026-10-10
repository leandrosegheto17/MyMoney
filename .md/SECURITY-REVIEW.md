# SECURITY-REVIEW

## TP-0001 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; check-ignore dos segredos OK, .env.example versionável, pnpm audit limpo, allowBuilds restrito, sem segredo/URL em README/config.

## RTP-0001 — DevSecOps — 2026-10-10
APROVADA — gitleaks sem vazamento, só fixtures falsas reformatadas, .prettierignore só encolheu; 0 críticos, 0 não críticos.

## TP-0002 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; gitleaks limpo no backend, sem ref/credencial de produção, G-16/G-02 conferidos no config.toml (lido) e signup/GraphQL comprovados pelo QA.

## TP-0006 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 1 baixo (RTP-0006: remover exceção minimumReleaseAgeExclude); gitleaks sem vazamentos, pnpm audit limpo, sem service_role/segredo, Worker sem rota HTTP.

## TP-0021 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; dist sem service_role/sb_secret/JWT, `pnpm audit` limpo, index.html sem script/CDN de terceiros, lerAmbiente recusa chave de serviço (lido).

## RTP-0002 — DevSecOps — 2026-10-10
APROVADA, 0 achados; gitleaks limpo no README, pnpm audit sem vulnerabilidades, mudança só de texto.

## RTP-0004 — DevSecOps — 2026-10-10
APROVADA, 0 achados; gitleaks limpo, pnpm audit sem vulnerabilidades, @types/node fixado e só dev/noEmit.

## RTP-0005 — DevSecOps — 2026-10-10
APROVADA, 0 achados; gitleaks limpo, audit sem vulnerabilidades, build sem rastro do plugin (grep 0), plugin só no projeto de testes.

## TP-0003 — DevSecOps — 2026-10-10
APROVADA — catálogo confirma anon/public sem usage em app/api, default privileges sem execute para PUBLIC/anon, gitleaks limpo em backend/; 0 achados críticos, 0 não críticos.

## TP-0024 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; funções puras sem eval/innerHTML/log/dependência nova (grep 0 ocorrências) e `lerMesDaUrl` estrito comprovado com entradas hostis executadas.

## TP-0022 — DevSecOps — 2026-10-10
APROVADA — teste ativo confirmou G-07/G-08/G-09 (pacotes só em dados/, camadas, escrita só por rpc; tudo error), pnpm audit limpo, unrs-resolver: false risco baixo (dev-only, binário pré-compilado); 0 críticos, 1 não crítico (RTP-0008: import() dinâmico e escrita via variável contornam o lint).

## TP-0023 — DevSecOps — 2026-10-10
APROVADA — audit limpo, gitleaks 0 em 7 arquivos, fontes locais sem CDN, sprite sem script, visual.mjs sem shell/segredo (0 críticos, 0 não críticos).

## TP-0027 — DevSecOps — 2026-10-10
APROVADA — sw.js sem runtimeCaching/dado de API, precache só app shell, sem script inline/eval próprio, pnpm audit limpo, gitleaks 0; semgrep não executado (fica no /deploy); 0 críticos, 0 não críticos.

## RTP-0003 — DevSecOps — 2026-10-10
APROVADA, 0 achados; config local com signup desligado e só schema api, gitleaks (arquivos e 30 commits) sem vazamento, nenhum .env versionado.

## RTP-0007 — DevSecOps — 2026-10-10
APROVADA, 0 achados; teste puro sem segredo, rede ou dependência nova; gitleaks limpo.

## TP-0004 — DevSecOps — 2026-10-10
APROVADA — 0 críticos/0 não críticos; catálogo: invoker, search_path vazio, execute só para authenticated (anon/public=false), gitleaks limpo nos 4 arquivos.

## TP-0013 — DevSecOps — 2026-10-10
APROVADA — RLS enable+force, auxiliares security definer com search_path vazio e execute só authenticated, anon sem acesso, leitura/escrita cruzada e user_id negados (executado), limite de 2 membros e 1 lar recusados, gitleaks limpo; 0 achados críticos, 0 não críticos.
