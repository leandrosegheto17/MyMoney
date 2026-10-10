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

## RTP-0009 — DevSecOps — 2026-10-10
RTP-0009 sem achados de segurança (só ARIA/CSS, sem dependência nova nem dado pessoal), Sec aprovada.

## RTP-0010 — DevSecOps — 2026-10-10
RTP-0010 aprovada na segurança, vitrine de teste fora do bundle, sem dependência nova nem achados.

## RTP-0011 — DevSecOps — 2026-10-10
RTP-0011 aprovada em segurança; só CSS/classe, sem dado sensível nem dependência nova, sem achados.

## RTP-0012 — DevSecOps — 2026-10-10
RTP-0012 sem achados de segurança (só config de lint e fixtures, 30/30 testes de lint verdes, sem dependência nova); Sec aprovado.

## RTP-0013 — DevSecOps — 2026-10-10
RTP-0013 OK em segurança: security definer comparado por assinatura, lista literal confere com SDD §7/ADR-012, sem dependência/segredo; nenhum achado novo.

## TP-0016 — DevSecOps — 2026-10-10
TP-0016 aprovada na segurança (G-06 trava de host, G-15 sem service_role, deps fixas e sem vulnerabilidades no pnpm audit, 18 unitários verdes); sem achados novos, RTP-0016 (Prettier) do QA segue pendente.

## TP-0040 — DevSecOps — 2026-10-10
TP-0040 sem achados de segurança: erro com texto fixo, sem import de dados/ em componentes, sem dependência nova.

## TP-0049 — DevSecOps — 2026-10-10
TP-0049 APROVADA em segurança (revisão do diff: RLS enable+force, políticas por dono, FKs compostos, sem grant a anon, seed fictício); sem RTP; sem dependências novas.

## TP-0052 — DevSecOps — 2026-10-10
TP-0052 OK na segurança: invoker, search_path vazio, anon sem execute, RLS isola individuais e sem-membro não cria nada; nenhum achado novo (RTP-0017 já cobre a duplicação).

## TP-0054 — DevSecOps — 2026-10-10
TP-0054 sem achados de segurança (invoker, search_path vazio, G-05/G-02/RN-03 conferidos por revisão do diff); catálogo e testes-api pendentes de CI.

## TP-0059 — DevSecOps — 2026-10-10
TP-0059 aprovada na segurança (invoker, search_path vazio, grants só authenticated, dono por membro_atual, id alheio dá registro_invalido, nome_repetido sem vazamento; probe em banco descartável); sem achados novos.

## TP-0134 — DevSecOps — 2026-10-10
TP-0134 aprovada em segurança: RLS enable+force sem política aberta, individual isolada por dono, sem grant a anon, sem dependência nova; nenhum achado que exija RTP.

## TP-0144 — DevSecOps — 2026-10-10
TP-0144 Sec OK: RLS enable+force, FK composto (RN-08) e isolamento da individual (RN-17) conferem por leitura do diff; 1 achado baixo (update de meta conjunta pode mudar escopo/dono) virou RTP-0021.

## RTP-0014 — DevSecOps — 2026-10-10
RTP-0014 OK na segurança (revisão do diff, só lint e fixtures; 34 testes de lint verdes; sem dependência nem dado sensível; limites de defesa em profundidade anotados).

## RTP-0015 — DevSecOps — 2026-10-10
RTP-0015 aprovada na segurança; só testes e vitrine estática, sem achados.

## RTP-0017 — DevSecOps — 2026-10-10
RTP-0017 aprovada na segurança: só seed local mudou, função segue security invoker sem alteração de grant/policy, sem segredo nem dependência nova; sem achados.

## RTP-0019 — DevSecOps — 2026-10-10
RTP-0019 aprovada na segurança; diff só remove classe CSS morta, sem dependência nem dado sensível, Botao 13/13 verdes, sem achados.

