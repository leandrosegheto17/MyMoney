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

## RTP-0044 — DevSecOps — 2026-10-10
RTP-0044 sem achados de segurança; limpeza de teste só em host local, SQL parametrizado, sem dependência nova.

## RTP-0045 — DevSecOps — 2026-10-10
RTP-0045 aprovada em segurança; janela ±12 meses fecha o abuso de escrita, função segue security invoker e sem acesso anon, sem achados novos (revisão do diff, sem execução de stack).

## TP-0126 — DevSecOps — 2026-10-10
TP-0126 aprovada em segurança (só o pagador, G-02/03/05 ok, invoker); contorno de RN-06/I-20 por editar/excluir_lancamento segue na RTP-0046, sem RTP nova.

## TP-0128 — DevSecOps — 2026-10-10
TP-0128 aprovada em segurança (revisão do diff: filtro por forma/RLS do pagador, invoker, search_path vazio, assinatura intacta); sem achados, sem RTP.

## TP-0151 — DevSecOps — 2026-10-10
TP-0151 aprovada em segurança (metas individuais isoladas por filtro explícito mais RLS, guardado_no_mes só do autor, funções invoker sem execute para anon); sem achado novo, RTP-0047 (manutenção) já aberta.

## RTP-0046 — DevSecOps — 2026-10-10
RTP-0046 aprovada na segurança: só o pagador edita/exclui pagamento de fixa (B: sem_permissao/registro_invalido sem oráculo; sem membro e anon recusados), editar_lancamento segue SECURITY DEFINER com search_path vazio e grants só authenticated.

## RTP-0047 — DevSecOps — 2026-10-10
RTP-0047 Sec OK: funções novas `security invoker`, `search_path` vazio, sem execute para anon, RLS e isolamento de metas individuais preservados; revisão por leitura do diff, sem achados.

## RTP-0048 — DevSecOps — 2026-10-10
RTP-0048 aprovada na segurança: só 3 pgTAP mudaram, sem alteração de função, grant ou seed e sem dado sensível; nenhum achado novo (RTP-0049 já aberto pelo QA).

## RTP-0031 — DevSecOps — 2026-10-10
RTP-0031 aprovada na segurança (sem dependência nova, sem relaxar lint, sem segredo no tipo; tsc e lint exit 0); nenhum achado novo além do RTP-0050 já aberto pelo QA.

## RTP-0049 — DevSecOps — 2026-10-10
RTP-0049 sem achado de segurança: só arquivo de teste alterado, sem migration/grant/dependência nova nem dado sensível; revisão estática, nada executado.

## RTP-0016 — DevSecOps — 2026-10-10
RTP-0016 OK em segurança — 22 arquivos só com formatação (conteúdo idêntico), sem mudança de dependência e sem segredo novo (apenas o default local pré-existente de TESTE_DATABASE_URL).

## RTP-0050 — DevSecOps — 2026-10-10
RTP-0050 aprovada na segurança: verificação só lê o catálogo, com trava de host local, SQL constante somente leitura, sem credencial nova nem dependência nova.

## RTP-0051 — DevSecOps — 2026-10-10
RTP-0051 aprovada em segurança; só o arquivo de teste mudou, sem dependência/segredo novo e com o caso na sessão do usuário (sem service_role).

## RTP-0052 — DevSecOps — 2026-10-10
RTP-0052 aprovada em segurança; só um comentário mudou, sem dependência, segredo, migration ou grant novos.

## TP-0007 — DevSecOps — 2026-10-10
APROVADA; 0 críticos/altos, 1 não crítico (RTP-0055: ações por tag e não SHA); permissions mínimas, sem secrets/pull_request_target, 35 fingerprints verificadas no histórico (JWTs supabase-demo e placeholders), gitleaks/actionlint/prova no GitHub não executados.

## TP-0036 — DevSecOps — 2026-10-10
APROVADA; 0 críticos/0 não críticos; revisão do diff sem sinks perigosos (innerHTML/style/eval/storage), sem dependência de produção nova (só user-event em dev), foco/ARIA sem vazamento do campo oculto; eslint limpo e vitest 27/27 executados; alteração do BK-0002 é só teste.

## TP-0053 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; security_invoker, só SELECT a authenticated, anon negado, sem lar_id/dono_id, isolamento A/B e `pode_excluir` sem vazamento (FK impede vínculo privado em categoria conjunta) provados por sondas em banco descartável (PostgREST/pgTAP reais não verificados).

## TP-0138 — DevSecOps — 2026-10-10
OK — 0 críticos, 0 não críticos; invoker, search_path vazio, execute só authenticated, isolamento A/B, G-05, idempotência sem sobrescrita e sem dependência nova confirmados por sondas executadas em banco descartável (PostgREST/pgTAP real não executados).

## RTP-0018 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos de segurança; diff lido (sem service_role/segredo/URL/dependência nova, isolamento G-05 de B mantido), nada executado além da leitura.

## RTP-0053 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; diff só troca nome de pasta de prints (literal constante, sem path traversal), sem dependência, segredo, URL ou mudança de superfície.

## RTP-0054 — DevSecOps — 2026-10-10
OK; 0 críticos, 0 não críticos; seed ...0715 herda lar/escopo/dono da categoria ...0415 de A (sem vínculo cruzado), dado fictício local, teste sem service_role/credencial, sem dependência nova (revisão de leitura, sem execução).

