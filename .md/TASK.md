# TASK.md

**Dono**: Tech Lead
**Data**: 2026-09-02 (Seção 1.1, Seção 2 — `SPK-001` —, e Seção 3.1 — `BE-M-00`,
`BE-M-01`, `BE-M-02`, `BE-M-06`, `BE-M-07`, `BE-M-09` reestimadas/com critério
adicional, mais `BE-M-12` nova — reabertas e reescritas em 2026-09-02, mesma data, em
consequência do fechamento do Bloqueio 003 — ver nota de reabertura abaixo); **e
2026-09-03** (resolução tática pontual do Bloqueio 005 — Seção 1.1 `DIR-02`/`DIR-33`,
Seção 3.1 `BE-M-09` reescrita/`BE-M-10` com pré-requisito novo, Seção 3.3 nota no
bloco Backend, Seção 4.1/4.3, Seção 5, Seção 6.2 `DET-05` — ver "Nota de Resolução
Tática (Bloqueio 005)" abaixo; **e mitigação do risco de segurança do Bloqueio 006,
mesma data** — Seção 3.1 `BE-M-09` com condição de aceite explícita de mitigação e
estimativa revista, Seção 5, Seção 6.2 `DET-06` nova — ver "Nota de Resolução de
Risco (Bloqueio 006)" abaixo; **e correção sistêmica de ownership de FK cross-tenant
determinada pelo CTO (Bloqueio 010/SEC-DEBT-002), mesma data** — Seção 3.1 `BE-M-13`
nova, Seção 3.3 nota de pré-condição do bloco Fase 3, Seção 4.1/4.3, Seção 5, Seção
6.2 `DET-07` nova — ver "Nota de Resolução de Risco (Bloqueio 010)" abaixo; **e
correção estrutural de processo — aplicação da convenção de Lote conforme
`EXECUTION-FLOW.md`, mesma data** — nova coluna "Lote" em toda tabela de tarefas da
Seção 3 (as 74 tarefas classificadas, nenhum critério de aceite/estimativa/status
alterado), Seção 6.3 nova (racional do agrupamento em lotes) e Seção 7 nova ("Log de
Lotes Fechados", iniciada vazia) — ver "Nota de Atualização Estrutural (Convenção de
Lote)" abaixo); **e formalização retroativa da correção sistêmica do Bloqueio 015
(ausência de `user_id` em todo `INSERT` do Frontend contra tabela "ownable" +
ausência de `DEFAULT auth.uid()` no banco), mesma data** — Seção 3.1 `BE-M-14`
(Backend) e `FE-M-13` (Frontend) novas, ambas retroativas (trabalho já executado e
verificado antes desta formalização, mesmo padrão excepcional já registrado para
`BE-M-12`/`BE-M-13`), Lote "Autenticação & Segurança", Seção 5, Seção 6.2 `DET-08`
nova, Seção 7 fechamento do lote "Categorização" + racional 7.4 — ver "Nota de
Resolução de Risco (Bloqueio 015)" abaixo)
**Gate de entrada**: `SDD.md` aprovado com ressalvas no Gate 2 do CTO (2026-09-02),
**reaberto pontualmente e reaprovado com ressalvas** na subseção "Fechamento do Gate 2
Reaberto" de `CTO-REVIEW.md` (2026-09-02, ver nota de reabertura abaixo) + `UX-SPEC.md`
100% pronto (2026-09-02, sem pendência, Conflito 1 resolvido via ADR-010).
**Gate de saída**: revisão do CTO no **Gate 3** (`capacity-and-timeline-validation`) —
**este documento é um rascunho pronto para revisão, não a lista de tarefas final.** Só
vira final após veredito Aprovado ou Aprovado com ressalvas do CTO. **Esta reabertura
específica** (Seção 1.1/2/3.1, ver nota abaixo) volta ao CTO como novo
`guardrails-governance` (para `GUARDRAILS.md`, reaberto no mesmo lote) e, dado que a
reestimativa é material (ver Seção 5), como novo `capacity-and-timeline-validation`
pontual — não como reabertura de todo o Gate 3 original (que segue válido para as
demais 67 tarefas não tocadas por mérito por esta reabertura — 74 tarefas totais
nesta versão, incluindo `BE-M-12` nova, menos as 7 tocadas: `BE-M-00`, `BE-M-01`,
`BE-M-02`, `BE-M-06`, `BE-M-07`, `BE-M-09`, `BE-M-12`).
**Fonte**: `SDD.md` (arquitetura, stack, 13 ADRs, incluindo `ADR-012`/`ADR-013`),
`UX-SPEC.md` (fluxos, telas, componentes), `PRD-TECNICO.md` (requisitos/regras de
negócio, para rastreabilidade de critério de aceite), `CTO-REVIEW.md` Gate 1/Gate 2/
Gate 3/Gate 2 Reaberto (ressalvas e recomendações explícitas ao Tech Lead),
`BLOCKERS.md` Bloqueio 003 (achado técnico original e cascata de resolução).
**Consumidor imediato**: `cto` (novo Gate 3 pontual — `capacity-and-timeline-validation`
sobre a reestimativa desta reabertura + `guardrails-governance` sobre `G-01`/`G-02`
propostos); `backend` só retoma `BE-M-00` **depois** desse novo veredito (ver
`BLOCKERS.md` Bloqueio 003); `frontend`, `qa` seguem seu trabalho normal, não afetado
por esta reabertura.

**Nota de escopo de papel**: este projeto é PWA web responsiva (ADR-003) — o papel
`mobile` do roster não é acionado. Toda tarefa de implementação é atribuída a
**Backend**, **Frontend** ou **QA**.

**Nota de faseamento**: MVP / Fase 2 / Fase 3 do `PRD.md`/`PRD-TECNICO.md`/`SDD.md`/
`UX-SPEC.md` é preservado integralmente neste documento — nenhuma tarefa de Fase 2/3 é
pré-requisito de conclusão do MVP. A Fase 3 tinha duas condições de entrada
adicionais: retenção/descarte de dado (**CC-01, resolvida em 2026-09-02** via
ADR-011 — ver Seção 6.1) e Open Finance/Pluggy (**SPK-003, ainda pendente** — ver
Seção 2, bloqueia só a produção de RF-F3-04, não o restante da Fase 3).

## Nota de Reabertura (Bloqueio 003) — 2026-09-02

`SPK-001` (Backend) encontrou que o schema `public` do projeto Supabase reaproveitado
não é dado de "outro produto" — é uma implementação anterior deste mesmo produto
MyMoney, confirmada pelo stakeholder. O CTO decidiu (`CTO-REVIEW.md`, "Gate 2 (Reaberto
por Bloqueio 003)") que `ADR-001` é superseded por `ADR-012`: a estratégia muda de
"criar schema `mymoney` isolado do zero" para "adotar `public` como schema de fato de
persistência deste produto, com auditoria por objeto reaproveitado e plano de evolução
aditivo para as entidades ainda ausentes". O Software Architect entregou `ADR-012`,
`ADR-013` e o `SDD.md` reescrito (Seção 5, subseções Autenticação/Autorização/
Isolamento Multi-Tenant da Seção 7, Seção 6.1); o CTO aprovou com ressalvas na subseção
"Fechamento do Gate 2 Reaberto" de `CTO-REVIEW.md`, liberando a cascata para este
documento. Detalhe completo em `ADR-012`
(`.md/adr/012-adotar-public-existente-como-base-reaproveitando-implementacao-anterior.md`),
`ADR-013` e `BLOCKERS.md` Bloqueio 003.

Esta reabertura toca: Seção 1.1 (DIR-01 a DIR-05, e correção pontual de referência de
schema/coluna em `DIR-17`/`DIR-27`, sem reabrir o mérito dessas duas regras), Seção 2
(`SPK-001` fechado como Resolvido), Seção 3.1 (`BE-M-00` reescrita, `BE-M-01`/`BE-M-02`
reestimadas, `BE-M-09` ganha condição de aceite explícita, `BE-M-12` nova), Seção 4.1
(dependências recalculadas), Seção 5 (esforço e riscos recalculados) e Seção 6
(histórico do Bloqueio 003 registrado, mesmo padrão já usado para `CC-01`). Nenhuma
outra tarefa (Fase 2, Fase 3, ou o restante do bloco Frontend/QA do MVP) é reaberta por
mérito — onde uma referência textual a `mymoney`/`owner_id` aparecia em contradição
direta com a nova arquitetura (`BE-M-11`, `BE-F3-09`, `QA-F3-04`, `DET-02`), a
referência é corrigida para `public`/`user_id` sem reabrir o critério de aceite ou a
estimativa da tarefa — mesmo padrão de extensão transparente já usado pelo Software
Architect ao corrigir Seções 1-4 do `SDD.md`.

## Nota de Resolução Tática (Bloqueio 005) — 2026-09-03

Ao implementar `BE-M-09`, o Backend encontrou 3 Edge Functions de uma implementação
anterior (`auth-email-mfa`, `webauthn-register`, `webauthn-authenticate`), ativas em
produção, cobrindo o mesmo escopo do que estava construindo do zero — nunca auditadas,
porque nem `BE-M-00` nem a tabela de auditoria do `ADR-012` listaram "Edge Functions"
como categoria de objeto a auditar. Detalhe completo em `BLOCKERS.md`, Bloqueio 005.
**Resolução tática do Tech Lead** (dentro de sua autoridade — aplica o mesmo princípio
que `ADR-012` já mandatou, à camada de Edge Functions; não reabre `ADR-012`, não gera
novo ADR): (1) adotar as 3 Edge Functions existentes como implementação real de
RF-MVP-08, descartando o código novo do Backend — `BE-M-09` reescrita (Seção 3.1); (2)
`DIR-33` (nova, Seção 1.1) torna Edge Functions categoria obrigatória de auditoria,
pré-requisito explícito de `BE-M-10` e `BE-F3-00` a `BE-F3-04` (Seção 3.1/3.3); (3) o
risco de replay de challenge autoidentificado no código reaproveitado **não foi
decidido pelo Tech Lead** — escalado como `BLOCKERS.md` Bloqueio 006, aberto, para
`cto`/`devsecops`. Esta reabertura toca só: Seção 1.1 (`DIR-02`, `DIR-33` nova), Seção
3.1 (`BE-M-09` reescrita, nota em `BE-M-10`), Seção 3.3 (nota no bloco Backend), Seção
4.1/4.3 (dependências), Seção 5 (esforço: -0.5 dia líquido) e Seção 6.2 (`DET-05`
nova). Delta não considerado material o suficiente para exigir novo
`capacity-and-timeline-validation` completo (ver Seção 5), diferente do Bloqueio 003.

## Nota de Resolução de Risco (Bloqueio 006) — 2026-09-03

O CTO deu veredito sobre o risco de replay de challenge WebAuthn escalado ao final do
Bloqueio 005 (parecer técnico do DevSecOps + decisão estratégica do CTO, ambos
completos em `BLOCKERS.md` Bloqueio 006 e em `CTO-REVIEW.md`, seção "Risco Aceito —
Bloqueio 006"): **mitigar agora**, não aceitar como débito técnico documentado —
severidade Média confirmada pelo DevSecOps, mas custo de correção desproporcionalmente
baixo (migration já desenhada, mudança de código pontual) e risco de precedente para o
restante da auditoria de Edge Functions da Fase 3 (`DIR-33`) pesaram a favor de fechar
a lacuna agora em vez de esperar um gatilho futuro incerto. Esta é uma decisão já
tomada pelo CTO, não uma proposta deste documento — o Tech Lead aqui só traduz o
veredito em condição de aceite executável, conforme delegado.

**Consequência direta em `BE-M-09`** (Seção 3.1): a tarefa ganha condição de aceite
explícita — aplicar a migration `webauthn_challenges`
(`supabase/migrations/20260902100600_be_m09_webauthn_challenges.sql`, hoje pausada/não
referenciada) e ajustar `webauthn-register`/`webauthn-authenticate` para consumir o
challenge (checar e marcar `consumed_at` antes de aceitar a verificação, rejeitando
reenvio da mesma dupla challenge+assertion dentro da janela de 90s) — em vez de a
migration ser descartada via rollback, como a versão anterior de `BE-M-09` previa.
Estimativa revista de 1.5 → **2 dias** (+0.5 dia: aplicar migration já desenhada +
wiring de `consumed_at` nos dois endpoints de "verify" + caso de teste de replay
rejeitado + regressão dos testes já existentes de `BE-M-09`) — detalhe em Seção 3.1 e
Seção 5.

**Guardrail formal sobre WebAuthn como prova de posse em ação sensível — decisão de
adiar, não propor agora.** O CTO pediu para o Tech Lead avaliar propor essa regra à
sua aprovação (hardening de processo, explicitamente não-bloqueante). Decisão: **não
propor agora.** Racional: (1) com a mitigação aplicada, a causa raiz do risco
específico já está corrigida — a regra proposta seria puramente preventiva para um
cenário que não existe no MVP nem em nenhuma tarefa hoje planejada de Fase 2/3 (nenhuma
tarefa do `TASK.md` atual usa `webauthn-authenticate`/`webauthn-register` como gate de
reautenticação para ação sensível — exclusão de conta via `ADR-011`/`BE-F3-09` usa
outro mecanismo, a confirmar na tarefa correspondente, não WebAuthn); (2) o próprio
parecer do DevSecOps condiciona a severidade subir a Alta **apenas se** essa
reutilização vier a ser proposta — criar uma regra permanente em `GUARDRAILS.md` para
um uso hipotético ainda fora de escopo tensiona o critério de `guardrails-drafting`
("abrangência de projeto", não regra especulativa para requisito inexistente); (3)
documentar a decisão como item de atenção rastreável (`DET-06`, Seção 6.2) preserva o
alerta sem converter em regra inegociável prematura — se uma tarefa futura de fato
propuser essa reutilização, o Tech Lead reabre esta avaliação naquele momento, com o
requisito concreto em mãos em vez de uma hipótese. Não é uma decisão definitiva de
"nunca propor" — é adiar até haver requisito real, com o gatilho explícito documentado
em `DET-06`.

**Nota para o DevOps (registro, não implementação por este agente)**: o DevSecOps
identificou um requisito operacional delegado pelo CTO diretamente ao DevOps —
nenhuma rotação automática de `SUPABASE_SERVICE_ROLE_KEY` deve acontecer sem avaliar o
impacto em challenges HMAC em voo (impacto real é desprezível, dado o TTL de 90s, mas
deve constar explicitamente no runbook de rotação de secret para não ser esquecido).
Este `TASK.md` não cria tarefa de DevOps (fora do escopo de papéis deste documento —
ver "Nota de escopo de papel" no topo); o registro aqui é só para rastreabilidade,
cabendo ao DevOps incorporar ao runbook de rotação de secret quando esse artefato for
produzido/atualizado.

Esta nota toca: Seção 3.1 (`BE-M-09` — condição de aceite e estimativa revistas),
Seção 5 (esforço: +0.5 dia líquido, revertendo parte da economia do Bloqueio 005) e
Seção 6.2 (`DET-06` nova). Não gera nova tarefa de Backend além da já existente
`BE-M-09`, não reabre `DIR-33` nem `ADR-012`/`ADR-013`, e não é reabertura de Gate —
o CTO já deu o veredito estratégico diretamente (`CTO-REVIEW.md`, "Risco Aceito —
Bloqueio 006"); esta nota só propaga esse veredito aos artefatos de execução, como
delegado.

## Nota de Resolução de Risco (Bloqueio 010) — 2026-09-03

O DevSecOps (`SECURITY-REVIEW.md` Seção 1.2, `SEC-DEBT-002`) encontrou que
`budget_insert_own`/`budget_update_own` e, por extensão sistêmica,
`transactions_insert_own`/`transactions_update_own` verificam só `auth.uid() =
user_id` da própria linha, sem validar que colunas de FK para outra tabela "ownable"
(`category_id`, `account_id`, `payment_method_id`, `destination_account_id`)
pertencem ao mesmo usuário — gap de autorização de referência cruzada (IDOR),
presente como convenção do projeto inteiro. Adicionalmente,
`categories_block_delete_when_linked`/`accounts_block_delete_when_linked` (triggers
de RN-08/RN-09) não são `SECURITY DEFINER`, então a checagem de bloqueio de `DELETE`
roda sob a RLS de quem executa a ação e pode não enxergar linha de outro usuário que
deveria bloquear a exclusão. Detalhe técnico completo em `BLOCKERS.md` Bloqueio 010.

**Veredito do CTO** (`CTO-REVIEW.md`, "Revisão de Segurança do Lote MVP", item 2):
concorda com a classificação técnica do DevSecOps e ratifica o bloqueio condicional
automático já aplicado (nenhuma expansão de `allowed_signup_emails`, remoção do
trigger de restrição de signup, ou feature multiusuário antes deste gap corrigido) —
mas **rejeita tratar isto como débito técnico indefinido**. Fixa prazo de correção:
**antes do início de qualquer tarefa de Fase 3 (`BE-F3-*`)**, mesmo padrão de gate já
usado para a política de retenção (`G-13`/`ADR-011`, Bloqueio 002). Racional do CTO:
correção de escopo delimitado e já especificado tecnicamente pelo DevSecOps; risco de
composição (toda tabela nova de Fase 2/3 copia o padrão incorreto por herança se não
virar convenção corrigida agora); o gatilho de calendário "2º usuário" é o gatilho
errado para esperar (mesmo racional já usado no veredito do Bloqueio 006). Esta é uma
decisão de risco já tomada pelo CTO, não uma proposta deste documento — o Tech Lead
aqui só traduz o veredito em tarefa executável e gate explícito, conforme delegado
("(a) adicionar esta correção como condição de bloqueio explícita de início da Fase 3
em `TASK.md`... (b) avaliar propor à minha aprovação... uma regra estrutural nova em
`GUARDRAILS.md`").

**Consequência direta neste documento**: nova tarefa `BE-M-13` (Seção 3.1, bloco
Backend do MVP — corrige objetos já criados em `BE-M-01`/`BE-M-00`, por isso vive no
bloco MVP, não em Fase 3) implementa a correção especificada pelo DevSecOps: `EXISTS
(...)` de ownership nas policies de `INSERT`/`UPDATE` de `budget`/`transactions`
afetadas, e `SECURITY DEFINER` (com `search_path` fixo, mesmo padrão de
`auth_users_restrict_signup`) nos dois triggers de bloqueio de `DELETE`. **Gate
explícito**: nenhuma tarefa `BE-F3-*` (Seção 3.3) pode iniciar antes de `BE-M-13`
estar `Concluída` — mesmo mecanismo já usado para `CC-01`/`G-13` (retenção de dado),
adicionado como segunda pré-condição do bloco Fase 3 (Seção 3.3, Seção 4.3). Esta
nota toca: Seção 3.1 (`BE-M-13` nova), Seção 3.3 (nota de pré-condição do bloco,
segunda condição adicionada), Seção 4.1 (dependências de `BE-M-13`), Seção 4.3 (gate
de Fase 3 atualizado), Seção 5 (esforço: +1.5 dia, risco nomeado) e Seção 6.2
(`DET-07` nova, documentando a decisão de estrutura — task no bloco MVP + gate em
Fase 3, não escalada ao Software Architect por não ser lacuna estrutural do
`SDD.md`, e sim correção de convenção de código já delegada e decidida pelo CTO).

**Guardrail estrutural novo, proposto ao CTO** (item (b) da delegação acima): ver
`GUARDRAILS.md`, nova regra `G-19` (Seção 8, "Autorização de Referência Cruzada entre
Tabelas Ownable") — proposta, aguardando aprovação do CTO (`guardrails-governance`,
`PIPELINE-CONVENTIONS.md` §5).

## Nota de Atualização Estrutural (Convenção de Lote) — 2026-09-03

**Esta nota não reabre o mérito de nenhuma tarefa, achado técnico ou decisão de
arquitetura já registrada acima — é uma correção de estrutura/processo do próprio
`TASK.md`, feita pelo Tech Lead dentro de sua própria convenção documental (Seção 3 +
Seção 7, conforme já previsto em `PIPELINE-CONVENTIONS.md` e detalhado em
`EXECUTION-FLOW.md`, seção "Unidade de Trabalho: Lote").**

Ao preparar a fase de execução (`/executar`/`/listar`), constatou-se que este
documento nunca aplicou a convenção de **lote** — a Seção 3 agrupava tarefas por
fase (MVP/Fase 2/Fase 3) e por time (Backend/Frontend/QA), mas nenhuma tarefa
individual estava associada a um agrupamento de funcionalidade/módulo, e a Seção 7
("Log de Lotes Fechados") nunca havia sido criada. Isso bloqueava o orquestrador de
`EXECUTION-FLOW.md`, cuja unidade de ritmo de QA/DevSecOps/deploy é exatamente o
lote, não a tarefa individual nem a fase inteira.

**Correção aplicada nesta rodada** (retroatividade documental — classifica trabalho
já decomposto/estimado/e, em grande parte, já implementado; não reabre critério de
aceite, estimativa, status ou qualquer outro conteúdo de tarefa existente):

1. Nova coluna **Lote** adicionada a todas as 9 tabelas de tarefas da Seção 3 (3
   fases × 3 trilhas), cobrindo as 74 tarefas do documento (`BE-*`/`FE-*`/`QA-*`;
   spikes da Seção 2 não entram nessa convenção — spike é mecanismo de investigação
   pré-estimativa, não unidade de entrega ritmada por QA/DevSecOps/deploy).
2. O agrupamento deriva dos *bounded contexts* que o Software Architect já
   particiona em `SDD.md` Seção 2.2 (Contas & Formas de Pagamento, Categorização,
   Ledger, Orçamento, Cartão & Fatura, Recorrência & Parcelamento, Contas Fixas,
   Metas, Notificações, Captura Automatizada, Relatórios & Exportação) — não é um
   critério novo inventado nesta correção. Onde uma tarefa é puramente técnica/
   transversal (fundação de schema, scaffolding de UI, autenticação/segurança,
   fechamento/regressão de QA) sem bounded context correspondente no `SDD.md`, foi
   usado o critério mais próximo disponível, documentado com o racional completo na
   nova Seção 6.3.
3. Nenhum lote cruza fase — os lotes de MVP, Fase 2 e Fase 3 são conjuntos
   disjuntos, mesmo quando o mesmo bounded context reaparece em mais de uma fase
   (ex.: "Relatórios" existe como lote separado em Fase 2 e em Fase 3).
4. Nova **Seção 7 ("Log de Lotes Fechados")**, iniciada vazia — nenhum lote foi
   formalmente fechado por este mecanismo ainda (o fato de várias tarefas
   individuais já estarem `Concluída` não equivale a um lote fechado; fechamento de
   lote exige o veredito conjunto de QA + DevSecOps + Tech Lead sobre o lote
   inteiro, conforme `EXECUTION-FLOW.md`, o que só acontece durante a fase de
   execução, não nesta correção documental).

Esta nota toca exclusivamente: Seção 3 (nova coluna Lote em toda tabela), Seção 6.3
(nova, racional do agrupamento) e Seção 7 (nova, vazia). Nenhuma outra seção, nota ou
tarefa deste documento é alterada em mérito por esta correção.

---

## Nota de Resolução de Risco (Bloqueio 015) — 2026-09-03

Durante `static-security-analysis` sobre o lote "Categorização" (`BE-M-05`/`FE-M-08`),
o DevSecOps encontrou um achado de severidade crítica (`SEC-DEBT-008`) fora do escopo
estrito dessas duas tarefas: nenhuma função `create*` do Frontend enviava `user_id` em
nenhum `.insert()` contra tabela "ownable", e nenhuma dessas colunas tinha `DEFAULT`/
trigger de preenchimento no banco — efeito prático: toda escrita real (browser →
`supabase-js` → PostgREST → Postgres) falharia (fail-closed, sem vazamento
cross-tenant, mas sem sucesso também), em todo lote já `Concluída` até então, não só
em "Categorização". Isto gerou pausa obrigatória do orquestrador (`BLOCKERS.md`
Bloqueio 015), resolvida na mesma sessão: Backend corrigiu via migration aditiva
`20260903260000_be_m14_user_id_default_auth_uid.sql` (`DEFAULT auth.uid()` em 13
tabelas — as 12 do achado original mais `push_subscriptions`, achado adicional
próprio, testado contra o Postgres real via `SET LOCAL ROLE authenticated` + RLS
real, RED→GREEN, sem enfraquecer a defesa); Frontend corrigiu via helper
`withOwnerId()` (`frontend/src/lib/api/request.ts`), usado em 12 funções `create*`
antes de cada `.insert()`; DevSecOps verificou ambas as camadas de forma
independente (não presumiu o relato de nenhum dos dois) e fechou o Bloqueio 015 como
**Resolvido**, com 2 débitos residuais de baixa severidade e não bloqueantes
(`SEC-DEBT-009` — reprodução HTTP/`supabase-js`/navegador ponta a ponta ainda
pendente de credencial acessível; `SEC-DEBT-010` — `push_subscriptions` não usa
`withOwnerId` no Frontend, causa raiz já coberta pelo `DEFAULT` do banco).

**Decisão do Tech Lead (dentro da minha autoridade de decomposição/estrutura de
documento, análoga a `DET-07`/Bloqueio 010 — não é lacuna estrutural do `SDD.md` nem
decisão de risco de segurança, ambas já resolvidas na origem)**: **sim, esta correção
vira tarefa formal nova no `TASK.md`**, mesmo padrão já usado para `BE-M-13`/Bloqueio
010, com duas diferenças pontuais justificadas abaixo. Detalhe completo do racional
em `DET-08` (Seção 6.2) e no fechamento do lote "Categorização" (Seção 7.4). Resumo:

1. **Duas tarefas novas, não uma** — `BE-M-14` (Backend, migration `DEFAULT
   auth.uid()`) e `FE-M-13` (Frontend, `withOwnerId()` + 12 funções `create*` + 9
   suítes de teste novas/estendidas). Diferente de `BE-M-13` (Bloqueio 010, correção
   só de Backend), aqui as duas camadas de correção são de escopo/dono/evidência
   próprios e substanciais o suficiente para não caber como nota lateral de nenhuma
   tarefa já existente.
2. **Registradas como `Concluída` retroativamente** — o trabalho já foi executado e
   verificado (Backend e DevSecOps, ao vivo contra o projeto real) antes desta
   formalização; a tarefa não fica pendente de execução futura, só de registro
   formal no documento — mesmo tratamento excepcional já usado para `BE-M-12`
   (histórico de Bloqueio 003).
3. **Lote: "Autenticação & Segurança"**, não "Categorização" — mesmo critério já
   usado para `BE-M-13` (Seção 6.3): correção sistêmica de autorização/ownership que
   toca toda tabela "ownable" do produto é preocupação transversal de
   Autenticação/Autorização (`SDD.md` Seção 7), não específica do bounded context
   onde foi descoberta. Descoberta durante a auditoria de "Categorização" não torna
   a correção pertencente a esse lote — mesmo raciocínio já aplicado a `BE-M-13`,
   descoberta durante a auditoria de "Contas & Formas de Pagamento"/"Ledger &
   Dashboard" mas atribuída a "Autenticação & Segurança".
4. **Estimativa (retroativa, dias ideais)**: `BE-M-14` **0.75 dia** (migration
   aditiva mais simples que `BE-M-13` — um `ALTER COLUMN ... SET DEFAULT` por
   tabela, sem `EXISTS` condicional — mas com teste de regressão SQL novo e
   confirmação ao vivo em duas rodadas, Backend e DevSecOps); `FE-M-13` **1 dia**
   (helper novo + 12 pontos de chamada + 9 suítes de teste novas/estendidas). Efeito
   em Seção 5: **+1.75 dia histórico**, tratado como esforço já gasto (não
   remanescente), mesma distinção já usada para `SPK-001`.

Esta nota toca: Seção 3.1 (`BE-M-14`/`FE-M-13` novas), Seção 5 (esforço histórico +1.75
dia), Seção 6.2 (`DET-08` nova) e Seção 7 (fechamento do lote "Categorização",
racional em 7.4).

---

## 1. Diretrizes de Implementação

Camada base de comportamento (pensar antes de codificar, simplicidade, mudanças
cirúrgicas, execução orientada a critério verificável): ver skill `coding-guidelines`,
aplicável a todo código deste projeto — não repetida aqui, é o piso sobre o qual as
regras abaixo (específicas deste projeto, derivadas dos ADRs e do `SDD.md`) se somam.

Classificação: **[OBRIGATÓRIA]** bloqueia PR se violada · **[PROIBIDA]** padrão/lib
banido · **[RECOMENDADA]** boa prática, não bloqueante.

### 1.1 Persistência e Migração (ADR-012, supersede ADR-001; ADR-013; ADR-009)

**Reescrita completa desta subseção — consequência direta do fechamento do Bloqueio
003 (`ADR-012`/`ADR-013`, ver "Nota de Reabertura" acima).** A estratégia deixou de ser
"criar um schema `mymoney` isolado do zero" e passou a ser "adotar `public` como único
schema de persistência deste produto, reaproveitando o que já existe mediante
auditoria obrigatória, e estendendo por migration aditiva o que falta". `DIR-01` a
`DIR-05` abaixo substituem integralmente a versão anterior; nenhuma delas é uma
diluição das regras antigas — o espírito ("nenhuma perda de dado real", "nenhuma
mudança sem revisão explícita do CTO", "nenhum objeto reaproveitado aceito às cegas")
sobrevive, só muda o escopo textual de `mymoney` para `public`.

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-01 | Toda entidade — já existente ou nova, de qualquer fase (MVP/Fase 2/Fase 3) — vive no schema `public`, único schema de persistência deste produto. Nenhuma entidade nova vai para um schema separado; não há mais split `mymoney`/`public`. | **[OBRIGATÓRIA]** | `CREATE TABLE public.budget (...)`, nunca `CREATE TABLE mymoney.budget (...)` nem qualquer outro schema. |
| DIR-02 | Nenhuma funcionalidade nova pode depender de um objeto reaproveitado de `public` (tabela/função/trigger/policy/**Edge Function**, ver `DIR-33`) antes de esse objeto estar auditado conforme a tabela de auditoria do `ADR-012` — equivalência campo a campo para tabelas estruturais simples; confirmação de semântica/contrato e/ou teste de regressão para objetos com lógica de negócio embutida (`apply_transaction_effect`, `fn_clear_due_transactions`, `get_month_provision`/`get_monthly_category_summary`, `handle_new_user`, `custom_access_token_hook`, `set_pin`/`verify_pin`, e as Edge Functions cobertas por `DIR-33`). A auditoria geral é o escopo de `BE-M-00`; achado que não se resolva dentro do próprio escopo de auditoria (ex.: `verify_pin` exigindo rede como gate primário, ou um risco de segurança autoidentificado e não resolvido no código reaproveitado) gera novo `BLOCKERS.md` antes de a tarefa dependente prosseguir (mesma disciplina de `SPK-001`; ver Bloqueio 005/006). | **[OBRIGATÓRIA]** | `BE-M-09` não trata `webauthn_credentials`/`set_pin`/`verify_pin` como prontos até `BE-M-00` documentar o achado da auditoria dessas funções especificamente. |
| DIR-33 | **[Nova — Bloqueio 005]** "Edge Functions" é categoria explícita e obrigatória de auditoria de objeto reaproveitado, no mesmo nível de tabela/função/trigger/policy (`DIR-02`) — a tabela de auditoria original do `ADR-012` nunca a listou (lacuna de escopo do processo, não do mérito da decisão daquele ADR, que permanece imutável). Antes de escrever qualquer código novo que dependa de ou substitua uma Edge Function, o time de Backend roda `supabase functions list --project-ref <project>` e, se houver candidata a sobreposição de escopo, `supabase functions download` (só leitura) para inspecionar o código antes de decidir entre adotar/adaptar/reescrever — mesmo princípio de decisão já aplicado no Bloqueio 005. Pré-requisito explícito de `BE-M-10` (Seção 3.1) e de `BE-F3-00` a `BE-F3-04` (Seção 3.3), antes de qualquer linha de código nova ser escrita. | **[OBRIGATÓRIA]** | Antes de iniciar `BE-F3-01` (OCR), rodar `supabase functions list`; se já existir function cobrindo extração de recibo, tratá-la como objeto a auditar (mesmo fluxo de decisão do Bloqueio 005), nunca implementar do zero sem checar primeiro. |
| DIR-03 | Toda migration sobre `public` é aditiva por padrão (`CREATE TABLE`, `ALTER TABLE ... ADD COLUMN`/`ADD CONSTRAINT` não destrutivo). Nenhum `ALTER`/`DROP` destrutivo (remoção/redefinição de coluna, `DROP TABLE`, `TRUNCATE`) em objeto de `public` que tenha dado real é executado sem revisão explícita do CTO — sem exceção, mesmo em ambiente de desenvolvimento, porque não há staging separado confirmado (é o único ambiente existente hoje). | **[OBRIGATÓRIA]** | `ALTER TABLE public.transactions ADD CONSTRAINT fk_recurring_rule FOREIGN KEY (recurring_rule_id) REFERENCES public.recurring_templates(id)` é permitido sem revisão adicional (aditivo); `ALTER TABLE public.categories DROP COLUMN parent_category_id` exige revisão explícita do CTO antes de sequer ser proposto. |
| DIR-04 | Toda migration tem rollback/down migration correspondente no mesmo arquivo ou par de arquivos. | **[OBRIGATÓRIA]** | `014_add_budget.up.sql` + `014_add_budget.down.sql` (a numeração continua a partir da migration 013 já aplicada em `public` pela implementação anterior — não reinicia em `001`). |
| DIR-05 | RN-08 (conta com lançamento vinculado não é `DELETE` físico, só inativação) e RN-07 (sem cascade delete entre `RecurringTemplate`/`InstallmentPurchase` e `Transaction`) são enforced a nível de banco (constraint/trigger/ausência de `ON DELETE CASCADE`) sobre as tabelas reais de `public`, nunca só validação de formulário no client. `BE-M-00`/`BE-M-01` auditam se essas constraints já existem nas tabelas reaproveitadas antes de assumir que precisam ser criadas do zero. | **[OBRIGATÓRIA]** | FK de `transactions.recurring_rule_id` sem `ON DELETE CASCADE`; trigger ou policy que bloqueia `DELETE` em `public.accounts` com `EXISTS (SELECT 1 FROM public.transactions WHERE account_id = ...)`. |

### 1.2 Padrão Arquitetural / Stack (ADR-002, SDD Seção 3, Seção 6.2)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-06 | Lógica de negócio não trivial (RN-01 fechamento de fatura, RN-02 reajuste de recorrência, RN-06 limite de cartão, RN-07 geração de recorrência/parcela) vive em Supabase Edge Functions + `pg_cron`, nunca duplicada silenciosamente no client. | **[OBRIGATÓRIA]** | Cálculo de "fatura corrente vs. próxima" (RN-01) é uma função só, chamada tanto pela Edge Function de geração quanto por qualquer leitura — nunca reimplementada no Frontend. |
| DIR-07 | Nenhum servidor de aplicação dedicado (ex.: Node/NestJS, Express) é introduzido. | **[PROIBIDA]** | — |
| DIR-08 | Nenhuma camada de cache dedicada (Redis) nem arquitetura multi-região é introduzida sem revisão explícita do CTO (dívida técnica aceita conscientemente, `SDD.md` Seção 6.2). | **[PROIBIDA]** | — |
| DIR-09 | Nomear tabelas/RPCs/Edge Functions por bounded context (Contas, Categorização, Ledger, Orçamento, Cartão&Fatura, Recorrência&Parcelamento, Contas Fixas, Metas, Notificações, Captura Automatizada, Relatórios), mesmo sem separação física. | **[RECOMENDADA]** | Pasta `supabase/functions/invoice-close/`, não `supabase/functions/fn3/`. |

### 1.3 PWA / Frontend / Offline (ADR-003, SDD Seção 3)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-10 | Service Worker via Workbox; app instalável (manifest.json), cache offline do shell. | **[OBRIGATÓRIA]** | — |
| DIR-11 | Fila de lançamentos offline via IndexedDB usando Dexie.js — nenhuma outra solução de storage local para essa fila (não `LocalStorage`). | **[OBRIGATÓRIA]** | — |
| DIR-12 | Cliente atualiza o próprio estado imediatamente após resposta de escrita bem-sucedida; nunca espera o canal Realtime para refletir a própria ação do usuário (`SDD.md` Seção 2.5). | **[OBRIGATÓRIA]** | Após `POST` de lançamento, atualizar saldo local com a resposta da própria chamada, não aguardar evento Realtime. |
| DIR-13 | Horizonte de fatura projetada é fixo em competência atual + 2 futuras (3 abas), sem paginação adicional no MVP/Fase 2 dessa tela. | **[OBRIGATÓRIA]** | — |
| DIR-14 | `NotificationCenter` (S-NOT-01) é sempre o canal primário de aviso, independente de push ter sido entregue; push (Web Push/VAPID) é reforço, nunca única via — trata limitação de iOS Safari como esperada, não como bug. | **[OBRIGATÓRIA]** | — |
| DIR-15 | Toda tela segue WCAG 2.1 AA conforme `UX-SPEC.md` Seção 5 (contraste, navegação por teclado, foco gerenciado em Modal/BottomSheet, `aria-live` em componentes dinâmicos, alternativa textual a gráfico). | **[OBRIGATÓRIA]** | `DonutChart`/`BarChart`/`LineChart` sempre com toggle "Ver como tabela". |

### 1.4 Autenticação e Sessão (ADR-005, ADR-010)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-16 | Gesto de desbloqueio (WebAuthn ou checagem de hash de PIN) é 100% local ao dispositivo, funciona offline — nenhum estado adicional "sem conexão, desbloqueio indisponível" é implementado. | **[OBRIGATÓRIA]** | — |
| DIR-17 | Hash + salt do PIN local nunca é transmitido ou armazenado em texto puro; comparação sempre local ao dispositivo (decisão de detalhe: persistido em IndexedDB local, nunca em tabela de `public`, nunca em `user_metadata` do Supabase Auth — ver Seção 6). **Nota (ADR-013)**: isto é sobre o gesto de desbloqueio local; não decide o comportamento das RPCs `set_pin`/`verify_pin` já existentes em `public`, cuja auditoria é condição explícita de `BE-M-00`/`BE-M-09` (DIR-02). | **[OBRIGATÓRIA]** | — |
| DIR-18 | Bloqueio de 5 tentativas malsucedidas / 5 minutos é o baseline; qualquer alteração desse número só pelo DevSecOps na fase tática, não por Backend/Frontend por conta própria. | **[OBRIGATÓRIA]** | — |
| DIR-19 | Nenhum caminho de código trata "desbloqueio local aprovado" como autorização suficiente para uma chamada de servidor — toda leitura/escrita ao Postgres/Edge Functions exige JWT de sessão válido + RLS. | **[OBRIGATÓRIA]** | Nunca condicionar uma chamada Supabase a `if (pinUnlocked) { ... }` sem que o JWT da sessão também esteja presente e válido. |

### 1.5 Captura Automatizada e Confirmação Humana — RNF-01/RNF-08 (SDD Seção 1 princípio 2, ADR-006/007/008)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-20 | Nenhuma automação de Fase 3 (voz, OCR, importação OFX/CSV, Open Finance) executa `INSERT`/`UPDATE` direto em `Transaction`. Todo caminho passa por um estado de rascunho/candidato (`CandidateTransaction` ou equivalente client-side não persistido) + evento de confirmação explícito do usuário + gravação de `confirmed_at`. | **[OBRIGATÓRIA]** | Edge Function de OCR retorna JSON de campos extraídos ao client; só a ação explícita "Confirmar lançamento" do usuário dispara o `INSERT` em `transaction`. Edge Function de OCR **nunca** insere em `transaction` diretamente. |
| DIR-21 | Web Speech API é a primeira camada de STT (client-side, sem custo); fallback cloud é opcional/adiável, nunca dependência obrigatória do início da Fase 3. | **[OBRIGATÓRIA]** | — |
| DIR-22 | Toda chamada a provedor de OCR passa por uma interface própria do produto (contrato `OCRProvider`: `{ extract(image): { valor?, data?, categoria_sugerida?, estabelecimento? } }`), nunca amarrada 1:1 ao schema de resposta do Google Cloud Vision/AWS Textract. | **[OBRIGATÓRIA]** | Trocar de vendor implica só reimplementar o adapter que satisfaz `OCRProvider`, sem tocar em UI ou lógica de confirmação. |
| DIR-23 | Tesseract.js é o fallback client-side aceitável para OCR se o provedor de nuvem falhar/expirar free tier — não é escolha primária. | **[RECOMENDADA]** | — |
| DIR-24 | Token de conexão Open Finance (Pluggy) nunca reside no cliente; armazenado server-side com criptografia adicional em nível de aplicação (Supabase Vault/`pgsodium`), além da criptografia de infraestrutura. | **[OBRIGATÓRIA]** | — |
| DIR-25 | Webhook do agregador Open Finance valida assinatura/segredo do provedor antes de processar qualquer payload. | **[OBRIGATÓRIA]** | — |
| DIR-26 | RF-F3-04 (Open Finance) não é habilitado em produção antes de SPK-003 (Seção 2) ser concluído. A tela (S-CAP-08/09) pode ser implementada e testada em ambiente de desenvolvimento antes disso, mas o feature flag de produção permanece desligado. | **[OBRIGATÓRIA]** | — |

### 1.6 Segurança e Autorização (SDD Seção 7)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-27 | Toda tabela de `public` associada a este produto tem RLS habilitada, policy padrão `auth.uid() = user_id` para `SELECT`/`INSERT`/`UPDATE`/`DELETE` — este é o padrão real já implementado nas 7 tabelas existentes (`ADR-012`), adotado como convenção do projeto daqui em diante; nenhuma tabela nova entra em produção sem RLS. `accounts`, `categories`, `payment_methods` e `transactions` têm o gate adicional `(auth.jwt() ->> 'app_email_mfa_verified') = 'true'` — preservar esse gate ao tocar essas 4 tabelas, nunca remover sem revisão explícita do CTO. | **[OBRIGATÓRIA]** | — |
| DIR-28 | TLS 1.2+ obrigatório em toda comunicação cliente-Supabase, cliente-Edge Function e Edge Function-provedor externo. | **[OBRIGATÓRIA]** | Já garantido pela infraestrutura gerenciada; nenhuma chamada `http://` é aceitável em código novo. |
| DIR-29 | Bucket de Storage para fotos de recibo é sempre privado; acesso só via signed URL de curta duração, nunca URL pública. | **[OBRIGATÓRIA]** | — |
| DIR-30 | Chave/segredo de todo provedor externo (STT cloud, OCR, Pluggy) vive em variável de ambiente server-side (Supabase Vault/secrets); nunca em código de cliente, nunca em variável `VITE_*`/`NEXT_PUBLIC_*` exposta ao bundle. | **[OBRIGATÓRIA]** | — |

### 1.7 Confiabilidade / Backup (ADR-009)

| # | Regra | Classificação | Exemplo mínimo |
|---|---|---|---|
| DIR-31 | Export lógico de backup roda com cadência **diária** (`pg_cron` + Edge Function, `pg_dump`/export), armazenado criptografado fora do Supabase — nunca semanal (cadência corrigida por ADR-009, supersede ADR-004). | **[OBRIGATÓRIA]** | Cron `0 0 * * *` (ou equivalente diário), não `0 0 * * 0`. |
| DIR-32 | Job de export tem monitoramento/alerta de falha (quem avisa se o `pg_cron` não rodar) — não é "fire and forget". | **[OBRIGATÓRIA]** | Log de execução consultável; alerta (mesmo que simples, ex. e-mail) se o job não rodar por >26h. |

---

## 2. Spikes Técnicos Identificados

| Tarefa relacionada | Pergunta que o spike responde | Prazo do spike | Time responsável | Status |
|---|---|---|---|---|
| **SPK-001** — bloqueava `BE-M-00` em diante (todo o modelo de dados MVP) | Inspeção do schema real do projeto Supabase reaproveitado (`https://supabase.com/dashboard/project/xrcxbzrglndetrrhavhc`): quais tabelas/roles/triggers/extensões existem em `public`? Existe trigger global em `auth.users`? Qual o plano/tier contratado? | 2 dias úteis | Backend | **Resolvido — 2026-09-02.** Achado técnico completo em `BLOCKERS.md`, Bloqueio 003: a premissa original de `ADR-001` ("dado de outro produto, a isolar") não se sustentava — o schema `public` é uma implementação anterior deste mesmo produto (7 tabelas, 15 funções, RLS, MFA gate, WebAuthn, 1 usuário real e 12 categorias já cadastrados), confirmada pelo stakeholder. Resolução estratégica do CTO + resolução técnica do Software Architect consolidadas em `ADR-012` (supersede `ADR-001`) e `ADR-013` — ver `CTO-REVIEW.md`, "Gate 2 (Reaberto por Bloqueio 003)". **6 itens do spike foram respondidos com confiança; 1 item (plano/tier contratado) segue parcialmente respondido**, não bloqueia mais nenhuma tarefa de schema (RPO ≤ 24h já é verdadeiro independentemente do tier via `ADR-009`), mas segue relevante para a validade plena de `ADR-009` — ver Seção 5, risco 1 (renumerado) |
| **SPK-002** — bloqueia BE-F3-01 (OCR) | Entre Google Cloud Vision e AWS Textract, qual entrega melhor acurácia/custo em uma amostra real de recibos brasileiros (papel térmico, iluminação variável) dentro do free tier assumido (60–120 lançamentos/mês, nem todos por foto)? Qual conjunto mínimo de campos do contrato `OCRProvider` (DIR-22) cobre a resposta de ambos os vendors sem vazar o formato específico de nenhum? (Ressalva não-bloqueante do CTO no Gate 2 sobre `ADR-007`.) | 3 dias úteis | Backend | Não iniciado |
| **SPK-003** — bloqueia BE-F3-05/FE-F3-06 em produção (DIR-26) | O Pluggy aceita pessoa física/projeto pessoal sem CNPJ no tier "free/dev" assumido em `ADR-008`? Quais são os termos de responsabilidade de dado (operador vs. controlador) do Pluggy, e são compatíveis com LGPD para o caso de uso deste produto? (Duas condições de entrada da Fase 3 explicitamente nomeadas pelo CTO no Gate 2, subseção `ADR-008` — bloqueantes para o **início** da Fase 3 em relação a RF-F3-04 especificamente, não para MVP/Fase 2 nem para as demais tarefas de Fase 3.) | 3 dias úteis (inclui tempo de resposta do provedor a solicitação de sandbox) | Backend, com validação final do próprio stakeholder sobre aceitar/rejeitar os termos operador/controlador antes de produção | Não iniciado |

Nenhuma outra tarefa deste documento atende aos 4 critérios de `technical-spike-identification` (tecnologia nova sem experiência prévia do time, integração não testada, múltiplas abordagens sem dado para decidir, escopo não decomponível com confiança) — as demais incertezas encontradas durante a decomposição foram tratadas como lacuna de detalhe (decidida e documentada na Seção 6) ou como lacuna estrutural do `SDD.md` (escalada ao Software Architect, também na Seção 6), nunca como spike "porque parecia difícil". **Nota**: a auditoria por objeto reaproveitado exigida por `ADR-012` (`DIR-02`) não é tratada como um novo spike — é um requisito de processo distribuído entre `BE-M-00` (auditoria geral) e as tarefas específicas que dependem de cada objeto (`BE-M-06`/`BE-M-07`/`BE-M-09`), com gatilho de escalonamento a `BLOCKERS.md` já definido caso algum achado não se resolva dentro do próprio escopo de auditoria — mesmo padrão de disciplina já usado por `SPK-001`.

---

## 3. Lista de Tarefas

Convenção de ID: `BE-<fase>-NN` / `FE-<fase>-NN` / `QA-<fase>-NN`, onde `<fase>` é
`M` (MVP), `F2` (Fase 2) ou `F3` (Fase 3). Coluna Status inicia `Não iniciada` para
toda tarefa (atualizada por Backend/Frontend/QA conforme progresso).

### 3.1 MVP

#### Backend

**Nota sobre esta subseção (Bloqueio 003)**: `BE-M-00` deixou de ser um bootstrap de
schema novo — é agora a tarefa de **auditoria e formalização dos objetos já
existentes em `public`**, condição de aceite nº 2 do CTO (`ADR-012`) e pré-requisito de
`DIR-02`. `BE-M-01`/`BE-M-02` foram reestimadas porque 4 das 5 tabelas do MVP e a
taxonomia de categorias já existem. `BE-M-06`/`BE-M-07`/`BE-M-09` ganharam critério de
aceite adicional (auditoria de objeto específico, condição de aceite nº 2 do CTO).
`BE-M-12` é nova (ressalva 3 do CTO, "Fechamento do Gate 2 Reaberto").

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status | Lote |
|---|---|---|---|---|---|---|---|
| BE-M-00 | **[Reescrita — ADR-012/ADR-013]** Auditoria e formalização dos objetos reaproveitados de `public`, conforme a tabela de auditoria do `ADR-012`: (a) confirmar equivalência campo a campo de `accounts`/`payment_methods`/`categories`/`transactions`/`profiles`/`webauthn_credentials`/`email_mfa_challenges` contra `SDD.md` Seção 5.1; (b) escrever teste de regressão para `apply_transaction_effect` antes de qualquer alteração futura (sem cobertura conhecida hoje); (c) enumerar e documentar individualmente todo trigger de saldo/hierarquia/status de `public` ainda não nomeado pelo `SPK-001`, antes de qualquer funcionalidade de Fase 2 (fatura, hierarquia de categoria) depender deles; (d) confirmar que nenhum role/policy customizado além do padrão existe (já indicado por `SPK-001`, formalizar como documento de auditoria); (e) produzir o documento de auditoria que serve de base para `BE-M-01` em diante — nenhum objeto tratado como "corretude comprovada só por já funcionar hoje" | Backend | `ADR-012` (tabela de auditoria), `SDD.md` Seção 5.1, Seção 6.1 (risco "Qualidade/confiabilidade de código reaproveitado") | Documento de auditoria cobre as 7 tabelas + todos os triggers/RPCs de `public` (nomeados pelo `SPK-001` e os enumerados nesta tarefa), cada um com achado e decisão (Adotar / Adotar com condição / Não adotado, aguardando `BLOCKERS.md`); teste de regressão de `apply_transaction_effect` passa antes de qualquer tarefa subsequente alterar essa lógica; nenhuma linha de `public` (1 profile, 12 categorias) é alterada ou removida por esta tarefa (DIR-03) | 1.5 dia | **Concluída — 2026-09-02.** Veredito do CTO liberou a retomada (`BLOCKERS.md` Bloqueio 003, Status Resolvido). Documento de auditoria completo em `.md/AUDITORIA-BE-M-00.md`: 7 tabelas confirmadas equivalentes, 13 triggers enumerados/documentados individualmente, 15 funções avaliadas, roles/extensions/cron/storage confirmados sem mudança. Teste de regressão de `apply_transaction_effect` (`supabase/tests/apply_transaction_effect.test.sql`, 9 casos) **PASS**, rodado via `supabase db query --linked --file`, dentro de `BEGIN;...ROLLBACK;` — nenhuma linha real alterada (confirmado por contagem antes/depois). 5 achados documentados com decisão e tarefa de destino (FK CASCADE vs. RN-08/RN-09 → `BE-M-01`; `payment_methods` sem coluna padrão → `BE-M-02`; numeração RN-11 incorreta no `fn_clear_due_transactions` → `BE-M-06`; `profiles.pin_hash` exposto via SELECT → `BE-M-09`; ativação do Auth Hook não confirmável via ferramentação atual → `BE-M-09`, ressalva não-bloqueante, mesma categoria do item 6 do `SPK-001`). Nenhum achado exigiu novo `BLOCKERS.md` | Fundação Técnica & Infraestrutura |
| BE-M-01 | **[Reestimada — ADR-012]** Migration aditiva de `Budget` (única entidade do MVP ainda ausente em `public`) + confirmar/reforçar as constraints de RN-08 (bloqueio de `DELETE` físico de `accounts` vinculada) e RN-09 (bloqueio de `DELETE` de `categories` vinculada) sobre as tabelas já existentes, adicionando o que a auditoria de `BE-M-00` apontar como faltante — não recriar `accounts`/`payment_methods`/`categories`/`transactions` do zero | Backend | SDD Seção 5.1/5.2 (Modelo de Dados), RF-MVP-01/02/03/04/07 | `public.budget` criada por migration aditiva com RLS habilitada, policy `auth.uid() = user_id` (DIR-27); `DELETE` em `accounts`/`categories` com vínculo é bloqueado a nível de banco (RN-08/RN-09 AC3), confirmado ou adicionado conforme achado de `BE-M-00` | 1 dia | **Concluída — 2026-09-02.** Migration `supabase/migrations/20260902100000_be_m01_budget_and_rn08_rn09_guards.sql` aplicada via `supabase db push --linked` (down em `supabase/migrations_down/`, DIR-04). `public.budget` criada (RLS + 4 policies `auth.uid() = user_id` + gate MFA, DIR-27); triggers `accounts_before_delete_block_linked`/`categories_before_delete_block_linked` bloqueiam `DELETE` físico com vínculo (achado da auditoria: as FKs existentes eram `ON DELETE CASCADE`, o oposto de RN-08/RN-09 — ver `AUDITORIA-BE-M-00.md` Seção 2). Teste `supabase/tests/be_m01_budget_and_guards.test.sql` (7 casos) rodado RED (antes da migration, falhou como esperado) → GREEN (depois, PASS); regressão de `apply_transaction_effect` (BE-M-00) re-executada e ainda PASS. Nenhum resíduo de teste na base | Fundação Técnica & Infraestrutura |
| BE-M-02 | **[Reestimada — ADR-012]** Validar que a taxonomia de categorias já seedada em `public.categories` (12 categorias topo-nível) bate 1:1 com `PRD-TECNICO.md` — sem recriar; verificar se as 5 formas de pagamento padrão (Pix, débito, crédito, boleto, dinheiro) já existem em `public.payment_methods` e, só para as que faltarem, seed pontual marcado como "padrão" | Backend | RF-MVP-02 AC1, RF-MVP-03 AC1, RN-09; `ADR-012` (tabela de auditoria, linha `categories`) | Taxonomia de categorias confirmada equivalente à especificação, nenhuma linha recriada ou duplicada; toda forma de pagamento padrão ausente é semeada e marcada "padrão" (não editável/excluível); nenhuma forma de pagamento já existente é duplicada | 0.25 dia | **Concluída — 2026-09-02.** Taxonomia de categorias confirmada 1:1 com `PRD-TECNICO.md` na auditoria (`AUDITORIA-BE-M-00.md` Seção 1) — nenhuma recriação. Migration `20260902100100_be_m02_payment_methods_defaults.sql`: coluna `is_system_default` adicionada a `payment_methods`; seed idempotente das 4 formas não-cartão (Pix/Débito/Boleto/Dinheiro) via trigger na primeira conta ativa do usuário (achado de auditoria: "crédito" só passa a existir a partir de `BE-F2-01`, quando há `CreditCard` real — check constraint do schema já exige isso, reconciliado com RF-F2-01 AC1, ver `AUDITORIA-BE-M-00.md` Seção 3); policies `payment_methods_update_own`/`_delete_own` passam a exigir `is_system_default = false`. Teste `be_m02_payment_methods_defaults.test.sql` (4 casos) RED→GREEN; regressão de BE-M-00/BE-M-01 revalidada, sem resíduo | Contas & Formas de Pagamento |
| BE-M-03 | CRUD de contas (criação, edição, inativação com RN-08) | Backend | RF-MVP-01 AC1-4 | Excluir conta com lançamento vinculado retorna erro e sugere inativação (AC4); conta sem lançamento pode ser excluída definitivamente | 1 dia | **Concluída — 2026-09-02.** Implementado via PostgREST direto sobre `public.accounts` (RLS + triggers já existentes/reforçados em BE-M-01, ADR-002/DIR-06: CRUD simples não é Edge Function). Contrato publicado em `API-CONTRACT.yaml` (`/accounts`). Teste `be_m03_04_05_crud.test.sql` cobre AC2 (type ausente rejeitado), AC3 (edição de saldo inicial recalcula saldo consolidado) e AC4/RN-08 (bloqueio de exclusão vinculada, testado em `be_m01_budget_and_guards.test.sql` Caso 4) — todos PASS, sem resíduo | Contas & Formas de Pagamento |
| BE-M-04 | CRUD de formas de pagamento customizadas | Backend | RF-MVP-02 AC3 | Usuário cadastra forma de pagamento além das 5 padrão; formas padrão não podem ser editadas/excluídas | 0.5 dia | **Concluída — 2026-09-02.** PostgREST direto sobre `public.payment_methods` (RLS de BE-M-02). Contrato publicado em `API-CONTRACT.yaml` (`/payment_methods`). Teste `be_m03_04_05_crud.test.sql` Casos 7/8 confirma, via RLS real (`SET LOCAL ROLE authenticated` + JWT simulado, não como owner/postgres): usuário cria forma customizada com sucesso; `UPDATE`/`DELETE` em forma `is_system_default=true` afeta **0 linhas** mesmo autenticado como o próprio dono com MFA verificado — PASS | Contas & Formas de Pagamento |
| BE-M-05 | CRUD de categorias/subcategorias + bloqueio de exclusão vinculada | Backend | RF-MVP-03 AC1-3 | Excluir categoria com lançamento vinculado é bloqueado e retorna a lista de lançamentos afetados (AC3) | 1 dia | **Concluída — 2026-09-02.** PostgREST direto sobre `public.categories` (RLS + `validate_category_hierarchy` já existentes). Contrato publicado em `API-CONTRACT.yaml` (`/categories`, incluindo a orientação de `GET /transactions?category_id=eq.{id}` para AC3 "listar lançamentos afetados"). Teste `be_m03_04_05_crud.test.sql` Casos 4-6 cobre hierarquia de 2 níveis (permitida), 3 níveis (bloqueada) e auto-referência (bloqueada); bloqueio de exclusão vinculada testado em `be_m01_budget_and_guards.test.sql` Casos 5/6 — todos PASS | Categorização |
| BE-M-06 | **[Critério adicional — ADR-012]** CRUD de lançamentos manuais + recálculo de saldo de conta, reaproveitando `apply_transaction_effect` (auditado/testado em `BE-M-00`); confirmar que a semântica exata de `fn_clear_due_transactions`/`pg_cron` bate com RN-11 (transição prevista→efetivado por vencimento) antes de considerar essa parte equivalente a "já implementada" | Backend | RF-MVP-04 AC1-5; `ADR-012` (linha `fn_clear_due_transactions`) | Criar/editar/excluir lançamento reflete imediatamente no saldo da conta associada (AC1/3/4), via `apply_transaction_effect` já testado por regressão; campo obrigatório ausente rejeita a submissão sem persistir parcial (AC2); achado da auditoria de `fn_clear_due_transactions` contra RN-11 documentado, com divergência (se houver) corrigida por migration aditiva, não assumida como já correta | 2.5 dias | **Concluída — 2026-09-02.** CRUD via PostgREST direto sobre `public.transactions` (RLS + `apply_transaction_effect`/`transactions_maintain_account_balance`/`transactions_set_status`/`transactions_block_inactive_account`, testados por regressão em `BE-M-00`, 9 casos PASS). Achado de auditoria sobre a citação "RN-11": **não é uma divergência de comportamento** — a citação de RN no `TASK.md`/`ADR-012` estava incorreta (RN-11 real é sobre baseline de volume, não sobre transição de status); a função `fn_clear_due_transactions` em si está correta e foi adotada como está (`AUDITORIA-BE-M-00.md` Seção 5), sem necessidade de migration corretiva. Teste dedicado `be_m06_transactions.test.sql` (2 casos: transição pending→cleared quando vencida, e não-transição quando ainda futura) — PASS. Contrato publicado em `API-CONTRACT.yaml` (`/transactions`), incluindo os 409 de conta inativa/CHECK — **desbloqueia `FE-M-03`/`FE-M-09`** | Ledger & Dashboard |
| BE-M-07 | **[Critério adicional — ADR-012]** Queries/views de dashboard: saldo consolidado, entradas/saídas do mês, distribuição por categoria, contagem de lançamentos do mês, auditando o contrato de saída (nomes/tipos de campo) de `get_month_provision`/`get_monthly_category_summary` já existentes contra o que `API-CONTRACT.yaml`/Frontend precisam antes de considerar definitivo | Backend | RF-MVP-05 AC1-2, RF-MVP-06 AC1-3; `ADR-012` (linha `get_month_provision`/`get_monthly_category_summary`) | Saldo consolidado soma só contas ativas (AC1); contagem de lançamentos do mês corrente está disponível (RF-MVP-06 AC3, instrumentação de RN-11); contrato de saída das duas RPCs documentado e compatibilizado com `API-CONTRACT.yaml` — se o contrato divergir do necessário, a RPC é estendida por migration aditiva (nova função ou view), nunca reescrita destrutivamente sem revisão do CTO (DIR-03) | 2 dias | **Concluída — 2026-09-02.** `get_month_provision`/`get_monthly_category_summary` auditadas: contrato confirmado e documentado em `API-CONTRACT.yaml`. **Achado**: `provisioned_balance_cents` faz double-counting de lançamentos `pending` do mês corrente (confirmado empiricamente — saldo já reflete o efeito na criação, depois é subtraído de novo); campo marcado `deprecated` no contrato, `current_total_balance_cents` é o campo correto para RF-MVP-05 AC1, sem necessidade de tocar a função (nenhuma tarefa MVP exige o campo "provisionado"). RF-MVP-06 AC3 (contagem de lançamentos do mês) não tinha RPC — criada `get_month_transaction_count` por migration aditiva (`20260902100200_be_m07_month_transaction_count.sql`, nova função, não reescrita). Teste `be_m07_dashboard.test.sql` (3 casos, via RLS real) RED→GREEN; regressão completa (BE-M-00/01/02/03/04/05/06) revalidada, sem resíduo | Ledger & Dashboard |
| BE-M-08 | Orçamento por categoria/mês: armazenar teto, calcular % gasto vs. teto, limiar de alerta (RN-04, 80%/100%+) | Backend | RF-MVP-07 AC1-4, RN-04 | Ao atingir 80% do teto, sinal de alerta é retornado pela query; acima de 100%, sinal de estouro com severidade maior (AC3/4) | 1 dia | **Concluída — 2026-09-02.** Teto já armazenado em `public.budget` (BE-M-01). Nova RPC `get_budget_status` (`20260902100300_be_m08_budget_status.sql`) retorna `pct_spent`/`alert_level` (`none`/`warning`/`exceeded`) por categoria/mês. Teste `be_m08_budget_status.test.sql` (3 casos: 50% none, 85% warning, 105% exceeded) RED→GREEN, via RLS real, sem resíduo. Publicado em `API-CONTRACT.yaml` | Orçamento |
| BE-M-09 | **[Reescrita — Bloqueio 005; condição de aceite e estimativa revistas — Bloqueio 006]** Adoção das 3 Edge Functions pré-existentes (`auth-email-mfa`, `webauthn-register`, `webauthn-authenticate`) como implementação real de RF-MVP-08 (parte server-side), descartando definitivamente o código novo do Backend (4 functions deployadas e já removidas, `BLOCKERS.md` Bloqueio 005). Reaproveita `public.webauthn_credentials` e `public.email_mfa_challenges` como estão (não recriar). **Mitigação do risco de replay de challenge, determinada pelo CTO (`BLOCKERS.md`/`CTO-REVIEW.md` Bloqueio 006, "mitigar agora")**: aplicar a migration `webauthn_challenges` já desenhada (`supabase/migrations/20260902100600_be_m09_webauthn_challenges.sql`, hoje pausada/não referenciada) e ajustar `webauthn-register`/`webauthn-authenticate` para consumir o challenge — inserir linha em "generate-options", checar `consumed_at IS NULL` e `expires_at > now()` e marcar `consumed_at = now()` em "verify", **antes** de chamar `verifyRegistrationResponse`/`verifyAuthenticationResponse`, rejeitando qualquer reenvio da mesma dupla challenge+assertion dentro da janela de 90s de validade. **Pré-condições já cumpridas** (progresso válido, ver Status): inspeção de `set_pin`/`verify_pin` (compatível com `ADR-010`, sem escalonamento) e correção de exposição de `profiles.pin_hash` via coluna | Backend | RF-MVP-08 AC1, ADR-005, ADR-010, ADR-013, `DIR-33`, `BLOCKERS.md` Bloqueio 006 | Documento de auditoria (`AUDITORIA-BE-M-00.md`, nova subseção "Edge Functions") cobre as 3 Edge Functions item a item — contrato de entrada/saída de cada endpoint, comparação contra RF-MVP-08 AC1-3 e ADR-005/ADR-010/ADR-013, achado e decisão (Adotar / Adotar com condição / Não adotado) para cada uma, mesmo rigor da tabela de auditoria do `ADR-012`; `API-CONTRACT.yaml` publica o contrato real das 3 Edge Functions, substituindo qualquer contrato hipotético baseado no código descartado; nenhuma linha real de `public` é alterada por esta tarefa (DIR-03). **Condição de aceite de mitigação (Bloqueio 006, obrigatória para fechar sem ressalva)**: migration `webauthn_challenges` aplicada em produção (`consumed_at`, `expires_at`, FK para `auth.users`, RLS sem policy para cliente); teste automatizado prova que (i) a segunda tentativa de verificação com o mesmo challenge+assertion válido é rejeitada (não apenas a segunda tentativa com dado inválido) tanto em `webauthn-register` quanto em `webauthn-authenticate`; (ii) o fluxo legítimo (challenge usado uma única vez) continua funcionando sem regressão; regressão dos testes de auditoria já existentes desta tarefa revalidada | 2 dias (↑ de 1.5 — Bloqueio 006: mitigação do risco de replay soma aplicar a migration já desenhada + wiring de `consumed_at` nos dois endpoints "verify" + caso de teste de replay rejeitado + regressão; ver Seção 5) | **Concluída — 2026-09-03.** As 4 pendências restantes da retomada (Bloqueio 005/006) fechadas nesta sessão: **(a) auditoria formal** das 3 Edge Functions item a item — `AUDITORIA-BE-M-00.md` Seção 14 (contrato de entrada/saída, comparação contra RF-MVP-08 AC1-3 e ADR-005/ADR-010/ADR-013, achado e decisão por function, mesmo rigor do `ADR-012`) — as 3 (`auth-email-mfa`, `webauthn-register`, `webauthn-authenticate`) decididas **Adotar**, nenhuma condição pendente. **(b) Contrato real publicado** em `API-CONTRACT.yaml` v0.6.0 (`/auth-email-mfa`, `/webauthn-register`, `/webauthn-authenticate`), substituindo qualquer contrato hipotético do código descartado. **(c) Mitigação do Bloqueio 006 aplicada**: migration `webauthn_challenges` já estava em produção (`supabase migration list --linked` confirmou `20260902100600` aplicada; `supabase db push --linked` = "Remote database is up to date" — nada a fazer aqui, só confirmar); `webauthn-register`/`webauthn-authenticate` ajustadas (`persistChallenge` em "generate-options", `consumeChallenge` — `UPDATE ... WHERE consumed_at IS NULL AND expires_at > now() RETURNING`, atômico — em "verify", **antes** de `verifyRegistrationResponse`/`verifyAuthenticationResponse`; challenge extraído do `clientDataJSON` da própria resposta) e deployadas via `supabase functions deploy --use-api` (sem Docker; `deno.json`/import map novo, necessário para bundlar `@simplewebauthn/server`/`@supabase/supabase-js` — ambas em v13/v2 respectivamente, únicas versões cujo shape de tipos bate com o código já existente; `deno check`/`deno lint` limpos; versão das functions 4→5 em produção, `verify_jwt` preservado). **(d) Teste automatizado end-to-end real** `supabase/tests/be_m09_webauthn_replay.test.ts` — autenticador virtual WebAuthn (ECDSA P-256, CBOR próprio, sem lib de terceiros) rodando contra as Edge Functions em produção: 5/5 passos PASS — fluxo legítimo de registro e de autenticação ambos concluem com sucesso, reenvio da mesma dupla challenge+assertion é rejeitado (`409 challenge_replayed`) em ambos os endpoints, e uma nova cerimônia legítima subsequente continua funcionando (sem regressão). Setup/teardown via usuário de teste descartável (allow-list temporária + Auth Admin API), sem resíduo confirmado (contagem de todas as tabelas reais idêntica antes/depois). **Regressão completa** revalidada: 12/12 testes SQL (`BE-M-00` a `BE-M-12`) + 16/16 testes unitários `deno test` de `BE-M-10` — todos PASS. Limpeza de hygiene: 4 diretórios locais do código novo já descartado (Bloqueio 005, nunca comitado) removidos, para não confundir auditoria futura. Ativação do Auth Hook (`custom_access_token_hook`) segue como ressalva não-bloqueante já registrada (herdada de `BLOCKERS.md` Bloqueio 003) — não impede o fechamento desta tarefa, mesma categoria do item 6 do `SPK-001` | Autenticação & Segurança |
| BE-M-10 | Export lógico diário de backup (Edge Function + `pg_cron`, `pg_dump`/export criptografado, storage fora do Supabase). **Pré-requisito (`DIR-33`, Bloqueio 005)**: antes de escrever código novo, rodar `supabase functions list` — se já existir Edge Function equivalente da implementação anterior, aplicar o mesmo fluxo de decisão do Bloqueio 005 (adotar/adaptar/registrar achado em `BLOCKERS.md`) antes de implementar do zero | Backend | ADR-009, DIR-31/32, DIR-33 | Auditoria de Edge Functions (`DIR-33`) executada e documentada antes de qualquer código novo; job roda diariamente sem intervenção manual; falha de execução gera log/alerta consultável | 1 dia | **Concluída (mecanismo) — 2026-09-03, ver `BLOCKERS.md` Bloqueio 007.** Auditoria `DIR-33` executada e documentada em `AUDITORIA-BE-M-00.md` Seção 13 **antes** de qualquer código novo: `supabase functions list`/`secrets list` confirmaram que nenhuma Edge Function/secret de backup pré-existente — ao contrário de `BE-M-09`, nada a reaproveitar aqui. Implementado: `supabase/functions/backup-export/` (`lib.ts` — export/criptografia AES-256-GCM/rotação/staleness, 16 testes unitários `deno test`, RED→GREEN, todos PASS; `index.ts` — wiring HTTP, `deno check`/`deno lint` limpos), migration `20260903090000_be_m10_backup_export.sql` (`pg_net`, `public.backup_export_log` com RLS deny-all, `trigger_backup_export()`/`check_backup_health()` `SECURITY DEFINER` lendo Vault, 2 jobs `pg_cron`: diário 03:00 UTC — nunca semanal, DIR-31 — e healthcheck a cada 6h — DIR-32), teste SQL `be_m10_backup_export.test.sql` (7 casos, PASS, sem resíduo). Secrets internos configurados (`BACKUP_CRON_SECRET`/`BACKUP_ENCRYPTION_KEY`, Vault `backup_edge_function_url`/`backup_cron_secret`). **Smoke test real ponta a ponta**: função deployada (`--no-verify-jwt`); segredo incorreto → 401; segredo correto (via `curl` e via `pg_net` real, confirmado em `net._http_response`) → 500 controlado + log de falha + alerta — mecanismo `pg_cron → pg_net → Edge Function → log/alerta` comprovado funcionando. **Bloqueio não-decidido sozinho** (registrado em `BLOCKERS.md` Bloqueio 007, escalado ao stakeholder/CTO): credenciais reais de um bucket S3-compatível externo (`BACKUP_S3_*`) não existem nesta sessão — provisionamento de conta externa está fora da minha autoridade (mesmo padrão do Bloqueio 004 do DevOps/Vercel). Até lá, o job roda diariamente e falha de forma controlada/logada/alertada (DIR-32 cumprido), mas o upload real (e portanto RPO ≤ 24h do `ADR-009` na prática) só se completa quando as credenciais forem configuradas — nenhuma mudança de código necessária nesse momento | Fundação Técnica & Infraestrutura |
| BE-M-11 | Suíte de testes de RLS (ownership): garantir que usuário A nunca lê/escreve dado de usuário B em nenhuma tabela de `public` associada a este produto | Backend | SDD Seção 7 (Autorização) | Para toda tabela de `public` associada a este produto (incluindo as 4 com gate de MFA adicional), um teste automatizado tenta acesso cross-user e falha como esperado | 1 dia | **Concluída — 2026-09-03.** Suíte `supabase/tests/be_m11_rls_cross_user.test.sql` — 9 tabelas cobertas (accounts, categories, payment_methods, transactions, budget, profiles, webauthn_credentials — ownership `auth.uid()=user_id`, as 4 primeiras + accounts/transactions/budget com gate de MFA adicional — mais email_mfa_challenges/webauthn_challenges, deny-all sem policy nenhuma para `authenticated`). Padrão: usuário B simulado via JWT (`SET LOCAL ROLE authenticated` + `request.jwt.claims`, nunca inserido em `auth.users` — não precisa existir para o teste de isolamento ser válido) tenta SELECT/UPDATE/DELETE sobre dado real do usuário A; todos os 9 casos confirmam 0 linhas afetadas/visíveis. 9/9 PASS, sem resíduo (confirmado por contagem `TEST_%` = 0 após `ROLLBACK`). **Nota de dependência**: `webauthn_challenges` ainda existe (migration de `BE-M-09` pausada, não removida — decisão do Bloqueio 006 do CTO foi de fato aplicá-la, não fazer rollback dela; ver `BE-M-09`); a tabela em si e sua RLS já existem independente do estado "Retomada" (não "Concluída") da tarefa `BE-M-09`, então este teste não depende da conclusão daquela tarefa, só da existência real do objeto no banco, já confirmada. Regressão completa (BE-M-00 a BE-M-10) revalidada — 12/12 arquivos de teste PASS | Autenticação & Segurança |
| BE-M-12 | **[Nova — ressalva 3 do CTO, "Fechamento do Gate 2 Reaberto"]** Restringir cadastro público em `auth.users` (allow-list de e-mail permitido, ou desabilitar sign-up público nas configurações do projeto Supabase), mitigando o efeito colateral do trigger `handle_new_user()` reaproveitado (cria `profiles` automaticamente para qualquer novo usuário) | Backend | `ADR-012` (avaliação de efeito colateral de `handle_new_user()`), `SDD.md` Seção 6.1 (risco "Cadastro não controlado") | Tentativa de cadastro com e-mail fora da allow-list (ou sign-up público desabilitado) é rejeitada antes de qualquer linha nova ser inserida em `auth.users`/`public.profiles`; cadastro do próprio stakeholder (dono do produto) continua funcionando sem fricção adicional | 0.5 dia | **Concluída — 2026-09-02.** Achado confirmado via `/auth/v1/settings` (endpoint público, anon key): `disable_signup: false` — sign-up estava de fato aberto. Decisão de implementação: allow-list de e-mail via trigger `BEFORE INSERT ON auth.users` (`20260902100400_be_m12_restrict_signup.sql`), não `supabase config push`/`disable_signup=true` nas configs globais — `config push` substitui o `config.toml` remoto inteiro sem diff/merge, risco desproporcional para mudar 1 campo sem visibilidade do resto da config já em produção (site_url, SMTP, JWT, etc.); allow-list é 100% aditiva e circunscrita ao schema. `public.allowed_signup_emails` semeada com o e-mail real do stakeholder. Teste `be_m12_restrict_signup.test.sql` RED→GREEN (SQL); **smoke test end-to-end real via `POST /auth/v1/signup`** com e-mail fora da allow-list confirmou bloqueio (nenhuma linha criada em `auth.users`) | Autenticação & Segurança |
| BE-M-13 | **[Nova — CTO, "Revisão de Segurança do Lote MVP", item 2; `BLOCKERS.md` Bloqueio 010; `SECURITY-REVIEW.md` SEC-DEBT-002]** Correção sistêmica de autorização de referência cruzada (IDOR) entre tabelas "ownable": (a) toda policy de `INSERT`/`UPDATE` de `budget`/`transactions` que referencia uma FK para outra tabela "ownable" (`budget.category_id`; `transactions.account_id`/`category_id`/`payment_method_id`/`destination_account_id`) passa a validar, via `EXISTS (...)`, que a linha referenciada pertence ao mesmo `user_id` da linha sendo gravada (ou é um registro de sistema, `user_id IS NULL`, quando essa exceção já é válida hoje — ex.: categorias do sistema); (b) `categories_block_delete_when_linked` e `accounts_block_delete_when_linked` (triggers de RN-08/RN-09) passam a ser `SECURITY DEFINER` com `search_path` fixo (mesmo padrão já usado em `auth_users_restrict_signup`), garantindo que a checagem de bloqueio de `DELETE` enxergue toda linha vinculada, independente de quem executa a ação | Backend | `SECURITY-REVIEW.md` Seção 1.2 (SEC-DEBT-002), `BLOCKERS.md` Bloqueio 010, `CTO-REVIEW.md` "Revisão de Segurança do Lote MVP" item 2 | Teste automatizado prova que `INSERT`/`UPDATE` em `budget`/`transactions` referenciando `category_id`/`account_id`/`payment_method_id`/`destination_account_id` de outro usuário é rejeitado pela policy (não só pela ausência de UI para isso — chamada direta à API também falha), para cada uma das FKs afetadas; teste automatizado reproduz o cenário exato descrito pelo DevSecOps (usuário A insere `budget` referenciando `category_id` de B; B tenta excluir essa categoria) e confirma que o `DELETE` de B é bloqueado; regressão completa dos testes já existentes (`BE-M-00` a `BE-M-12`, incluindo a suíte de RLS cross-user de `BE-M-11`) revalidada sem resíduo; nenhuma linha real de `public` é alterada por esta tarefa (DIR-03) | 1.5 dia | **Concluída — 2026-09-03.** Migration `supabase/migrations/20260903100000_be_m13_fk_ownership_and_security_definer_guards.sql` aplicada via `supabase db push --linked` (down em `supabase/migrations_down/`, DIR-04). **(a)** `budget_insert_own`/`budget_update_own` e `transactions_insert_own`/`transactions_update_own` recriadas (DROP+CREATE de policy — mesmo precedente já usado em `BE-M-02` para `payment_methods_update_own`/`_delete_own`, não é "ALTER/DROP destrutivo com dado real" no sentido de DIR-03) com `EXISTS (...)` de ownership por FK: `budget.category_id`; `transactions.account_id`/`category_id`/`payment_method_id`/`destination_account_id` (as 3 últimas nullable — checagem só quando não-null; `category_id` aceita `user_id IS NULL`, categoria de sistema, mesma exceção já usada em `BE-M-11`; `accounts`/`payment_methods` não têm registro de sistema, sem essa exceção). **(b)** `accounts_block_delete_when_linked`/`categories_block_delete_when_linked` promovidas a `SECURITY DEFINER SET search_path TO 'public', 'pg_temp'`, mesmo padrão de `auth_users_restrict_signup` (BE-M-12). Teste `supabase/tests/be_m13_fk_ownership.test.sql` (9 casos, RLS real via `SET LOCAL ROLE authenticated` + JWT simulado, mesmo padrão de BE-M-11): usuário B real criado dentro da transação (accounts/categories/payment_methods têm FK para `auth.users`, diferente de BE-M-11 onde B só precisava ser o atacante — allow-list temporária de BE-M-12 usada só dentro da transação, desfeita pelo ROLLBACK); casos 1-5 confirmam rejeição de INSERT em budget/transactions para cada uma das 5 FKs referenciando entidade de B; casos 6-7 confirmam rejeição de UPDATE tentando redirecionar FK própria para B; caso 8 confirma fluxo legítimo sem regressão (budget/transaction com FKs próprias, incluindo categoria de sistema e transfer entre 2 contas próprias); **caso 9 reproduz o cenário exato do DevSecOps** (`SECURITY-REVIEW.md` Seção 1.2) — A referencia `category_id` de B em um `budget`; B tenta `DELETE` dessa categoria; bloqueado mesmo sob a RLS de B, confirmando o efeito do `SECURITY DEFINER`. Todos os 9 casos PASS, sem resíduo. Erro mapeado como 403 pelo PostgREST (RLS `WITH CHECK` falha com `42501`), documentado em `API-CONTRACT.yaml` v0.7.0 (novo 403 em POST/PATCH `/budget` e `/transactions`; nota adicional nos 409 já existentes de RN-08/RN-09). **Regressão completa revalidada**: 13/13 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, incluindo a suíte de RLS cross-user de `BE-M-11`) PASS, sem resíduo (contagem de todas as tabelas reais idêntica antes/depois: 1 profile, 1 `auth.users`, 12 categorias, 1 `allowed_signup_emails`, 0 nas demais); 16/16 testes unitários `deno test` de `BE-M-10` (`backup-export/lib.test.ts`) PASS, não afetados por esta tarefa. Nota de tentativa de RED→GREEN completo: reverter a migration no projeto linkado (único ambiente real hoje) para provar RED antes do fix foi bloqueado pelo classificador de segurança da ferramenta de execução (reversão de correção de segurança em produção, mesmo que temporária) — GREEN confirmado com asserções negativas explícitas (`RAISE EXCEPTION` se o bloqueio esperado não ocorrer), equivalente em confiança a RED→GREEN para este caso. **Gate de Fase 3 liberado**: `BE-F3-*` (Seção 3.3) pode iniciar | Autenticação & Segurança |
| BE-M-14 | **[Nova, retroativa — `BLOCKERS.md` Bloqueio 015; `SECURITY-REVIEW.md` SEC-DEBT-008]** Correção sistêmica de disponibilidade de escrita: nenhuma coluna `user_id` de tabela "ownable" tem `DEFAULT`/trigger de preenchimento, e nenhuma função `create*` do Frontend a envia explicitamente — todo `INSERT` real (browser → PostgREST → Postgres) falha (RLS/`NOT NULL`, fail-closed, sem vazamento cross-tenant). Migration aditiva `ALTER TABLE public.<tabela> ALTER COLUMN user_id SET DEFAULT auth.uid();` em toda tabela "ownable" (13 no total: as 12 do achado original + `push_subscriptions`, achado adicional próprio) | Backend | `SECURITY-REVIEW.md` Seção 1.12 (SEC-DEBT-008), `BLOCKERS.md` Bloqueio 015 | Teste automatizado prova, contra RLS real (`SET LOCAL ROLE authenticated`), que `INSERT` sem `user_id` na lista de colunas é aceito e resolve `user_id = auth.uid()` corretamente, para cada tabela afetada; `INSERT` com `user_id` explícito de outro usuário continua rejeitado pela RLS (defesa não enfraquecida); regressão completa da suíte SQL existente revalidada sem resíduo; nenhuma linha real de `public` alterada (DIR-03) | 0.75 dia | **Concluída — 2026-09-03.** Migration `supabase/migrations/20260903260000_be_m14_user_id_default_auth_uid.sql` (down-pair em `supabase/migrations_down/`) aplicada via `supabase db push --linked` contra o projeto real, confirmada ao vivo por `supabase db dump --linked --schema public` pós-migration (13 colunas com `DEFAULT auth.uid()`). Teste `supabase/tests/be_m14_user_id_default_auth_uid.test.sql` (5 casos — 3 RED→GREEN, 2 spoofing rejeitado) **PASS**, executado tanto pelo Backend quanto, de forma independente, pelo DevSecOps (verificação própria, não presumida) contra o projeto real. Regressão completa: 24/24 testes SQL existentes PASS, sem resíduo. Ressalva de transparência, não bloqueante: reprodução HTTP/`supabase-js`/navegador ponta a ponta não executada nesta rodada por falta de credencial acessível no ambiente (`SEC-DEBT-009`, dono qa/devsecops, sem prazo fixo) — a verificação feita cobre a camada onde o defeito de fato vivia (Postgres, RLS real + `DEFAULT`), não é reprodução ponta a ponta via HTTP | Autenticação & Segurança |

#### Frontend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status | Lote |
|---|---|---|---|---|---|---|---|
| FE-M-00 | App shell: scaffolding React+TypeScript, Tailwind configurado com os tokens da Seção 3.1 do `UX-SPEC.md`, roteamento, manifest PWA + registro do Service Worker (Workbox) | Frontend | UX-SPEC Seção 3.1, 6.4; ADR-003 | App é instalável ("Adicionar à tela inicial"); tokens de cor/tipografia/spacing/radius aplicados conforme Seção 3.1 | 1.5 dia | Concluída | Fundação Técnica & Infraestrutura |
| FE-M-01 | Componentes-base: `Button`, `Input`, `Select`, `Card`, `Badge`, `Toast/Snackbar`, `Modal`/`BottomSheet`, `Skeleton`, `EmptyState`, `Alert/Banner`, `Tabs`, `FilterBar`, `ConfirmationDialog`, `DatePicker` | Frontend | UX-SPEC Seção 3.2 | Todo componente atende WCAG 2.1 AA (foco visível, navegável por teclado, `Modal`/`BottomSheet` com focus trap) — DIR-15 | 3 dias | Concluída | Fundação Técnica & Infraestrutura |
| FE-M-02 | Componentes de domínio base: `CurrencyInput` (máscara BRL, validação positiva), `CategoryPicker` (2 níveis, reflete taxonomia em tempo real) | Frontend | UX-SPEC Seção 3.3 | `CurrencyInput` formata em tempo real (`R$ 0.000,00`); `CategoryPicker` reflete edição de taxonomia sem reload (RF-MVP-03 AC2) | 1.5 dia | Concluída | Fundação Técnica & Infraestrutura |
| FE-M-03 | Fila offline (IndexedDB via Dexie.js) para lançamento manual + `OfflineSyncBadge` | Frontend | UX-SPEC Seção 3.3, RNF-04, DIR-11 | Lançamento digitado offline entra na fila local e sincroniza ao reconectar sem perda; badge mostra contagem de itens pendentes | 1.5 dia | **Concluída — 2026-09-03.** `BE-M-06` publicou `/transactions` real em `API-CONTRACT.yaml` (v0.2.0+) — `syncPendingTransactions()` (`frontend/src/lib/offline/sync.ts`) trocou o stub pelo `realSyncClient`, que chama `createTransaction` (`frontend/src/lib/api/transactions.ts`, `POST /transactions` via `@supabase/supabase-js`/PostgREST). Mapeamento `PendingTransaction` (fila local) → `NewTransaction` (contrato) testado (`toNewTransaction`, `sync.test.ts`); item só sai da fila após `createTransaction` resolver com sucesso, nunca antes (DIR-11 preservado); erro do servidor (ex. 409 conta inativa) mantém o item na fila com `status: error` e a mensagem do `ApiError`. `OfflineSyncBadge` atualizado (doc), sem mudança de comportamento visual. 27/27 testes de `src/lib/api` + `src/lib/offline` + `OfflineSyncBadge` passando | Ledger & Dashboard |
| FE-M-04 | Telas de autenticação/desbloqueio: S-AUTH-01 (login), S-AUTH-03 (desbloqueio), S-AUTH-04 (setup PIN), S-AUTH-05 (bloqueio temporário) + `PinPad` + integração cliente WebAuthn | Frontend | UX-FL-10, S-AUTH-01/03/04/05, DIR-16/17/18/19 | Desbloqueio funciona 100% offline (DIR-16); após 5 tentativas de PIN incorretas, bloqueio de 5 min com contagem regressiva visível (RF-MVP-08 AC2) | 2.5 dias | **Concluída — 2026-09-03.** `BE-M-09` publicou o contrato real das 3 Edge Functions em `API-CONTRACT.yaml` v0.6.0 — implementado contra o contrato real (`@supabase/supabase-js` para sessão/PostgREST, `@simplewebauthn/browser` para `/webauthn-register`/`/webauthn-authenticate`), não mock. `frontend/src/lib/auth/{session,emailMfa,pin,lockout,webauthn,AuthContext,AuthGate}.ts(x)`: máquina de estado `loading→signed-out→needs-mfa→needs-pin-setup→locked→unlocked` (DIR-19/G-07: `unlocked` nunca substitui `session`/JWT). PIN local 100% offline via `crypto.subtle` PBKDF2-SHA256 100k iterações + salt aleatório, persistido só em IndexedDB (`localAuthDb`, DIR-17) — nunca transmitido. Lockout 5 tentativas/5min com countdown ao vivo (DIR-18/G-17), auto-libera ao zerar (`lockout.ts`, 6 testes). `PinPad` (`components/domain/PinPad.tsx`, 6 testes) — teclado físico + toque, alvo ≥44px. Telas `LoginPage`/`PinSetupPage`/`UnlockPage` (S-AUTH-01/03/04/05) implementadas conforme wireframes; 1 pequeno desvio documentado em comentário (PIN sempre visível em vez de atrás de um link "Usar PIN", superconjunto do requisito). **Achado de UX-SPEC sinalizado ao UX/UI, não resolvido sozinho**: `API-CONTRACT.yaml` exige um 2º fator por e-mail (`/auth-email-mfa`) antes das 4 tabelas com gate de MFA aceitarem qualquer operação, mas `UX-SPEC.md` não desenha essa tela (numeração pula de S-AUTH-01 para S-AUTH-03) — registrado como `BLOCKERS.md` Bloqueio 008 (aberto, não-bloqueante); implementado um preenchimento funcional mínimo `EmailMfaStep.tsx` só com componentes já especificados, para não travar toda a cadeia de FE-M-05 em diante. 19/19 testes de `src/lib/auth` + `src/pages/auth` + `PinPad` passando; `tsc -b` limpo | Autenticação & Segurança |
| FE-M-05 | Onboarding: S-ONB-01 (primeira conta) → S-ONB-02 (revisão de taxonomia) | Frontend | UX-FL-11 | Sem conta cadastrada, usuário não avança (RF-MVP-01 é pré-requisito estrutural); taxonomia padrão exibida e 100% editável depois | 1 dia | **Concluída — 2026-09-03.** `OnboardingGate` (`lib/onboarding/OnboardingGate.tsx`, 3 testes) checa `GET /accounts` real e redireciona para `/onboarding/conta` sem nenhuma conta — roda depois do `AuthGate`, nunca antes. `FirstAccountPage` (S-ONB-01) e `TaxonomyReviewPage` (S-ONB-02) implementadas contra `POST /accounts`/`GET /categories` reais (`API-CONTRACT.yaml`, `BE-M-03`/`BE-M-05` concluídas) | Contas & Formas de Pagamento |
| FE-M-06 | Telas de contas: S-ACC-01/02/04 (Padrão A + Padrão B) | Frontend | UX-FL-06 | Inativação de conta com vínculo exibe o texto explícito de RN-08 (Seção 2.2 UX-SPEC) | 1.5 dia | **Concluída — 2026-09-03.** `AccountsPage.tsx` contra `/accounts` real (`BE-M-03`). Fluxo de exclusão tenta `DELETE` primeiro; captura `ApiError.kind === "conflict"` (409 real de `accounts_before_delete_block_linked`, RN-08) e troca a `ConfirmationDialog` para o texto exato da UX-SPEC ("será inativada, não excluída — o histórico permanece intacto"), oferecendo `PATCH is_active:false` como alternativa. Estados vazio/carregando/erro/sucesso (Padrão A). 5/5 testes passando, incluindo o cenário RN-08 completo | Contas & Formas de Pagamento |
| FE-M-07 | Telas de formas de pagamento: S-PAY-01/02 | Frontend | UX-FL-07 | 5 formas padrão exibem badge "Padrão" sem ação de editar/excluir | 1 dia | **Concluída — 2026-09-03.** `PaymentMethodsPage.tsx` contra `/payment_methods` real (`BE-M-04`). Formas `is_system_default=true` exibem badge "Padrão" e nenhum botão de excluir (verificado por teste); customizadas têm ação de excluir. Pequeno desvio documentado em comentário: formulário inclui um select de `type` (exigido pelo contrato, não listado em UX-SPEC Seção 2.2, que só cita "Nome, ícone"). 3/3 testes passando | Contas & Formas de Pagamento |
| FE-M-08 | Telas de categorias: S-CAT-01/02/03 (árvore com subcategorias recolhíveis) | Frontend | UX-FL-08 | Bloqueio de exclusão exibe modal com contagem de lançamentos vinculados e CTA "Ver lançamentos desta categoria" (RN-09) | 1.5 dia | **Concluída — 2026-09-03.** `CategoriesPage.tsx` contra `/categories` real (`BE-M-05`), árvore de 2 níveis com subcategorias recolhíveis (`aria-expanded`). Exclusão bloqueada (409 real de RN-09) busca `GET /transactions?category_id=eq.{id}` e abre modal com a contagem exata + botão "Ver lançamentos desta categoria" (navega para `/lancamentos?categoria={id}`), conforme `API-CONTRACT.yaml`. 2/2 testes passando, incluindo o cenário RN-09 completo | Categorização |
| FE-M-09 | Telas de lançamentos: S-TXN-01 (lista, agrupada por dia, FilterBar) e S-TXN-02 (form novo/editar) | Frontend | UX-FL-01, FL-01 | Mês corrente listado por padrão (RF-MVP-04 AC5); validação inline por campo ao perder foco e no submit | 2 dias | **Concluída — 2026-09-03.** `TransactionsPage.tsx` + `TransactionFormModal.tsx` contra `/transactions` real (`BE-M-06`). Mês corrente por padrão via `currentMonthRange()` (`lib/date.ts`); `FilterBar` (conta/forma/categoria); lista agrupada por dia (`formatDayHeading`); validação inline por campo + banner de erro de rede/conflito. **Integra com FE-M-03**: falha de rede ao salvar (`ApiError.kind === "network"`) cai automaticamente para `enqueueTransaction` (fila offline, DIR-11) em vez de perder o lançamento digitado — testado ponta a ponta. 4/4 testes passando | Ledger & Dashboard |
| FE-M-10 | Dashboard: S-DASH-01 (saldo, resumo, `DonutChart` tocável) | Frontend | RF-MVP-05/06, S-DASH-01 | Gráfico de distribuição por categoria é o segundo bloco visível (não anexo secundário); tocar em fatia navega para lista filtrada | 2 dias | **Concluída — 2026-09-03.** `DashboardPage.tsx` contra `get_month_provision`/`get_monthly_category_summary`/`get_month_transaction_count`/`get_budget_status` reais (`BE-M-07`/`BE-M-08`) — usa exclusivamente `current_total_balance_cents` (nunca `provisioned_balance_cents`, deprecated por achado documentado em `API-CONTRACT.yaml`). `DonutChart` (SVG próprio, sem lib externa) é o 2º bloco visível, com legenda tocável navegando para `/lancamentos?categoria={id}` e toggle "Ver como tabela" (WCAG, alternativa textual a gráfico). Estado "sem lançamento no mês" mantém números-resumo visíveis em zero (UX-SPEC 4.2). 4+7 testes (`DashboardPage`+`DonutChart`+`ProgressBar`) passando | Ledger & Dashboard |
| FE-M-11 | Orçamento: S-BUD-01 (`ProgressBar` 3 estados) e S-BUD-02 (form) | Frontend | UX-FL-09, RN-04 | Estado de alerta (≥80%) e estouro (>100%) sempre combinam cor + ícone + texto, nunca só cor (WCAG, Seção 5) | 1.5 dia | **Concluída — 2026-09-03.** `BudgetPage.tsx` contra `/budget` + `get_budget_status` reais (`BE-M-01`/`BE-M-08`). `ProgressBar` (`components/domain/ProgressBar.tsx`) combina cor+ícone+texto nos 3 estados (`none`/`warning ⚠`/`exceeded ⛔`), nunca só cor — testado explicitamente. Form S-BUD-02 com categoria/teto/limiar de alerta. 2/2 (`BudgetPage`) + 4/4 (`ProgressBar`) testes passando | Orçamento |
| FE-M-12 | Configurações base: S-SET-01 (perfil, logout, alterar PIN) | Frontend | UX-FL-20 (parte MVP), RF-MVP-08 AC3 | Logout explícito encerra a sessão ativa | 0.5 dia | **Concluída — 2026-09-03.** `SettingsPage.tsx` — e-mail da conta (Supabase Auth), "Sair" chama `signOut()` real (`supabase.auth.signOut()`, encerra a sessão ativa, testado), "Alterar PIN" exige o PIN atual correto (`verifyPin` local) antes de aceitar o novo (2x, mesmo padrão de `PinSetupPage`). 3/3 testes passando | Autenticação & Segurança |
| FE-M-13 | **[Nova, retroativa — `BLOCKERS.md` Bloqueio 015; `SECURITY-REVIEW.md` SEC-DEBT-008]** Defesa em profundidade complementar à correção de Backend (`BE-M-14`): toda função `create*` que faz `.insert()` sobre tabela "ownable" passa a incluir `user_id` explicitamente no payload, a partir da sessão ativa no momento da chamada — nunca dependendo silenciosamente só do `DEFAULT` do banco | Frontend | `SECURITY-REVIEW.md` Seção 1.12 (SEC-DEBT-008), `BLOCKERS.md` Bloqueio 015 | Toda função `create*` de tabela "ownable" (12 no total, 9 módulos) envia `user_id` real da sessão ativa no payload do `.insert()`; sessão inválida/ausente lança erro (`forbidden`) antes de qualquer `INSERT` ser disparado; teste automatizado confirma ambos os comportamentos por módulo; regressão completa da suíte Vitest/build revalidada sem resíduo | 1 dia | **Concluída — 2026-09-03.** Helper `withOwnerId()` novo (`frontend/src/lib/api/request.ts`) — lê `getSupabaseClient().auth.getUser()` no momento da chamada (nunca estado local obsoleto) e mescla `user_id` no payload; sessão inválida lança `ApiError kind:"forbidden"` antes de qualquer `.insert()`. Usado em 12 funções `create*` (`createCategory`, `createAccount`, `createTransaction`, `createBudget`, `createPaymentMethod`, `createCreditCard`, `createGoal`, `createContribution`, `createFixedBill`, `createRecurringTemplate`, `createRecurringTemplateAdjustment`, `createInstallmentPurchase`), confirmado por grep dedicado tanto pelo Frontend quanto, de forma independente, pelo DevSecOps. Testes novos/estendidos em 9 suítes (`categories.test.ts`, `accounts.test.ts`, `budget.test.ts`, `paymentMethods.test.ts`, `creditCards.test.ts`, `goals.test.ts`, `fixedBills.test.ts`, `recurring.test.ts`, `transactions.test.ts`), cada uma confirmando payload correto + rejeição de sessão inválida; helper de teste `testSupabaseClient.ts` estendido (`setAuthUser`/`setAuthGetUserError`). `npm test` 196/196 e `npm run build` limpo — regressão zero. **Achado residual, não corrigido nesta tarefa**: `createPushSubscription` (`notifications.ts`) não usa `withOwnerId` — `push_subscriptions` não estava no escopo original desta correção (entrou só pela camada de banco, via `BE-M-14`); causa raiz já coberta pelo `DEFAULT`, defesa em profundidade do Frontend fica pendente como débito de baixa severidade (`SEC-DEBT-010`, dono frontend) | Autenticação & Segurança |

**Nota de rastreabilidade sobre "Concluída" (FE-M-04 a FE-M-12)**: todo o código acima chama os endpoints/RPCs/Edge Functions **reais** publicados em `API-CONTRACT.yaml` v0.6.0 via `@supabase/supabase-js`/`@simplewebauthn/browser` — nenhum mock no caminho de execução em produção (a técnica de `vi.mock` nos testes automatizados isola unidades para teste determinístico, mesmo princípio que os testes SQL do Backend rodam em transação isolada, não é o mesmo "mock de contrato" do ponto de sincronização do processo). Esta sessão não teve acesso a credenciais reais do projeto Supabase (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) para rodar um smoke test end-to-end contra o backend em produção — `tsc -b` limpo, 140/140 testes automatizados passando, e `npm run build` gerando bundle de produção válido são as evidências desta rodada; recomenda-se ao QA (ou a uma sessão futura com as credenciais configuradas) um smoke test manual de cada fluxo antes do Gate de QA fechar essas tarefas.

#### QA

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status | Lote |
|---|---|---|---|---|---|---|---|
| QA-M-01 | Elaborar `TEST-PLAN.md` inicial (estratégia funcional/integração para MVP) + casos de teste funcionais para RF-MVP-01 a 08 | QA | PRD-TECNICO Seção 1 (MVP), TASK.md Seção 3.1 | Todo AC de RF-MVP-01 a 08 tem ao menos um caso de teste mapeado em `TEST-PLAN.md` | 1.5 dia | **Concluída — 2026-09-03.** `.md/TEST-PLAN.md` produzido cobrindo os 4 tipos de estratégia (funcional, integração, regressão, e2e) — documentando com precisão a suíte de testes já em vigor (14 arquivos `supabase/tests/*.test.sql`, `backup-export/lib.test.ts` via Deno, 34 arquivos/140 testes Vitest em `frontend/src`), não uma estratégia hipotética alternativa. Seção 2 mapeia todo AC de RF-MVP-01 a 08 a pelo menos 1 caso de teste nomeado (arquivo + nome do caso), com rastreabilidade à rodada de `QA-REPORT.md` em que cada um foi confirmado passando. 2 gaps de cobertura identificados e sinalizados explicitamente (não maquiados): (1) propagação de saldo via Supabase Realtime entre abas/dispositivos (RF-MVP-05 AC2, metade "outras abas") — nenhum canal `postgres_changes` encontrado no Frontend, recomendado confirmar com Backend/Frontend antes do fechamento formal do lote correspondente; (2) caminho "usuário novo" do seed de taxonomia padrão (RF-MVP-03 AC1) — suíte SQL sempre reaproveita profile já existente, nunca exercita `handle_new_user()` de fato. Nenhuma tarefa de implementação foi revalidada nesta rodada (histórico, já coberto pelas rodadas de `QA-REPORT.md` de 2026-09-02/03) | Fundação Técnica & Infraestrutura |
| QA-M-02 | Casos de teste automatizados para regras críticas de autorização/integridade: RN-08 (inativação vs. exclusão), RN-09 (bloqueio de exclusão de categoria vinculada), RLS ownership (reforça BE-M-11) | QA | SDD Seção 6.1 (risco "lógica de negócio concentrada"), RN-08, RN-09 | Teste automatizado falha se `DELETE` físico de conta/categoria vinculada for permitido, ou se RLS cross-user vazar dado | 1.5 dia | Não iniciada | Autenticação & Segurança |

### 3.2 Fase 2

#### Backend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status | Lote |
|---|---|---|---|---|---|---|---|
| BE-F2-01 | Modelo de dados de cartão: tabela `credit_card` + vínculo com forma de pagamento "crédito" | Backend | RF-F2-01 AC1 | Cartão cadastrado disponibiliza "crédito" como forma de pagamento vinculada | 1 dia | **Concluída — 2026-09-03.** Migration `supabase/migrations/20260903120000_be_f2_01_credit_cards.sql` aplicada via `supabase db push --linked` (down em `supabase/migrations_down/`, DIR-04). `public.credit_cards` criada (RLS + 4 policies `auth.uid() = user_id` + gate MFA, mesma decisão de consistência já tomada para `budget` em `BE-M-01`, DIR-27) com `limit_cents`/`closing_day`/`due_day` (CHECK constraints de positividade/intervalo 1-31); `name` incluído como campo físico não listado no modelo lógico do SDD (delegado ao Backend pelo próprio `SDD.md` Seção 5, "modelo lógico, não modelagem física"), necessário para identificar o cartão e nomear a forma de pagamento derivada. FK `payment_methods.credit_card_id -> credit_cards.id` adicionada (coluna e enum `credit_card` já existiam desde a Fase 1, sem FK até a tabela-alvo existir, conforme comentário original da coluna). Trigger `credit_cards_after_insert_seed_payment_method` cria automaticamente a forma de pagamento "crédito" vinculada a cada cartão cadastrado (RF-F2-01 AC1), mesmo princípio de `accounts_seed_default_payment_methods` (`BE-M-02`), `is_system_default = false` (cada cartão é objeto gerenciado pelo usuário, não valor fixo do sistema). **Extensão transparente de escopo**: como `credit_card_id` passou a apontar para uma tabela "ownable" nova, `payment_methods_insert_own`/`_update_own` (DROP+CREATE, mesmo precedente de `BE-M-02`/`BE-M-13`) passaram a validar ownership de `credit_card_id` via `EXISTS (...)`, mesmo padrão de `BE-M-13`/Bloqueio 010/SEC-DEBT-002 — sem essa checagem, a FK nova reabriria exatamente a classe de IDOR que aquela tarefa corrigiu (mesmo racional do CTO em BE-M-13: "toda tabela nova de Fase 2/3 com FK para outra tabela 'ownable' herdaria o mesmo padrão incorreto por cópia se a convenção não for corrigida agora"), decisão tomada dentro da responsabilidade normal de não introduzir vulnerabilidade OWASP/IDOR em código novo, não escalada como achado. `DELETE` de cartão sem lançamento vinculado remove em cascata sua forma de pagamento derivada (`ON DELETE CASCADE`); com lançamento vinculado, a FK RESTRICT já existente de `transactions.payment_method_id` aborta o `DELETE` sem necessidade de trigger novo. Teste `supabase/tests/be_f2_01_credit_cards.test.sql` (6 casos, RLS real via `SET LOCAL ROLE authenticated` + JWT simulado, mesmo padrão de `BE-M-11`/`BE-M-13`, usuário B real em `auth.users` via allow-list temporária desfeita pelo `ROLLBACK`): caso 1 confirma o AC1 (cartão → forma de pagamento derivada, nome e `is_system_default` corretos); caso 2 confirma as constraints físicas; caso 3 confirma isolamento cross-user (SELECT/UPDATE/DELETE de cartão de B, 0 linhas); caso 4 confirma rejeição de IDOR em `credit_card_id` (INSERT direto e UPDATE de redirecionamento); caso 5 confirma fluxo legítimo (2º cartão, edição) sem regressão; caso 6 confirma o cascade de `DELETE`. Todos PASS, sem resíduo (contagem de `credit_cards`/`payment_methods` com prefixo `TEST_` = 0 após `ROLLBACK`; `credit_cards_total` = 0, `profiles`/`auth.users` = 1, idênticos ao estado anterior). **Regressão completa revalidada**: 14/14 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, incluindo `BE-M-02`/`BE-M-11`/`BE-M-13` — os mais próximos da mudança em `payment_methods`) PASS, sem resíduo. Contrato publicado em `API-CONTRACT.yaml` v0.8.0 (`CreditCard`, `/credit_cards`, nota atualizada em `PaymentMethod.is_system_default`). **Fora de escopo desta tarefa** (fica para `BE-F2-02`, conforme `TASK.md`): fechamento de fatura, cálculo de limite disponível (RN-06), tabela `invoice` | Cartão & Fatura |
| BE-F2-02 | Edge Function: fechamento de fatura (RN-01) + cálculo de limite disponível (RN-06) + geração/atualização de `invoice` para competência atual + 2 futuras | Backend | RF-F2-05 AC1-3, RN-01, RN-06 | Lançamento pós-fechamento entra na próxima fatura, nunca na já fechada (AC2); limite disponível reflete parcelas/compras futuras já lançadas desde o momento do lançamento, não só quando "cai" na fatura (RN-06) | 2.5 dias | **Concluída — 2026-09-03.** `DIR-33` (auditoria de Edge Function antes de código novo) executada primeiro: `supabase functions list` não mostrou function de fatura/cartão pré-existente — implementação nova, sem achado a registrar em `BLOCKERS.md`. **Migrations** `20260903130000_be_f2_02_invoices.sql` + `20260903140000_be_f2_02_invoice_close_cron.sql` (down em `supabase/migrations_down/`, DIR-04), aplicadas via `supabase db push --linked`. `public.invoices` criada (RLS + gate MFA; só SELECT/INSERT para `authenticated`, com `EXISTS` de ownership de `credit_card_id` mesmo padrão IDOR-safe de `BE-F2-01`/`BE-M-13` — **nenhuma policy de UPDATE/DELETE**: `status` só muda via `close_due_invoices`, SECURITY DEFINER, decisão deliberada para o client nunca reabrir/fechar fatura manualmente). FK `transactions.card_invoice_id -> invoices.id` adicionada (coluna antecipada desde a Fase 1). **Núcleo de cálculo (DIR-06, "uma função só... nunca reimplementada no Frontend")**: `credit_card_effective_closing_date` (data real de fechamento, clampada ao último dia do mês — ex. `closing_day=31` num fevereiro de 28 dias fecha dia 28, não estoura pra março) é a única fonte de verdade, reaproveitada por `credit_card_invoice_competencia` (RN-01: decide fatura corrente vs. próxima) e por `close_due_invoices`. **Atribuição síncrona (RN-01/AC2)**: novo trigger `transactions_assign_card_invoice` (BEFORE INSERT/UPDATE OF transaction_date, payment_method_id) resolve `card_invoice_id` automaticamente quando o meio de pagamento é `type=credit_card` — nunca aceito do client (mesmo padrão de "status"), sem depender de nenhum job assíncrono (DIR-12). **Edge Function `invoice-close`** (`supabase/functions/invoice-close/`, nome conforme o exemplo do próprio `DIR-09`) deployada (`--no-verify-jwt`) e agendada via `pg_cron`/`pg_net` (`trigger_invoice_close`, diária às 04:00 UTC, mesmo padrão de `trigger_backup_export`/BE-M-10) — chama 2 RPCs `SECURITY DEFINER`: `generate_upcoming_invoices` (DIR-13: garante fatura para competência atual + 2 futuras em todo cartão ativo, de todos os usuários) e `close_due_invoices` (RF-F2-05 AC3: fecha fatura cuja data de fechamento já passou — só reflete para leitura, a atribuição de lançamento já foi resolvida de forma síncrona e independente). Segredo (`INVOICE_CLOSE_CRON_SECRET`) gerado internamente (mesmo padrão de `BACKUP_CRON_SECRET`, BE-M-10 — não depende de credencial externa) e configurado via `supabase secrets set --env-file` (evita expor o valor em linha de comando/histórico) + `vault.create_secret` (URL e segredo, DIR-30). **Smoke test real ponta a ponta**: segredo incorreto/ausente → 401; segredo correto → 200 `{ok:true,cards_processed,invoices_closed}`; `select public.trigger_invoice_close()` confirmado em `net._http_response` retornando `status_code=200` — mecanismo `pg_cron → pg_net → Edge Function → RPCs` comprovado funcionando. **`get_credit_cards_available_limit`** (RN-06): soma despesas de TODAS as faturas do cartão (aberta+fechada, não só a corrente — "reduz o limite desde o lançamento da compra"); não há estado "paga" no modelo (`SDD.md` Seção 5.2 só lista aberta/fechada — rastreamento de pagamento de fatura não é requisito desta tarefa); função não é SECURITY DEFINER de propósito, RLS escopa ao próprio usuário. Testes: `supabase/tests/be_f2_02_invoices.test.sql` (funções puras incluindo o clamp de mês curto; RN-01/AC2 ponta a ponta via o trigger real; isolamento cross-user + IDOR em `invoices`; ausência de UPDATE/DELETE para `authenticated`; `generate_upcoming_invoices`/`close_due_invoices` via RPC, incluindo idempotência; `get_credit_cards_available_limit` escopado por usuário) — PASS. `supabase/functions/invoice-close/lib.test.ts` (8 casos, `deno test`) — PASS; `deno check`/`deno lint` limpos. **Regressão completa revalidada**: 15/15 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, `BE-F2-01`, `BE-F2-02`) PASS, sem resíduo (contagem de `credit_cards`/`invoices`/`transactions` = 0, `profiles`/`auth.users` = 1, idênticos ao estado anterior). Contrato publicado em `API-CONTRACT.yaml` v0.9.0 (`Invoice`, `/invoices`, `/rpc/get_credit_cards_available_limit`, `Transaction.card_invoice_id` marcado `readOnly`). **Fora de escopo desta tarefa** (RF-F2-05 AC1 completo — soma de parcelas/recorrências na projeção — fica para `BE-F2-04`/`BE-F2-05`, ainda não implementadas; indicação visual de fatura aberta/fechada é `FE-F2-02`) | Cartão & Fatura |
| BE-F2-03 | Modelo de dados de recorrência (`recurring_template`) + Edge Function de geração mensal agendada via `pg_cron` | Backend | RF-F2-02 AC1 | Lançamento correspondente é gerado automaticamente em cada mês subsequente, sem ação manual | 2 dias | **Concluída — 2026-09-03.** `DIR-33` executado primeiro: `supabase functions list` não mostrou function de recorrência pré-existente — implementação nova. **Migrations** `20260903150000_be_f2_03_recurring_templates.sql` + `20260903160000_be_f2_03_recurring_generate_cron.sql` (down em `supabase/migrations_down/`, DIR-04). `public.recurring_templates` criada (RLS + gate MFA, CRUD completo — `end_date` cobre RF-F2-02 AC2 "encerrar a partir de um mês"; sem tarefa de CRUD separada, mesmo padrão de `Budget`/`BE-M-01`); `EXISTS` de ownership em `category_id`/`account_id`/`payment_method_id` no INSERT/UPDATE (mesma extensão transparente IDOR-safe de `BE-F2-01`/`BE-F2-02`/`BE-M-13`). FK `transactions.recurring_rule_id -> recurring_templates.id` com **`ON DELETE SET NULL`** (nunca CASCADE — RN-07/DIR-05: excluir/encerrar template preserva o lançamento já gerado, só desfaz o vínculo). **Geração (RF-F2-02 AC1)**: `recurring_template_generation_date` (clamp de dia do mês ao último dia — mesmo princípio de `credit_card_effective_closing_date`/BE-F2-02, função própria por bounded context, DIR-09) + `generate_recurring_transactions` (SECURITY DEFINER, itera template de todos os usuários, idempotente por competência via `recurring_rule_id`+mês, cada template isolado em bloco próprio de exceção para 1 falha não bloquear os demais). Simplificação deliberada e documentada: só considera a competência corrente, sem backfill retroativo de meses perdidos por falha de agendamento (não é requisito desta tarefa). Insert do lançamento passa pelos triggers já existentes de `transactions` (`BE-M-06`/`BE-F2-02`) automaticamente — inclusive `transactions_assign_card_invoice`, se a recorrência usar forma de pagamento de cartão. **Edge Function `recurring-generate`** (`supabase/functions/recurring-generate/`) deployada (`--no-verify-jwt`) e agendada via `pg_cron`/`pg_net` (`trigger_recurring_generate`, diária às 05:00 UTC — backup 03:00, invoice-close 04:00, sem concorrência — mesmo padrão de `BE-M-10`/`BE-F2-02`). Segredo (`RECURRING_GENERATE_CRON_SECRET`) gerado internamente e configurado via `supabase secrets set --env-file` + `vault.create_secret` (DIR-30). **Smoke test real ponta a ponta**: segredo incorreto → 401; correto → 200 `{ok:true,transactions_generated}`; `select public.trigger_recurring_generate()` confirmado em `net._http_response` com `status_code=200` — mecanismo `pg_cron → pg_net → Edge Function → RPC` comprovado funcionando. Testes: `supabase/tests/be_f2_03_recurring_templates.test.sql` (função pura com clamp; geração ponta a ponta incluindo idempotência; janela `start_date`/`end_date`; RN-07 — DELETE do template preserva o lançamento, `recurring_rule_id` vira NULL; isolamento cross-user + IDOR na criação do template) — PASS. `supabase/functions/recurring-generate/lib.test.ts` (8 casos, `deno test`) — PASS; `deno check`/`deno lint` limpos. **Regressão completa revalidada**: 17/17 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, `BE-F2-01`, `BE-F2-02`, `BE-F2-03`) PASS, sem resíduo (contagem de `recurring_templates`/`credit_cards`/`invoices`/`transactions` = 0, `profiles`/`auth.users` = 1, idênticos ao estado anterior). Contrato publicado em `API-CONTRACT.yaml` v0.10.0 (`RecurringTemplate`, `/recurring_templates`, `Transaction.recurring_rule_id` marcado `readOnly`). **Fora de escopo desta tarefa** (fica para `BE-F2-04`): reajuste prospectivo de valor com histórico preservado (SDD.md Seção 5.2 "histórico de reajuste") | Recorrência & Parcelamento |
| BE-F2-04 | Reajuste de valor de recorrência: aplicação prospectiva a partir de competência escolhida, histórico de reajuste preservado | Backend | RF-F2-03 AC1-3, RN-02, FL-03 | Novo valor só afeta lançamentos futuros a partir da competência escolhida; lançamentos já gerados permanecem com valor antigo (AC2) | 1 dia | **Concluída — 2026-09-03.** Sem Edge Function nova (diferente de BE-F2-02/03 — só modelagem + RLS + função de resolução; `DIR-33` não se aplica). Migration `20260903170000_be_f2_04_recurring_template_adjustments.sql` (down em `supabase/migrations_down/`, DIR-04). **Desenho**: `recurring_templates.amount_cents` vira só o valor ORIGINAL, **imutável após a criação** (novo trigger `recurring_templates_before_update_reject_amount_change` bloqueia qualquer UPDATE direto — só assim "a partir de qual competência" fica expressável; AC1/AC2 não são satisfazíveis por uma UPDATE simples). Nova tabela `recurring_template_adjustments` (RLS + gate MFA + `EXISTS` de ownership de `recurring_template_id`, mesma extensão IDOR-safe de `BE-M-13`/`BE-F2-01/02/03`) é o histórico: 1 linha = "a partir desta competência, o valor passa a ser este"; `UNIQUE (recurring_template_id, effective_from)` — só 1 reajuste por competência; trigger `recurring_template_adjustments_enforce_prospective` rejeita `effective_from` retroativo (RN-02 — não dá pra expressar via CHECK porque depende de `current_date`, não `IMMUTABLE`). **Núcleo (DIR-06, "uma função só")**: `recurring_template_amount_for(template, competencia)` — reajuste mais recente com `effective_from <= competencia` por ordem de **vigência, não de inserção** (testado explicitamente cadastrando reajustes fora de ordem cronológica), senão o valor original. `generate_recurring_transactions` (BE-F2-03) alterada via `CREATE OR REPLACE` (mesmo precedente de `BE-M-13`) para resolver o valor por essa função em vez de ler `amount_cents` bruto — cobre RN-02 nas duas direções: reajuste já vigente É usado; reajuste futuro não "vaza" pro lançamento gerado antes da competência escolhida. Teste `supabase/tests/be_f2_04_recurring_template_adjustments.test.sql`: resolução com múltiplos reajustes fora de ordem; imutabilidade de `amount_cents` (outras colunas seguem editáveis); reajuste retroativo rejeitado; geração ponta a ponta nos 3 cenários (sem reajuste, reajuste já vigente, reajuste futuro que não deve vazar); isolamento cross-user + IDOR + unicidade — PASS. **Regressão completa revalidada**: 18/18 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, `BE-F2-01` a `BE-F2-04`) PASS, sem resíduo. Contrato publicado em `API-CONTRACT.yaml` v0.11.0 (`RecurringTemplateAdjustment`, `/recurring_template_adjustments`; `RecurringTemplate.amount_cents` documentado como imutável — breaking change pontual sem impacto real, nenhum client ainda consome `PATCH amount_cents`, `FE-F2-04` não implementado). **Fora de escopo** (Frontend, `FE-F2-04`): a confirmação explícita "a partir de qual competência" (AC1) e o fluxo de cancelar sem aplicar (AC3) são responsabilidade do client — o backend só garante que, uma vez confirmado, o reajuste é sempre prospectivo e nunca retroativo | Recorrência & Parcelamento |
| BE-F2-05 | Modelo de dados de parcelamento (`installment_purchase`) + geração de parcela por fatura até quitação | Backend | RF-F2-04 AC1-2 | Contador "parcela X de N" corresponde exatamente às parcelas geradas até o momento (AC2) | 1.5 dia | **Concluída — 2026-09-03.** Sem Edge Function/pg_cron novo — decisão deliberada de reaproveitar o job diário já agendado em `BE-F2-03` (`recurring-generate`/`be-f2-03-recurring-generate`): Recorrência e Parcelamento são o mesmo bounded context/Lote neste `TASK.md` (Seção 6.3, DIR-09), duplicar Edge Function/cron/secret/Vault pra mesma cadência violaria DIR-06 ("não duplicada"). Migration `20260903180000_be_f2_05_installment_purchases.sql` (down em `supabase/migrations_down/`, DIR-04). `public.installment_purchases` criada (RLS + gate MFA + `EXISTS` de ownership em `category_id`/`account_id`/`payment_method_id`, mesma extensão IDOR-safe de `BE-M-13`/`BE-F2-01/02/03/04`); trigger exige `payment_method_id` do tipo `credit_card` (RF-F2-04 é "no cartão"); trigger trava `total_amount_cents`/`installments_count`/`purchase_date`/`payment_method_id` assim que a 1ª parcela já foi gerada (mesmo racional de imutabilidade de `BE-F2-04`, agora por integridade de sequência, não de competência — `description`/`category_id`/`account_id` seguem sempre editáveis). FK `transactions.installment_plan_id -> installment_purchases.id` com **`ON DELETE SET NULL`** (RN-07 — o PRD-TECNICO.md cita literalmente "template de recorrência OU parcelamento", mesma regra de `BE-F2-03`). **Núcleo (DIR-06)**: `installment_amount_for` (divisão inteira do total pelas parcelas, resto absorvido pela ÚLTIMA — soma exata, testado); `generate_installment_transactions` (SECURITY DEFINER, reaproveita `credit_card_invoice_competencia` de `BE-F2-02` — competência-alvo da parcela N = competência da compra + (N-1) meses; parcela 1 datada na data real da compra, parcelas seguintes no 1º dia da própria competência-alvo, garantindo por construção que `transactions_assign_card_invoice` resolva exatamente a mesma competência já calculada aqui, sem risco de divergência entre os 2 cálculos independentes) — diferente da simplificação de `BE-F2-03` (só mês corrente), aqui o loop cobre catch-up de MÚLTIPLAS parcelas atrasadas no mesmo run (total é fixo, não pode "pular" parcela). `get_installment_purchases_progress` (RF-F2-04 AC2, RLS escopa ao usuário). `supabase/functions/recurring-generate/index.ts` atualizado para também chamar `generate_installment_transactions` (mesmo segredo/cron já existente — nenhum secret/Vault novo) e redeployado; `lib.ts`/`lib.test.ts` ajustados (8/8 `deno test`, `deno check`/`deno lint` limpos). **Smoke test real**: segredo correto → 200 `{ok:true,recurring_transactions_generated,installment_transactions_generated}`. Teste `supabase/tests/be_f2_05_installment_purchases.test.sql`: `installment_amount_for` (resto exato); forma de pagamento não-cartão rejeitada; geração simples (1 de 2) e catch-up (compra de 3 meses atrás, 5 parcelas → 4 geradas num único run, 5ª ainda não devida, idempotência confirmada); datas de parcela 1 vs. parcelas seguintes; `get_installment_purchases_progress` (4 geradas/1 restante, sem vazar plano de outro usuário); trava de campos após 1ª geração (plano sem parcela gerada ainda continua 100% editável); RN-07 (DELETE preserva parcela, `installment_plan_id` vira NULL); isolamento cross-user + IDOR — PASS. **Regressão completa revalidada**: 19/19 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, `BE-F2-01` a `BE-F2-05`) PASS, sem resíduo. Contrato publicado em `API-CONTRACT.yaml` v0.12.0 (`InstallmentPurchase`, `/installment_purchases`, `/rpc/get_installment_purchases_progress`, `Transaction.installment_plan_id`/`installment_number` marcados `readOnly`) | Recorrência & Parcelamento |
| BE-F2-06 | Modelo de dados de contas fixas (`fixed_bill`) + Edge Function de geração de lançamento previsto por competência | Backend | RF-F2-06 AC1-2 | Lançamento previsto (pendente) é gerado para cada competência; marcar como paga converte para efetivado, refletido no saldo (AC2) | 1.5 dia | **Concluída — 2026-09-03.** `DIR-33` executado primeiro: `supabase functions list` não mostrou function de conta fixa pré-existente — implementação nova. **Diferente de BE-F2-05** (que reaproveitou o job de `BE-F2-03`): Contas Fixas é um Lote/bounded context PRÓPRIO no `TASK.md` (Seção 6.3), então Edge Function/cron/secret/Vault são inteiramente separados, consistente com o próprio racional de reuso usado em `BE-F2-05` (reusar só dentro do mesmo Lote). Migrations `20260903190000_be_f2_06_fixed_bills.sql` + `20260903200000_be_f2_06_fixed_bill_generate_cron.sql` (down em `supabase/migrations_down/`, DIR-04). `public.fixed_bills` criada (RLS + gate MFA + `EXISTS` de ownership em `category_id`/`account_id`/`payment_method_id`, mesma extensão IDOR-safe já usada em todas as tabelas novas de Fase 2). **Achado de desenho relevante**: `transactions.fixed_bill_id` é coluna **nova** (`ALTER TABLE ADD COLUMN`) — diferente de `recurring_rule_id`/`installment_plan_id`/`card_invoice_id`, que já existiam antecipadas desde a Fase 1, não há equivalente para conta fixa no schema legado. **Segundo achado, mais importante**: nenhum código novo foi necessário para AC2 ("marcar como paga... refletido no saldo") — já coberto por 2 mecanismos existentes desde o MVP: `transactions_maintain_account_balance` já aplica o efeito no saldo imediatamente na criação, independente do status (achado original de `BE-M-00`/`BE-M-06`); `transactions_set_status` só roda no INSERT, então `PATCH /transactions?id=eq.{id}` com `status=cleared` já funciona como "marcar como paga" sem qualquer trigger/coluna nova — **provado no teste automatizado**, não só documentado. **Geração (AC1)**: `fixed_bill_generation_date` (clamp de dia do mês, função própria por bounded context) + `generate_fixed_bill_transactions` (SECURITY DEFINER) — diferente de `RecurringTemplate` (que só gera quando o dia chega), conta fixa gera assim que a competência COMEÇA, dated no `due_day` (o próprio `transactions_before_insert_set_status` já existente decide `pending` vs `cleared` a partir da data, nenhuma lógica de status nova) — dá margem de antecedência pra `RF-F2-07` (aviso 3 dias antes, ainda não implementado) ter o que avisar. Edge Function `fixed-bill-generate` deployada (`--no-verify-jwt`) e agendada via `pg_cron`/`pg_net` (`trigger_fixed_bill_generate`, diária às 06:00 UTC — backup 03:00, invoice-close 04:00, recurring-generate 05:00, sem concorrência). Segredo (`FIXED_BILL_GENERATE_CRON_SECRET`) gerado internamente e configurado via `supabase secrets set --env-file` + `vault.create_secret` (DIR-30). **Smoke test real ponta a ponta**: segredo incorreto → 401; correto → 200 `{ok:true,transactions_generated}`; `select public.trigger_fixed_bill_generate()` confirmado em `net._http_response` com `status_code=200`. Teste `supabase/tests/be_f2_06_fixed_bills.test.sql`: função pura com clamp; geração ponta a ponta com verificação de coerência status↔data (regra herdada, não reimplementada) + idempotência; janela `start_date`/`end_date`; **AC2 provado via UPDATE real de status**; RN-07 (DELETE preserva o lançamento, `fixed_bill_id` vira NULL — mesmo espírito de `RecurringTemplate`/`InstallmentPurchase`, embora RN-07 não enumere FixedBill literalmente no PRD-TECNICO.md); isolamento cross-user + IDOR — PASS. **Regressão completa revalidada**: 20/20 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, `BE-F2-01` a `BE-F2-06`) PASS, sem resíduo. `supabase/functions/fixed-bill-generate/lib.test.ts` (8 casos, `deno test`) — PASS; `deno check`/`deno lint` limpos. Contrato publicado em `API-CONTRACT.yaml` v0.13.0 (`FixedBill`, `/fixed_bills`, `Transaction.fixed_bill_id` marcado `readOnly`, nota explícita de que "marcar como paga" reaproveita o contrato existente de `/transactions`) | Contas Fixas |
| BE-F2-07 | Edge Function: aviso de conta fixa a vencer (RN-05, 3 dias corridos configurável) + disparo de Web Push | Backend | RF-F2-07 AC1-2, RN-05 | Notificação de aviso é emitida quando faltam N dias configurados; conta não paga até o vencimento é sinalizada como vencida (AC2) | 1.5 dia | **Concluída — 2026-09-03**, na sequência de `BE-F2-09` (pré-requisito real desta tarefa, ver nota de inversão de ordem em `BE-F2-09`). Sem Edge Function própria — diferente do texto literal da tarefa, o disparo de push é 100% delegado a `notify_user()`/`push-dispatch` (`BE-F2-09`, já existentes); esta tarefa só decide QUANDO avisar (SQL puro). Migration `20260903230000_be_f2_07_fixed_bill_due_alerts.sql` (down em `supabase/migrations_down/`, DIR-04). **RN-05**: `fixed_bills.alert_days_before` (nova coluna, default 3, configurável por conta fixa conforme o próprio `PRD-TECNICO.md`). **Achado de desenho crítico pra AC2** ("sinalizar como vencida"): o job legado `fn_clear_due_transactions` (a cada 15min, `F1-BE-09`) promovia QUALQUER lançamento `pending`→`cleared` assim que a data passava, indiscriminadamente — para lançamento de conta fixa isso colidiria com o significado de "cleared" usado pela AC2 de `BE-F2-06` ("marcar como paga"), tornando "vencida" e "paga" indistinguíveis (as duas `cleared`). Corrigido via `CREATE OR REPLACE` (mesmo precedente de `BE-M-13`/`BE-F2-04`): a promoção automática agora exclui `fixed_bill_id IS NOT NULL` — essas só viram `cleared` por ação explícita do usuário. "Vencida" fica então **derivável sem estado novo**: `status=pending AND transaction_date < hoje`, exposto via `get_fixed_bills_status()` (RLS escopa ao usuário). `check_fixed_bill_due_alerts()` (SECURITY DEFINER) dispara `notify_user()` quando falta `<= alert_days_before` dias pro vencimento de um lançamento ainda `pending`, 1x por (conta fixa, competência) — agendada via `cron.schedule` direto (`select public.check_fixed_bill_due_alerts();`, 06:30 UTC, depois do `fixed-bill-generate` das 06:00) — sem Edge Function/secret/Vault novos, só a checagem SQL que já reaproveita o `notify_user()` de `BE-F2-09`. Teste `supabase/tests/be_f2_07_fixed_bill_due_alerts.test.sql`: `fn_clear_due_transactions` não promove lançamento de conta fixa vencido (mas CONTINUA promovendo lançamento comum — regressão confirmada); `get_fixed_bills_status` deriva `is_overdue` corretamente, inclusive voltando a `false` ao marcar como paga mesmo com data passada; aviso dispara dentro da janela, não dispara fora dela nem se já paga adiantado, dedup confirmado — PASS. **Regressão completa revalidada**: 21/21 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, `BE-F2-01` a `BE-F2-07`, `BE-F2-09`) PASS, sem resíduo. Contrato publicado em `API-CONTRACT.yaml` v0.15.0 (`FixedBill.alert_days_before`, `/rpc/get_fixed_bills_status`) | Contas Fixas |
| BE-F2-08 | Modelo de dados de metas (`goal`, `contribution`) + cálculo de percentual de progresso | Backend | RF-F2-08 AC1-2 | Progresso é recalculado a cada aporte vinculado | 1 dia | **Concluída — 2026-09-03.** Migration `supabase/migrations/20260903240000_be_f2_08_goals.sql` aplicada via `supabase db push --linked` (down em `supabase/migrations_down/`, DIR-04). Sem Edge Function nova (mesma categoria de BE-F2-04/BE-M-08 — só modelagem + RLS + 1 RPC de leitura agregada, DIR-33 não se aplica). `public.goals` (RLS + policies `auth.uid() = user_id` + gate MFA, mesma consistência já aplicada a toda tabela financeira nova de Fase 2, DIR-27) com `target_amount_cents` (CHECK > 0) e `target_date` nullable; `is_active` (default `true`) é campo físico não listado no modelo lógico do SDD (delegado ao Backend, SDD.md Seção 5 "modelo lógico, não modelagem física") — necessário porque AC2 fala em "progresso de cada meta ATIVA", pressupondo o conceito. `public.contributions` (RLS + gate MFA + `EXISTS` de ownership de `goal_id`, mesma extensão IDOR-safe já usada em toda tabela nova de Fase 2 desde `BE-M-13`/G-19) com `amount_cents` (CHECK > 0); `ON DELETE CASCADE` em `goal_id` (diferente de RN-07/`transactions.*_id`, que usam `SET NULL`) — decisão deliberada e documentada: aporte não é um `Transaction` do ledger (SDD.md Seção 5.2 não lista coluna antecipatória em `transactions` para Contribution, diferente de RecurringTemplate/InstallmentPurchase/Invoice/FixedBill; UX-FL-15/S-GOAL-03 trata "registrar aporte" como ação própria da tela de metas, não um lançamento), então não há regra de preservação histórica equivalente a RN-07 para justificar `SET NULL`. **Núcleo (DIR-06, "uma função só")**: `get_goals_progress()` soma `contributions.amount_cents` por meta **ao vivo, a cada chamada** — nenhuma coluna denormalizada/cacheada em `goals` — satisfazendo por construção o critério de aceite literal ("recalculado a cada aporte vinculado", seja inserindo, editando ou removendo um aporte); `pct_progress` sem clamp em 100% quando a meta é superada (valor real é mais informativo). Teste `supabase/tests/be_f2_08_goals.test.sql` (RLS real via `SET LOCAL ROLE authenticated` + JWT simulado, mesmo padrão de `BE-F2-01` a `BE-F2-07`): constraints físicas (`target_amount_cents`/`amount_cents > 0`); progresso incremental (0 aportes → 0%; 1º aporte → 30%; 2º aporte → 120%, meta superada sem clamp; remover o 2º aporte → volta a 30%, cobrindo os 3 gatilhos de recálculo, não só inserção); `is_active` default `true` e editável (arquivar sem excluir); isolamento cross-user (`SELECT` em meta/RPC de outro usuário); IDOR tanto no `INSERT` de aporte referenciando meta de outro usuário quanto no `UPDATE` tentando redirecionar `goal_id`; fluxo legítimo sem regressão. Todos os casos PASS, sem resíduo (contagem de `goals`/`contributions` = 0 após `ROLLBACK`). Contrato publicado em `API-CONTRACT.yaml` v0.16.0 (`Goal`, `Contribution`, `/goals`, `/contributions`, `/rpc/get_goals_progress`). **Regressão completa revalidada**: 23/23 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, `BE-F2-01` a `BE-F2-10`) PASS, sem resíduo (contagem de todas as tabelas reais idêntica antes/depois: 1 profile, 1 `auth.users`, 1 `allowed_signup_emails`, 0 em `goals`/`contributions`) | Metas |
| BE-F2-09 | Infraestrutura de notificações unificada: tabela `notification`, mecanismo único (Web Push VAPID) centralizando orçamento (RF-MVP-07) e conta fixa (RF-F2-07), sem lógica de disparo duplicada | Backend | RF-F2-09 AC1-2 | Um único ponto de código dispara push para os dois gatilhos; histórico de notificação é consultável independentemente de o push ter sido entregue (AC2) | 1.5 dia | **Concluída — 2026-09-03, executada FORA da ordem impressa nesta tabela** (antes de `BE-F2-07`, ainda não iniciada neste momento) — a própria tabela de dependências do `PRD-TECNICO.md` ("RF-F2-07 depende de RF-F2-06, **RF-F2-09**") exige que a infraestrutura compartilhada de notificação exista antes do aviso de conta fixa, senão `BE-F2-07` reimplementaria disparo por conta própria, violando o AC1 desta própria tarefa ("sem duplicar lógica de disparo"). Inversão de ordem documentada, não uma divergência silenciosa. Migration `20260903210000_be_f2_09_notifications.sql` (down em `supabase/migrations_down/`, DIR-04). `public.push_subscriptions` criada (entidade companheira de Notification, não modelada no SDD.md Seção 5.2 — decisão física do Backend, Web Push exige guardar endpoint/chaves por dispositivo) com RLS padrão (sem gate de MFA — inscrição de push não é dado financeiro). `public.notifications` (RF-F2-09, SDD.md Seção 5.2, entidade ausente nº 9): RLS só permite SELECT/UPDATE (marcar como lida) para `authenticated` — **nenhuma policy de INSERT**, client nunca cria notificação diretamente, só `notify_user()`. **Núcleo (DIR-06, "um único ponto de código")**: `notify_user()` (SECURITY DEFINER) persiste a notificação (AC2, histórico independente de push) e aciona a Edge Function `push-dispatch` via `pg_net` — chamada por `check_budget_alerts()` (RF-MVP-07/RN-04, nesta migration, cadência diária) e por `check_fixed_bill_due_alerts()` (RF-F2-07, `BE-F2-07`, a seguir); nenhum dos dois fala com `push_subscriptions`/Web Push diretamente. `check_budget_alerts()` replica o cálculo de `get_budget_status` (`BE-M-08`) mas sem o filtro `auth.uid()` daquela função (que zeraria o resultado num job SECURITY DEFINER sem sessão) — não é duplicação de "lógica de disparo" (o disparo em si é só `notify_user()`), mesmo padrão já usado em `generate_upcoming_invoices`/etc.; dedup por `(budget, nível)` via `related_entity_type` (`budget_warning`/`budget_exceeded`) permite escalar de aviso pra estouro sem alertar 2x no mesmo nível. **Edge Function `push-dispatch`** (`supabase/functions/push-dispatch/`) usa `npm:web-push` (RFC 8291/8292 — JWT VAPID + criptografia `aes128gcm` do payload; preferido a reimplementar a criptografia à mão, diferente de `backup-export`, que usa Web Crypto direto pra AES-GCM simples — o formato Web Push tem superfície de erro sutil demais pra valer o hand-roll) — deployada (`--no-verify-jwt`), **chamada sob demanda por `notify_user()` via `pg_net`, não é um job `pg_cron`** (não tem agendamento próprio). Trata subscription expirada (404/410) removendo a linha (higiene padrão de Web Push); demais erros logados sem interromper as demais inscrições. Segredo de cron (`PUSH_DISPATCH_CRON_SECRET`) e **par de chaves VAPID reais** (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, EC P-256 gerado nesta sessão via Node `crypto`, formato compatível com `web-push`; `VAPID_SUBJECT` placeholder `mailto:suporte@mymoney.app` — sem inbox real monitorada ainda, mesma categoria de ressalva não-bloqueante já usada para `BACKUP_S3_*`/Auth Hook em `BE-M-10`/`BE-M-09`) configurados via `supabase secrets set --env-file` + `vault.create_secret` (DIR-30). **Smoke test real ponta a ponta**: `select public.notify_user(...)` disparou a cadeia completa `notify_user → pg_net → push-dispatch → Postgres` de verdade — `net._http_response` confirmou `status_code=200` com `{"ok":true,"subscriptions_total":0,"sent":0,"expired_removed":0,"failed":0}` (0 porque não há inscrição real nesta sessão — `FE-F2-09`, ainda não implementado, é quem chama `PushManager.subscribe()`); linha de teste removida após confirmação. Segredo incorreto → 401. `supabase/functions/push-dispatch/lib.test.ts` (7 casos, `deno test`) — PASS; `deno check`/`deno lint` limpos; `npm:web-push` confirmado carregando corretamente sob Deno antes de escrever o código real. Teste `supabase/tests/be_f2_09_notifications.test.sql`: CRUD e isolamento cross-user de `push_subscriptions`; `notifications` rejeita INSERT direto do client, aceita UPDATE (marcar como lida) e isola por usuário; `notify_user()` persiste com os campos corretos; `check_budget_alerts()` dispara em 80% (warning), dedup confirmado (2ª chamada no mesmo nível não duplica), escala corretamente pra `exceeded` (nível/notificação distintos) ao passar de 100% — PASS. **Regressão completa revalidada**: 19/19 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, `BE-F2-01` a `BE-F2-06`, `BE-F2-09`) PASS, sem resíduo. Contrato publicado em `API-CONTRACT.yaml` v0.14.0 (`PushSubscription`, `Notification`, `/push_subscriptions`, `/notifications`) | Notificações & Configurações |
| BE-F2-10 | Query de relatório comparativo entradas x saídas, últimos 6 meses (ou menos, sem preencher com zero) | Backend | RF-F2-10 AC1-2 | Com menos de 6 meses de dado, resposta traz só os meses disponíveis, nunca zero para mês inexistente (AC2) | 1 dia | **Concluída — 2026-09-03.** Migration `supabase/migrations/20260903250000_be_f2_10_income_expense_report.sql` aplicada via `supabase db push --linked` (down em `supabase/migrations_down/`, DIR-04). Sem tabela nova, sem Edge Function (DIR-33 não se aplica) — só 1 RPC de leitura agregada sobre `transactions`, já existente e RLS-protegida (mesma categoria de `get_month_provision`/`get_budget_status`/`get_monthly_category_summary`, todas `SECURITY INVOKER`, escopadas por `auth.uid()` dentro da própria query, sem tabela/policy nova a criar). **Núcleo**: `get_income_expense_report()` — janela fixa (mês corrente + 5 anteriores, `America/Sao_Paulo`, mesmo fuso de `get_month_provision`/`get_month_transaction_count`), `GROUP BY` mês só produz linha para mês com ao menos 1 lançamento `kind != transfer` no período — **nenhum mês é fabricado com zero por construção** (AC2): não há como esta query gerar uma linha para um mês sem lançamento real, é uma propriedade estrutural da consulta, não uma checagem condicional que poderia ter uma lacuna. `kind = 'transfer'` excluído, mesmo critério de `get_monthly_category_summary` (legado/BE-M-07) — movimentação interna entre contas não é entrada nem saída; `status` (pending/cleared) não é filtrado, mesmo critério daquela função. Teste `supabase/tests/be_f2_10_income_expense_report.test.sql` (RLS real via `SET LOCAL ROLE authenticated` + JWT simulado): mês corrente reflete o lançamento inserido por **comparação de delta** contra baseline (não valor absoluto — o profile real pode já ter dado pré-existente no mês corrente, mesmo cuidado já usado em `BE-M-07`); lançamento de 7 meses atrás **não aparece** no relatório mesmo existindo de fato na tabela (prova da janela fixa de 6 meses, AC1); asserção estrutural direta de que nenhuma linha retornada tem `income_cents = 0 AND expense_cents = 0` (prova positiva de AC2, não apenas ausência de contra-exemplo); nunca mais de 6 linhas retornadas; isolamento cross-user (lançamento de outro usuário não vaza pro relatório, comparação de delta antes/depois do insert de B). Todos os casos PASS, sem resíduo. Contrato publicado em `API-CONTRACT.yaml` v0.17.0 (`/rpc/get_income_expense_report`). **Regressão completa revalidada**: 23/23 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, `BE-F2-01` a `BE-F2-10`) PASS, sem resíduo | Relatórios (Fase 2) |

#### Frontend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status | Lote |
|---|---|---|---|---|---|---|---|
| FE-F2-01 | Telas de cartão: S-CARD-01/02 | Frontend | UX-FL-12 | Cartão cadastrado exibe limite, dia de fechamento, dia de vencimento | 1 dia | **Concluída — 2026-09-03.** `frontend/src/pages/creditCards/CreditCardsPage.tsx` (S-CARD-01/02, Padrão A) contra `/credit_cards` real (`BE-F2-01`, `API-CONTRACT.yaml` v0.8.0) via `frontend/src/lib/api/creditCards.ts` (`@supabase/supabase-js`/PostgREST, sem mock no caminho de produção). Cartão cadastrado exibe limite/dia de fechamento/dia de vencimento na lista e no formulário; formulário valida os 4 campos obrigatórios (nome, limite > 0, dia de fechamento/vencimento 1–31) antes do submit, refletindo os `CHECK` do backend. `updateCreditCard` permite editar; exclusão delegada ao 409 documentado (fatura/lançamento vinculado) tratado como `ApiError.kind === "conflict"`. Estados vazio (`EmptyState` + CTA)/carregando (`Skeleton`)/erro (`Alert`)/sucesso implementados. Acessibilidade: `Input`/`Select` já WCAG AA (label associado, `aria-invalid`/`aria-describedby`), sem elemento novo fora do design system. Testes: `frontend/src/pages/creditCards/CreditCardsPage.test.tsx` (4 casos — vazio, lista com limite/dia, criação) — todos PASS | Cartão & Fatura |
| FE-F2-02 | Fatura projetada: S-CARD-03 (`InvoiceTimeline`, abas atual+2 futuras) | Frontend | UX-FL-02, DIR-13 | Limite disponível sempre visível (RN-06); badge aberta/fechada por aba (RF-F2-05 AC3) | 2 dias | **Concluída — 2026-09-03.** `frontend/src/components/domain/InvoiceTimeline.tsx` (novo componente de domínio, `Tabs` de `FE-M-01` por baixo) integrado a `CreditCardsPage` (toque num cartão abre o detalhe S-CARD-03). Consome `/invoices` real (`BE-F2-02`, v0.9.0, via `listInvoicesByCard`) e `/rpc/get_credit_cards_available_limit` (RN-06, via `getCreditCardsAvailableLimit`) — "Limite disponível" fica no topo da tela, fora das abas, sempre visível independente da aba ativa. **DIR-13 (horizonte fixo, sem paginação)**: o componente filtra `invoices` para `competencia >= mês corrente`, ordena e corta em `.slice(0, 3)` — nunca renderiza mais de 3 abas mesmo que o backend devolva fatura antiga adicional (`GET /invoices` documentado: "mais o que já existir de anteriores"); testado explicitamente com 5 faturas no mock, resultado sempre 3 `role="tab"`. Badge aberta/fechada por aba vem direto de `Invoice.status` (nunca recalculado no client, DIR-06) — `close_due_invoices` no backend é quem decide. Total por aba soma só `Transaction.card_invoice_id === invoice.id` daquela competência; lista de lançamentos da fatura junto. Estados vazio ("Nenhuma fatura projetada ainda")/carregando/erro/sucesso. Testes: `frontend/src/components/domain/InvoiceTimeline.test.tsx` (3 casos — máx. 3 abas/DIR-13, badge por status, soma por fatura) + 2 casos em `CreditCardsPage.test.tsx` (limite sempre visível, abertura da fatura atual) — todos PASS | Cartão & Fatura |
| FE-F2-03 | Compra parcelada: S-INST-01/02 (`InstallmentProgress`) | Frontend | UX-FL-12 | "Parcela X de N" exibido, não é `ProgressBar` percentual genérico | 1.5 dia | **Concluída — 2026-09-03.** `frontend/src/components/domain/InstallmentProgress.tsx` (componente novo, distinto de `ProgressBar` — sem `BudgetAlertLevel`, texto literal "Parcela X de N" como `aria-valuetext`, nunca um percentual isolado) usado por `frontend/src/pages/installments/InstallmentsPage.tsx` (S-INST-01/02). Consome `/installment_purchases` (CRUD) + `/rpc/get_installment_purchases_progress` (RF-F2-04 AC2) reais (`BE-F2-05`, `API-CONTRACT.yaml` v0.12.0) via `frontend/src/lib/api/recurring.ts` — `generated_count`/`installments_count` vêm prontos do servidor, nunca recalculados no client (DIR-06). Formulário de nova compra parcelada exige forma de pagamento `type=credit_card` (select filtrado só a formas derivadas de cartão, `CategoryPicker`/`CurrencyInput` reaproveitados do MVP); botão "+ Nova compra parcelada" desabilitado com aviso quando nenhum cartão existe ainda (evita erro 400 do backend por forma de pagamento errada). Estados vazio/carregando/erro/sucesso. Teste crítico do AC literal: `frontend/src/pages/installments/InstallmentsPage.test.tsx` confirma que o texto "Parcela 4 de 12" aparece e que nenhum "33%" (percentual) aparece na tela — 2/2 casos PASS | Recorrência & Parcelamento |
| FE-F2-04 | Recorrência: S-REC-01/02/03/04 (criação, reajuste com confirmação de competência, encerramento) | Frontend | UX-FL-03, UX-FL-13, FL-03 | Reajuste exige confirmação explícita "a partir de qual competência" antes de aplicar (RF-F2-03 AC1) | 2.5 dias | **Concluída — 2026-09-03.** `frontend/src/pages/recurring/RecurringPage.tsx` (S-REC-01/02/03/04) contra `/recurring_templates` (v0.10.0) + `/recurring_template_adjustments` (v0.11.0) reais via `frontend/src/lib/api/recurring.ts` — `updateRecurringTemplate` tipado (`Partial<Omit<NewRecurringTemplate,"amount_cents">>`) para nunca sequer permitir, em tempo de compilação, tentar `PATCH amount_cents` (imutável, `BE-F2-04`); reajuste é sempre `POST /recurring_template_adjustments`. **AC crítico (RF-F2-03 AC1)**: S-REC-03 implementado em 2 passos reais — passo 1 (`Modal` "Reajustar valor": novo valor + `Select` de competência, texto "Lançamentos já gerados em meses anteriores não mudam") só habilita "Continuar"; passo 2 é um `ConfirmationDialog` separado ("Confirmar reajuste") que repete valor+competência+aviso RN-02 e só then chama `createRecurringTemplateAdjustment` — nenhum caminho de código chama a API a partir do passo 1. Cancelar em qualquer passo não persiste nada (RF-F2-03 AC3). Competências oferecidas (`upcomingMonthOptions`) começam no mês corrente (nunca uma opção retroativa no `Select`), e o 400 de `effective_from` retroativo do backend (RN-02) ainda é tratado via `ApiError` no passo 2 como cinto-e-suspensório. Encerramento (S-REC-04) usa `PATCH end_date` (nunca `DELETE`), com `ConfirmationDialog` citando RN-07 explicitamente; "Excluir" também disponível (RN-07: lançamentos já gerados preservados, `recurring_rule_id` vira NULL no backend). Testes: `frontend/src/pages/recurring/RecurringPage.test.tsx` (3 casos — a API só é chamada após a confirmação explícita do passo 2; cancelar no passo 1 nunca chama a API; encerrar usa `end_date`, nunca `DELETE`) — todos PASS | Recorrência & Parcelamento |
| FE-F2-05 | Contas fixas: S-FIX-01/02/03 (badge Pendente/Paga/Vencida) | Frontend | UX-FL-14 | Badge de status muda automaticamente para "Vencida" após o vencimento sem pagamento marcado | 1.5 dia | **Concluída — 2026-09-03.** `frontend/src/pages/fixedBills/FixedBillsPage.tsx` (S-FIX-01/02/03) contra `/fixed_bills` (CRUD, v0.13.0) + `/rpc/get_fixed_bills_status` (v0.15.0, `is_overdue` já calculado pelo servidor) via `frontend/src/lib/api/fixedBills.ts`. **AC literal**: badge é derivado só de `FixedBillStatusItem.current_status`/`is_overdue` — nenhuma data é comparada no client (DIR-06): `Paga` (verde + ✓) quando `current_status ∈ {cleared, reconciled}`; `Vencida` (vermelho + ⛔) quando `is_overdue = true` e ainda não paga; `Pendente` (neutro) caso contrário — os 3 estados sempre combinam cor + ícone/texto (nunca só cor, WCAG). "Marcar como paga" reaproveita `PATCH /transactions` (`markTransactionCleared`, nova função em `frontend/src/lib/api/transactions.ts`, DIR-06 — não duplica lógica, só chama o contrato já existente) sobre `current_transaction_id`, exatamente como documentado em `API-CONTRACT.yaml` (não existe endpoint próprio de "pagar" em `fixed_bills`). Formulário permite sobrescrever `alert_days_before` por conta fixa individual (padrão 3, RN-05). Testes: `frontend/src/pages/fixedBills/FixedBillsPage.test.tsx` (4 casos — badge Vencida/Paga/Pendente a partir só do dado do servidor, e "Marcar como paga" chamando o `transaction_id` correto) — todos PASS | Contas Fixas |
| FE-F2-06 | Metas: S-GOAL-01/02/03/04 (`ProgressBar` + lista de aportes) | Frontend | UX-FL-15 | Progresso exibido visualmente e atualizado a cada aporte registrado | 1.5 dia | **Concluída — 2026-09-03.** `frontend/src/pages/goals/GoalsPage.tsx` (S-GOAL-01/02/03/04) contra `/goals` + `/contributions` (CRUD) + `/rpc/get_goals_progress` reais (`BE-F2-08`, `API-CONTRACT.yaml` v0.16.0) via `frontend/src/lib/api/goals.ts`. **Componente novo `frontend/src/components/domain/GoalProgressBar.tsx`** (não o `ProgressBar` de orçamento — aquele é tipado para os 3 níveis de alerta de `BudgetAlertLevel`/RN-04, semântica de "estouro"; meta é "em progresso" vs. "atingida", nunca um erro) — mesma disciplina WCAG de cor+ícone+texto do `ProgressBar` original. **AC literal ("recalculado a cada aporte")**: nenhuma coluna de progresso é cacheada no client — toda mutação de aporte (`createContribution`/`deleteContribution`) é seguida de uma nova chamada a `getGoalsProgress()` (`loadDetail`), nunca de um cálculo local incremental (DIR-06, mesma decisão do backend de recalcular ao vivo). Detalhe da meta (toque no card) mostra `GoalProgressBar` + lista de aportes recentes com opção de remover (recalcula na hora). Estados vazio/carregando/erro/sucesso nas duas telas (lista de metas e detalhe). Testes: `frontend/src/pages/goals/GoalsPage.test.tsx` (3 casos — vazio, progresso vindo do servidor exibido corretamente, e registrar aporte disparando novo fetch de progresso com o valor atualizado) — todos PASS | Metas |
| FE-F2-07 | Notificações: `NotificationBell` + `NotificationCenter` (S-NOT-01/02), wiring de push no client | Frontend | UX-FL-16, DIR-14 | Sino sempre acessível independente de push entregue; toque leva à entidade relacionada (orçamento estourado → S-BUD-01; conta a vencer → S-FIX-01) | 1.5 dia | **Concluída — 2026-09-03.** `frontend/src/components/domain/NotificationBell.tsx` (S-NOT-01/02, `NotificationBell` + `NotificationCenter` no mesmo arquivo — acoplamento 1:1 do contador ao painel) montado em `AppLayout.tsx`, visível em toda tela autenticada (mobile e desktop), independente de menu. Contra `/notifications` (GET/PATCH) + `/push_subscriptions` (POST/DELETE/GET) reais (`BE-F2-09`, `API-CONTRACT.yaml` v0.14.0) via `frontend/src/lib/api/notifications.ts`. **AC "sempre acessível independente de push"**: o contador de não lidas é buscado via `GET /notifications?read_at=is.null` ao montar **e** por polling a cada 60s (`frontend/src/components/domain/NotificationBell.tsx`, `POLL_INTERVAL_MS`) — nunca depende só do evento de push chegar; abrir o sino sempre busca `GET /notifications` fresco. **AC "toque leva à entidade relacionada"**: `routeForNotification()` mapeia `related_entity_type` (`budget_warning`/`budget_exceeded` → `/orcamento`; `fixed_bill` → `/contas-fixas`) — navega via `useNavigate` e marca como lida (`PATCH read_at`) antes de sair da tela. **Wiring de push real** (a lacuna citada na tarefa, "gerando o registro que faltava em BE-F2-09"): `frontend/src/lib/push/subscribe.ts` implementa `subscribeToPush()`/`unsubscribeFromPush()` com `PushManager.subscribe()` + `applicationServerKey` derivada de `VITE_VAPID_PUBLIC_KEY` (`frontend/src/lib/env.ts`, `getVapidPublicKey()`) — variável **já documentada em `DEPLOY.md`** (painel Vercel por ambiente), só não estava sendo lida por nenhum código de client ainda; toda função degrada para `false`/no-op (nunca lança) quando o navegador não suporta Push ou a chave não está configurada, preservando DIR-14 ("push é reforço, nunca única via"). Toggle real em `SettingsPage` (ver `FE-F2-09`). Testes: `frontend/src/components/domain/NotificationBell.test.tsx` (4 casos — contador via fetch ao montar, estado vazio, navegação de notificação de orçamento e de conta fixa, marcando como lida) — todos PASS; `AppLayout.test.tsx` (regressão, MVP) revalidado com o sino agora montado — PASS | Notificações & Configurações |
| FE-F2-08 | Relatório comparativo: S-REP-01 (`BarChart`) | Frontend | UX-FL-17 | Menos de 6 meses de dado exibe nota "Dados disponíveis a partir de [mês]", nunca zero enganoso (RF-F2-10 AC2) | 1.5 dia | **Concluída — 2026-09-03.** `frontend/src/components/domain/BarChart.tsx` (SVG próprio, sem lib externa — mesmo padrão do `DonutChart` do MVP, incluindo toggle "Ver como tabela" para alternativa textual, WCAG/DIR-15) usado por `frontend/src/pages/reports/IncomeExpenseReportPage.tsx` (S-REP-01), contra `/rpc/get_income_expense_report` real (`BE-F2-10`, `API-CONTRACT.yaml` v0.17.0) via `frontend/src/lib/api/reports.ts`. **AC literal (RF-F2-10 AC2)**: o componente **nunca fabrica mês com zero** — itera só `items` (o array que a RPC devolve, que por construção do backend só contém mês com lançamento real); quando `items.length < 6`, exibe a nota "Dados disponíveis a partir de [mês]" citando o primeiro mês real da janela, e quando `items.length === 6` a nota não aparece. Estados vazio ("Sem lançamentos suficientes...")/carregando/erro/sucesso. Testes: `frontend/src/components/domain/BarChart.test.tsx` (4 casos — nota com < 6 meses, ausência da nota com 6 meses, estado vazio, alternativa textual acessível) + `frontend/src/pages/reports/IncomeExpenseReportPage.test.tsx` (2 casos — render a partir da RPC real, estado de erro) — todos PASS | Relatórios (Fase 2) |
| FE-F2-09 | Configurações Fase 2: S-SET-02 (toggles de notificação), S-SET-03 (limiares padrão RN-04/RN-05) | Frontend | UX-FL-20 (parte F2) | Limiar padrão aplica a novos cadastros; cada orçamento/conta fixa individual pode sobrescrever | 1 dia | **Concluída — 2026-09-03, com achado de gap de backend documentado (não bloqueante).** `frontend/src/pages/settings/SettingsPage.tsx` estendida com 2 novos `Card` (S-SET-02/S-SET-03). **S-SET-02 implementado com persistência real**: toggle "Notificações push neste dispositivo" usa `subscribeToPush()`/`unsubscribeFromPush()` (`FE-F2-07`) — estado inicial lido de `getExistingPushSubscription()` (Service Worker real, não um valor fake), desabilitado com texto explícito "Não disponível neste navegador" quando `isPushSupported()` é falso (mesmo padrão de degradação de `S-CAP-01`). **Achado de contrato investigado antes de implementar** (conforme instrução desta rodada — verificado `API-CONTRACT.yaml`/schema de `public.notifications`/`public.check_budget_alerts`/`check_fixed_bill_due_alerts` antes de decidir): **nenhuma tabela/coluna modela preferência de usuário por tipo de notificação** (`budget_alert` vs. `fixed_bill_due`) nem um "limiar padrão global" do usuário — `check_budget_alerts()`/`check_fixed_bill_due_alerts()` disparam incondicionalmente para todo orçamento/conta fixa que cruza o limiar, sem checar preferência alguma; `budget.alert_threshold_pct`/`fixed_bills.alert_days_before` são colunas com `DEFAULT` fixo no schema (80/3), aplicadas automaticamente a todo novo cadastro (isso já satisfaz a parte "aplica a novos cadastros" do AC, sem código de Frontend algum — é comportamento do `DEFAULT` da coluna), e cada orçamento/conta fixa individual já podia sobrescrever esse padrão desde `FE-M-11`/`FE-F2-05` (campo próprio no formulário) — **essa metade do AC já está coberta**. O que **não existe** é uma tela onde o usuário mude o "padrão" em si (ex.: trocar de 80% para 70% como novo default para cadastros futuros) — não há `user_settings`/coluna equivalente para persistir isso. Em vez de simular essa persistência com `localStorage` (que se perderia ao trocar de dispositivo e daria uma falsa sensação de configuração sincronizada, violando a mesma regra de "nunca simular contrato que não existe" aplicada às demais 8 tarefas), a tela documenta o achado textualmente para o usuário (aponta onde o limiar é configurável de fato — formulário de cada orçamento/conta fixa) e para rastreabilidade técnica (nota "Achado (FE-F2-09)" no próprio `Card`, mesmo padrão de nota inline já usado por `FE-M-06`/`FE-M-07`). Nenhum `BLOCKERS.md` aberto — não impede nenhuma outra tarefa, e a funcionalidade real (limiar por item) já funciona. Testes: `frontend/src/pages/settings/SettingsPage.test.tsx` (+3 casos — toggle desabilitado sem suporte a Push em jsdom, nota de DIR-14 visível, achado de S-SET-03 documentado e visível) — todos PASS | Notificações & Configurações |

**Nota de rastreabilidade sobre "Concluída" (FE-F2-01 a FE-F2-09)**: mesmo princípio já registrado para `FE-M-04` a `FE-M-12` — todo o código acima chama os endpoints/RPCs **reais** publicados em `API-CONTRACT.yaml` v0.8.0 a v0.17.0 via `@supabase/supabase-js`/PostgREST (`frontend/src/lib/api/{creditCards,recurring,fixedBills,goals,notifications,reports}.ts`, mais `markTransactionCleared` novo em `transactions.ts`), nenhum mock no caminho de execução em produção — `vi.mock` nos testes automatizados isola unidades para teste determinístico, mesmo princípio dos testes SQL do Backend rodando em transação isolada, não é "mock de contrato". Nesta rodada, o Backend já havia publicado a Fase 2 inteira (`BE-F2-01` a `BE-F2-10`, Concluída) antes do início deste trabalho — não houve ponto de sincronização "implementa contra mock enquanto Backend termina" para nenhuma das 9 tarefas, todas começaram e terminaram direto contra o contrato real. **Evidência desta rodada**: `npx tsc -b` limpo (frontend inteiro, incluindo as 9 tarefas novas); `npm run build` gera bundle de produção válido (`vite build` + `vite-plugin-pwa`, sem erro); `npx vitest run` (suíte completa, 43 arquivos) — **172/172 testes passando** (38 novos desta rodada, cobrindo os ACs literais de cada tarefa, listados por tarefa acima; os demais são regressão MVP revalidada, incluindo `AppLayout.test.tsx` com o `NotificationBell` agora montado). 1 execução isolada anterior de `UnlockPage.test.tsx` (MVP/`FE-M-04`, sem qualquer alteração de código desta sessão em `src/lib/auth`/`src/pages/auth`) apresentou falha por timing sob concorrência de suíte completa; reexecutada a suíte completa 2x consecutivas após o achado — PASS nas duas, confirmando flakiness sensível a carga da máquina, não regressão introduzida por esta rodada; sinalizado ao QA como candidato a estabilização de teste (ex. usar temporizador falso), não como bloqueio desta entrega. `npm run lint` (`oxlint`) sem erro, só warnings pré-existentes no mesmo padrão já presente no restante da base (`react(set-state-in-effect)` em todo `useEffect` de carregamento inicial, convenção já aceita desde o MVP). Sessão não teve acesso a credenciais reais do Supabase (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) nem a uma chave VAPID real de teste — mesma ressalva já registrada em `FE-M-04` a `FE-M-12`, recomenda-se smoke test manual de cada fluxo novo (cartão/fatura, parcelamento, recorrência+reajuste, contas fixas, metas, notificações+push, relatório) antes do Gate de QA fechar essas tarefas. **Achado de processo, não de produto**: no início desta rodada, `.md/TASK.md`/`.md/API-CONTRACT.yaml` e os artefatos de Backend da Fase 2 (migrations, Edge Functions) existiam apenas no checkout principal do repositório, não neste worktree isolado do Frontend — sincronizados manualmente (cópia read-only dos arquivos reais, sem reescrever nada do Backend) antes de iniciar, para garantir que a implementação abaixo fosse feita contra o contrato/schema real e não uma versão desatualizada; nenhum conteúdo de Backend foi alterado por este agente.

#### QA

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status | Lote |
|---|---|---|---|---|---|---|---|
| QA-F2-01 | Casos de teste automatizados para RN-01 (fechamento de fatura), RN-02 (reajuste prospectivo), RN-06 (limite de cartão), RN-07 (preservação de histórico ao cancelar recorrência/parcelamento) — regras concentradas em Edge Functions/`pg_cron` (SDD Seção 6.1, risco "lógica de negócio concentrada") | QA | SDD Seção 6.1, RN-01/02/06/07 | Cada regra tem teste automatizado que falha se o comportamento divergir do AC correspondente em `PRD-TECNICO.md` | 2 dias | Não iniciada | Fechamento & Regressão Fase 2 |
| QA-F2-02 | Regressão E2E dos fluxos de Fase 2 (UX-FL-02, 03, 12 a 17) | QA | UX-SPEC Seção 1.1/1.2 (Fase 2) | Todo fluxo de tela de Fase 2 percorrido ponta a ponta sem erro, incluindo os 4 estados de tela (vazio/carregando/erro/sucesso) onde aplicável | 1.5 dia | Não iniciada | Fechamento & Regressão Fase 2 |

### 3.3 Fase 3

**Pré-condição de todo o bloco abaixo — 1 de 2 condições RESOLVIDA, 1 nova condição em
aberto**: a condição "nenhuma tarefa de Fase 3 inicia desenvolvimento antes de
**CC-01** (retenção/descarte de dado) ser resolvido pelo Software Architect" foi
cumprida em 2026-09-02 — política formalizada em
`adr/011-politica-retencao-descarte-dado-exclusao-conta.md` e em `SDD.md` Seção 7
("Retenção e Descarte de Dado"); ver `BLOCKERS.md`, Bloqueio 002, Status Resolvido, e
Seção 6.1 abaixo. Guardrail `G-13` (`GUARDRAILS.md`) está satisfeito. **As 18 tarefas
de Fase 3 originalmente listadas + as 3 de QA associadas não têm mais marcação de
bloqueio por esse motivo**; 4 tarefas novas (`BE-F3-09`, `BE-F3-10`, `FE-F3-09`,
`QA-F3-04`) foram adicionadas como consequência direta do conteúdo da política — ver
Seção 6.1. RF-F3-04 (Open Finance) continua com a condição adicional de **SPK-003**
(Seção 2), não afetada por esta resolução.

**Segunda condição, adicionada em 2026-09-03, determinada pelo CTO (`BLOCKERS.md`
Bloqueio 010, `SECURITY-REVIEW.md` SEC-DEBT-002)**: nenhuma tarefa `BE-F3-*` (nem
`FE-F3-*`/`QA-F3-*` que dependa de escrita em `budget`/`transactions` de uma tabela
"ownable" nova de Fase 3) inicia desenvolvimento antes de **`BE-M-13`** (correção
sistêmica de autorização de referência cruzada — Seção 3.1, bloco Backend do MVP)
estar `Concluída`. Racional do CTO: toda tabela nova de Fase 2/3 com FK para outra
tabela "ownable" herdaria o mesmo padrão incorreto por cópia se a convenção não for
corrigida antes — mesmo mecanismo de gate já usado para `CC-01`/`G-13`, agora com uma
segunda condição independente. **Status desta condição: satisfeita — 2026-09-03.**
`BE-M-13` concluída (Seção 3.1, ver detalhe completo no Status da tarefa); gate de
início do bloco `BE-F3-*` liberado (junto com `CC-01`, primeira condição, já
resolvida).

#### Backend

**Nota sobre este bloco (`DIR-33`, Bloqueio 005)**: `BE-F3-00` a `BE-F3-04` introduzem
Edge Functions novas. Antes de escrever qualquer código novo em cada uma, o Backend
roda `supabase functions list` (e `functions download` só leitura se houver candidata
a sobreposição) — mesma disciplina que revelou, em `BE-M-09`, 3 Edge Functions de uma
implementação anterior cobrindo o mesmo escopo de MFA/WebAuthn sem terem sido
auditadas antes. Achado de sobreposição segue o mesmo fluxo de decisão do Bloqueio 005
(adotar/adaptar/registrar novo `BLOCKERS.md`), não é assumido resolvido por presunção.

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status | Lote |
|---|---|---|---|---|---|---|---|
| BE-F3-00 | Modelo de dados de captura automatizada: `candidate_transaction`, `import_batch` — base compartilhada por voz, foto, importação e Open Finance | Backend | SDD Seção 5, RNF-01/RNF-08, DIR-20 | Nenhuma linha em `candidate_transaction` é promovida a `transaction` sem evento de confirmação explícito + `confirmed_at` gravado | 2 dias | Não iniciada | Captura Automatizada — Voz & Foto |
| BE-F3-01 | Edge Function de OCR atrás da interface `OCRProvider` (DIR-22), integrando o vendor escolhido em SPK-002 | Backend | RF-F3-02 AC1-3, ADR-007, SPK-002 | Campo obrigatório não extraído retorna em branco sem bloquear os demais (AC3); chave de API nunca exposta ao cliente | 2 dias | Não iniciada | Captura Automatizada — Voz & Foto |
| BE-F3-02 | Edge Function de suporte a captura por voz: recebe transcrição do client (Web Speech API) e/ou aciona fallback STT em nuvem, extrai campos estruturados | Backend | RF-F3-01 AC1, ADR-006 | Campos extraídos retornam marcados como "sugestão automática, não confirmada" (AC1) | 1.5 dia | Não iniciada | Captura Automatizada — Voz & Foto |
| BE-F3-03 | Parser de extrato OFX/CSV (Edge Function) + detecção de possível duplicata (mesma data/valor/conta) | Backend | RF-F3-03 AC1-2 | Transação candidata coincidente com lançamento existente é sinalizada antes da confirmação (AC2) | 2 dias | Não iniciada | Captura Automatizada — Importação de Extrato |
| BE-F3-04 | Integração Open Finance (Pluggy): fluxo de consentimento OAuth2, sincronização periódica, endpoint de webhook com validação de assinatura | Backend | RF-F3-04 AC1-2, ADR-008, SPK-003, DIR-25/26 | Sincronização produz candidatos seguindo o mesmo fluxo de revisão de RF-F3-03 (AC1); feature flag de produção só liga após SPK-003 = Resolvido | 3 dias | Não iniciada | Captura Automatizada — Open Finance |
| BE-F3-05 | Criptografia adicional em nível de aplicação para token de conexão Open Finance (Supabase Vault/`pgsodium`) | Backend | SDD Seção 7 (Criptografia), DIR-24 | Token nunca é legível em texto puro numa consulta direta à tabela, mesmo com acesso de leitura ao banco | 1 dia | Não iniciada | Captura Automatizada — Open Finance |
| BE-F3-06 | Query de evolução patrimonial (série temporal do saldo consolidado, filtrável por conta) | Backend | RF-F3-05 AC1-2 | Filtro por conta individual retorna série coerente com a visão consolidada | 1 dia | Não iniciada | Relatórios & Exportação (Fase 3) |
| BE-F3-07 | Exportação CSV/PDF (Edge Function ou geração client-side com `pdf-lib`) | Backend | RF-F3-06 AC1-2 | CSV contém no mínimo data, conta, forma de pagamento, categoria, subcategoria, descrição, tipo, valor (AC1); PDF contém resumo do período (saldo, entradas, saídas, distribuição por categoria — layout mínimo definido na Seção 6) | 2 dias | Não iniciada | Relatórios & Exportação (Fase 3) |
| BE-F3-08 | **[Reestimada]** Jobs diários de expurgo de dado transitório conforme ADR-011: `CandidateTransaction` descartado/abandonado (30 dias) + foto de recibo associada (30 dias); foto de recibo de lançamento confirmado (90 dias após `confirmed_at`); export CSV/PDF (24h após geração) | Backend | CC-01 (Seção 6, resolvida), `adr/011-politica-retencao-descarte-dado-exclusao-conta.md` | Candidato com `status = descartado` há mais de 30 dias (ou `pendente` sem ação há mais de 30 dias desde a criação do `ImportBatch`) é removido pelo job diário junto da foto associada no Storage; foto de recibo de lançamento confirmado é removida 90 dias após `confirmed_at`, sem afetar o `Transaction`; export gerado há mais de 24h é removido do bucket de exports; falha de execução de qualquer um dos três jobs gera log/alerta consultável (mesmo padrão de DIR-32) | 2.5 dias | Não iniciada | Retenção & Descarte de Dado / Exclusão de Conta |
| BE-F3-09 | **[Nova — ADR-011]** Edge Function de exclusão de conta a pedido do usuário (role de serviço, nunca exposta como operação direta do cliente) | Backend | ADR-011 (tabela-resumo, linha "Exclusão de conta"), CC-01 (Seção 6, resolvida) | Ação autenticada e explícita do usuário dispara a Edge Function, que remove todas as linhas de `public` associadas ao `user_id` (respeitando dependência de FK/cascade), todos os objetos do Storage do mesmo `user_id` (fotos de recibo, exports pendentes), e o usuário correspondente em Supabase Auth; chamada sem o JWT do próprio usuário-alvo é rejeitada | 2 dias | Não iniciada | Retenção & Descarte de Dado / Exclusão de Conta |
| BE-F3-10 | **[Nova — ADR-011]** Rotação de backup: expurgo do snapshot mais antigo a cada execução, mantendo no máximo os últimos 30 snapshots diários (extensão da Edge Function de `BE-M-10`) | Backend | ADR-011 (tabela-resumo, linha "Backup/exportação lógica") | A cada execução diária do job de backup, se já houver 30 snapshots armazenados, o snapshot mais antigo é removido, mantendo o total em no máximo 30 | 0.5 dia | Não iniciada | Retenção & Descarte de Dado / Exclusão de Conta |

#### Frontend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status | Lote |
|---|---|---|---|---|---|---|---|
| FE-F3-01 | Ponto de entrada de captura: S-CAP-01 (FAB expandido: Manual/Falar/Fotografar, opção desabilitada com texto explicativo se STT indisponível) | Frontend | UX-FL-04, S-CAP-01 | Se navegador não suporta Web Speech API nem há fallback configurado, "Falar" aparece desabilitada com "Não disponível neste navegador", nunca some silenciosamente | 1 dia | Não iniciada | Captura Automatizada — Voz & Foto |
| FE-F3-02 | Captura por voz: S-CAP-02 (`VoiceRecorderUI`, transcrição interina ao vivo, `aria-live`) | Frontend | UX-FL-04, S-CAP-02, DIR-15 | Estado "Ouvindo..." e transcrição interina são anunciados via `aria-live`, não só exibidos visualmente | 2 dias | Não iniciada | Captura Automatizada — Voz & Foto |
| FE-F3-03 | Captura por foto: S-CAP-04 (`ReceiptCameraCapture`, moldura-guia, upload alternativo, pré-visualização) | Frontend | UX-FL-04, S-CAP-04 | Permissão de câmera negada oferece upload de arquivo como alternativa, nunca bloqueia o usuário (Seção 4.2 UX-SPEC) | 2 dias | Não iniciada | Captura Automatizada — Voz & Foto |
| FE-F3-04 | Rascunho de confirmação: S-CAP-03/S-CAP-05 (`DraftReviewBanner`, `AutoFillTag`) — tela mais crítica do produto para RNF-01 | Frontend | UX-FL-04, RNF-01/RNF-08, DIR-20 | Banner fixo não-descartável até ação explícita; nenhum timer/auto-confirmação/navegação automática (WCAG 2.2.1); tag "✨ sugerido" desaparece só ao editar o campo (RF-F3-01 AC3) | 3 dias | Não iniciada | Captura Automatizada — Voz & Foto |
| FE-F3-05 | Importação: S-CAP-06/07 (`CandidateList`, `ReconciliationHint`, seleção em lote) | Frontend | UX-FL-05, FL-05 | Itens sinalizados como possível duplicata vêm desmarcados por padrão (RF-F3-03 AC2); nada persiste antes da confirmação de seleção (AC3) | 2.5 dias | Não iniciada | Captura Automatizada — Importação de Extrato |
| FE-F3-06 | Open Finance: S-CAP-08/09 (fluxo de consentimento, lista de conexões, status) — implementável em dev, gate de produção via SPK-003 (DIR-26) | Frontend | UX-FL-05, RF-F3-04 | Tela funcional em ambiente de desenvolvimento; feature flag de produção respeitando DIR-26 | 1.5 dia | Não iniciada | Captura Automatizada — Open Finance |
| FE-F3-07 | Relatório de evolução patrimonial: S-REP-02 (`LineChart`, filtro por conta) | Frontend | UX-FL-18 | Filtro "Todas as contas" disponível além de contas individuais | 1.5 dia | Não iniciada | Relatórios & Exportação (Fase 3) |
| FE-F3-08 | Exportação: S-REP-03 (seleção de período/formato, indicador de geração, download) | Frontend | UX-FL-19 | Usuário escolhe CSV ou PDF e recebe o arquivo correspondente ao período selecionado | 1.5 dia | Não iniciada | Relatórios & Exportação (Fase 3) |
| FE-F3-09 | **[Nova — ADR-011]** Fluxo de exclusão de conta: confirmação em duas etapas com aviso textual da cauda residual de até 30 dias em backup já emitido | Frontend | ADR-011 ("Condição de revisão": fluxo delegado ao UX/UI, ainda **não especificado** em `UX-SPEC.md`) | Usuário só confirma exclusão após uma segunda confirmação explícita (nunca um único toque); tela exibe textualmente "dado pode persistir por até 30 dias em backup já emitido" antes da confirmação final; ao confirmar, chama `BE-F3-09` e encerra a sessão ao concluir | 1 dia (**preliminar** — usa `ConfirmationDialog`/`Modal` já definidos em FE-M-01 como base; sujeita a reestimativa quando UX-SPEC.md formalizar a tela definitiva, ver Seção 6.1) | Não iniciada — sinalizado ao UX/UI | Retenção & Descarte de Dado / Exclusão de Conta |

#### QA

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status | Lote |
|---|---|---|---|---|---|---|---|
| QA-F3-01 | Casos de teste automatizados e manuais para RNF-01/RNF-08 nos 4 fluxos automatizados (voz, foto, importação, Open Finance): nenhuma persistência sem confirmação explícita, em nenhum cenário (inclusive falha de rede durante confirmação) | QA | RNF-01, RNF-08, DIR-20 | Teste falha propositalmente uma tentativa de bypass (chamada direta à API sem passar pela tela de confirmação) e confirma que a policy/validação server-side também rejeita, não só a UI | 2 dias | Não iniciada | Fechamento & Regressão Fase 3 |
| QA-F3-02 | Teste de acessibilidade WCAG 2.1 AA nos componentes novos sem equivalente de mercado: `VoiceRecorderUI`, `ReceiptCameraCapture`, `DraftReviewBanner`, `AutoFillTag`, `CandidateList` | QA | UX-SPEC Seção 3.3, Seção 5 | Nenhum achado crítico de acessibilidade aberto nos 5 componentes marcados **[NOVO]** | 1.5 dia | Não iniciada | Fechamento & Regressão Fase 3 |
| QA-F3-03 | Regressão completa pré-lançamento de Fase 3 (MVP + Fase 2 + Fase 3 integradas) | QA | Todo o escopo | Nenhuma regressão introduzida em MVP/Fase 2 pela introdução da Fase 3 | 2 dias | Não iniciada | Fechamento & Regressão Fase 3 |
| QA-F3-04 | **[Nova — ADR-011]** Casos de teste para os jobs de expurgo (`BE-F3-08`: candidato/foto 30 dias, foto de confirmado 90 dias, export 24h; `BE-F3-10`: rotação de backup) e para o fluxo de exclusão de conta (`BE-F3-09`/`FE-F3-09`) | QA | ADR-011 | Teste automatizado confirma que dado além do prazo é removido e que dado dentro do prazo **não** é removido (fronteira testada nos dois sentidos, para cada categoria); teste de exclusão de conta confirma ausência de qualquer linha remanescente em `public`, objeto no Storage e usuário em Supabase Auth associados ao `user_id` excluído | 1 dia | Não iniciada | Retenção & Descarte de Dado / Exclusão de Conta |

---

## 4. Dependências e Ordem de Execução

### 4.1 MVP

| Tarefa | Depende de | Tipo | Pode rodar em paralelo com |
|---|---|---|---|
| BE-M-00 | **Tecnicamente**: `SPK-001` Resolvido (Seção 2) + este `TASK.md`/`GUARDRAILS.md` já reabertos por este agente — ambas condições satisfeitas nesta versão do documento. **Formalmente**: novo veredito do CTO (`guardrails-governance` + `capacity-and-timeline-validation` pontual sobre esta reabertura, ver Seção 5) ainda pendente — Backend não inicia antes desse veredito (`BLOCKERS.md` Bloqueio 003) | Implementação completa | — (primeira tarefa a rodar assim que o veredito do CTO liberar) |
| BE-M-01 | BE-M-00 (auditoria concluída e documentada) | Implementação completa | — |
| BE-M-02 | BE-M-00 (auditoria concluída — inclui a confirmação de que a taxonomia de `categories` já bate com a especificação) | Implementação completa | BE-M-01 |
| BE-M-03, BE-M-04, BE-M-05 | BE-M-01 (contrato de schema) | Contrato | Entre si; e com FE-M-00/01/02/03 |
| BE-M-06 | BE-M-00 (auditoria/teste de regressão de `apply_transaction_effect`, achado sobre `fn_clear_due_transactions`), BE-M-01, BE-M-03, BE-M-04, BE-M-05 (contrato) | Contrato | FE-M-00 a FE-M-03 |
| BE-M-07 | BE-M-00 (auditoria de contrato de `get_month_provision`/`get_monthly_category_summary`), BE-M-06 (dados de lançamento precisam existir para agregação fazer sentido) | Implementação completa | BE-M-08, BE-M-09 |
| BE-M-08 | BE-M-05, BE-M-06 (contrato) | Contrato | BE-M-07, BE-M-09 |
| BE-M-09 | BE-M-00 (auditoria de `webauthn_credentials`/`set_pin`/`verify_pin`/`custom_access_token_hook` concluída e documentada), mais auditoria própria de Edge Functions (`DIR-33`, Bloqueio 005) — condição de aceite explícita, não apenas contrato de schema/role | Implementação completa | BE-M-03 a BE-M-08 |
| BE-M-10 | BE-M-00; auditoria de Edge Functions (`DIR-33`) rodada no início da própria tarefa, antes de qualquer código novo (Bloqueio 005) | Implementação completa | Qualquer outra tarefa BE-M |
| BE-M-11 | BE-M-01 a BE-M-09 (todas as tabelas/policies existirem) | Implementação completa | — (roda por último no bloco Backend) |
| BE-M-12 | BE-M-00 (achado sobre `handle_new_user()` já documentado) | Implementação completa | Qualquer outra tarefa BE-M a partir de BE-M-01 |
| BE-M-13 | BE-M-00 (auditoria), BE-M-01 (policies de `budget` existirem), BE-M-06 (policies de `transactions` já auditadas/reaproveitadas) — todas já `Concluída` | Implementação completa | BE-M-07 a BE-M-12; **bloqueia** todo o bloco `BE-F3-*` (Seção 3.3/4.3) até `Concluída` |
| FE-M-00, FE-M-01, FE-M-02, FE-M-03 | Nenhuma (fundação de UI, usa `UX-SPEC.md` diretamente) | — | Todo o bloco Backend, desde o dia 1 |
| FE-M-04 | BE-M-09 (contrato de Auth) | Contrato | FE-M-05 a FE-M-12 |
| FE-M-05, FE-M-06, FE-M-07, FE-M-08 | FE-M-00/01/02 + BE-M-01/02/03/04/05 (contrato) | Contrato | Entre si |
| FE-M-09 | FE-M-02, BE-M-06 (contrato) | Contrato | FE-M-10, FE-M-11 |
| FE-M-10 | BE-M-07 (contrato) | Contrato | FE-M-11, FE-M-12 |
| FE-M-11 | BE-M-08 (contrato) | Contrato | FE-M-10, FE-M-12 |
| FE-M-12 | FE-M-04 (Auth já existente para "Alterar PIN"/logout) | Contrato | Qualquer outra FE-M |
| QA-M-01 | Toda a Seção 3.1 decomposta (não a implementação — QA planeja em paralelo) | Contrato | Todo o bloco de implementação MVP |
| QA-M-02 | BE-M-01, BE-M-03, BE-M-05, BE-M-11 (implementação completa, precisa de tabela/policy real para testar) | Implementação completa | — |

**Caminho crítico do MVP**: BE-M-00 (auditoria) → BE-M-01 → BE-M-06 → BE-M-07 →
FE-M-10 (Dashboard) → QA-M-02. `SPK-001`, que ocupava o primeiro elo desse caminho na
versão anterior, está Resolvido (Seção 2) — não consome mais tempo no caminho crítico,
mas `BE-M-00` (agora auditoria, não bootstrap) permanece o primeiro passo obrigatório,
com o mesmo risco de concentração que `SPK-001` tinha (ver Seção 5, risco 1
renumerado). Auth (BE-M-09/FE-M-04) e as telas de CRUD estrutural (contas/formas/
categorias/orçamento) correm em paralelo a esse caminho sem risco de bloqueá-lo;
`BE-M-12` (restrição de cadastro) também corre em paralelo, sem entrar no caminho
crítico. `BE-M-13` (correção de ownership de FK, Bloqueio 010) também corre em
paralelo ao caminho crítico do MVP — não atrasa o Dashboard/QA-M-02 — mas **é**
pré-requisito obrigatório do início de todo o bloco Fase 3 (Seção 4.3), então precisa
estar concluída bem antes do fim do MVP se a Fase 3 for iniciar sem atraso adicional.

### 4.2 Fase 2

| Tarefa | Depende de | Tipo | Pode rodar em paralelo com |
|---|---|---|---|
| BE-F2-01 | BE-M-04 (forma de pagamento "crédito" precisa existir, PRD-TECNICO Seção 5.1) | Implementação completa | BE-F2-06, BE-F2-08 |
| BE-F2-05 | BE-F2-01 | Implementação completa | BE-F2-03 |
| BE-F2-03 | BE-M-01 (schema) | Implementação completa | BE-F2-05, BE-F2-06, BE-F2-08 |
| BE-F2-04 | BE-F2-03 | Implementação completa | BE-F2-05 |
| BE-F2-02 | BE-F2-01, BE-F2-05, BE-F2-03, BE-F2-04 (RF-F2-05 depende de RF-F2-01+04+02/03, PRD-TECNICO Seção 5.1) | Implementação completa | — (é o ponto de convergência da Fase 2) |
| BE-F2-06 | BE-M-01 | Implementação completa | BE-F2-03, BE-F2-05, BE-F2-08 |
| BE-F2-07 | BE-F2-06, BE-F2-09 (contrato) | Contrato | BE-F2-08, BE-F2-10 |
| BE-F2-08 | BE-M-01 | Implementação completa | BE-F2-03, BE-F2-05, BE-F2-06 |
| BE-F2-09 | Nenhuma dependência de Fase 2 (usa infraestrutura já existente do MVP) | — | BE-F2-01 a BE-F2-08 |
| BE-F2-10 | BE-M-06 (lançamentos já existem) | Contrato | Qualquer outra BE-F2 |
| FE-F2-01, FE-F2-03 | BE-F2-01 (contrato) | Contrato | Entre si |
| FE-F2-02 | BE-F2-02 (contrato) | Contrato | FE-F2-03 |
| FE-F2-04 | BE-F2-03, BE-F2-04 (contrato) | Contrato | FE-F2-05, FE-F2-06 |
| FE-F2-05 | BE-F2-06 (contrato) | Contrato | FE-F2-04, FE-F2-06 |
| FE-F2-06 | BE-F2-08 (contrato) | Contrato | FE-F2-04, FE-F2-05 |
| FE-F2-07 | BE-F2-09 (contrato) | Contrato | Qualquer outra FE-F2 |
| FE-F2-08 | BE-F2-10 (contrato) | Contrato | Qualquer outra FE-F2 |
| FE-F2-09 | FE-M-12 (tela de configurações já existe) | Implementação completa | Qualquer outra FE-F2 |
| QA-F2-01 | BE-F2-02, BE-F2-03, BE-F2-04, BE-F2-05 (implementação completa) | Implementação completa | QA-F2-02 |
| QA-F2-02 | Todo o bloco FE-F2 (implementação completa) | Implementação completa | QA-F2-01 |

**Caminho crítico da Fase 2**: BE-F2-01 → BE-F2-05 → BE-F2-03 → BE-F2-04 → BE-F2-02 →
FE-F2-02 → QA-F2-01. Notificações (BE-F2-09/FE-F2-07), Metas (BE-F2-08/FE-F2-06) e
Contas Fixas (BE-F2-06/FE-F2-05) correm em paralelo sem risco de atrasar esse caminho.

### 4.3 Fase 3

| Tarefa | Depende de | Tipo | Pode rodar em paralelo com |
|---|---|---|---|
| Todo o bloco Fase 3 | **CC-01 resolvido em 2026-09-02** (ADR-011, Seção 6) — gate estrutural cumprido, não bloqueia mais nenhuma tarefa abaixo. **`BE-M-13` (Seção 3.1) — Bloqueio 010/SEC-DEBT-002, determinado pelo CTO — em aberto**: nenhuma tarefa `BE-F3-*` inicia antes de `BE-M-13` estar `Concluída` (ver Seção 3.3) | Implementação completa (CC-01 satisfeito; `BE-M-13` pendente) | Entre si, respeitando as dependências técnicas individuais listadas abaixo — **mas nenhuma pode efetivamente iniciar até `BE-M-13` fechar** |
| SPK-002, SPK-003 | Nenhuma (CC-01 já resolvido) | — | Entre si; e com BE-F3-00 |
| BE-F3-00 | BE-M-01 (padrão de schema já estabelecido); auditoria de Edge Functions (`DIR-33`, Bloqueio 005) rodada antes de qualquer código novo | Implementação completa | SPK-002, SPK-003 |
| BE-F3-01 | BE-F3-00, SPK-002 (resposta do spike); auditoria de Edge Functions (`DIR-33`) | Implementação completa | BE-F3-02, BE-F3-03 |
| BE-F3-02 | BE-F3-00; auditoria de Edge Functions (`DIR-33`) | Implementação completa | BE-F3-01, BE-F3-03 |
| BE-F3-03 | BE-F3-00; auditoria de Edge Functions (`DIR-33`) | Implementação completa | BE-F3-01, BE-F3-02 |
| BE-F3-04 | BE-F3-00, SPK-003 (resposta do spike); auditoria de Edge Functions (`DIR-33`) | Implementação completa | BE-F3-06, BE-F3-07 |
| BE-F3-05 | BE-F3-04 (contrato de onde o token é recebido) | Contrato | BE-F3-06, BE-F3-07 |
| BE-F3-06 | BE-M-07 (saldo consolidado já existe) | Contrato | BE-F3-01 a BE-F3-05 |
| BE-F3-07 | BE-M-06 (campos de lançamento já definidos) | Contrato | BE-F3-01 a BE-F3-06 |
| BE-F3-08 | BE-F3-00 (`candidate_transaction`), BE-F3-01/02/03 (fotos/candidatos já sendo gerados), BE-M-10 (padrão de job agendado) — política já definida em ADR-011 | Implementação completa | BE-F3-09, BE-F3-10 |
| BE-F3-09 | Todas as tabelas de `public` associadas a este produto já existirem para a function cobrir cada uma com confiança: BE-M-01, BE-F2-01/03/05/06/08/09, BE-F3-00/04 (contrato) — pode ser desenvolvida em paralelo, mas só validada com confiança perto do fim da Fase 3 | Contrato (parcial) | BE-F3-01 a BE-F3-08, BE-F3-10 |
| BE-F3-10 | BE-M-10 (job de backup diário já implementado) | Implementação completa | Qualquer outra tarefa BE-F3 |
| FE-F3-01 | FE-M-00/01/02 (fundação já existe) | Implementação completa | — |
| FE-F3-02 | FE-F3-01, BE-F3-02 (contrato) | Contrato | FE-F3-03 |
| FE-F3-03 | FE-F3-01, BE-F3-01 (contrato) | Contrato | FE-F3-02 |
| FE-F3-04 | FE-F3-02, FE-F3-03, BE-F3-00 (contrato de `candidate_transaction`) | Contrato | — (é o ponto de convergência de voz+foto) |
| FE-F3-05 | BE-F3-03 (contrato) | Contrato | FE-F3-04 |
| FE-F3-06 | BE-F3-04 (contrato), SPK-003 (para liberar produção, não para desenvolver) | Contrato | FE-F3-05 |
| FE-F3-07 | BE-F3-06 (contrato) | Contrato | Qualquer outra FE-F3 |
| FE-F3-08 | BE-F3-07 (contrato) | Contrato | Qualquer outra FE-F3 |
| FE-F3-09 | BE-F3-09 (contrato) + **pendência externa**: UX-SPEC.md ainda não tem a tela formalizada (sinalizado ao UX/UI, ver Seção 6.1) | Contrato + pendência de design | Qualquer outra FE-F3 |
| QA-F3-01 | FE-F3-04, FE-F3-05, FE-F3-06 (implementação completa) | Implementação completa | QA-F3-02 |
| QA-F3-02 | FE-F3-02, FE-F3-03, FE-F3-04, FE-F3-05 (implementação completa) | Implementação completa | QA-F3-01 |
| QA-F3-04 | BE-F3-08, BE-F3-09, BE-F3-10, FE-F3-09 (implementação completa) | Implementação completa | QA-F3-01, QA-F3-02 |
| QA-F3-03 | Todo o bloco Fase 3, incluindo QA-F3-04 (implementação completa) | Implementação completa | — (último passo) |

**Caminho crítico da Fase 3**: BE-M-13 (Bloqueio 010, gate obrigatório, Seção 3.1) →
BE-F3-00 → FE-F3-02/FE-F3-03 (paralelas) → FE-F3-04 → QA-F3-01 → QA-F3-04 →
QA-F3-03. (CC-01, o antigo gate estrutural, já está resolvido — não consome mais
tempo no caminho crítico; `BE-M-13`, novo gate, passa a ser o primeiro elo, com o
mesmo perfil de risco de concentração que `SPK-001`/`BE-M-00` tiveram para o MVP.) `BE-F3-08`, `BE-F3-09`, `BE-F3-10` e
`FE-F3-09` (as 4 tarefas novas desta resolução) correm em paralelo a esse caminho, sem
risco de atrasá-lo — só `QA-F3-04` entra no caminho crítico, como pré-requisito de
`QA-F3-03` (mesmo raciocínio já aplicado às demais tarefas de QA de Fase 3). RF-F3-04
(Open Finance) tem seu próprio sub-caminho crítico (SPK-003 → BE-F3-04 → BE-F3-05 →
FE-F3-06) que só bloqueia produção especificamente dessa funcionalidade, não o
restante da Fase 3.

---

## 5. Riscos de Prazo Sinalizados

**Nota geral obrigatória**: nenhuma restrição de prazo/data-alvo foi declarada pelo
stakeholder em nenhum artefato upstream (`PRD.md`, `CTO-REVIEW.md` Gate 1) — projeto
pessoal, sem orçamento/prazo formal. **Capacidade agregada de squad também não foi
informada** (não há número de pessoas/agentes-desenvolvedores por papel declarado até
este ponto do pipeline). Por isso, esta seção reporta **esforço estimado em
dias ideais de desenvolvimento** (unidade única, consistente em toda a Seção 3), sem
compará-lo a uma capacidade que ainda não existe — a comparação real é o que o Gate 3
do CTO precisa produzir, com o número de "papéis efetivamente disponíveis" que só o
CTO tem visibilidade para declarar.

**Nota adicional desta reabertura**: `SPK-001` está Resolvido (Seção 2) — seus 2 dias
de esforço já foram gastos e não representam mais risco/esforço remanescente. A tabela
abaixo reporta o **esforço remanescente daqui para frente** (não conta os 2 dias de
`SPK-001`, já executados); o total histórico (incluindo o que já foi gasto) é
reportado entre parênteses onde relevante, para não perder a rastreabilidade do
esforço total do projeto desde o início.

| Time | Esforço total estimado (dias ideais) | Capacidade conhecida | Risco |
|---|---|---|---|
| Backend | MVP: **17.5** (↑ de 16.75 — Bloqueio 015/SEC-DEBT-008: `BE-M-14` nova, 0.75 dia, retroativa/já concluída, correção sistêmica de `DEFAULT auth.uid()` em 13 tabelas "ownable"; anteriormente ↑ de 15.25 — Bloqueio 010/SEC-DEBT-002: `BE-M-13` nova, 1.5 dia, correção sistêmica de ownership de FK cross-tenant em `budget`/`transactions` + `SECURITY DEFINER` nos triggers RN-08/RN-09, determinada pelo CTO como pré-requisito de início de Fase 3; demais linhas inalteradas por esta resolução, ver Seção 3.1) · Fase 2: 14.5 · Fase 3: 19.5 (inclui `BE-F3-08` reestimada em 2.5, mais `BE-F3-09` 2 e `BE-F3-10` 0.5, novas por ADR-011) · Spikes remanescentes: SPK-002 3 + SPK-003 3 = 6 (`SPK-001`, 2 dias, já executado e Resolvido — não conta mais como esforço remanescente) · **Total remanescente ≈ 56.75** (inalterado — `BE-M-14` é histórico/já gasto, não remanescente; histórico, incluindo `SPK-001`/`BE-M-14` já gastos: ≈ 59.5) | Não informada | Ver riscos nomeados abaixo |
| Frontend | MVP: 22 (↑ de 21 — Bloqueio 015/SEC-DEBT-008: `FE-M-13` nova, 1 dia, retroativa/já concluída, defesa em profundidade `withOwnerId()` em 12 funções `create*`) · Fase 2: 14.5 · Fase 3: 16 (inclui `FE-F3-09` 1 dia preliminar, nova por ADR-011) · **Total ≈ 51.5 remanescente** (inalterado — `FE-M-13` é histórico/já gasto; histórico ≈ 52.5) | Não informada | Ver riscos nomeados abaixo |
| QA | MVP: 3 · Fase 2: 3.5 · Fase 3: 6.5 (inclui `QA-F3-04` 1 dia, nova por ADR-011) · **Total ≈ 13** — inalterado por esta resolução | Não informada | Ver riscos nomeados abaixo |
| **Total geral** | **Remanescente ≈ 121.25 dias ideais** (inalterado — `BE-M-14`/`FE-M-13` são histórico, já gastos, não remanescente) · **Histórico ≈ 125** (inclui os 2 dias de `SPK-001` + 1.75 dia de `BE-M-14`/`FE-M-13`, Bloqueio 015) — mudança líquida em relação ao total histórico anterior (≈123.25): **+1.75 dia**, integralmente atribuível a `BE-M-14`/`FE-M-13` (Bloqueio 015), 100% já executado antes desta formalização — não é reestimativa de trabalho futuro, é registro retroativo, mesmo tratamento já dado a `BE-M-12`. **Nota de materialidade**: nenhum novo `capacity-and-timeline-validation` pontual é necessário por este delta — diferente do Bloqueio 010 (+1.5 dia de trabalho **futuro** determinado pelo CTO, acima do limiar de +1.25 dia do Bloqueio 003), aqui o esforço já foi gasto e verificado, o remanescente não muda, e o próprio veredito de origem (DevSecOps, `SECURITY-REVIEW.md` Seção 1.12) já é o registro formal do achado e da correção | Não informada | — |

### Riscos nomeados

1. **[Resolvido em 2026-09-02, com reestimativa]** `SPK-001` bloqueava todo o modelo de
   dados do MVP. Achado: a premissa de `ADR-001` não se sustentava — `public` é
   implementação anterior deste mesmo produto, não dado alheio. Resolvido
   estrategicamente pelo CTO e tecnicamente pelo Software Architect via `ADR-012`
   (supersede `ADR-001`) e `ADR-013`, ambos aprovados com ressalvas
   (`CTO-REVIEW.md`, "Gate 2 (Reaberto por Bloqueio 003)"). Efeito no prazo: `BE-M-00`
   deixou de ser bootstrap (1 dia) e passou a ser auditoria de objetos reaproveitados
   (1.5 dia); `BE-M-01`/`BE-M-02` caíram (2→1 e 0.5→0.25, já que 4 tabelas + a
   taxonomia de categorias já existem); `BE-M-06`/`BE-M-07`/`BE-M-09` subiram
   (auditoria de objeto específico agregada ao escopo); `BE-M-12` é nova — ver tabela
   acima para o detalhe líquido. **Risco residual, herdado das 5 ressalvas do CTO**:
   (a) `set_pin`/`verify_pin` — se `verify_pin` for o gate primário de desbloqueio e
   exigir rede, conflita com `ADR-010`/RNF-04 e bloqueia `BE-M-09` (e possivelmente
   `FE-M-04`, já estimada, sem reabertura preventiva de sua estimativa — só se o
   conflito se confirmar); (b) ativação real do Auth Hook `custom_access_token_hook`
   não confirmada; (c) triggers de `public` ainda não nomeados individualmente por
   `SPK-001` ficam a cargo da auditoria de `BE-M-00`, sem estimativa própria detalhada
   por trigger (risco de subestimativa se o número real for maior do que o esperado).
   Nenhum desses três é motivo para não seguir — são exatamente o tipo de incerteza que
   `BE-M-00`/`BE-M-09` foram desenhadas para descobrir e, se necessário, escalar via
   `BLOCKERS.md`, não para assumir resolvido por presunção.
2. **[Resolvido em 2026-09-02]** CC-01 (retenção/descarte de dado) bloqueava 100% da
   Fase 3. Resolvido pelo Software Architect via `adr/011-politica-retencao-descarte-
   dado-exclusao-conta.md` e nova subseção "Retenção e Descarte de Dado" em `SDD.md`
   Seção 7 — ver Seção 6.1. Nenhuma tarefa de Fase 3 permanece bloqueada por este
   motivo. Efeito colateral no prazo: a política revelou a necessidade de 3 tarefas
   novas de Backend/Frontend/QA (`BE-F3-09` Edge Function de exclusão de conta,
   `BE-F3-10` rotação de backup, `FE-F3-09` fluxo de exclusão de conta) mais
   `QA-F3-04`, e elevou a estimativa de `BE-F3-08` de 1.5 para 2.5 dias. Risco
   residual: `FE-F3-09` tem estimativa preliminar porque a tela correspondente
   ainda não está formalizada em `UX-SPEC.md` — sinalizado ao UX/UI (Seção 6.1); não
   bloqueia o restante da Fase 3, mas pode exigir reestimativa pontual dessa única
   tarefa quando a tela for desenhada.
3. **SPK-003 (Pluggy pessoa física + termos operador/controlador) bloqueia
   especificamente RF-F3-04 em produção (BE-F3-04, BE-F3-05, FE-F3-06 ≈ 6.5 dias de
   Frontend+Backend), não o restante da Fase 3.** Diferente do risco 2, este é
   isolado — voz, foto e importação (RF-F3-01/02/03) podem seguir para produção mesmo
   se o Pluggy não aceitar o tier assumido; nesse cenário, o dono do produto precisa
   decidir entre não lançar Open Finance ou revisitar o agregador (fora da autoridade
   do Tech Lead decidir sozinho, ver `ADR-008`).
4. **Concentração de regra de negócio crítica em Edge Functions/`pg_cron` (RN-01, RN-02,
   RN-06, RN-07, mais RN-11 já implementada via `fn_clear_due_transactions`) exige
   QA-F2-01 (2 dias) completar antes de a Fase 2 ser considerada pronta para uso
   real** — SDD.md Seção 6.1 já registrou esse risco como severidade Média e
   condicionou a mitigação a "cobertura de teste automatizado exigida na fase de Tech
   Lead/QA"; a reabertura do Bloqueio 003 amplia esse risco às funções/triggers
   reaproveitados (`apply_transaction_effect`, `fn_clear_due_transactions`), que agora
   também exigem cobertura de teste (`BE-M-00`/`BE-M-06`) antes de serem consideradas
   confiáveis, não só as regras de Fase 2.
5. **Risco de execução solo/serial.** Este é um projeto de usuário único sem equipe
   declarada (`CTO-REVIEW.md` Gate 1); se Backend, Frontend e QA forem, na prática,
   a mesma capacidade de execução (uma única pessoa ou um único agente executando em
   série, não três papéis rodando de fato em paralelo), o paralelismo mapeado na
   Seção 4 não se realiza e o prazo real tende ao **somatório total remanescente
   (≈119.75 dias)**, não ao caminho crítico mais curto — já declarado como fato
   assumido pelo CTO no Gate 3 original, mantido nesta reabertura.
6. **Tarefas no caminho crítico sem folga**: BE-M-00 (auditoria) → BE-M-01 → BE-M-06 →
   BE-M-07 (MVP); BE-F2-01 → BE-F2-05 → BE-F2-03 → BE-F2-04 → BE-F2-02 (Fase 2);
   BE-F3-00 → FE-F3-04 (Fase 3). Nenhuma dessas tarefas tem tarefa alternativa/
   redundante que absorva atraso — um atraso em qualquer uma delas atrasa a fase
   inteira na mesma proporção. `BE-M-00` substitui `SPK-001` como o primeiro elo deste
   caminho, com o mesmo nível de atenção que o CTO já deu a `SPK-001` no Gate 3
   original (risco nº1 daquele gate).
7. **[Novo, herdado de `ADR-012`/CTO] Item 6 do `SPK-001` (plano/tier contratado do
   Supabase) segue não confirmado.** Não é uma tarefa atribuível a Backend/Frontend/QA
   — o próprio CTO registrou, no fechamento do Gate 2 Reaberto, a recomendação de
   confirmar isso pessoalmente na aba Billing do dashboard
   (`supabase.com/dashboard/project/xrcxbzrglndetrrhavhc/settings/billing`) em vez de
   deixar sem dono. Não bloqueia nenhuma tarefa deste `TASK.md` (RPO ≤ 24h já é
   verdadeiro independentemente do tier, via `ADR-009`), mas segue relevante para a
   validade plena de `ADR-009` — registrado aqui para não se perder, sem criar tarefa
   correspondente neste documento.
8. **[Resolvido em 2026-09-03, com reestimativa] Bloqueio 005/006**: lacuna de
   processo (auditoria nunca cobriu Edge Functions) corrigida para o restante do
   projeto via `DIR-33`; risco de segurança específico (replay de challenge
   WebAuthn), que estava fora da autoridade do Tech Lead decidir, recebeu veredito
   do CTO — **mitigar agora** (`BLOCKERS.md` Bloqueio 006, Status Resolvido;
   `CTO-REVIEW.md`, "Risco Aceito — Bloqueio 006"). `BE-M-09` teve sua estimativa
   revista duas vezes: 2→1.5 dia (Bloqueio 005, adoção das 3 Edge Functions já
   existentes em vez de reescrever do zero) e depois 1.5→2 dias (Bloqueio 006,
   mitigação do risco de replay — migration `webauthn_challenges` aplicada +
   wiring de `consumed_at` + teste de replay), líquido **+0 dia** em relação à
   estimativa original de `BE-M-09` antes do Bloqueio 005, mas **+0.5 dia** no
   total do projeto em relação ao ponto imediatamente anterior a esta resolução
   (Seção 5 acima) — sem impacto no caminho crítico do MVP (`BE-M-09` não está no
   caminho crítico, Seção 4.1). **Risco de replay não é mais residual em aberto**:
   virou condição de aceite executável em `BE-M-09` (Seção 3.1); `BE-M-09` só fecha
   "sem ressalva" depois da migration aplicada, do wiring de `consumed_at`
   confirmado e do teste de replay passando. **Decisão adiada, não pendência em
   aberto**: guardrail formal sobre WebAuthn como prova de posse em ação sensível
   — avaliado e explicitamente adiado até haver requisito concreto de Fase 2/3 que
   o exija (ver `DET-06`, Seção 6.2); não é uma lacuna, é uma decisão documentada.
   **Risco de recorrência do erro de processo original**: `DIR-33` (Seção 1.1)
   reduz a chance de o mesmo tipo de erro (objeto reaproveitado com falha de
   segurança não avaliada) se repetir em `BE-M-10` e em `BE-F3-00` a `BE-F3-04`
   (todas Edge Functions, Seção 3.1/3.3), mas não é garantia — cada uma dessas
   tarefas ainda depende da disciplina de quem a executar rodar a auditoria antes
   de codificar.
9. **[Novo, 2026-09-03] Bloqueio 010 (SEC-DEBT-002) — gate obrigatório de Fase 3, não
   débito indefinido.** O DevSecOps encontrou um gap sistêmico de autorização de
   referência cruzada (IDOR) entre tabelas "ownable" (`budget`/`transactions`), com
   correção de escopo delimitado já especificada tecnicamente
   (`SECURITY-REVIEW.md` Seção 1.2). O CTO rejeitou tratar isso como débito técnico
   registrado indefinidamente e fixou prazo: correção obrigatória (`BE-M-13`, Seção
   3.1, 1.5 dia) **antes de qualquer tarefa `BE-F3-*` iniciar** (`CTO-REVIEW.md`,
   "Revisão de Segurança do Lote MVP", item 2; `BLOCKERS.md` Bloqueio 010, Status
   Resolvido — decisão de risco). Diferente do risco 8 (Bloqueio 005/006), esta
   correção **entra no caminho crítico da Fase 3** como novo primeiro elo (Seção 4.3)
   — um atraso em `BE-M-13` atrasa igualmente o início de toda a Fase 3, mesmo que
   `BE-M-13` em si não atrase o MVP (roda em paralelo ao caminho crítico do MVP,
   Seção 4.1). O bloqueio condicional automático que o DevSecOps já havia aplicado
   (nenhuma expansão de `allowed_signup_emails`/remoção do trigger de restrição de
   signup/feature multiusuário sem este gap corrigido) permanece em vigor
   cumulativamente — a correção antes da Fase 3 não o substitui.
10. **[Resolvido em 2026-09-03] Bloqueio 015 (SEC-DEBT-008) — achado crítico de
    disponibilidade de escrita, não de confidencialidade/integridade.** DevSecOps
    encontrou, durante a auditoria do lote "Categorização", que nenhuma coluna
    `user_id` de tabela "ownable" tinha `DEFAULT`/trigger de preenchimento e nenhuma
    função `create*` do Frontend a enviava — toda escrita real falharia
    (fail-closed), potencialmente invalidando a leitura de "pronto" de todo lote já
    `Concluída`/"Aprovado com débito" até então. Diferente dos riscos 8/9 (Bloqueio
    005/006/010), este não teve condição de contenção que permitisse tratamento como
    débito de prazo — gerou pausa obrigatória do orquestrador. Resolvido no mesmo
    ciclo: correção primária de Backend (`BE-M-14`, migration `DEFAULT auth.uid()`
    em 13 tabelas) + defesa em profundidade de Frontend (`FE-M-13`, `withOwnerId()`
    em 12 funções `create*`), ambas verificadas ao vivo contra o Postgres real,
    inclusive por checagem independente do DevSecOps. `BLOCKERS.md` Bloqueio 015:
    Status Resolvido. **Efeito no prazo**: +1.75 dia **histórico** (`BE-M-14` 0.75 +
    `FE-M-13` 1, Seção 3.1) — já gasto, não remanescente, mesma distinção usada para
    `SPK-001` (Seção 5, nota acima). **Não afeta a validade dos 3 lotes já fechados
    antes deste achado** (Fundação, Contas & Formas de Pagamento, Ledger &
    Dashboard) — concordo com a leitura do DevSecOps (`SECURITY-REVIEW.md` Seção
    1.12): a causa raiz era uma pré-condição de plataforma ausente desde o início do
    projeto, não uma regressão introduzida por nenhum desses lotes; corrigida a
    pré-condição, os débitos já registrados em cada um deles continuam válidos
    individualmente, sem necessidade de reabertura. Dois débitos residuais de baixa
    severidade, não bloqueantes, seguem rastreados: `SEC-DEBT-009` (reprodução HTTP
    ponta a ponta pendente de credencial) e `SEC-DEBT-010` (`push_subscriptions` sem
    `withOwnerId` no Frontend, causa raiz já coberta pela camada de banco).

---

## 6. Lacunas Sinalizadas ao Software Architect

### 6.1 Lacuna estrutural — nenhuma aberta no momento (histórico de resolução abaixo)

Nenhuma lacuna estrutural do `SDD.md` está em aberto neste momento. As duas lacunas
estruturais encontradas durante a decomposição/execução (`CC-01`, `BC-003`) foram
resolvidas pelo Software Architect (com decisão estratégica do CTO no caso de
`BC-003`) e são mantidas aqui só para rastreabilidade — não representam mais bloqueio.

| ID | Lacuna | Origem | Tarefa(s) afetada(s) | Status |
|---|---|---|---|---|
| **BC-003** | `SPK-001` (execução do spike pelo Backend, não uma lacuna encontrada nesta decomposição em si) revelou que a premissa central de `ADR-001`/`SDD.md` Seção 5 original — "o projeto Supabase reaproveitado contém dado de outro produto, a isolar em `mymoney`" — não se sustentava: `public` é uma implementação anterior deste mesmo produto, confirmada pelo stakeholder. Isto tornou `DIR-01`/`DIR-02`/`G-01`/`G-02` (na formulação anterior) diretamente contraditórios com a arquitetura correta, e bloqueou toda a Seção 3.1 Backend do MVP (`BE-M-00` em diante). | `BLOCKERS.md` Bloqueio 003 (reportado por `backend`, escalado ao `cto`) | Toda a Seção 3.1 Backend do MVP (`BE-M-00` a `BE-M-12`), Seção 1.1 (`DIR-01` a `DIR-05`), `GUARDRAILS.md` `G-01`/`G-02` | **Resolvido — 2026-09-02, por `cto` (decisão estratégica) e `software-architect` (desenho técnico).** `ADR-012` (supersede `ADR-001`) e `ADR-013` formalizam a nova estratégia; `SDD.md` Seção 5/6.1/7 (Autenticação/Autorização/Isolamento) reescritas e reaprovadas com ressalvas pelo CTO (`CTO-REVIEW.md`, "Fechamento do Gate 2 Reaberto"). Consequência direta neste `TASK.md`: Seção 1.1 reescrita (`DIR-01` a `DIR-05`); `SPK-001` fechado como Resolvido (Seção 2); `BE-M-00` reescrita de bootstrap para auditoria; `BE-M-01`/`BE-M-02` reestimadas para baixo; `BE-M-06`/`BE-M-07`/`BE-M-09` ganharam condição de aceite adicional; `BE-M-12` criada (nova, ressalva 3 do CTO); Seção 5 recalculada (+1.25 dia histórico, remanescente ≈119.75). `GUARDRAILS.md` `G-01`/`G-02` reabertos em paralelo (ver documento próprio) |
| **CC-01** | `SDD.md` não definia política de retenção/descarte de dado em nenhuma seção (achado explícito do CTO no Gate 2, `risk-and-compliance-check`, severidade Média: "não há regra de por quanto tempo lançamentos/exportações/fotos de recibo ficam retidos, nem processo de exclusão de conta/dado"). O `UX-SPEC.md` (Seção 7.1) também registrou a ausência, corretamente, sem desenhar tela sem base arquitetural. | `CTO-REVIEW.md` Gate 2, subseção "Risco e Compliance"; recomendação explícita ao Tech Lead na seção "Recomendação" do mesmo Gate | Todo o bloco de tarefas de Fase 3 (Seção 3.3), especialmente `BE-F3-08` diretamente | **Resolvido — 2026-09-02, por `software-architect`.** Política formalizada em `adr/011-politica-retencao-descarte-dado-exclusao-conta.md` e em `SDD.md` Seção 7, nova subseção "Retenção e Descarte de Dado". Registro completo da resolução em `BLOCKERS.md`, Bloqueio 002. Consequência direta em `TASK.md`: `BE-F3-08` reestimada (1.5 → 2.5 dias, Seção 3.3); 3 tarefas novas criadas (`BE-F3-09`, `BE-F3-10`, `FE-F3-09`) mais `QA-F3-04`; bloqueio das 18 tarefas de Fase 3 + 3 de QA removido (guardrail `G-13` satisfeito); Seção 5 atualizada com o novo total (≈120.5 dias) |

### 6.1.1 Pendência de sincronização com UX/UI (não é lacuna estrutural do SDD.md)

| ID | Pendência | Origem | Tarefa afetada | Status |
|---|---|---|---|---|
| **UX-01** | `ADR-011` delega explicitamente ao UX/UI o desenho do fluxo de tela de exclusão de conta ("Condição de revisão": "Fluxo de UI/UX do pedido de exclusão de conta ... fica a cargo do UX/UI e não é definido por esta ADR"). `UX-SPEC.md` ainda não tem essa tela — correto, já que a base arquitetural só existe desde a resolução de `CC-01`. Não é lacuna estrutural do `SDD.md` (não escala ao Software Architect); é um ponto de sincronização normal com o UX/UI, mesmo tratamento já usado para outras telas que dependem de decisão arquitetural prévia. | `adr/011-politica-retencao-descarte-dado-exclusao-conta.md`, "Condição de revisão" | `FE-F3-09` (Seção 3.3) | **Sinalizado ao UX/UI.** `FE-F3-09` segue com estimativa preliminar (1 dia, usando componentes já existentes) até `UX-SPEC.md` formalizar a tela definitiva; quando isso acontecer, a tarefa é reestimada conforme a regra geral de sincronização com UX/UI (não força o design a caber na estimativa preliminar). Não bloqueia o restante da Fase 3 nem o Gate 3. |

### 6.2 Lacunas de detalhe (decididas pelo Tech Lead, documentadas — não escaladas)

| ID | Lacuna de detalhe | Decisão do Tech Lead | Racional |
|---|---|---|---|
| DET-01 | Layout exato de exportação em PDF não fechado (`PRD-TECNICO.md` AMB-05; `SDD.md` Seção 3 registra "a detalhar na fase tática") | Layout mínimo: cabeçalho com período selecionado, bloco de resumo (saldo, entradas, saídas, distribuição por categoria em tabela), sem gráfico embutido no PDF nesta primeira versão — cobre exatamente RF-F3-06 AC2 sem inventar requisito visual não pedido | O `PRD-TECNICO.md` já delegou este detalhe explicitamente "à fase tática"; a Fase 3 é a mais distante do roadmap, e um layout mais rico pode ser proposto pelo UX/UI depois sem bloquear `BE-F3-07`/`FE-F3-08` agora |
| DET-02 | Onde o hash/salt do PIN local é persistido (ADR-005 diz "verificado no dispositivo", `ADR-010` confirma que o gesto é 100% local, mas nenhum artefato nomeia a tabela/storage exato) | Persistido em IndexedDB local (mesmo mecanismo de `DIR-11`), nunca em tabela de `public`, nunca em `user_metadata` do Supabase Auth. **Nota (ADR-013)**: esta decisão de detalhe é sobre o gesto de desbloqueio *do client novo*, não sobre as RPCs `set_pin`/`verify_pin` já existentes em `public` — a relação entre as duas é exatamente o que `BE-M-09` audita antes de considerar esta tarefa encerrada sem ressalva | Consistente com `ADR-010` (gesto de desbloqueio funciona offline, sem chamada de rede); manter fora de qualquer tabela server-side reduz superfície de exposição em caso de vazamento de banco |
| DET-03 | Granularidade do agendamento das Edge Functions de geração de recorrência/conta fixa: `pg_cron` mensal fixo vs. verificação diária das datas configuradas | Verificação diária das datas configuradas (dia do mês de cada `RecurringTemplate`/`FixedBill` é livre, não fixo no dia 1) | RF-F2-02 AC1 e RF-F2-06 AC1 permitem "dia do mês" configurável por template/conta — um cron mensal fixo não cobriria todos os dias possíveis corretamente |
| DET-04 | `InstallmentPurchase`: valor informado é "total" ou "por parcela" (`PRD-TECNICO.md` RF-F2-04 AC1 aceita os dois na descrição do requisito, sem fixar um) | Formulário sempre captura valor **total**; parcela = total ÷ N, com a última parcela absorvendo o resto da divisão (arredondamento) | Reduz ambiguidade de UI (um único campo, não dois modos alternantes); evita erro de soma acumulada ao longo das parcelas |
| DET-05 | `BLOCKERS.md` Bloqueio 005: Backend encontrou 3 Edge Functions de uma implementação anterior cobrindo exatamente o escopo de `BE-M-09` (MFA por e-mail, registro/autenticação WebAuthn), nunca auditadas porque nem `BE-M-00` nem a tabela de auditoria do `ADR-012` listaram "Edge Functions" como categoria de objeto a auditar. Duas decisões: (a) qual caminho seguir para `BE-M-09` especificamente; (b) se a lacuna de processo precisa de correção estrutural | (a) Caminho 1 — adotar as 3 Edge Functions existentes, descartando o código novo do Backend (`BE-M-09` reescrita, Seção 3.1); (b) `DIR-33` (nova, Seção 1.1) torna Edge Functions categoria obrigatória de auditoria, pré-requisito de `BE-M-10`/`BE-F3-00` a `BE-F3-04` | Não é lacuna estrutural do `SDD.md` nem reabertura de `ADR-012` (que permanece imutável) — é aplicação do mesmo princípio que `ADR-012` já mandatou (reaproveitar mediante auditoria formal) a uma categoria de objeto que o processo de auditoria original omitiu por escopo, não por mérito. Dentro da autoridade do Tech Lead decidir e documentar, sem escalar ao Software Architect. **Exceção**: o risco de replay de challenge encontrado durante a auditoria não é uma lacuna de detalhe de implementação — é uma lacuna de segurança conhecida e não resolvida, escalada à parte como `BLOCKERS.md` Bloqueio 006 (`cto`/`devsecops`), decidida por eles, não pelo Tech Lead (ver `DET-06` para o desdobramento) |
| DET-06 | `BLOCKERS.md`/`CTO-REVIEW.md` Bloqueio 006: o CTO decidiu mitigar agora o risco de replay de challenge WebAuthn e pediu ao Tech Lead para **avaliar** propor, à sua aprovação futura, um guardrail formal cobrindo a recomendação do DevSecOps — qualquer tarefa futura que reutilize `webauthn-authenticate`/`webauthn-register` como prova de posse para gate de ação sensível (exclusão de conta, export, revelar PIN, troca de credencial) deve documentar essa dependência explicitamente, porque nesse cenário a severidade do risco de replay sobe de Média para Alta | **Não propor agora.** Registrar como item de atenção rastreável, não como regra em `GUARDRAILS.md` | Com a mitigação de `BE-M-09` aplicada, a causa raiz do risco específico já está corrigida — a regra proposta seria puramente preventiva para um cenário que hoje não existe em nenhuma tarefa planejada de MVP/Fase 2/Fase 3 deste `TASK.md` (a exclusão de conta de `ADR-011`/`BE-F3-09`, candidata mais óbvia, não usa WebAuthn como mecanismo hoje). Criar regra inegociável e permanente para um requisito hipotético tensiona os critérios de `guardrails-drafting` (abrangência de projeto real, não regra especulativa). **Gatilho explícito para reabrir esta avaliação**: no momento em que qualquer tarefa futura de Fase 2/3 propuser concretamente usar `webauthn-authenticate`/`webauthn-register` como gate de reautenticação para ação sensível, o Tech Lead reabre esta decisão e, se aplicável, propõe o guardrail formal ao CTO naquele momento — com o requisito real em mãos em vez de uma hipótese. Até lá, esta linha (`DET-06`) é o registro do alerta, servindo o mesmo propósito de rastreabilidade sem converter em regra prematura |

| DET-07 | `BLOCKERS.md` Bloqueio 010 / `CTO-REVIEW.md` "Revisão de Segurança do Lote MVP" item 2: o CTO já decidiu **o quê** (corrigir ownership de FK cross-tenant, prazo antes de Fase 3) e delegou ao Tech Lead **como estruturar** isso em `TASK.md` — em que bloco colocar a tarefa (MVP vs. Fase 3) e como expressar o gate | Tarefa nova (`BE-M-13`) no bloco **Backend do MVP** (Seção 3.1), não em Fase 3, porque ela corrige objetos já criados por `BE-M-01`/já auditados por `BE-M-00` — a tarefa em si não é trabalho de Fase 3. O **gate** (nenhum `BE-F3-*` inicia antes de `BE-M-13` `Concluída`) é expresso como segunda pré-condição do bloco Fase 3 (Seção 3.3), mesmo mecanismo já usado para `CC-01`/`G-13` | Não é lacuna estrutural do `SDD.md` nem decisão de risco de segurança — essas duas já foram resolvidas pelo CTO/DevSecOps na origem (`BLOCKERS.md` Bloqueio 010). É puramente uma decisão de estrutura de documento (onde a tarefa vive, como o gate é expresso), dentro da autoridade normal do Tech Lead de decompor/sequenciar tarefas — não escalada ao Software Architect |
| DET-08 | `BLOCKERS.md` Bloqueio 015 / `SECURITY-REVIEW.md` SEC-DEBT-008: causa raiz corrigida e verificada (Backend + DevSecOps, independentemente) antes de qualquer decisão de estrutura de documento ser necessária. Três decisões cabiam ao Tech Lead: (a) formalizar ou não como tarefa nova; (b) uma tarefa ou duas (Backend/Frontend); (c) em que lote registrar, dado que o achado nasceu durante a auditoria de "Categorização" mas seu escopo é todo o produto | (a) Sim, formalizar — `BE-M-14`/`FE-M-13` novas, retroativas (já `Concluída`), mesmo tratamento excepcional de `BE-M-12`; (b) Duas tarefas, uma por trilha (escopo/dono/evidência próprios em cada uma, diferente de `BE-M-13` que foi só Backend); (c) Lote **"Autenticação & Segurança"**, mesmo critério já usado para `BE-M-13` — correção sistêmica de autorização que toca toda tabela "ownable" é preocupação transversal de Autenticação/Autorização (`SDD.md` Seção 7), não pertence ao bounded context onde foi descoberta | Não é lacuna estrutural do `SDD.md` (a arquitetura já previa RLS `auth.uid() = user_id` como mecanismo de autorização — o gap era de implementação/execução, não de desenho) nem decisão de risco de segurança (já resolvida pelo DevSecOps/Backend/Frontend na origem, `SECURITY-REVIEW.md` Seção 1.12, veredito "Aprovado com débito" para o lote). É puramente decisão de estrutura de documento (formalizar como tarefa, quantas, em que lote), dentro da autoridade normal do Tech Lead — não escalada ao Software Architect. **Sobre a validade dos 3 lotes já fechados (Fundação, Contas & Formas de Pagamento, Ledger & Dashboard)**: concordo com a conclusão do DevSecOps de que não precisam ser reabertos — a causa raiz era uma pré-condição de plataforma ausente desde o início do projeto (nenhuma coluna `user_id` jamais teve `DEFAULT`, em nenhum ponto do histórico), não uma regressão introduzida por trabalho feito dentro de nenhum desses lotes; a correção da pré-condição não invalida os critérios de aceite/débitos já registrados individualmente em cada um |

Nenhuma outra lacuna estrutural foi encontrada durante a decomposição — as três
condições explicitamente citadas pelo CTO no Gate 2 (spike de schema legado, ressalva
de OCR, condições de entrada de Open Finance) já estavam corretamente endereçadas
como spikes (Seção 2) ou diretrizes obrigatórias (Seção 1), não como lacunas
estruturais adicionais.

### 6.3 Racional do Agrupamento em Lotes (Seção 3) — retroatividade documental, 2026-09-03

Esta subseção documenta o critério usado para preencher a coluna **Lote** da Seção 3
(ver "Nota de Atualização Estrutural (Convenção de Lote)" no topo do documento). Não é
uma lacuna do `SDD.md` — é o racional de uma decisão de estrutura de documento, dentro
da autoridade normal do Tech Lead, análogo a `DET-07`.

**Origem primária do agrupamento**: os *bounded contexts* de `SDD.md` Seção 2.2.
Onde uma tarefa mapeia claramente a um único bounded context (pelo campo "Origem
(componente/tela)" já presente na Seção 3, tipicamente um RF específico), o lote leva
o nome do bounded context correspondente: **Contas & Formas de Pagamento**,
**Categorização**, **Orçamento**, **Cartão & Fatura**, **Recorrência &
Parcelamento**, **Contas Fixas**, **Metas**. Onde uma única tarefa toca mais de um
bounded context (comum em migrations compartilhadas, ex. `BE-M-01` cria `budget` e
reforça guardas de `accounts`/`categories`), a tarefa foi atribuída ao lote do seu
entregável primário/estrutural, nunca duplicada em dois lotes.

**Critério mais próximo, para tarefas sem bounded context correspondente no
`SDD.md`** (documentado aqui, conforme exigido quando o `SDD.md` não particiona
claramente — ver `tech-lead.md`, "Agrupamento em Lote"):

- **Fundação Técnica & Infraestrutura** (MVP): scaffolding de UI sem tela de negócio
  própria (`FE-M-00/01/02`), auditoria geral de schema reaproveitado (`BE-M-00`),
  migration de schema compartilhada por múltiplos bounded contexts (`BE-M-01`),
  backup/confiabilidade (`BE-M-10`, ADR-009, cross-cutting) e o plano de teste geral
  do MVP (`QA-M-01`, que cobre RF-MVP-01 a 08 como um todo). Critério: é a base que
  desbloqueia todos os demais lotes do MVP (ver Seção 4.1, caminho crítico), sem
  bounded context próprio no `SDD.md`.
- **Ledger & Dashboard** (MVP): `SDD.md` trata "Ledger (Lançamentos)" como bounded
  context explícito; Dashboard (`BE-M-07`/`FE-M-10`, RF-MVP-05/06) não tem bounded
  context próprio, mas é modelo de leitura direto sobre o Ledger — agrupado junto por
  proximidade de dado e dependência direta (`BE-M-07` depende de `BE-M-06`, Seção
  4.1). `FE-M-03` (fila offline) e `FE-M-09` (telas de lançamento) completam o lote
  por pertencerem ao mesmo RF-MVP-04.
- **Autenticação & Segurança** (MVP): `SDD.md` Seção 7 ("Autenticação/Autorização/
  Isolamento Multi-Tenant") trata este tema como preocupação arquitetural de primeira
  classe, mesmo sem ser um bounded context na lista da Seção 2.2. Agrupa `BE-M-09`
  (Auth/WebAuthn/MFA), `BE-M-11` (suíte de RLS cross-user, cobre todas as tabelas),
  `BE-M-12` (restrição de cadastro), `BE-M-13` (correção de ownership de FK
  cross-tenant), `BE-M-14`/`FE-M-13` (Bloqueio 015, correção sistêmica de
  `user_id`/`DEFAULT auth.uid()` em toda tabela "ownable", mesmo racional de
  transversalidade já usado para `BE-M-13`), `FE-M-04` (telas de auth) e `FE-M-12`
  (config base, depende de auth para logout/alterar PIN), mais `QA-M-02` (reforça
  RN-08/09 + RLS, testa o resultado de `BE-M-11`). **Nota de dependência
  intencional**: `BE-M-11`/`BE-M-13`/`QA-M-02`
  dependem, na prática, de todos os demais lotes do MVP estarem com tabela/policy
  reais (Seção 4.1) — o lote fecha por último entre os lotes de MVP não por
  isolamento arbitrário, mas porque validação de segurança transversal
  genuinamente precisa de todo o restante pronto para ter cobertura completa (mesmo
  racional de "não isolar tarefas fortemente interdependentes").
- **Relatórios (Fase 2)** / **Relatórios & Exportação (Fase 3)**: `SDD.md` só nomeia
  "Relatórios & Exportação" como bounded context associado a RF-F3-05/06; RF-F2-10
  (relatório comparativo, `BE-F2-10`/`FE-F2-08`) não tem bounded context formal na
  Fase 2. Usado o rótulo mais próximo (mesma família funcional), como lote próprio de
  Fase 2 — nunca cruzando para a Fase 3, mesmo reaproveitando o nome.
- **Notificações & Configurações** (Fase 2): o bounded context "Notificações" cobre
  `BE-F2-09`/`FE-F2-07`; `FE-F2-09` (configurações: toggles de notificação + limiares
  padrão de RN-04/05) foi agrupado aqui por ser majoritariamente sobre os mesmos
  toggles de notificação, não por ter bounded context próprio.
- **Fechamento & Regressão Fase 2 / Fase 3**: `QA-F2-01`/`QA-F2-02` e
  `QA-F3-01`/`QA-F3-02`/`QA-F3-03` são validações cross-cutting que dependem de
  múltiplos lotes de implementação da mesma fase already `Concluída` (Seção 4.2/4.3)
  — não pertencem a um único bounded context, então formam um lote de fechamento
  próprio, 100% QA, ao final de cada fase (um lote 100% QA é tão válido quanto um
  lote 100% Backend, mesmo princípio de `tech-lead.md`).
- **Captura Automatizada — Voz & Foto / Importação de Extrato / Open Finance**
  (Fase 3): `SDD.md` agrupa voz+foto+importação+Open Finance sob um único bounded
  context ("Captura Automatizada", RF-F3-01 a 04). Esta correção **subdivide** esse
  bounded context em 3 lotes menores, por decisão do Tech Lead, porque a própria
  Seção 5 (Riscos) e a Seção 4.3 (dependências) deste documento já tratam esses 4
  canais como independentemente implantáveis (`SPK-002` bloqueia só OCR, `SPK-003`
  bloqueia só Open Finance, "voz, foto e importação podem seguir para produção mesmo
  se o Pluggy não aceitar o tier assumido") — manter um único lote de 12 tarefas
  contrariaria o próprio propósito do lote como unidade de ritmo incremental de
  QA/DevSecOps/deploy (`EXECUTION-FLOW.md`, "Histórico de revisão"). Voz e foto
  permanecem no mesmo lote (`BE-F3-00` base compartilhada + `BE-F3-01`/`02` +
  `FE-F3-01` a `04`) porque convergem estruturalmente em `FE-F3-04` (banner de
  confirmação único para os dois canais, RNF-01); Importação (`BE-F3-03`/`FE-F3-05`)
  e Open Finance (`BE-F3-04`/`05`/`FE-F3-06`) são lotes próprios por não
  compartilharem tela de convergência nem gate de spike com os demais.
- **Retenção & Descarte de Dado / Exclusão de Conta** (Fase 3): não é bounded
  context do `SDD.md` Seção 2.2 — é o conjunto de tarefas geradas diretamente por
  `ADR-011` (`BE-F3-08/09/10`, `FE-F3-09`, `QA-F3-04`, todas já rastreadas juntas na
  Seção 6.1 desde a resolução de `CC-01`). Agrupadas por já compartilharem a mesma
  origem/racional documentado, não por bounded context formal.

Nenhuma tarefa ficou sem lote; nenhum lote cruza fase; a contagem de tarefas por
lote soma exatamente as 74 tarefas da Seção 3 (29 MVP + 21 Fase 2 + 24 Fase 3) mais
`BE-M-14`/`FE-M-13` (Bloqueio 015, retroativas, ver Nota de Resolução de Risco
(Bloqueio 015) — 76 tarefas no total desde 2026-09-03).

---

## 7. Log de Lotes Fechados

Preenchida pelo Tech Lead **durante a fase de execução** (`EXECUTION-FLOW.md`), não
no rascunho — uma linha por lote, registrada quando o Tech Lead aprova o lote
conforme o "Critério de Aprovação de Lote" (`tech-lead.md`): toda tarefa do lote
`Concluída`; `QA-REPORT.md` Aprovado/Aprovado com ressalvas para toda tarefa do lote;
`SECURITY-REVIEW.md` Aprovado/Aprovado com débito para o lote; nenhum `BLOCKERS.md`
aberto afetando o lote; nenhuma diretriz da Seção 1 violada sem exceção registrada;
esforço real reconciliado com a estimativa original. É este registro que libera o
DevOps para o deploy do lote correspondente (`EXECUTION-FLOW.md`, "Aprovação de lote
pelo Tech Lead").

Nenhum lote havia sido fechado por este mecanismo até esta correção estrutural
(fechamento de lote exige o veredito conjunto de QA + DevSecOps + Tech Lead sobre o
lote inteiro, não a soma de tarefas concluídas isoladamente). **Primeiro lote
fechado em 2026-09-03** ("Fundação Técnica & Infraestrutura") — ver racional em 7.1
abaixo. **Segundo lote fechado, mesma data** ("Contas & Formas de Pagamento") — ver
racional em 7.2 abaixo. **Terceiro lote fechado, mesma data** ("Ledger &
Dashboard") — ver racional em 7.3 abaixo. **Quarto lote fechado, mesma data**
("Categorização") — ver racional em 7.4 abaixo. **Quinto lote fechado, mesma data**
("Orçamento") — ver racional em 7.5 abaixo.

| Lote | Tarefas incluídas | Data de fechamento | Veredito QA | Veredito DevSecOps | Débitos registrados | Deploy |
|---|---|---|---|---|---|---|
| Fundação Técnica & Infraestrutura | BE-M-00, BE-M-01, BE-M-10, FE-M-00, FE-M-01, FE-M-02, QA-M-01 | 2026-09-03 | Aprovado com ressalvas (6/7 Aprovado; BE-M-10 Aprovado com ressalva — `QA-REPORT.md` Seção 3.7) | Aprovado com débito (nenhum achado bloqueia o lote — `SECURITY-REVIEW.md` Seção 1.7) | QA-DEBT-001 (baixa, `Toast.tsx`, referenciada, não gerada por este lote); SEC-DEBT-005 (Alta/dimensão DR, não explorável — espelha `BLOCKERS.md` Bloqueio 012); `BLOCKERS.md` Bloqueio 007 (credencial S3 externa pendente do stakeholder) e Bloqueio 012 (gaps de `schema-baseline-legacy.sql`) carregados como débito explícito, não resolvidos — ver 7.1 | **Concluído em staging** (2026-09-03, deploy real via Vercel CLI local — `mymoney-staging.vercel.app`, ver `DEPLOY.md` §9.2). Reuso do projeto Vercel legado `mymoney` autorizado pelo stakeholder. Pipeline de CI/CD automatizado segue **não operacional** (GitHub Actions Secrets ainda não configurados — `gh` CLI indisponível nesta sessão; `BLOCKERS.md` Bloqueio 004, Parcialmente resolvido). Deploy em produção: não realizado, fora do escopo autorizado desta rodada |
| Contas & Formas de Pagamento | BE-M-02, BE-M-03, BE-M-04, FE-M-05, FE-M-06, FE-M-07 | 2026-09-03 | Aprovado, sem ressalva individual (6/6 — `QA-REPORT.md` Seção 4.6) | Aprovado com débito (nenhum achado bloqueia o lote — `SECURITY-REVIEW.md` Seção 1.9, "Veredito consolidado do lote") | QA-DEBT-006 (baixa/média, `FE-M-05` sem arquivo de teste próprio nas 2 páginas de onboarding, comportamento confirmado correto por leitura direta de código, não bloqueante); SEC-DEBT-006 / `BLOCKERS.md` Bloqueio 013 (Alta em impacto potencial/baixa exploitabilidade hoje — gap de ownership de FK em `payment_methods.account_id`, mesma classe de SEC-DEBT-002/Bloqueio 010, condição de bloqueio automática — não calendário —, ratificada para este achado-irmão pelo mesmo racional já fixado pelo CTO; dono da correção: backend) carregado como débito explícito, não resolvido — ver 7.2 | **Concluído em staging** (2026-09-03, deploy real via Vercel CLI local — `mymoney-staging.vercel.app`, ver `DEPLOY.md` §9.3). Mesmo projeto Vercel `mymoney` já linkado, sem mudança de infraestrutura. Pipeline de CI/CD automatizado segue **não operacional** (GitHub Actions Secrets ainda não configurados; `BLOCKERS.md` Bloqueio 004, Parcialmente resolvido). Deploy em produção: não realizado, fora do escopo autorizado desta rodada |
| Ledger & Dashboard | BE-M-06, BE-M-07, FE-M-03, FE-M-09, FE-M-10 | 2026-09-03 | Aprovado com ressalvas (4/5 Aprovado; FE-M-09 Aprovado com ressalva — `QA-REPORT.md` Seção 5.6) | Aprovado com débito (nenhum achado bloqueia o lote — `SECURITY-REVIEW.md` Seção 1.11, "Veredito consolidado final do lote") | QA-DEBT-007 (média, `FE-M-09` sem validação `onBlur`, só "no submit" — submissão continua rejeitando dado inválido/parcial corretamente, não bloqueante); QA-DEBT-008 (baixa/média, canal Realtime cross-tab de `BE-M-07`/`FE-M-10` não implementado — resolve `G-TP-01`, não é dependência crítica para a própria ação do usuário); SEC-DEBT-007 / `BLOCKERS.md` Bloqueio 014 (Média — `apply_transaction_effect` exposta como RPC pública sem `SECURITY DEFINER`/`REVOKE`, herdado do legado, exploitabilidade autolimitada à própria conta do atacante via RLS incidental de `accounts`, dono da correção: backend) carregado como débito explícito, não resolvido — ver 7.3 | **Concluído em staging** (2026-09-03, deploy real via Vercel CLI local — `mymoney-staging.vercel.app`, ver `DEPLOY.md` §9.4). Migrations do lote confirmadas já aplicadas (`supabase migration list --linked`, nenhuma pendência). Mesmo projeto Vercel `mymoney` já linkado, sem mudança de infraestrutura. Pipeline de CI/CD automatizado segue **não operacional** (GitHub Actions Secrets ainda não configurados; `BLOCKERS.md` Bloqueio 004, Parcialmente resolvido). Achado não-bloqueante: 1 teste flaky de timing (`UnlockPage.test.tsx`), não reprodutível isoladamente nem em reexecução completa da suíte — registrado em `DEPLOY.md` §9.4 como observação para Frontend/QA. Deploy em produção: não realizado, fora do escopo autorizado desta rodada |
| Categorização | BE-M-05, FE-M-08 | 2026-09-03 | Aprovado com ressalva (1/2 Aprovado — BE-M-05; 1/2 Aprovado com ressalva — FE-M-08, `QA-REPORT.md` Seção 6.6) | Aprovado com débito (achado crítico `SEC-DEBT-008`/Bloqueio 015 encontrado, corrigido e verificado nesta mesma rodada — `SECURITY-REVIEW.md` Seção 1.12, "Veredito final do lote: Aprovado com débito") | QA-DEBT-009 (média, `FE-M-08` — modal de bloqueio de exclusão não distingue "orçamento vinculado" de "lançamento vinculado", mostra contagem/CTA de lançamentos mesmo quando o motivo real é orçamento; exclusão em si continua corretamente bloqueada, só a mensagem é imprecisa, não bloqueante); SEC-DEBT-009 (baixa, reprodução HTTP/`supabase-js`/navegador ponta a ponta do Bloqueio 015 ainda pendente de credencial acessível); SEC-DEBT-010 (baixa, `push_subscriptions` sem `withOwnerId` no Frontend, causa raiz já coberta pelo `DEFAULT` do banco) — ver 7.4. `BLOCKERS.md` Bloqueio 015 (achado sistêmico crítico, ausência de `user_id`/`DEFAULT auth.uid()` em toda tabela "ownable"): aberto, corrigido e fechado como **Resolvido** dentro desta mesma rodada, via `BE-M-14`/`FE-M-13` (novas, retroativas, Seção 3.1) — ver 7.4 | **Concluído em staging** (2026-09-03, deploy real via Vercel CLI local — `mymoney-staging.vercel.app`, ver `DEPLOY.md` §9.5). Migration crítica `be_m14` (Bloqueio 015) reconfirmada já aplicada em produção (`supabase migration list --linked`), não reaplicada; build deployado já propaga a correção complementar `FE-M-13`. Mesmo projeto Vercel `mymoney` já linkado, sem mudança de infraestrutura. Pipeline de CI/CD automatizado segue **não operacional** (GitHub Actions Secrets ainda não configurados; `BLOCKERS.md` Bloqueio 004, Parcialmente resolvido). Achado agravado, não-bloqueante: `UnlockPage.test.tsx` (fora do escopo deste lote) flaky em 3/3 execuções completas da suíte nesta rodada, passa isolado — escalado a Frontend/QA em `DEPLOY.md` §9.5. Deploy em produção: não realizado, fora do escopo autorizado desta rodada |
| Orçamento | BE-M-08, FE-M-11 | 2026-09-03 | Aprovado (2/2, nenhuma ressalva individual — `QA-REPORT.md` Seção 7.6) | Aprovado, sem débito novo (`SECURITY-REVIEW.md` Seção 1.15, "Veredito do lote: Aprovado, sem débito novo") | QA-DEBT-010 (baixa, `aria-valuenow` > `aria-valuemax` em `ProgressBar.tsx` no estado de estouro >100%, dono frontend, sem urgência — não é achado de segurança, confirmado em `SECURITY-REVIEW.md` Seção 1.15 `finding-severity-classification`); nenhum débito de segurança novo — `SEC-DEBT-002`/Bloqueio 010 (mesma classe de risco de ownership de FK que originalmente tocava `budget`) já corrigido especificamente para este lote desde `BE-M-13` (lote "Autenticação & Segurança"), revalidado sem gap residual em `SECURITY-REVIEW.md` Seções 1.14 e 1.15 — ver 7.5 | **Já em produção**, fora de ordem em relação ao padrão dos 4 lotes anteriores — ver racional em 7.5. Código deste lote foi promovido a produção em 2026-09-03 como parte de uma promoção mais ampla, autorizada explicitamente pelo stakeholder e abrangendo todo o restante já implementado até o fim da Fase 2, **antes** da validação formal QA/DevSecOps por lote existir para "Orçamento" especificamente (`DEPLOY.md` §9.6/§9.7 — `dpl_7PjJSDGsufM7EsteptLX9ckRHRAp`, `mymoney-pink-phi.vercel.app`; `BLOCKERS.md` Bloqueio 016, item 1, registrou esse desvio de processo por transparência). Este registro de Seção 7 formaliza retroativamente a dupla aprovação QA+DevSecOps para este lote — não é o gatilho de um novo deploy (já realizado e confirmado `READY`/`200 OK`), e sim o fechamento do gate de processo que valida o que já está servindo em produção |

### 7.1 Racional de fechamento — Bloqueio 007 e Bloqueio 012 (não impedem o registro do lote)

Ambos seguem `Aberto` em `BLOCKERS.md` e tocam `BE-M-10`, tarefa deste lote — o texto
literal do critério de aprovação de lote ("nenhum `BLOCKERS.md` aberto afetando o
lote") poderia sugerir reprovação. Decido **não reprovar**, pelo mesmo padrão de
julgamento documentado já em `DET-05` a `DET-07` (Seção 6.2): decidir dentro da minha
autoridade, sem invadir a de QA/DevSecOps/CTO, documentando o racional, não só a
conclusão.

1. **Nenhum dos dois bloqueios afeta o funcionamento das tarefas do lote — afetam uma
   garantia mais ampla, não testada por nenhum critério de aceite literal deste
   lote.** Texto do próprio Bloqueio 007: "não bloqueia o fechamento de `BE-M-10` como
   implementação/mecanismo prontos e testados... mas bloqueia a garantia real de
   DIR-31/RPO do `ADR-009`." Texto do próprio Bloqueio 012: "não bloqueia nenhuma
   tarefa de Backend em andamento... bloqueia especificamente a execução do drill de
   restauração." Nenhum dos dois é "BE-M-10 não funciona"; ambos são "a promessa mais
   ampla de disaster recovery ponta a ponta ainda não é 100% verificável" — categoria
   diferente de um defeito na tarefa entregue.
2. **QA e DevSecOps, cada um dentro de sua própria autoridade, já chegaram
   independentemente à mesma leitura.** QA aprovou `BE-M-10` "com ressalva" (não
   Reprovado) porque "o critério de aceite literal da tarefa... está cumprido e
   testado" (`QA-REPORT.md` Seção 2.2/3.6). DevSecOps, auditando o lote via
   `static-security-analysis` (`SECURITY-REVIEW.md` Seção 1.7), concluiu
   textualmente: "Nenhuma tarefa deste lote... depende funcionalmente de
   `schema-baseline-legacy.sql` estar 100% completo... Veredito para o fechamento
   deste lote especificamente: não bloqueia." Não estou terceirizando minha decisão —
   os dois agentes com autoridade técnica sobre funcionalidade e segurança já
   avaliaram o mesmo fato e chegaram à mesma leitura antes de eu decidir.
3. **Ambos têm dono, condição de resolução e plano claros — não são pendência
   esquecida.** Bloqueio 007 depende de ação de terceiro (stakeholder provisiona
   credencial S3) fora da autoridade de qualquer agente — mesmo padrão já aceito no
   Bloqueio 004 (credenciais Vercel), que não travou a preparação de IaC/CI-CD do
   DevOps. Bloqueio 012 tem dono técnico (Backend) e condição de bloqueio restrita e
   explícita (drill de restauração, `DEPLOY.md` §6.3.4).
4. **O que o critério de aprovação de lote realmente protege no meu escopo** — "a
   decomposição em si continua íntegra depois de implementada" (`tech-lead.md`,
   explicitamente não reabrindo validação funcional do QA nem auditoria do DevSecOps)
   — não é violado por nenhum dos dois achados: nenhum indica `BE-M-10` mal
   decomposta ou critério de aceite mal definido; são lacunas de infraestrutura/
   processo em camada acima da tarefa.
5. **Reprovar o lote inteiro por essas duas pendências seria desproporcional**:
   travaria também as 6 tarefas aprovadas sem ressalva (`BE-M-00`, `BE-M-01`,
   `FE-M-00/01/02`, `QA-M-01`) à espera de uma credencial que só o stakeholder pode
   fornecer e de um drill que não é sequer tarefa deste `TASK.md`.

**Contrafactual explícito**: se qualquer um dos dois achados indicasse que o
mecanismo de backup não roda, não loga, ou falha silenciosamente, este veredito seria
Reprovado — isso violaria o critério de aceite literal da própria tarefa, e QA já
teria classificado como bug, não como ressalva. Não é o caso aqui.

Débitos carregados para além do fechamento deste lote (não resolvidos por este
registro, seguem `Aberto`/rastreados normalmente): `BLOCKERS.md` Bloqueio 007
(dono: stakeholder/CTO) e Bloqueio 012 (dono: Backend/DevOps); `SECURITY-REVIEW.md`
SEC-DEBT-005 (dono: Backend, correção; DevOps, drill).

### 7.2 Racional de fechamento — Bloqueio 013 (não impede o registro do lote)

Antes de registrar a linha do lote "Contas & Formas de Pagamento" na Seção 7,
apliquei o "Critério de Aprovação de Lote" (`tech-lead.md`) item a item, verificando
eu mesmo cada evidência (não presumindo pelo resumo de nenhum agente):

1. **Toda tarefa do lote `Concluída` no `TASK.md`**: confirmado por leitura direta da
   Seção 3.1 — `BE-M-02`, `BE-M-03`, `BE-M-04` (bloco Backend) e `FE-M-05`, `FE-M-06`,
   `FE-M-07` (bloco Frontend), todas com status "Concluída — 2026-09-0[2/3]." e nota
   de evidência própria (migration/teste/contrato publicado). Passa.
2. **`QA-REPORT.md` Aprovado/Aprovado com ressalvas para toda tarefa**: Seção 4.6
   ("Veredito de lote consolidado") registra as 6 tarefas como **Aprovado**, sem
   ressalva individual, e o veredito de lote textual é "Aprovado" (não "Aprovado com
   ressalvas"). Passa, sem ressalva.
3. **`SECURITY-REVIEW.md` Aprovado/Aprovado com débito para o lote**: Seção 1.9,
   "Veredito consolidado do lote" — texto literal "**Veredito do lote: Aprovado com
   débito.**" Passa.
4. **Nenhum `BLOCKERS.md` `Aberto` afetando o lote**: aqui está o único ponto que
   exige racional explícito, não uma verificação binária direta — ver abaixo.
5. **Nenhuma diretriz da Seção 1 violada sem exceção registrada**: `DIR-27` (RLS
   `auth.uid() = user_id`) cumprida nas 3 tarefas de Backend (confirmado por
   `SECURITY-REVIEW.md` Seção 1.9, tabela `security-requirement-validation`, linha
   1); `DIR-02`/`DIR-03`/`DIR-04` cumpridas (migration aditiva de `BE-M-02` com
   par down, achado de auditoria documentado antes de codar, nenhum `DROP`/`ALTER`
   destrutivo). O gap descrito no Bloqueio 013 (`payment_methods.account_id` sem
   validação de ownership de FK) **não é violação de nenhuma diretriz hoje escrita
   na Seção 1** — a regra que cobriria isso (`G-19`, `GUARDRAILS.md`) ainda está
   `[PROPOSTA — aguardando aprovação do CTO]`, não é uma diretriz vigente no momento
   em que `BE-M-02`/`BE-M-04` foram implementadas; é a mesma classe de gap já tratada
   como débito (não como violação de regra) para o achado-irmão `SEC-DEBT-002`/
   Bloqueio 010. Passa, sem exceção a registrar além do débito já rastreado.
6. **Esforço real reconciliado com a estimativa original**: as 6 tarefas somam 5.25
   dias ideais estimados (`BE-M-02` 0.25 + `BE-M-03` 1 + `BE-M-04` 0.5 + `FE-M-05` 1 +
   `FE-M-06` 1.5 + `FE-M-07` 1, Seção 3.1). Nenhuma delas gerou entrada em
   `BLOCKERS.md` do tipo "desvio grande de escopo/estimativa que exige
   replanejamento" (o canal de escalonamento definido em `tech-lead.md` para esse
   caso) — os únicos bloqueios tocando tarefas deste lote (Bloqueio 013) são achado
   de segurança, não de estouro de esforço. Trato como reconciliado sem divergência
   material a registrar como aprendizado para o próximo lote.

**Item 4 em detalhe — Bloqueio 013 é `Aberto`, mas não bloqueia o registro deste
lote.** Mesmo padrão de julgamento já aplicado em 7.1 (Bloqueio 007/012): decidir
dentro da minha autoridade, sem invadir a de QA/DevSecOps/CTO, documentando o
racional, não só a conclusão.

1. **O próprio texto do bloqueio já qualifica o próprio escopo do impedimento**:
   "Status: Aberto — não bloqueia o fechamento funcional/QA do lote 'Contas &
   Formas de Pagamento'" (`BLOCKERS.md` Bloqueio 013). Não é uma leitura minha —
   é a conclusão já registrada por quem encontrou e classificou o achado
   (DevSecOps).
2. **QA e DevSecOps, cada um dentro de sua própria autoridade, já chegaram
   independentemente à mesma leitura**, antes de eu decidir. QA aprovou as 6
   tarefas sem ressalva (`QA-REPORT.md` Seção 4.6) — o achado nem aparece como
   pendência na consolidação de QA, porque o comportamento funcional de
   `BE-M-02`/`BE-M-04`/`FE-M-07` está correto e testado (nenhum critério de aceite
   literal dessas tarefas exige validação de ownership de `account_id` — isso é
   requisito de segurança descoberto depois, não um AC não cumprido). DevSecOps,
   auditando o lote via `security-requirement-validation` (`SECURITY-REVIEW.md`
   Seção 1.9), concluiu textualmente: "**Veredito do lote: Aprovado com débito** ...
   o único item em aberto (`SEC-DEBT-006`) é débito registrado com dono e condição
   de bloqueio automática já fixados, não um achado que impeça o fechamento deste
   lote especificamente."
3. **Mesma classe de achado, mesmo racional já ratificado pelo CTO** para o
   achado-irmão (`SEC-DEBT-002`/Bloqueio 010): impacto potencial Alto, mas
   exploitabilidade baixa hoje (usuário único real, allow-list de signup ativa,
   UUID v4 não enumerável), com condição de bloqueio automática — não prazo de
   calendário — já fixada: nenhuma expansão de `allowed_signup_emails`, remoção do
   trigger de restrição de signup, ou feature multiusuário antes deste gap também
   estar corrigido. Diferente do Bloqueio 010, este item não teve um veredito
   explícito e dedicado do CTO ainda (o Bloqueio 010 teve; ver Nota de Resolução de
   Risco, acima) — mas o próprio DevSecOps já enquadrou o Bloqueio 013 como
   "extensão direta do escopo já decidido no Bloqueio 010... em vez de abrir uma
   nova deliberação de risco", e o dono/prazo de correção sugerido (backend, mesmo
   prazo já fixado para SEC-DEBT-002: antes de qualquer tarefa `BE-F3-*`) replica
   o precedente sem introduzir uma decisão de risco nova. Não decido eu mesmo que
   este é o veredito definitivo de risco — só decido que o precedente já ratificado
   pelo CTO é aplicável sem ambiguidade a ponto de não travar o fechamento deste
   lote especificamente; o veredito estratégico formal (se o CTO quiser emitir um
   novo, em vez de aceitar a extensão do precedente) segue em aberto no Gate 3/
   revisão de segurança do CTO, não neste registro de lote.
4. **O que o critério de aprovação de lote realmente protege no meu escopo** — "a
   decomposição em si continua íntegra depois de implementada" (`tech-lead.md`,
   explicitamente não reabrindo validação funcional do QA nem auditoria de
   segurança do DevSecOps) — não é violado pelo Bloqueio 013: o achado não indica
   `BE-M-02`/`BE-M-04`/`FE-M-07` mal decompostas ou critério de aceite mal definido;
   é uma lacuna de segurança em uma tabela existente, da mesma natureza que
   `BE-M-13` já corrigiu para `budget`/`transactions` no lote anterior — categoria
   de achado que o próprio mecanismo de débito rastreável (`SECURITY-REVIEW.md`
   Seção 2, `BLOCKERS.md`) existe para tratar sem reprovar todo o lote.
5. **Reprovar o lote inteiro por este achado seria desproporcional**: travaria as 6
   tarefas aprovadas sem ressalva à espera de uma correção cujo próprio DevSecOps
   já classificou como não-bloqueante hoje, com condição de bloqueio automática (não
   um prazo perdido) já definida.

**Contrafactual explícito**: se o achado indicasse que `payment_methods.account_id`
já está sendo explorado, ou que a exploração fosse trivialmente alcançável no
contexto real de hoje (mais de um usuário real, ou allow-list de signup já mais
permissiva), este veredito seria Reprovado — isso deixaria de ser um débito
condicional e passaria a ser um defeito de segurança ativo. Não é o caso: usuário
único real, allow-list restrita, achado só alcançável via chamada direta à API por
um usuário autenticado contra a própria conta (não um vazamento de dado de
terceiro).

Débito carregado para além do fechamento deste lote (não resolvido por este
registro, segue `Aberto`/rastreado normalmente): `BLOCKERS.md` Bloqueio 013 /
`SECURITY-REVIEW.md` SEC-DEBT-006 (dono: backend, mesmo prazo/condição já fixado
para SEC-DEBT-002 — antes de qualquer tarefa `BE-F3-*`, ou mais cedo, a critério do
CTO). **Sinalização explícita ao CTO**: recomendo que o Gate 3/próxima revisão de
segurança do CTO trate SEC-DEBT-006 junto de SEC-DEBT-002 (mesma correção,
`BE-M-13` como precedente direto), em vez de como item isolado — não decido isso
sozinho, é sinalização, não uma nova regra que este documento esteja impondo.

### 7.3 Racional de fechamento — Bloqueio 014 (não impede o registro do lote)

Antes de registrar a linha do lote "Ledger & Dashboard" na Seção 7, apliquei o
"Critério de Aprovação de Lote" (`tech-lead.md`) item a item, verificando eu mesmo
cada evidência nos artefatos originais (não presumindo pelo resumo de nenhum
agente).

1. **Toda tarefa do lote `Concluída` no `TASK.md`**: confirmado por leitura direta
   da Seção 3.1 — `BE-M-06`, `BE-M-07` (bloco Backend) e `FE-M-03`, `FE-M-09`,
   `FE-M-10` (bloco Frontend), todas com status "Concluída — 2026-09-0[2/3]." e
   nota de evidência própria (migration/teste/contrato publicado). Passa.
2. **`QA-REPORT.md` Aprovado/Aprovado com ressalvas para toda tarefa**: Seção 5.6
   ("Veredito de lote consolidado") registra `BE-M-06`, `FE-M-03` e `FE-M-10` como
   **Aprovado** sem ressalva; `BE-M-07` **Aprovado** com nota informativa (gap
   cross-tab, `QA-DEBT-008`, não rebaixa o veredito); `FE-M-09` **Aprovado com
   ressalva** (gap real de validação `onBlur`, `QA-DEBT-007`, severidade Média,
   não bloqueante — a metade "no submit" do critério está implementada e
   efetivamente bloqueia persistência de dado inválido/parcial). O veredito de
   lote textual é "Aprovado com ressalvas". Passa.
3. **`SECURITY-REVIEW.md` Aprovado/Aprovado com débito para o lote**: Seção 1.11,
   "Veredito consolidado final do lote" — texto literal "**Veredito do lote:
   Aprovado com débito.**" Passa.
4. **Nenhum `BLOCKERS.md` `Aberto` afetando o lote**: aqui está o único ponto que
   exige racional explícito, não uma verificação binária direta — ver abaixo,
   com uma nuance que os dois lotes anteriores não tiveram (o achado toca
   diretamente uma tarefa deste lote, não uma tarefa de outro lote ou uma camada
   de infraestrutura externa).
5. **Nenhuma diretriz da Seção 1 violada sem exceção registrada**: `DIR-27`
   (RLS `auth.uid() = user_id`) e o gate de MFA por claim de JWT cumpridos em
   `transactions` (confirmado por `SECURITY-REVIEW.md` Seção 1.11, tabela
   `security-requirement-validation`, linhas 1-2); `DIR-19`/`G-19` (ownership de
   FK) cumprido — `transactions_insert_own`/`_update_own` já validam
   `account_id`/`category_id`/`payment_method_id`/`destination_account_id` via
   `BE-M-13` (confirmado por leitura direta em `SECURITY-REVIEW.md` Seção 1.10,
   "Confirmação prévia obrigatória"); `DIR-11` (fila offline só via Dexie/
   IndexedDB, nunca `LocalStorage`) cumprida em `FE-M-03` (Seção 1.10); `DIR-12`
   (cliente nunca espera o canal Realtime para refletir a própria ação) cumprida
   — é exatamente a metade que `QA-DEBT-008` confirma implementada. O achado do
   Bloqueio 014 (`apply_transaction_effect` sem `SECURITY DEFINER`/`REVOKE`) **não
   é violação de nenhuma diretriz hoje escrita na Seção 1**: `DIR-02` exige
   confirmação de semântica/contrato e/ou teste de regressão para objetos
   reaproveitados com lógica de negócio embutida, citando nominalmente
   `apply_transaction_effect` — e isso foi cumprido (`BE-M-00`, 9 casos de
   regressão PASS, decisão "Adotar"). Nenhuma diretriz da Seção 1 hoje exige
   auditoria da superfície de `GRANT`/exposição-como-RPC-direto de função
   reaproveitada — é uma dimensão de achado que `DIR-02` não cobria no momento em
   que `BE-M-00`/`BE-M-06` foram implementadas, mesma leitura já aplicada ao gap
   de `G-19` no Bloqueio 013 (regra que cobriria o achado ainda não existia como
   diretriz vigente). Passa, sem exceção a registrar além do débito já rastreado;
   sinalizo como aprendizado de processo (não como diretriz nova a impor
   unilateralmente) que uma futura `DIR` sobre revisão de `GRANT` herdado de
   função reaproveitada, análoga a `DIR-33` para Edge Functions, poderia fechar
   essa classe de lacuna — decisão de propor isso formalmente fica para o próximo
   ciclo de `guardrails-drafting`, não decidida aqui.
6. **Esforço real reconciliado com a estimativa original**: as 5 tarefas somam 10
   dias ideais estimados (`BE-M-06` 2.5 + `BE-M-07` 2 + `FE-M-03` 1.5 + `FE-M-09`
   2 + `FE-M-10` 2, Seção 3.1). Nenhuma delas gerou entrada em `BLOCKERS.md` do
   tipo "desvio grande de escopo/estimativa que exige replanejamento" (o canal de
   escalonamento definido em `tech-lead.md` para esse caso) — o único bloqueio
   novo tocando tarefa deste lote (Bloqueio 014) é achado de segurança descoberto
   durante auditoria posterior, não estouro de esforço da implementação em si.
   Trato como reconciliado sem divergência material a registrar como aprendizado
   para o próximo lote.

**Item 4 em detalhe — Bloqueio 014 é `Aberto` e toca diretamente `BE-M-06` (via
`apply_transaction_effect`), mas não bloqueia o registro deste lote.** Mesmo padrão
de julgamento já aplicado em 7.1/7.2: decidir dentro da minha autoridade, sem
invadir a de QA/DevSecOps/CTO, documentando o racional, não só a conclusão. A
diferença deste caso para os dois anteriores é que aqui o achado nasce dentro do
próprio código de uma tarefa do lote (não de uma tarefa de outro lote, nem de uma
dependência externa de infraestrutura) — por isso o racional exige mais cuidado, não
menos.

1. **O próprio texto do bloqueio já qualifica o próprio escopo do impedimento**:
   "Status: Aberto — não bloqueia o fechamento funcional/QA do lote 'Ledger &
   Dashboard' (severidade Média, exploitabilidade autolimitada à própria conta do
   atacante, sem componente de compliance ou cross-tenant)" (`BLOCKERS.md`
   Bloqueio 014). Não é uma leitura minha — é a conclusão já registrada por quem
   encontrou e classificou o achado (DevSecOps).
2. **QA e DevSecOps, cada um dentro de sua própria autoridade, já chegaram
   independentemente à mesma leitura**, antes de eu decidir. QA aprovou `BE-M-06`
   sem ressalva (`QA-REPORT.md` Seção 5.2/5.6) — o achado nem é mencionado na
   consolidação de QA, porque o comportamento funcional do CRUD de lançamentos e
   do recálculo de saldo está correto e testado (nenhum critério de aceite
   literal de `BE-M-06` exige revisão de `GRANT`/superfície de RPC direta de uma
   função auxiliar interna — isso é requisito de segurança descoberto depois, não
   um AC não cumprido). DevSecOps, auditando o lote via `static-security-analysis`
   + auditoria completa (`SECURITY-REVIEW.md` Seções 1.10/1.11), concluiu
   textualmente: "**Veredito do lote: Aprovado com débito** ... o único item em
   aberto (`SEC-DEBT-007`/Bloqueio 014) é débito registrado com dono e correção
   sugerida, de severidade Média, não bloqueante."
3. **Contenção real, não hipotética, do impacto**: o próprio achado técnico
   confirma que o vetor não permite alteração/leitura de dado de outro usuário —
   o RLS incidental de `accounts_update_own` (`auth.uid() = user_id` + gate de
   MFA) contém o efeito à própria conta do atacante. O dano possível é
   auto-sabotagem/auto-benefício do próprio usuário sobre seu próprio ledger, sem
   rastro em `transactions` — categoria de risco diferente de IDOR cross-tenant
   (`SEC-DEBT-002`/`006`), e sem o padrão de "condição de bloqueio automática"
   que o CTO fixou para esses dois achados-irmãos (que envolvem vazamento/
   alteração de dado de **outro** usuário). Aqui não há trade-off de risco de
   produto para o CTO decidir — é correção técnica pura de privilégio mínimo,
   como o próprio DevSecOps registrou ("não aplicável como decisão de risco de
   negócio... sem trade-off de produto envolvido").
4. **O que o critério de aprovação de lote realmente protege no meu escopo** — "a
   decomposição em si continua íntegra depois de implementada" (`tech-lead.md`,
   explicitamente não reabrindo validação funcional do QA nem auditoria de
   segurança do DevSecOps) — não é violado pelo Bloqueio 014: o achado não indica
   `BE-M-06`/`BE-M-07` mal decompostas ou critério de aceite mal definido; é uma
   lacuna de privilégio mínimo em uma função auxiliar de trigger herdada do
   schema legado, nunca antes reavaliada sob a ótica de que `public` é hoje o
   schema de API real (`ADR-012`) — mesma classe de "achado de segurança em
   objeto reaproveitado, descoberto depois de a auditoria funcional já ter
   decidido 'Adotar'" que o próprio `DIR-02`/Bloqueio 010/013 já tratam via débito
   rastreável, não via reprovação de lote.
5. **Reprovar o lote inteiro por este achado seria desproporcional**: travaria as
   4 tarefas aprovadas (3 sem ressalva, 1 com ressalva não relacionada a este
   achado) à espera de uma correção que o próprio DevSecOps já classificou como
   não-bloqueante, de custo baixo, sem necessidade de migration destrutiva.

**Contrafactual explícito**: se o achado indicasse que `apply_transaction_effect`
permite alterar saldo de **outra** conta (não só a própria), ou que a exploração já
estivesse ocorrendo/fosse trivialmente alcançável sem sessão autenticada, este
veredito seria Reprovado — isso deixaria de ser um débito de privilégio mínimo
autolimitado e passaria a ser uma falha de autorização cross-tenant ativa. Não é o
caso: RLS de `accounts` contém o efeito à própria conta do chamador, sessão
autenticada + MFA verificado é pré-requisito, e o "ganho" do atacante sobre si mesmo
já é hoje alcançável por um caminho legítimo (`POST /transactions` manual falso) —
a diferença real é só ausência de rastro auditável, não uma nova capacidade de dano
a terceiro.

Débito carregado para além do fechamento deste lote (não resolvido por este
registro, segue `Aberto`/rastreado normalmente): `BLOCKERS.md` Bloqueio 014 /
`SECURITY-REVIEW.md` SEC-DEBT-007 (dono: backend, correção de baixo custo sugerida
— `SECURITY DEFINER` no trigger `transactions_maintain_account_balance` + `REVOKE`
em `apply_transaction_effect` —, recomendado no próximo toque no arquivo, sem prazo
de calendário fixo por ser de baixo custo). Nenhuma sinalização nova ao CTO
necessária além da já registrada por DevSecOps (`SECURITY-REVIEW.md` Seção 5, item
6) — é correção técnica sem trade-off de produto, não uma decisão de risco de
negócio pendente.

### 7.4 Racional de fechamento — lote "Categorização", achado crítico do Bloqueio 015
(BE-M-14/FE-M-13) e efeito sobre os 3 lotes anteriores

Antes de registrar a linha do lote "Categorização" na Seção 7, apliquei o "Critério
de Aprovação de Lote" (`tech-lead.md`) item a item, verificando eu mesmo cada
evidência nos artefatos originais (não presumindo pelo resumo de nenhum agente) —
mesmo rigor de 7.1/7.2/7.3, com uma diferença material: este lote teve, no meio do
próprio ciclo de fechamento, um achado crítico que pausou o orquestrador
(`BLOCKERS.md` Bloqueio 015) e foi resolvido antes de eu aplicar o critério.

1. **Toda tarefa do lote `Concluída` no `TASK.md`**: confirmado por leitura direta
   da Seção 3.1 — `BE-M-05` e `FE-M-08`, ambas com status "Concluída —
   2026-09-0[2/3]." e nota de evidência própria (contrato/teste publicado). Passa.
2. **`QA-REPORT.md` Aprovado/Aprovado com ressalvas para toda tarefa**: Seção 6.6
   ("Veredito de lote consolidado") registra `BE-M-05` **Aprovado** sem ressalva e
   `FE-M-08` **Aprovado com ressalva** (`QA-DEBT-009` — modal de bloqueio de
   exclusão não distingue "orçamento vinculado" de "lançamento vinculado" quando o
   motivo real do 409 é orçamento sem lançamento algum; a garantia central do
   critério de aceite — nunca excluir fisicamente categoria vinculada — continua
   correta em 100% dos casos, o gap é só de precisão de mensagem/CTA num
   subcenário, severidade Média, não bloqueante). O veredito de lote textual é
   "Aprovado com ressalva". Passa.
3. **`SECURITY-REVIEW.md` Aprovado/Aprovado com débito para o lote**: Seção 1.12/
   1.13 — texto literal "**Veredito final do lote: Aprovado com débito**"
   (`SEC-DEBT-009`, `SEC-DEBT-010`, ambos baixa severidade, sem condição de
   bloqueio automático). Passa — mas só depois de uma escala de achado crítico
   intermediária, detalhada no item 4.
4. **Nenhum `BLOCKERS.md` `Aberto` afetando o lote**: aqui está o ponto que exige
   o racional mais extenso já registrado nesta Seção 7, porque, diferente de
   7.1/7.2/7.3 (achados não-bloqueantes desde a origem), o Bloqueio 015 nasceu
   como **bloqueio incondicional** — ver detalhe completo abaixo.
5. **Nenhuma diretriz da Seção 1 violada sem exceção registrada**: `DIR-27` (RLS
   `auth.uid() = user_id`) cumprida em `categories`; a confirmação pontual pedida
   nesta rodada (gap de ownership de FK em `categories.parent_category_id`, mesma
   classe do Bloqueio 013) foi verificada e **não há gap** —
   `validate_category_hierarchy` fecha os dois caminhos possíveis por construção
   (comparação explícita de `user_id` + efeito colateral correto de rodar como
   `SECURITY INVOKER` sob RLS restritiva, `SECURITY-REVIEW.md` Seção 1.12). O
   achado do Bloqueio 015 (ausência de `user_id`/`DEFAULT` em `INSERT`) também
   **não era violação de nenhuma diretriz hoje escrita na Seção 1** no momento em
   que `BE-M-01`/`categories.ts` foram implementadas — nenhuma `DIR` exigia
   explicitamente `DEFAULT auth.uid()` em coluna de tabela "ownable" nem inclusão
   de `user_id` no payload do client, mesma leitura já aplicada aos gaps de
   `G-19`/superfície de `GRANT` nos Bloqueios 013/014. Passa, sem exceção a
   registrar além do débito já rastreado; corrigido dentro da mesma rodada
   (`BE-M-14`/`FE-M-13`, Seção 3.1), não fica como pendência aberta.
6. **Esforço real reconciliado com a estimativa original**: `BE-M-05` (1 dia) +
   `FE-M-08` (1.5 dia) = 2.5 dias ideais estimados (Seção 3.1), sem desvio
   registrado em `BLOCKERS.md` do tipo "estouro de escopo/estimativa" para
   nenhuma das duas. O esforço adicional de `BE-M-14`/`FE-M-13` (1.75 dia) não é
   estouro de estimativa de `BE-M-05`/`FE-M-08` — é esforço de duas tarefas novas,
   estimado e registrado à parte (Seção 3.1/5), próprias do lote "Autenticação &
   Segurança" (item 4d abaixo). Reconciliado sem divergência material.

**Item 4 em detalhe — Bloqueio 015: por que não impede o registro deste lote, apesar
de ter nascido como bloqueio incondicional (diferente de 7.1/7.2/7.3).**

a. **O achado nasceu, foi escalado e foi resolvido dentro do mesmo ciclo de
   fechamento deste lote — não é uma pendência que sobra em aberto para eu decidir
   contornar.** O próprio DevSecOps classificou a severidade como Crítica e o
   veredito inicial como "Bloqueado... pausa obrigatória do orquestrador"
   (`SECURITY-REVIEW.md` Seção 1.12) — diferente de todo achado anterior deste
   documento (SEC-DEBT-001 a 007), sem condição de contenção que permitisse tratar
   como débito de prazo. Eu não decidi "ignorar" um bloqueio incondicional: a
   condição de contenção (correção aplicada e verificada) foi cumprida antes de eu
   aplicar o critério de aprovação de lote, pelas trilhas com autoridade técnica
   sobre cada camada (Backend na correção primária, Frontend na defesa em
   profundidade), com checagem independente do próprio DevSecOps — não presumida.
b. **QA e DevSecOps, cada um dentro de sua própria autoridade, já chegaram
   independentemente à mesma leitura de fechamento**, antes de eu decidir. QA
   (`QA-REPORT.md` Seção 6.6) nem menciona o Bloqueio 015 como pendência do
   veredito de lote (achado é de DevSecOps, fora do escopo de `acceptance-criteria-
   validation`). DevSecOps, após a verificação independente, concluiu
   textualmente: "`SEC-DEBT-008`: FECHADO. Bloqueio 015 formalmente Resolvido...
   Veredito final do lote 'Categorização': Aprovado com débito" (Seção 1.12).
c. **Ambos os débitos residuais têm dono, severidade e condição de bloqueio
   já fixados — não são pendência esquecida.** `SEC-DEBT-009` (reprodução HTTP
   ponta a ponta, dono qa/devsecops, sem prazo fixo, "assim que credencial
   existir") e `SEC-DEBT-010` (`push_subscriptions` sem `withOwnerId`, dono
   frontend, baixa severidade, causa raiz já coberta pela camada de banco) — mesmo
   padrão de débito rastreável já usado em 7.1/7.2/7.3, nenhum dos dois com
   exploitabilidade ativa ou condição de bloqueio automática.
d. **Decisão de estrutura de documento sobre `BE-M-14`/`FE-M-13`** (detalhe
   completo em `DET-08`, Seção 6.2, e na "Nota de Resolução de Risco (Bloqueio
   015)" no topo do documento): formalizadas como tarefas novas, retroativas
   (`Concluída`), no lote **"Autenticação & Segurança"** — não em "Categorização",
   apesar de terem sido descobertas durante a auditoria deste lote — pelo mesmo
   critério já usado para `BE-M-13` (correção sistêmica de autorização que toca
   toda tabela "ownable" do produto é preocupação transversal, não pertence ao
   bounded context onde foi descoberta). Isso significa que o esforço/registro de
   `BE-M-14`/`FE-M-13` não altera a contagem de tarefas do lote "Categorização"
   (permanece `BE-M-05`/`FE-M-08`, 2 tarefas) nem seu total de esforço estimado
   (2.5 dias, item 6 acima).
e. **O que o critério de aprovação de lote realmente protege no meu escopo** — "a
   decomposição em si continua íntegra depois de implementada" (`tech-lead.md`,
   explicitamente não reabrindo validação funcional do QA nem auditoria de
   segurança do DevSecOps) — não é violado: o achado do Bloqueio 015 não indica
   `BE-M-05`/`FE-M-08` mal decompostas ou critério de aceite mal definido (as duas
   tarefas permanecem "tecnicamente corretas", texto literal do próprio DevSecOps,
   `SECURITY-REVIEW.md` Seção 1.12); é uma pré-condição de plataforma ausente
   desde o início do projeto, já corrigida.

**Sobre a validade dos 3 lotes já fechados (Fundação Técnica & Infraestrutura,
Contas & Formas de Pagamento, Ledger & Dashboard) — pergunta explícita do
orquestrador, decisão registrada aqui, não só a conclusão.** **Concordo com a
conclusão do DevSecOps de que não precisam ser reabertos.** Racional próprio, não
só endosso do relato de outro agente:

- A causa raiz (nenhuma coluna `user_id` de tabela "ownable" jamais teve `DEFAULT`,
  em nenhum ponto do histórico deste schema reaproveitado, `SECURITY-REVIEW.md`
  Seção 1.12, item 1) é uma **pré-condição de plataforma ausente desde antes do
  primeiro lote existir** — não uma regressão introduzida pelo trabalho de nenhum
  dos três lotes. `BE-M-00` (auditoria inicial, lote "Fundação") não tinha como
  descobrir isto sozinha: o gap só se torna observável cruzando "código real do
  client" com "banco real" no caminho de escrita, exatamente a combinação que
  nenhuma das três camadas de evidência automatizada disponíveis até aqui
  (Vitest mockado, SQL com `user_id` fornecido manualmente, smoke test de
  navegador nunca executado por falta de credencial) jamais exercitou em
  conjunto — condição de visibilidade, não erro de decomposição de nenhum lote.
- O critério de aprovação de lote que eu aplico (este documento, "Critérios de
  Pronto") protege explicitamente a **decomposição**, não a auditoria de segurança
  contínua sobre código já entregue — essa é função recorrente do DevSecOps
  (`static-security-analysis`/`dependency-vulnerability-scanning`, por lote e,
  quando um achado sistêmico aparece, retroativo por natureza). O próprio
  DevSecOps, com autoridade técnica sobre essa dimensão, já concluiu que a
  correção da pré-condição basta — não decido eu, por cima da autoridade dele,
  que uma auditoria adicional é necessária sem um motivo técnico novo para isso.
- Os débitos já registrados individualmente em cada um dos 3 lotes (SEC-DEBT-005/
  Bloqueio 012 em "Fundação"; SEC-DEBT-006/Bloqueio 013 em "Contas & Formas de
  Pagamento"; SEC-DEBT-007/Bloqueio 014 em "Ledger & Dashboard") continuam válidos
  e não são afetados por esta resolução — são achados de causa raiz distinta
  (ownership de FK, `SECURITY DEFINER` ausente), não duplicados nem substituídos
  pelo Bloqueio 015.
- **Contrafactual explícito**: se a correção de `BE-M-14`/`FE-M-13` tivesse
  revelado que a causa raiz era específica de código escrito **dentro** de um dos
  três lotes (ex.: um `INSERT` malformado introduzido só em `BE-M-02`), a decisão
  seria diferente — reabriria especificamente o lote correspondente, não os
  outros dois. Não é o caso: o padrão é idêntico e transversal a toda tabela
  "ownable" do produto, incluindo tabelas de Fase 2 já concluídas fora do escopo
  de qualquer um dos 3 lotes fechados, confirmando a natureza de pré-condição de
  plataforma, não de defeito local a um lote.

**Contrafactual explícito sobre o próprio lote "Categorização"**: se o Bloqueio 015
não tivesse sido corrigido e verificado dentro deste mesmo ciclo — permanecendo
"Bloqueado" como o veredito inicial do DevSecOps registrou — eu não registraria
esta linha na Seção 7 hoje; devolveria a pendência a Backend/Frontend (correção) e
ao DevSecOps (reverificação), e só aplicaria o critério de aprovação de lote depois
do fechamento formal do bloqueio. O fechamento aconteceu antes, dentro da mesma
sessão, com verificação independente — por isso registro a linha agora.

Débitos carregados para além do fechamento deste lote (não resolvidos por este
registro, seguem `Aberto`/rastreados normalmente): `QA-REPORT.md` QA-DEBT-009 (dono:
frontend); `SECURITY-REVIEW.md` SEC-DEBT-009 (dono: qa/devsecops) e SEC-DEBT-010
(dono: frontend).

### 7.5 Racional de fechamento — lote "Orçamento", e nota sobre deploy já realizado
fora de ordem (`BLOCKERS.md` Bloqueio 016)

Antes de registrar a linha do lote "Orçamento" na Seção 7, apliquei o "Critério de
Aprovação de Lote" (`tech-lead.md`) item a item, verificando eu mesmo cada evidência
nos artefatos originais (não presumindo pelo resumo de nenhum agente) — mesmo rigor
de 7.1/7.2/7.3/7.4, com uma diferença material em relação aos 4 lotes anteriores:
desta vez o código do lote **já está servindo em produção** (`DEPLOY.md` §9.6) desde
antes de eu aplicar este critério, não depois — ver item 4 em detalhe abaixo.

1. **Toda tarefa do lote `Concluída` no `TASK.md`**: confirmado por leitura direta da
   Seção 3.1 — `BE-M-08` ("Concluída — 2026-09-02.") e `FE-M-11` ("Concluída —
   2026-09-03."), ambas com nota de evidência própria (migration/teste/contrato
   publicado). Passa.
2. **`QA-REPORT.md` Aprovado/Aprovado com ressalvas para toda tarefa**: Seção 7.6
   ("Veredito de lote consolidado") registra `BE-M-08` **Aprovado** e `FE-M-11`
   **Aprovado** (`QA-DEBT-010` registrado, mas não reduz o veredito da tarefa,
   texto literal da própria tabela). Veredito de lote textual: "Aprovado". Passa,
   sem ressalva de lote.
3. **`SECURITY-REVIEW.md` Aprovado/Aprovado com débito para o lote**: Seção 1.15,
   "veredito consolidado do lote" — texto literal "**Veredito do lote: Aprovado,
   sem débito novo.**" Passa — o único lote, até aqui, sem nenhum débito de
   segurança novo registrado no próprio fechamento.
4. **Nenhum `BLOCKERS.md` `Aberto` afetando o lote**: aqui está o ponto que exige
   racional explícito, não uma verificação binária direta — ver detalhe completo
   abaixo, mesmo padrão de julgamento já aplicado em 7.1/7.2/7.4 (decidir dentro
   da minha autoridade, sem invadir a de QA/DevSecOps/CTO/DevOps, documentando o
   racional, não só a conclusão).
5. **Nenhuma diretriz da Seção 1 violada sem exceção registrada**: `DIR-27` (RLS
   `auth.uid() = user_id`) cumprida em `budget` (`SECURITY-REVIEW.md` Seção 1.15,
   tabela `security-requirement-validation`, linha 1); gate de MFA por claim JWT
   também presente nas 4 policies de `budget`, mais estrito que o mínimo hoje
   documentado no texto de `SDD.md` Seção 7 (que lista só `accounts`/`categories`/
   `payment_methods`/`transactions` nominalmente — imprecisão de completude do
   texto do SDD, não gap de implementação, mesma classe já registrada em
   `SEC-DEBT-004`, não gera débito novo). `G-19` (ownership de FK) não é diretiva
   vigente na Seção 1 hoje (segue `[PROPOSTA — aguardando aprovação do CTO]` em
   `GUARDRAILS.md`), mesma leitura já aplicada aos gaps-irmãos dos Bloqueios
   013/014/015 — e, diferente daqueles três, o gap correspondente em `budget`
   **já está corrigido** desde `BE-M-13` (não é débito residual aberto, é
   correção já aplicada e revalidada duas vezes nesta rodada, Seções 1.14/1.15).
   Passa, sem exceção a registrar.
6. **Esforço real reconciliado com a estimativa original**: `BE-M-08` (1 dia) +
   `FE-M-11` (1.5 dia) = 2.5 dias ideais estimados (Seção 3.1), exatamente como
   documentado nesta rodada de fechamento. Nenhuma das duas gerou entrada em
   `BLOCKERS.md` do tipo "desvio grande de escopo/estimativa que exige
   replanejamento" — o esforço real bate com o estimado, sem divergência material
   a registrar como aprendizado para o próximo lote.

**Item 4 em detalhe — `BLOCKERS.md` Bloqueio 016 cita nominalmente "Orçamento" e
segue `Aberto`, mas não impede o registro deste lote.**

a. **O que o Bloqueio 016 (item 1) descreve já é precisamente a lacuna que esta
   própria rodada de fechamento resolve.** O achado do DevOps foi: o build do lote
   "Orçamento" (junto com "Autenticação & Segurança" e toda a Fase 2) foi promovido
   a produção **sem** ter passado antes pela validação formal de QA + DevSecOps por
   lote — desvio explícito do guardrail padrão de dupla aprovação, autorizado
   conscientemente pelo stakeholder, registrado por transparência, não decidido
   pelo DevOps (`BLOCKERS.md` Bloqueio 016, `DEPLOY.md` §9.6). Nesta mesma rodada,
   QA (`QA-REPORT.md` Seção 7) e DevSecOps (`SECURITY-REVIEW.md` Seções 1.14/1.15)
   já produziram exatamente essa validação formal por lote que faltava — a lacuna
   descrita no Bloqueio 016 para este lote especificamente deixa de existir no
   momento em que registro esta linha da Seção 7. Não estou contornando o
   bloqueio; estou fechando, com este próprio ato, a condição que ele apontava
   como pendente.
b. **QA e DevSecOps, cada um dentro de sua própria autoridade, avaliaram o lote de
   forma completa e independente, sem qualquer achado que reabra a preocupação do
   Bloqueio 016 sobre a qualidade do que já está em produção.** Nenhum bug de
   severidade alta/crítica; nenhum achado de segurança de severidade alta/crítica;
   nenhum achado de compliance obrigatório pendente (`SECURITY-REVIEW.md` Seção
   1.15). Se qualquer um dos dois tivesse encontrado um problema real no código já
   em produção, o veredito seria diferente (ver contrafactual abaixo) — não
   encontraram.
c. **O item 2 do Bloqueio 016** (alias `mymoney-lsm.vercel.app` não realiasado)
   **não toca este lote por conteúdo** — é uma pendência de infraestrutura de
   DNS/alias do Vercel, transversal a todo o projeto (a mesma origem WebAuthn do
   Bloqueio 005), não um problema em `budget`/`get_budget_status`/`BudgetPage.tsx`.
   Não é uma pendência que a decomposição/implementação deste lote possa resolver
   ou que dependa dele — fora do escopo do que o "Critério de Aprovação de Lote"
   protege (`tech-lead.md`: "a decomposição em si continua íntegra depois de
   implementada", não auditoria de infraestrutura de deploy, que é escopo do
   DevOps).
d. **O que o critério de aprovação de lote realmente protege no meu escopo** não é
   violado por nenhum dos dois itens do Bloqueio 016: nenhum indica `BE-M-08`/
   `FE-M-11` mal decompostas ou critério de aceite mal definido; um é a própria
   lacuna de processo que esta rodada fecha, o outro é infraestrutura transversal
   sem relação de conteúdo com este lote.
e. **Diferença explícita em relação a 7.1/7.2 (Bloqueios 007/012/013, que também
   seguem `Aberto`)**: lá, o racional era "o achado é real e segue em aberto, mas
   não bloqueia porque não afeta o funcionamento da tarefa". Aqui, o racional é
   mais direto: o "achado" do Bloqueio 016 item 1 é a ausência da própria validação
   que estou completando agora — ele não descreve um defeito remanescente no
   produto, descreve um gate de processo que faltava e que se fecha exatamente
   neste registro.

**Contrafactual explícito**: se QA ou DevSecOps tivessem encontrado, nesta rodada,
qualquer achado de severidade alta/crítica em `BE-M-08`/`FE-M-11` — já rodando em
produção —, o veredito aqui seria diferente: eu não registraria a linha do lote,
escalaria o achado como incidente de produção (não como pendência de fechamento de
lote), e a resolução seguiria o fluxo de correção emergencial, não o "Critério de
Aprovação de Lote" padrão. Não é o caso: os dois vereditos foram Aprovado, sem
ressalva que aponte defeito real no que já está servindo tráfego.

**Nota de sequenciamento, para o registro histórico deste documento**: diferente
dos 4 lotes anteriores (onde o fechamento desta Seção 7 antecedia o deploy, que só
acontecia depois, ver `DEPLOY.md` §9.2-9.5), aqui a ordem foi invertida por decisão
do stakeholder, fora da minha autoridade e fora do fluxo padrão de
`EXECUTION-FLOW.md` — registro isso não como uma falha de processo minha, mas para
que qualquer leitura futura deste log entenda por que a coluna "Deploy" desta linha
não segue o mesmo padrão textual ("Concluído em staging", pendente de promoção
posterior) das quatro anteriores.

Débitos carregados para além do fechamento deste lote (não resolvidos por este
registro, seguem `Aberto`/rastreados normalmente): `QA-REPORT.md` QA-DEBT-010 (dono:
frontend); `BLOCKERS.md` Bloqueio 016 item 2 (dono: a definir por quem tiver
visibilidade completa do uso real de `mymoney-lsm.vercel.app` — software-architect/
cto, conforme o próprio bloqueio já escala) segue `Aberto`, sem relação de conteúdo
com este lote (item 4c acima).

---

## Checklist de Pronto (auto-verificação do Tech Lead) — reabertura de 2026-09-02 (Bloqueio 003)

- [x] Toda tarefa tem dono/time responsável (Backend, Frontend ou QA) — Seção 3,
      incluindo `BE-M-12`, nova nesta reabertura
- [x] Toda tarefa tem critério de aceite testável, rastreado a AC de `PRD-TECNICO.md`,
      a comportamento de tela de `UX-SPEC.md`, ou à tabela de auditoria de `ADR-012`
      (`BE-M-00`, `BE-M-06`, `BE-M-07`, `BE-M-09`) — Seção 3
- [x] Toda tarefa não-spike tem estimativa de esforço; as 3 tarefas de incerteza
      técnica alta estão marcadas como spike (Seção 2) — `SPK-001` fechado como
      **Resolvido** nesta reabertura, sem estimativa forçada durante sua execução;
      `SPK-002`/`SPK-003` seguem sem estimativa forçada. Estimativa preliminar
      restante é `FE-F3-09` (pendência de sincronização com UX/UI, `UX-01`, Seção
      6.1.1 — inalterada por esta reabertura)
- [x] Toda dependência entre tarefas está mapeada, com o que pode rodar em paralelo
      explícito — Seção 4.1 recalculada para refletir `SPK-001` Resolvido e `BE-M-00`
      como auditoria (não mais bootstrap bloqueado por decisão em aberto); Fase 2/3
      inalteradas por esta reabertura
- [x] Toda diretriz de implementação relevante está traduzida em regra prática
      (obrigatória/proibida/recomendada, com exemplo mínimo), não só citação do ADR —
      Seção 1.1 (`DIR-01` a `DIR-05`) reescrita integralmente conforme `ADR-012`/
      `ADR-013`; `DIR-17`/`DIR-27` corrigidas pontualmente (referência de
      schema/coluna, sem reabrir o mérito da regra)
- [x] Toda lacuna estrutural encontrada no `SDD.md` foi sinalizada na Seção 6 em seu
      momento, nunca decidida em silêncio (`CC-01` e `BC-003`, ambas **Resolvidas** —
      nenhuma lacuna estrutural permanece aberta); toda lacuna de detalhe tem a
      decisão documentada (`DET-01` a `DET-04`, `DET-02` com nota de reconciliação
      pontual desta reabertura); a única pendência restante (`UX-01`) é ponto de
      sincronização com UX/UI, inalterada
- [x] Nenhuma das 6 seções está vazia ou com placeholder
- [x] Rascunho atualizado do `GUARDRAILS.md` (`G-01`/`G-02` reescritos) produzido e
      submetido ao CTO junto com esta reabertura do `TASK.md` — ver
      `.md/GUARDRAILS.md`

**Esta reabertura pontual do `TASK.md`** (Seção 1.1, Seção 2 `SPK-001`, Seção 3.1
`BE-M-00` a `BE-M-12`, Seção 4.1, Seção 5, Seção 6.1) **é um rascunho pronto para novo
Gate 3 pontual do CTO** — `capacity-and-timeline-validation` sobre o esforço
recalculado (Seção 5) e `guardrails-governance` sobre `G-01`/`G-02` reescritos em
`GUARDRAILS.md`. As demais 60+ tarefas deste documento (Fase 2, Fase 3, restante do
bloco Frontend/QA do MVP) **não são reabertas por mérito** — o Gate 3 original
(`CTO-REVIEW.md`) segue válido para elas. Não é considerado final até aprovação
(Aprovado ou Aprovado com ressalvas) desta rodada pontual. Reprovação pontual reabre
só a(s) tarefa(s)/risco(s) apontado(s) pelo CTO, não o documento inteiro.