## RTP-0020 — DevSecOps — 2026-10-10
RTP-0020 OK na segurança; só comentário alterado, lista literal e asserção G-03 inalteradas, sem achados.

## RTP-0021 — DevSecOps — 2026-10-10
RTP-0021 aprovada na segurança; grant de update por coluna confirmado em banco descartável (escopo, dono_id e lar_id não graváveis por authenticated; anon sem acesso), sem achados.

## TP-0051 — DevSecOps — 2026-10-10
DevSecOps aprovou TP-0051 (RLS força/enable, sem política true, dados de pagamento só na tabela privada do pagador); 1 achado baixo (FK de categoria não amarra dono/lar) aberto como RTP-0026.

## TP-0056 — DevSecOps — 2026-10-10
TP-0056 segurança OK por revisão do diff (invoker, search_path vazio, RLS/dono, G-05 com mesmo registro_invalido, sem dependência nova); único ponto é o teste de API com ids fora do seed, já na RTP-0022.

## TP-0058 — DevSecOps — 2026-10-10
TP-0058 aprovada em segurança (invoker, search_path vazio, grants só authenticated, filtros por dono e G-05 respeitados); nenhum achado novo, RTP-0024 do QA permanece.

## TP-0137 — DevSecOps — 2026-10-10
TP-0137 OK na segurança (Sec ✔) — invoker, search_path vazio, anon sem execute, G-05 uniforme, escopo/dono da categoria, testados em banco descartável; sem RTP nova (RTP-0023 já cobre a leitura); PostgREST não verificado.

## TP-0145 — DevSecOps — 2026-10-10
TP-0145 aprovada na segurança: função security invoker com RLS respeitada (B não vê a meta individual de A), anon sem execute, sem achados.

## TP-0147 — DevSecOps — 2026-10-10
TP-0147 OK em segurança: invoker, grants só authenticated, conta visível só ao autor por RLS + filtro, meta alheia = inexistente; 1 achado baixo de teste (RTP-0027).

## TP-0148 — DevSecOps — 2026-10-10
TP-0148 aprovada na segurança — security invoker com isolamento por RLS de meta, grants só para authenticated, sem achados e sem dependência nova; stack Supabase real não verificada.

## TP-0149 — DevSecOps — 2026-10-10
TP-0149 OK na segurança: escopo/dono nunca do cliente, RLS + filtro explícito, G-05/G-03/G-02/G-10 conferidos no diff, sem dependência nova e sem achados.

## RTP-0025 — DevSecOps — 2026-10-10
RTP-0025 OK no DevSecOps (diff só move tipo e documenta disable; eslint 0 erro; `any` residual já em RTP-0031).

## TP-0055 — DevSecOps — 2026-10-10
TP-0055 OK na segurança: security invoker, search_path vazio, grants só authenticated, isolamento por dono_id sem oráculo de em_uso; sem achado novo (RTP-0029 do QA segue aberta).

## TP-0057 — DevSecOps — 2026-10-10
Sec OK; invoker, search_path vazio, grants só authenticated e filtro por dono confirmados por revisão do diff; único achado baixo já coberto por RTP-0028.

## TP-0060 — DevSecOps — 2026-10-10
TP-0060 aprovada em segurança (revisão do diff: invoker, search_path vazio, grants só authenticated, filtro de dono antes do FK sem vazamento de existência/uso, migration aditiva); sem achado nem RTP.

## TP-0062 — DevSecOps — 2026-10-10
TP-0062 APROVADA em segurança: função invoker com search_path vazio, RLS forçada nas 3 tabelas, erros uniformes (G-05), idempotência (G-17), anon sem execute e resposta sem dado alheio; sem achados nem RTP.

## TP-0063 — DevSecOps — 2026-10-10
TP-0063 aprovada em segurança (Sec ✔): função INVOKER com search_path vazio, contagem e padrões filtrados explicitamente pelo membro, anon sem execute; sem achados.