## RTP-0055 — DevSecOps — 2026-10-10
APROVADA; 0 críticos/0 não críticos; 3 SHAs (checkout, setup-node, pnpm via `^{}`) confirmados por `git ls-remote` nos repositórios oficiais, 5 `uses:` de terceiros fixadas, passos e permissions inalterados.

## TP-0018 — DevSecOps — 2026-10-10
APROVADA em segurança, 0 críticos e 0 não críticos; revisão de leitura mais parse YAML e greps executados (permissions mínimas, SHAs fixados, sem secrets, anon mascarada, CLI do lockfile, sem dependência nova); SHAs no upstream e execução real dos jobs não verificados.

## TP-0037 — DevSecOps — 2026-10-10
TP-0037 aprovada em DevSecOps: diff lido sem HTML injetável, style inline, storage ou dependência nova; confirma só por clique no botão (foco inicial em Cancelar, véu e Esc inertes), pilha de foco sem vazamento; eslint 0 e 43 vitest passando; 0 achados.

## RTP-0057 — DevSecOps — 2026-10-10
RTP-0057 aprovada em segurança: diff executado confirma só comentário alterado, sem segredo/URL/dado pessoal nem dependência nova (0 achados).

## RTP-0058 — DevSecOps — 2026-10-10
APROVADA, 0 críticos/0 não críticos; só o nome do caso mudou (sufixo do id), sessão de usuário, sem segredo/URL/dependência nova e asserções de isolamento intactas (revisão do diff + grep).

## TP-0008 — DevSecOps — 2026-10-10
TP-0008 aprovada em segurança: 19 testes e shellcheck -x verdes, G-14/falha fechada/sem segredo/sem service_role conferidos, sem dependência nova; 0 críticos, 1 baixo (RTP-0062: validação de host do --db-url contornável por @ na query); ensaio real não verificado.

## TP-0019 — DevSecOps — 2026-10-10
OK; 0 críticos, 1 não crítico (RTP-0063: senha da CONTRATO_DB_URL pode aparecer no erro do execFileSync e shell no win32); 10 testes verdes, lockfile/CI/banco.ts/erros.ts limpos.

## TP-0109 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 1 não crítico novo (RTP-0064 baixa: host-local.sh passa `?x=@localhost` e `?host=`), RTP-0060 mantida (média); testes 31/31, 19/19, ensaio 7/7 em banco descartável com shim; sem segredos/pull_request_target/dependência nova; CLI real e CI não verificados.

## RTP-0056 — DevSecOps — 2026-10-10
APROVADA — 1 linha mudou (saída descartada, CODIGO e asserções intactos, set -e preservado), teste executado verde (2 casos), sem segredo/URL/dependência; 0 achados.

## RTP-0059 — DevSecOps — 2026-10-10
APROVADA — diff de 1 linha de diretiva shellcheck, sem segredo/URL/dependência, `source` de host-local.sh intacto e sem path traversal; 0 críticos, 0 não críticos (revisão de leitura, nada executado).

## RTP-0060 — DevSecOps — 2026-10-10
APROVADA: perl só lê o texto, nomes hostis e ReDoS testados sem bypass, 62+24 testes ok; perl que falha só induzido por limite artificial de memória, RTP-0072 confirmada como defesa em profundidade (cobrir também symlink pendente); 0 críticos, 0 RTP novos.

## RTP-0061 — DevSecOps — 2026-10-10
OK; 0 críticos, 0 não críticos; diff de 1 linha de comentário, trava G-06 chamada antes de qualquer conexão, carregar.test.sh 10 casos verdes.

## RTP-0062 — DevSecOps — 2026-10-10
APROVADA; 0 críticos/1 não crítico (RTP-0074: --db-url vazio vira --linked); trava via exigir_host_local sem desvio, antes de qualquer uso da URL, G-14/CI intactos, 24+48 testes e 12 casos adversariais executados.

## RTP-0063 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (env herdado pelo filho -> RTP-0075); prova: 8 modos de falha com senha especial sem fragmento em stdout+stderr, sem shell, banco.ts fixo; vazamento parcial do mascarar segue em RTP-0071 (defesa em profundidade, stderr real não repete a URL).

## RTP-0064 — DevSecOps — 2026-10-10
APROVADA — leitura linha a linha + 46 casos próprios (case, IPv6, %00, host=/HOST=/hostaddr, `;`/`&`, userinfo, 0.0.0.0, 127.x, ::ffff:) sem bypass, falha fechada e senha fictícia nunca impressa; host-local 48/48, carregar e migrar 24/24 ok; ensaiar-migration.test.sh não executado (sem Docker); 0 achados.

## TP-0020 — DevSecOps — 2026-10-10
OK; 0 críticos, 0 não críticos; só tipos, privacidade do pagador preservada (pagamento?/data_ajustada? opcionais), mockup fictício, @types/node só acréscimo com integrity e sem exceção de idade, audit --prod limpo, typecheck e 65 testes verdes.

## TP-0025 — DevSecOps — 2026-10-10
TP-0025 APROVADA em segurança (59/59 testes, eslint e audit limpos, só anon via lerAmbiente, cliente interno, erros sem vazamento, redefinição neutra); sem achado novo, RTP-0066 já cobre o limite de taxa.

