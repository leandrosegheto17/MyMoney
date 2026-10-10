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

## RTP-0008 — DevSecOps — 2026-10-10
RTP-0008 OK em segurança (lint 0 erros, 27 testes verdes, sem segredo/dependência/dado pessoal); contorno por import() com template literal aberto como RTP-0014 (baixo).

## TP-0005 — DevSecOps — 2026-10-10
OK; 0 achados; diff lido e grep confirma único grant ao anon = api.ping + usage em api (INVOKER, search_path vazio, select 1); sem RTP.

## TP-0014 — DevSecOps — 2026-10-10
TP-0014 aprovada em segurança (OK): seed 100% fictício, só local, senha com hash bcrypt, sem dependência nova; gitleaks e login real no GoTrue ficaram sem execução por falta de ferramenta.

## TP-0015 — DevSecOps — 2026-10-10
TP-0015 aprovada em segurança (INVOKER, search_path vazio, anon/public sem execute, sem vazamento do outro membro, registro_invalido sem membro); nenhum achado; reset/pgTAP real pendentes no CI.

## TP-0017 — DevSecOps — 2026-10-10
TP-0017 OK em segurança; 10 asserções do catálogo passam, lista fechada literal e conforme SDD §7/ADR-012; overload de função definer escapa da regra por nome (baixo, RTP-0013).

## TP-0032 — DevSecOps — 2026-10-10
TP-0032 aprovada em segurança: sem superfície de segurança, sem import proibido, sem style inline/innerHTML, vitrine fora do build, sem dependência nova, sem achados.

## TP-0034 — DevSecOps — 2026-10-10
TP-0034 aprovada na segurança: componentes sem dado/rede, sem HTML injetado nem estilo inline, sem dependência nova, bloqueio de envio duplo no Salvando; sem achados.

## TP-0035 — DevSecOps — 2026-10-10
TP-0035 aprovada em segurança: sem rede/dado persistido, só centavos inteiros, devDependency user-event sem vulnerabilidades, sem achados.

## TP-0039 — DevSecOps — 2026-10-10
TP-0039 aprovada em segurança (texto puro, sem style inline, sem dependência nova); nenhum achado novo, RTP-0010 do QA segue pendente.

## TP-0043 — DevSecOps — 2026-10-10
TP-0043 aprovada em segurança (sem HTML cru nem style inline, devDependency user-event sem vulnerabilidade conhecida no audit); sem achados.

## TP-0048 — DevSecOps — 2026-10-10
TP-0048 aprovada em segurança: RLS enable+force, FK composto e grants verificados em banco descartável (isolamento A/B, anon sem acesso); sem achados.

## TP-0050 — DevSecOps — 2026-10-10
TP-0050 aprovada em segurança: RLS enable+force, políticas sem `true` com `or` entre parênteses, individual de outro membro invisível/imutável em banco descartável, nada a `anon`/`api`; sem achados acionáveis.

## TP-0061 — DevSecOps — 2026-10-10
TP-0061 aprovada em segurança, revisão do diff e prova em banco descartável sem achados (INVOKER, search_path vazio, só inteiro, anon sem execute).

## TP-0079 — DevSecOps — 2026-10-10
TP-0079 aprovada na segurança (sem achados, sem dependência nova, lint G-09 limpo); axe nas telas fica para TP-0089/TP-0103.