## TP-0064 — DevSecOps — 2026-10-10
TP-0064 aprovada em segurança: função security invoker, search_path vazio, RLS preservada (outra conta devolve null), sem execute para anon; revisão do diff, sem achados.

## TP-0067 — DevSecOps — 2026-10-10
TP-0067 OK em segurança — invoker, search_path vazio, RLS de dono, null/null sem oráculo, anon sem execute; sem achados; pgTAP real não verificado.

## TP-0085 — DevSecOps — 2026-10-10
TP-0085 aprovada na segurança: filtro explícito conjunto/despesa, invoker com search_path vazio, anon sem execute, sem valor_total, sem achados.

## TP-0086 — DevSecOps — 2026-10-10
TP-0086 aprovada na segurança (RN-16e com dono_id explícito, invoker, sem anon, sem valor_total); sem achados novos, duplicação já em RTP-0030; pgTAP/CLI reais não verificados.

## TP-0096 — DevSecOps — 2026-10-10
TP-0096 aprovada em segurança; INVOKER/search_path vazio/RLS/grants corretos, sem vazamento por total, contagem ou filtro de forma; nenhum achado e nenhuma RTP.

## TP-0097 — DevSecOps — 2026-10-10
TP-0097 aprovada na segurança (Sec ✔): INVOKER, search_path vazio, anon sem execute, pagamento/data_ajustada omitidos para o outro membro com dono_id além da RLS, registro_invalido uniforme; sem achados nem RTP.

## TP-0098 — DevSecOps — 2026-10-10
TP-0098 aprovada em segurança (revisão do diff): matriz RN-06/RN-07 correta, G-05/G-03 atendidos, sem achados nem RTP; pgTAP real e catalogo.sql completo não verificados por falta de ferramenta.

## TP-0100 — DevSecOps — 2026-10-10
TP-0100 OK na segurança: função INVOKER com search_path vazio, filtro explícito + RLS, mesma mensagem para alheia/inexistente, anon sem execute, sem dependência nova; sem achados.

## TP-0115 — DevSecOps — 2026-10-10
TP-0115 OK em segurança: invoker/search_path vazio, anon sem execute, isolamento por dono e erro uniforme registro_invalido, escopo individual fixo; sem achado alto/crítico nem RTP.

## TP-0117 — DevSecOps — 2026-10-10
TP-0117 aprovada em segurança por revisão do diff (INVOKER, search_path vazio, filtro de dono/lar/crédito, resposta uniforme, anon sem execute, migration aditiva), sem achados; execução real do catálogo/pgTAP/vitest não verificada por falta de ambiente.

## TP-0119 — DevSecOps — 2026-10-10
TP-0119 aprovada em segurança: RLS enable+force por lar, grants mínimos, sem campo privado, seed fictício; sem achados relevantes.

## TP-0135 — DevSecOps — 2026-10-10
TP-0135 aprovada em segurança: filtro de dono explícito, só parcelas via parcelas_mes, invoker com search_path vazio, sem achados; pgTAP real e db diff não verificados.

## TP-0146 — DevSecOps — 2026-10-10
TP-0146 aprovada em segurança: view `api.metas` com security_invoker, RLS efetiva, sem vazamento de metas individuais nem de dono, somente leitura; sem achados.

## TP-0150 — DevSecOps — 2026-10-10
TP-0150 aprovada em segurança (RN-08/G-05/G-02/G-03/G-10 conferidos por leitura do diff e paridade schema x migration; sem dependência nova nem dado pessoal novo; sem achado alto/crítico; pgTAP real e testes-api não executáveis aqui).

## RTP-0022 — DevSecOps — 2026-10-10
RTP-0022 segurança OK — troca de ids de teste para os do seed, sem segredo/dependência; G-05 agora exercitado de fato.

## RTP-0024 — DevSecOps — 2026-10-10
RTP-0024 sem achados de segurança; diff só de constantes de teste (ids do seed), sem segredo, dependência ou dado pessoal; isolamento de B provado no QA.