## RTP-0065 — DevSecOps — 2026-10-10
APROVADA; 0 críticos/0 não críticos; diff só de tipo e teste, sem superfície de segurança nem dependência alterada (revisão de leitura, nada executado).

## RTP-0066 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; neutralidade de usuário inexistente preservada (G-05), sem texto do servidor na tela, 25 testes passando.

## RTP-0067 — DevSecOps — 2026-10-10
APROVADA — diff de 1 linha (diretiva shellcheck), sem mudança de superfície nem dependência; 0 achados.

## RTP-0068 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; diff de 1 linha no find do shellcheck, sem mudança de superfície, sem dependências.

## RTP-0071 — DevSecOps — 2026-10-10
APROVADA — 0 críticos, 0 não críticos; mascararUrl sem vazamento de senha com @ // ? # crus (executado) e validação G-06 preservada (lido).

## RTP-0072 — DevSecOps — 2026-10-10
APROVADA, 0 críticos/0 não críticos; falha do perl agora reprova (falha fechada), teste novo 10/10 reexecutado, sem dependência nova.

## RTP-0073 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; diff só de testes/CI/README, 6 suítes verdes (62+10), script G-12 intacto, CI passa a rodar o falha-fechada.

## RTP-0074 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; diff lido e migrar.test.sh 30/30 e host-local.test.sh 48/48 executados, --db-url vazio/repetido não cai em --linked.

## TP-0033 — DevSecOps — 2026-10-10
APROVADA, 0 críticos e 0 não críticos; guarda não renderiza nada em "carregando", sem open redirect nem token no título, sem import de dados/ na página, lint e 74 testes passam (executados).

## TP-0038 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; diff só de constantes com `import type` do contrato, sem dependência nova, eslint limpo.

## TP-0069 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; escrita só por rpc, G-05 uniforme, sem console/dado cru, sem dependência nova, eslint limpo; sem RTP.

## TP-0076 — DevSecOps — 2026-10-10
APROVADA — 0 críticos, 1 não crítico (baixo, RTP-0078: cache de outro usuário persiste até sobrescrita); audit de dependências limpo, cache por usuário e fila preservada confirmados por leitura.

## TP-0077 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 novos não críticos (RTP-0076 e RTP-0077 do QA seguem); dono vindo da sessão, remoção só pós-sucesso/descarte confirmado, 22/22 testes.

## TP-0102 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; diff revisado (rpc-only, G-05 uniforme, sem console, sem dependência nova), nenhuma RTP.

## TP-0129 — DevSecOps — 2026-10-10
APROVADA; 0 achados críticos, 0 não críticos; diff lido (rpc-only, G-05/G-17 ok, sem dependência nova), 28 testes executados passando.

## TP-0140 — DevSecOps — 2026-10-10
APROVADA — 0 críticos, 0 não críticos; diff lido (escrita só por rpc, uuid inválido sem requisição, sem escopo/dono no definir, sem fila, sem dependência nova); vitest 22 passando e eslint limpo executados.

## TP-0152 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; escrita só por rpc tipada, sem conta alheia/console/dependência nova (revisão de diff + grep executado).

## RTP-0075 — DevSecOps — 2026-10-10
APROVADA — env do filho supabase por lista de permissão, provado por teste (35/35); 0 críticos, 0 não críticos; execução contra banco real não executada.

## RTP-0076 — DevSecOps — 2026-10-10
APROVADA; 0 críticos/0 não críticos; diff lido (sem texto bruto/token guardado, item intacto no 401), vitest 32/32 executado, sem dependências novas.

## RTP-0077 — DevSecOps — 2026-10-10
APROVADA — diff é fixture sintético e teste de leitura local; sem dado sensível nem dependência nova; 0 achados (somente leitura, nada executado).

## RTP-0078 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; `lerCache` apaga só o store `mymoney-cache` do outro usuário (fila intacta, G-17), 7 testes do cache passando, achado de baixa do TP-0076 coberto.

## TP-0041 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; `mes` da URL validado por regex com padrão seguro, sem sink de DOM/rede/armazenamento, sem dependência nova; 43 testes vitest passando, SAST/DAST ficam para a auditoria de release.

## TP-0042 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; diff lido (texto como nó React, sem HTML/rede/storage) e grep de sinks perigosos executado sem ocorrências; sem dependência nova.

## TP-0044 — DevSecOps — 2026-10-10
APROVADA, 0 críticos/0 não críticos; diff sem style estático, sem dangerouslySetInnerHTML, sem cálculo de regra e sem dependência nova (grep executado), sem dado pessoal.

## TP-0078 — DevSecOps — 2026-10-10
APROVADA, 0 críticos/0 não críticos; esvaziamento só com sessão válida, nada apagado, isolamento por dono confirmado no diff, 26 testes executados passando, sem mudança de dependência.

## TP-0080 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; diff lido e grep executado (sem HTML bruto, style inline, import de dados/ nem dependência nova); superfície de segurança nula.

## RTP-0079 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; revisão do diff de 3 arquivos de teste/vitrine sem dado sensível, rede ou dependência nova (nada executado).

## RTP-0080 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; diff só de testes, sem dependência nem superfície de segurança (revisão por leitura, nada executado).

## TP-0026 — DevSecOps — 2026-10-10
APROVADA — 0 críticos, 1 não crítico (RTP-0083: trava só em mode=production); bundle de produção real limpo do modo (grep), teste de build 2/2, build com a variável falha, sem dependência nova.

## RTP-0081 — DevSecOps — 2026-10-10
APROVADA (revisão do diff, só lido, nada executado) - preventDefault no mousedown da ListaFormas e ajustes de vitrine/spec sem superfície de segurança, sem dependência nova nem dado sensível; 0 críticos, 0 não críticos; nenhuma RTP aberta.

## RTP-0082 — DevSecOps — 2026-10-10
OK DevSecOps (revisão do diff, nada executado): troca de `<title>` em HTML de vitrine e2e, sem impacto de segurança; 0 críticos, 0 não críticos, nenhuma RTP aberta.

## RTP-0083 — DevSecOps — 2026-10-10
APROVADA — 0 críticos/0 não críticos; vite build em production, development e staging com a variável falha (exit 1, sem artefato), bundle sem marcadores do modo, teste de build 3/3 verde.

## TP-0045 — DevSecOps — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0088: códigos de Auth que revelam a conta caem em mensagem diferente de "E-mail ou senha incorretos."); lido o diff + vitest 18/18; sem dependência nova, senha/e-mail sem log/URL/storage, redirectTo fixo.

## TP-0046 — DevSecOps — 2026-10-10
APROVADA — token do link não vaza (sem log/título/storage próprio, hash tratado pelo supabase-js, teste "token não fica na URL" 15/15 verde), mensagens uniformes, `sair()` local após troca; 0 críticos, 0 não críticos; fluxo real com Auth e política do servidor pendentes para a auditoria de release.

## RTP-0084 — DevSecOps — 2026-10-10
APROVADA em segurança (revisão do diff, nada executado); 0 críticos, 0 não críticos novos; G-05 preservada, textos estáticos sem conteúdo bruto do servidor.

## RTP-0085 — DevSecOps — 2026-10-10
OK — revisão do diff: senha não vai a log/URL/storage/DOM, focarPrimeiroErro só foca, aoEnviar recebe apenas o form; 0 achados (nada executado).

## RTP-0088 — DevSecOps — 2026-10-10
APROVADA — 0 críticos, 1 não crítico (RTP-0090: user_sso_managed/phone_not_confirmed ainda diferenciam a conta); 3 códigos uniformizados, 47 testes executados verdes; timing do servidor não medido.

## RTP-0089 — DevSecOps — 2026-10-10
APROVADA — revisão do diff (lido, nada executado além do diff): troca de literais por constantes de texto puro, sem impacto de segurança; 0 críticos, 0 não críticos, sem RTP.

## RTP-0090 — DevSecOps — 2026-10-10
APROVADA — 0 críticos, 0 não críticos; diff lido (sem log do erro bruto, limites de taxa intocados) e vitest erros+sessao 37/37 executado.

## TP-0160 — DevSecOps — 2026-10-10
APROVADA — 0 críticos, 0 não críticos; sem service_role e sem log de token, revogação global chamada antes de limpar a sessão local, rede/5xx preservam sessão e cache; vitest sessao 39/39.

## TP-0047 — DevSecOps — 2026-10-11
APROVADA: 0 críticos/0 não críticos; vitest 60/60, sem dependência, segredo, log ou storage novo; sair local limpa o cache, global revoga no servidor e mantém a sessão sem rede; confirmação destrutiva presente.

## TP-0090 — DevSecOps — 2026-10-11
OK — 0 críticos, 0 não críticos, 0 RTP novas; sem dependência nova, sem dangerouslySetInnerHTML/style estático/segredo/log/import de dados em grep executado; só formatação sobre dado da API.

## RTP-0091 — DevSecOps — 2026-10-11
OK — 0 críticos, 0 não críticos, 0 RTP novas; diff lido e grep executado (sem innerHTML/log/storage/segredo), sem dependência nova.

## RTP-0092 — DevSecOps — 2026-10-11
OK — 0 críticos, 0 não críticos, 0 RTP novas; ícone dir fixo e aria-hidden, sem innerHTML/log/storage/segredo (grep executado), sem dependência nova.

## TP-0101 — DevSecOps — 2026-10-11
APROVADA - 0 críticos, 0 não críticos; sem dependência nova, sem innerHTML/log/storage/segredo (grep executado), texto da API e `Icone.rotulo` escapados pelo React.

## TP-0105 — DevSecOps — 2026-10-11
APROVADA — 0 críticos, 0 não críticos novos (sem RTP); autorização real no servidor (editar_lancamento DEFINER + permissoes_edicao), cliente só oculta campos; sem innerHTML/segredo/log/storage/dependência nova; erros sem mensagem crua; I-21 só com clique explícito.

## TP-0130 — DevSecOps — 2026-10-11
APROVADA; 0 críticos, 0 não críticos; autorização de desfazer/marcar é do servidor (RPC com dono explícito), sem segredo/log/innerHTML/dependência nova nem redirecionamento aberto nos arquivos compartilhados.

## TP-0131 — DevSecOps — 2026-10-11
APROVADA; 0 críticos, 0 não críticos, nenhuma RTP; grep de sinks/segredos limpo, sem dependência nova, RPC/RLS revalidam valor, dia e categoria, id da rota validado por UUID.