## RTP-0026 — DevSecOps — 2026-10-10
RTP-0026 aprovada em segurança (Sec OK): FK composto de dono e lar fecha o uso de categoria alheia em insert/update sem alterar políticas; sem achados.

## RTP-0027 — DevSecOps — 2026-10-10
RTP-0027 OK na segurança; o caso de B busca nome e ids das contas de A em todo o JSON (exceto `local`), sem achados novos (prettier já na RTP-0038).

## RTP-0028 — DevSecOps — 2026-10-10
RTP-0028 aprovada em segurança; troca de 2 constantes de teste para o id do seed, G-05 agora exercita a forma real de A, sem dependência, segredo ou dado pessoal.

## RTP-0029 — DevSecOps — 2026-10-10
RTP-0029 aprovada em segurança; diff só de testes, sem achados nem dependências novas.

## RTP-0032 — DevSecOps — 2026-10-10
RTP-0032 aprovada em segurança: limpeza só em host local (G-06), SQL parametrizado e escopado aos UUIDs das metas de teste, sem segredo, dependência nem acesso novo.

## TP-0065 — DevSecOps — 2026-10-10
TP-0065 aprovada em segurança; api.contas security_invoker, só leitura para authenticated, sem lar_id/dono_id, isolamento A/B coberto; sem achados.

## TP-0066 — DevSecOps — 2026-10-10
TP-0066 aprovada em segurança; função invoker, sem oráculo cross-tenant, grants corretos, sem achados novos (RTP-0033 do QA segue aberta).

## TP-0068 — DevSecOps — 2026-10-10
TP-0068 aprovada em segurança: view `security_invoker`, somente leitura para `authenticated`, sem `lar_id`/`dono_id`, isolamento por RLS de dono confirmado no código; sem achados nem RTP.

## TP-0087 — DevSecOps — 2026-10-10
TP-0087 aprovada em segurança (invoker, search_path vazio, anon sem execute, dono_id explícito, isolamento A/B coberto por teste); sem achados, sem RTP nova.

## TP-0099 — DevSecOps — 2026-10-10
TP-0099 APROVADA em segurança: única DEFINER correta (search_path vazio, filtros explícitos, grants só authenticated, G-05 uniforme, sem vazamento B→A em ataques por SQL como A/B/sem-membro/anon); 1 achado baixo (sem teto de valor) aberto como RTP-0039.

## TP-0120 — DevSecOps — 2026-10-10
TP-0120 aprovada em segurança: funções invoker com search_path vazio, RLS do lar respeitada, sem exposição a anon, sem achados.

## TP-0121 — DevSecOps — 2026-10-10
TP-0121 aprovada na segurança: view api.despesas_fixas com security_invoker, só select para authenticated, sem lar_id, RLS do lar herdada; nenhum achado.

## TP-0122 — DevSecOps — 2026-10-10
TP-0122 OK em segurança (invoker, search_path vazio, grants só authenticated, RLS do lar, G-05 uniforme, sem SQL dinâmico); sem achado novo, RTP-0036 do QA permanece.

## TP-0136 — DevSecOps — 2026-10-10
TP-0136 aprovada na segurança: invoker, search_path vazio, anon sem execute, filtro de dono explícito e isolamento A/B sem canal de inferência; sem achados nem RTP; vitest real do isolamento pendente para o deploy.

## TP-0158 — DevSecOps — 2026-10-10
TP-0158 aprovada em segurança (revisão do diff: invoker, search_path vazio, RLS+FKs compostos, execute só authenticated, sem vazamento entre membros, fora de totais I-14); nenhum achado novo.

## RTP-0023 — DevSecOps — 2026-10-10
RTP-0023 aprovada em segurança: mudança só de teste, sem segredo, dependência ou dado pessoal; reforça o isolamento G-04 da individual de A em `orcamento_mes`.