## TP-0154 — DevSecOps — 2026-10-11
APROVADA; 0 críticos, 1 não crítico (RTP-0102); retry global sem mascarar autorização, uuid validado, G-05 igual para inexistente/alheia, sem innerHTML/segredo/dependência nova; vitest 15/15; SAST completo fica no /deploy.

## TP-0070 — DevSecOps — 2026-10-13
OK (rodadas 1 e 2): contas lidas via view security_invoker/RLS, saldo do servidor sem soma no cliente, texto escapado sem innerHTML/style/log/storage, cache em memória limpo no sair, comparar-visual.mjs só com espera maior, sem dependência nova; 0 críticos, 0 não críticos, nenhuma RTP.

## TP-0071 — DevSecOps — 2026-10-13
OK (rodadas 1 e 2) — autorização e validação no servidor (RPC security invoker, dono do contexto, G-05), uuid na rota, prévia só simulada, exclusão com confirmação, sem innerHTML/segredo/dependência nova, asserções do teste intactas; 0 críticos, 1 baixo (nome sem limite de tamanho, RTP-0111); vitest 28 ok, tsc limpo.

## TP-0089 — DevSecOps — 2026-10-13
APROVADA (rodadas 1 e 2); 0 achados; `vite build` executado e grep no dist sem semeadura/token/sessão falsa; sem segredo, innerHTML, log/storage sensível, dependência nova ou redirecionamento aberto; mês da URL validado.

## TP-0103 — DevSecOps — 2026-10-13
OK; 0 críticos, 0 não críticos, sem RTP; RPC security invoker com RLS, `mes` validado por regex, texto escapado, sem innerHTML/storage/log/segredo/dependência nova (greps executados), filtros da URL ficam para o TP-0104.

## TP-0106 — DevSecOps — 2026-10-13
TP-0106 APROVADA em segurança: RPC autoriza no servidor com `registro_invalido` único (sem enumeração), exclusão só pelo botão do diálogo, duplo envio barrado no hook, cache correto, sem innerHTML/segredo/dependência nova; 0 críticos, 1 não crítico (RTP-0112 uuid no comando; RTP-0105 já cobre estado ocupado).

## RTP-0093 — DevSecOps — 2026-10-13
APROVADA; 0 achados; diff só monta aria-label com dados já exibidos, sem sink perigoso (grep limpo), sem dependência nova.

## RTP-0094 — DevSecOps — 2026-10-13
APROVADA; 0 achados; diff só de texto de UI, sem superfície de segurança nem dependência nova (lido, nada executado).

## RTP-0096 — DevSecOps — 2026-10-13
APROVADA; 0 achados; diff só documental, sem código/dependência (Campo e FormularioFixa intactos), nenhuma RTP aberta.

## RTP-0097 — DevSecOps — 2026-10-13
APROVADA; 0 achados; diff só de className/CSS/teste, sem dependência nem dado pessoal; revisão de leitura, nada executado.

## RTP-0098 — DevSecOps — 2026-10-13
APROVADA; 0 críticos/0 não críticos; diff é só uma lista de ids em JSON, sem superfície de segurança (revisão de leitura, sem dependência alterada).

## RTP-0099 — DevSecOps — 2026-10-13
APROVADA; 0 críticos, 0 não críticos; diff só de teste, sem superfície de segurança nem dependências (revisão de leitura, nada executado).

## RTP-0100 — DevSecOps — 2026-10-13
APROVADA; 0 achados (diff só de docs e mockup estático, sem dependência nem dado pessoal); nada executado além da leitura do diff.

## RTP-0101 — DevSecOps — 2026-10-13
APROVADA; 0 achados; diff só remove CSS/classe de estilo, sem superfície de segurança nem dependência nova (revisão de leitura).

## RTP-0102 — DevSecOps — 2026-10-13
APROVADA COM DÉBITO; 0 críticos/1 baixo (RTP-0113: useMeta ainda consulta metas com id malformado); movimentos_meta guardado e G-05 preservado; Meta.test 17 passando.

## TP-0118 — DevSecOps — 2026-10-13
APROVADA; 0 críticos, 0 não críticos novos (RTP-0107/0108 já abertas pelo QA); escrita só via RPC em dados/ com validação de uuid, outro membro sem controle, erro genérico, sem fila; revisão de diff + 2 greps, sem dependências novas.

## RTP-0087 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 1 baixo (RTP-0131: config.toml local com enable_signup=true, fora do diff); sem código/dependência alterados e artefatos visuais gitignored, sessão falsa, sem segredo.

## RTP-0103 — DevSecOps — 2026-10-14
APROVADA; 0 achados; diff só adiciona teste com fixtures sintéticas, sem produção/dependência/segredo; revisão de leitura, nada executado.

## RTP-0104 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; diff só em .md (UX-SPEC §5 T04 e TP-0103), sem código/dependência/segredo e sem enfraquecer requisito de segurança.

## RTP-0105 — DevSecOps — 2026-10-14
APROVADA; 0 achados; duplo envio barrado no Botao (aria-disabled + guarda no handler) e Esc/Cancelar inertes durante a chamada, autorização segue no servidor, sem dependência nova (revisão de diff, nada executado).