## RTP-0030 — DevSecOps — 2026-10-10
RTP-0030 aprovada em segurança: função comum security invoker, search_path vazio, sem execute para anon, filtros RN-16e mantidos nos chamadores, sem achados.

## RTP-0033 — DevSecOps — 2026-10-10
RTP-0033 aprovada em segurança — troca de 2 UUIDs em teste, sem código de produção nem dependências; asserções de B agora provam o isolamento G-05 sem oráculo de saldo; sem achados.

## RTP-0034 — DevSecOps — 2026-10-10
RTP-0034 aprovada na segurança: mudança só em teste (limpeza em finally), sem nova superfície, segredo, dependência ou dado pessoal; nenhum achado.

## RTP-0035 — DevSecOps — 2026-10-10
RTP-0035 aprovada em segurança — só teste, sem mudança de superfície, sem segredos nem dependências novas; nenhum achado.

## RTP-0036 — DevSecOps — 2026-10-10
RTP-0036 aprovada em segurança — limpeza parametrizada, só host local, sem mudança de superfície nem dependência; sem achados.

## RTP-0037 — DevSecOps — 2026-10-10
RTP-0037 aprovada em segurança: diff só de tipagem em teste, sem dependência, segredo ou dado pessoal; isolamento de B intacto; nenhum achado.

## RTP-0038 — DevSecOps — 2026-10-10
RTP-0038 aprovada em segurança: diff é só espaço em branco em uma linha, sem asserção alterada, sem dependência nova, sem achados.

## RTP-0039 — DevSecOps — 2026-10-10
RTP-0039 aprovada em segurança: teto de 100000000000 centavos validado antes da escrita nas 3 funções e no check da tabela, grants/DEFINER/search_path preservados, sem achados.

## TP-0088 — DevSecOps — 2026-10-10
TP-0088 aprovada em segurança: trava de host exata (7/7 testes), sem credencial nem dado real, carga via api.* como membro, package.json só com 2 scripts; sem achados.

## TP-0123 — DevSecOps — 2026-10-10
TP-0123 aprovada em segurança (revisão do diff: invoker, search_path vazio, RLS do lar, delete só de pendentes, execute só authenticated); sem achados novos.

## TP-0124 — DevSecOps — 2026-10-10
TP-0124 OK na segurança: sem leitura de pagamento privado, invoker, search_path vazio, grants só authenticated; sem achados novos e sem dependência nova.

## TP-0139 — DevSecOps — 2026-10-10
TP-0139 OK em segurança (isolamento individual por dono_id explícito, invoker/search_path vazio, anon sem execute, só aditivo); sem achado novo, RTP-0043 (teste TP-0087) segue aberta.

## RTP-0040 — DevSecOps — 2026-10-10
RTP-0040 aprovada na segurança — diff só de teste, limpeza reaproveita apagarFixas (host local garantido, SQL parametrizado), sem achados.

## RTP-0041 — DevSecOps — 2026-10-10
RTP-0041 aprovada em segurança: apenas `analyze` e uma linha de README, sem impacto em dado, privilégio ou dependência; nenhum achado.

## RTP-0042 — DevSecOps — 2026-10-10
RTP-0042 aprovada em segurança: diff só de tipo em teste, sem mudança de superfície, sem segredo nem dependência nova e isolamento entre usuários preservado.

## RTP-0043 — DevSecOps — 2026-10-10
RTP-0043 aprovada em segurança: diff só de asserções de teste, sem segredo, dependência ou dado pessoal; sem achados.

## TP-0125 — DevSecOps — 2026-10-10
TP-0125 aprovada em segurança (invoker/search_path/grants preservados, DEFINER intacta, forma_do_membro sem vazamento, resposta sem campos privados); nenhum achado novo.

## TP-0127 — DevSecOps — 2026-10-10
TP-0127 aprovada na segurança (INVOKER, search_path vazio, escrita só no lar, anon sem execute, sem dado privado); achado baixo de escrita sem janela de meses aberto como RTP-0045.