## RTP-0106 — DevSecOps — 2026-10-14
APROVADA; 0 achados; diff só de teste (dados fictícios), sem produção/dependência/segredo.

## RTP-0111 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; salvar_conta mantém invoker/search_path fixo/grants só authenticated, limite 80 no servidor com erro estável, pgTAP 107 arquivos PASS e catálogo confirmado no banco local.

## TP-0072 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; view security_invoker, sem somatório, sem style inline/innerHTML, sem dependência nova (revisão do diff + grep).

## TP-0073 — DevSecOps — 2026-10-14
APROVADA; 0 achados (diff revisado, sem dependência nova, `p_conta_id: null` coerente com o servidor, tipo imutável e RLS no servidor); executado só grep + 33 testes, sondas ativas ficam para a auditoria de release.

## TP-0075 — DevSecOps — 2026-10-14
APROVADA; 0 achados (sem crítico/não crítico); tipo/escopo imutáveis, `nome_repetido` sem vazamento entre membros, `:id` validado como uuid, sem dependência nova nem `style` inline; 23 testes passando.

## TP-0091 — DevSecOps — 2026-10-14
APROVADA em segurança (revisão do diff); 0 achados de segurança, nenhuma RTP nova (RTP-0117 do QA segue aberta); Casa só consome `conjunto`, nomes escapados pelo React, sem dependência alterada.

## TP-0092 — DevSecOps — 2026-10-14
APROVADA; 0 achados de segurança (revisão do diff: só dados da casa, textos escapados pelo React, ids via URLSearchParams/uuid, sem dependência nova); nada executado além de grep/diff.

## TP-0093 — DevSecOps — 2026-10-14
APROVADA — 0 achados de segurança; bloco Eu usa só `individual` (restrito ao membro no servidor), sem XSS nem dado do outro membro, `LinhasValores.receita` inofensivo, sem dependência nova; SAST/teste ativo ficam para o /deploy.

## TP-0095 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; revisão de diff: `?instalar=1` fixo e lido só com `=== '1'` (sem uso inseguro), mês vazio sem exposição de dado, sem innerHTML, sem dependência nova; nada executado além de grep/diff.

## TP-0104 — DevSecOps — 2026-10-14
APROVADA; 0 achados (filtros da URL validados por whitelist/UUID, rodapé da fila só leitura e filtrado por dono, sem dependência nova); vitest 16 ok, grep de sinks perigosos limpo.

## TP-0107 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; revisão do diff + ESLint e greps de fronteira/inline/links limpos, localStorage guarda só a marca de dispensa, sem dependência nova.

## TP-0132 — DevSecOps — 2026-10-14
APROVADA: 0 crítico/alto/médio, 1 baixo (RTP-0130: data do pagamento sem faixa no servidor); `?pagar=` validado por uuid+ocorrência carregada, regra/forma/valor no servidor (API 6/6 executado), duplo envio barrado no cliente e no servidor.

## TP-0153 — DevSecOps — 2026-10-14
APROVADA; 0 achados; separação casa/eu garantida pela RLS/view (não pelo cliente), nome da meta como texto, sem dependência nova; grep e 15 testes executados.

## TP-0156 — DevSecOps — 2026-10-14
APROVADA; 0 achados (sem crítico/alto/médio/baixo); validação, autorização de meta/conta e limite de retirada são do RPC no servidor, conta só no corpo do RPC, sem dependência nova, sem dangerouslySetInnerHTML, telas.json só com dados fictícios.

## RTP-0109 — DevSecOps — 2026-10-14
APROVADA — diff só HTML estático do mockup, sem script/recurso externo/segredo/dado real (lido, não executado); 0 críticos, 0 não críticos.

## RTP-0110 — DevSecOps — 2026-10-14
APROVADA; 0 achados; `recorte` só vai para `locator()` (sem eval/rede/child_process novos), escrita só em `.md/.visual`, `telas.json` sem segredo/dado real (revisão de leitura).

## RTP-0114 — DevSecOps — 2026-10-14
APROVADA — 0 críticos, 0 não críticos; diff de uma linha de apresentação (prop booleana), sem sink de XSS, dependência ou mudança de submissão (revisão de leitura; nada executado).

## RTP-0115 — DevSecOps — 2026-10-14
APROVADA; 0 achados (diff só de apresentação, sem sinks de XSS, sem dependência, submissão inalterada; ajuda omitida não é mensagem de segurança); verificação por leitura + busca de padrões.

## RTP-0117 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; rename puro de CSS e imports, sem sinks (style=/dangerouslySetInnerHTML/url()), sem dependência nem dado real.

## RTP-0118 — DevSecOps — 2026-10-14
APROVADA; 0 achados; mês vem da prop `mes`, formatado e renderizado como texto JSX, sem sinks de XSS nem dependência nova.

## RTP-0119 — DevSecOps — 2026-10-14
APROVADA; 0 achados; diff só de testes com fixtures fictícias e rotas interceptadas, sem segredos, dependência ou código de produção.

## RTP-0120 — DevSecOps — 2026-10-14
APROVADA em segurança; 0 achados (só renderização condicional sobre dados do próprio membro, sem XSS/dependência); verificação por leitura do diff, nada executado.

## RTP-0122 — DevSecOps — 2026-10-14
APROVADA — 0 achados; diff só de teste, href constante e ProvedorInstalar só lê `instalar === '1'` (revisão de leitura, nada executado).

## RTP-0123 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; diff só de tipo/teste, sem dependência nova, sem sink XSS, sem alteração do que a fila local guarda (revisão de leitura, nada executado).

## RTP-0124 — DevSecOps — 2026-10-14
APROVADA; 0 achados; HTML estático do mockup sem script, sem segredo/dado real e sem link externo (fonte do Google é convenção herdada do mockup), UX-SPEC sem enfraquecer segurança; verificado por leitura do diff e grep.

## RTP-0125 — DevSecOps — 2026-10-14
APROVADA; 0 achados; diff só de testes (LIDO), sem código de produção/dependência/segredo/dado real; nada executado por não haver superfície.

## RTP-0127 — DevSecOps — 2026-10-14
APROVADA; 0 achados; diff de 2 linhas em mockup HTML estático, sem script/recurso externo/segredo/dado real (revisão de leitura, nada executado).

## RTP-0128 — DevSecOps — 2026-10-14
APROVADA; 0 achados; gancho sem navegação/HTML, validação (ehUuid, whitelist, '1') mantida em cada consumidor, demais parâmetros preservados; revisão de leitura, sem dependência nova.

## RTP-0129 — DevSecOps — 2026-10-14
APROVADA; 0 achados de segurança (diff só acrescenta id "T13" em lista JSON; JSON validado por parse), nenhuma RTP aberta.

## TP-0074 — DevSecOps — 2026-10-14
APROVADA — whitelist de `?tipo=`, nomes como texto, `seta={false}` do ItemLink só visual, sem dependência nova; 0 críticos, 0 não críticos, nenhuma RTP.

## TP-0081 — DevSecOps — 2026-10-14
APROVADA — 0 críticos, 0 não críticos; folha oculta fora do alcance de teclado/leitor (hidden no div externo), nada financeiro em storage, estado some ao sair, sem dependência nova, /ensaio-teclado removida sem resquício.

## TP-0155 — DevSecOps — 2026-10-14
APROVADA (rodada 2) — 0 achados; `?escopo` em whitelist, `:id` validado como uuid, escopo não enviado na edição e regras/autorização no RPC `salvar_meta`; sem `dangerouslySetInnerHTML` nem dependência nova.

## TP-0159 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; RPC valida membro, valor, forma/conta do dono e idempotência no servidor, API test 4/4 contra Supabase local, sem dependência nova.

## TP-0009 — DevSecOps — 2026-10-14
APROVADA, 0 críticos e 0 não críticos; G-14 coberto por 8/8 testes executados, G-15 sem segredo (grep e histórico limpos, ref não é segredo), sem ref/URL hard-coded nem senha em argumento, dump fora do repo; alerta externo: config.toml não commitado com enable_signup=true.

## RTP-0116 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; diff só CSS/teste, sem dependência nem dado pessoal, nada executado além da leitura.

## RTP-0130 — DevSecOps — 2026-10-14
APROVADA — validação de faixa de data no servidor, sem vazamento nem regressão de permissão; 0 achados de segurança, nenhuma RTP nova.

## RTP-0132 — DevSecOps — 2026-10-14
OK; 0 críticos, 0 não críticos; diff só de CSS/imports, sem dependência nem dado sensível (revisão de leitura, nada executado).

## RTP-0135 — DevSecOps — 2026-10-14
APROVADA; 0 achados; só asserção e2e, sem impacto de segurança (revisão de leitura do diff).

## TP-0083 — DevSecOps — 2026-10-14
APROVADA em segurança — 0 críticos, 0 não críticos; diff lido (sem HTML cru, sem cálculo de data/parcela no cliente, limite 1–24 só como guia, sem import de dados/, sem dependência nova); nada executado além da leitura do diff.

## TP-0141 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; escopo da URL em lista fechada, sem XSS/cálculo/import de dados na tela, sem dependência nova (revisão do diff, grep executado).

## RTP-0006 — DevSecOps — 2026-10-14
APROVADA; 0 críticos/0 não críticos; diff lido remove a exceção de minimumReleaseAge sem nova exceção nem dependência nova (nada executado por este chapéu).

## RTP-0095 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; diff lido (CSS + tratamento de erro no cliente via mensagemErro), sem dependência nova nem superfície de segurança; nada executado além da leitura.

## RTP-0108 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; revisão de diff apenas (nada executado), sem import/style inline/HTML cru novos e sem dependência nova, chamadas intermediárias ao rpc eliminadas.

## RTP-0133 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; diff só de texto em UX-SPEC (lido, nada executado), sem impacto de segurança.

## RTP-0136 — DevSecOps — 2026-10-14
APROVADA em segurança (revisão de diff, nada executado); 0 críticos, 0 não críticos; validação continua no servidor.

## RTP-0137 — DevSecOps — 2026-10-14
APROVADA — diff é só lista estática de IDs de tela em JSON, sem impacto de segurança; 0 críticos, 0 não críticos; nada executado (revisão de leitura).

## RTP-0138 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; diff só `.gitattributes` (config de EOL), revisão de leitura, sem execução nem dependência nova.

## RTP-0139 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; diff só de estado local de UI, sem dependência nova nem superfície de segurança (revisão de leitura, nada executado).

## RTP-0140 — DevSecOps — 2026-10-14
APROVADA; 0 críticos/0 não críticos; remoção de componente estático sem impacto de segurança, grep sem referências restantes.

## TP-0028 — DevSecOps — 2026-10-14
APROVADA em segurança; 0 críticos, 0 não críticos novos; CSP/HSTS/nosniff/no-referrer/Permissions-Policy conferidos no diff, ref confirmado em limpeza.md e 15 testes executados passando; teste ativo em deploy fica para o /deploy.

## TP-0084 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; diff lido (fila/idempotência, erros só por rótulo, sem HTML cru/style/dependência nova) e 40 testes do gancho e dos rótulos executados ok; SAST e teste ativo ficam para o `/deploy`.

## TP-0142 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; revisão do diff (lida, nada de segurança executado): só mês/categoria/valor enviados, abre só para id já na resposta, registro_invalido genérico (G-05), sem dependência nova.

## RTP-0141 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; diff só de dados (telas.json, lista de telas), revisão por leitura, sem impacto de segurança.

## RTP-0142 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; diff é só texto em TASK.md (lido, nada executado), sem impacto de segurança.

## RTP-0144 — DevSecOps — 2026-10-14
APROVADA; 0 achados críticos, 0 não críticos; CSP do vercel.json inalterada e sem unsafe-*, sem segredo, e2e CSP reexecutado (1 passando).

## RTP-0145 — DevSecOps — 2026-10-14
APROVADA; 0 críticos/0 não críticos; diff só de apresentação/foco lido (seletor literal, sem entrada externa, sem dependência nova), nada executado.

## RTP-0146 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; revisão de diff (lida, não executada): mensagem genérica G-05, sem consulta nova nem dado sensível.

## TP-0108 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; isolamento por dono em listar/reativar/descartar/enviar confirmado no diff, descarte só com confirmação, sem dado sensível novo em log/IndexedDB (revisão de diff; testes do QA).

## TP-0116 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 1 não crítico (RTP-0149: e2e @integracao sem trava de host local); revisão do diff e grep executados, sem fila/IndexedDB nem credencial real versionada, gitleaks/semgrep não executados.

## RTP-0147 — DevSecOps — 2026-10-14
APROVADA — diff só JSON do mockup (mapa T23 e resposta 400 falsa genérica), sem segredo/dado pessoal/código de app; 0 críticos, 0 não críticos (revisão de leitura, nada executado).

## RTP-0148 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; limpeza só em localhost, só chave anon + JWT do usuário de teste, sem service_role nem credencial versionada (revisão de diff + git check-ignore/grep).

## RTP-0149 — DevSecOps — 2026-10-14
APROVADA; 0 críticos, 0 não críticos; trava recusa localhost.evil.com/userinfo@host (executado), sem senha padrão nem .env versionado.

## RTP-0152 — DevSecOps — 2026-10-14
APROVADA (DevSecOps), 0 críticos/0 não críticos; revisão de diff: Excluir só com pode_excluir e sempre via DialogoConfirmacao (portal), sem HTML cru/style inline; nada executado.

## RTP-0153 — DevSecOps — 2026-10-14
APROVADA (0 críticos, 0 não críticos); actionlint limpo e leitura confirmam token mínimo, ações por SHA, sem segredo/injeção, artefato só em falha sem dado sensível, PR de fork sem exposição.

## TP-0010 — DevSecOps — 2026-10-14
APROVADA (0 críticos, 0 novos; RTP-0154 cobre o restante); diff sem chave/senha, cadastro e OTP-create recusados (422) por curl, nada exposto na Data API; senha 12, JWT, rotação, redirect e pg_graphql só confirmados pelo usuário; na RTP-0154 remover `public` do extra_search_path do painel.

## RTP-0155 — DevSecOps — 2026-10-14
APROVADA, 0 críticos e 0 não críticos; 422 signup_disabled reexecutado no Supabase local, test:config 26/26, nenhum config push nem JWT/anon de produção no repo, anon local mascarada no CI.

## RTP-0156 — DevSecOps — 2026-10-14
APROVADA — só 2 linhas no ci.yml; sem segredo real (só `comparacao.invalid`), sem permissão/`secrets.*`/`pull_request_target` novos, passo sem sessão sem VITE_MODO_COMPARACAO, trava do vite.config.ts intacta; 0 achados.

## RTP-0157a — DevSecOps — 2026-10-14
APROVADA; 0 achados; zonas/no-restricted-imports de dados/ intactos, matriz == ADR-015 §5, sem eslint-disable nem segredo (grep), lint 42/42 executado.

## RTP-0157b — DevSecOps — 2026-10-14
APROVADA em segurança; 0 críticos, 0 não críticos novos; refatoração sem mudança de comportamento, mensagens de erro sem vazamento, sem eslint-disable/skip/segredo, lint só com os 35 `no-restricted-paths` da RTP-0157c.

## RTP-0157c — DevSecOps — 2026-10-14
APROVADA — comum/ puro (só tipos e ehUuid), tradução de erro/supabase-js/idb-keyval só em dados/, componentes/paginas sem importar dados/, nenhuma regra desligada, lint exit 0 e test/lint 42/42 executados; 0 críticos, 0 não críticos.
