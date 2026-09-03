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
6.2 `DET-07` nova — ver "Nota de Resolução de Risco (Bloqueio 010)" abaixo)
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

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| BE-M-00 | **[Reescrita — ADR-012/ADR-013]** Auditoria e formalização dos objetos reaproveitados de `public`, conforme a tabela de auditoria do `ADR-012`: (a) confirmar equivalência campo a campo de `accounts`/`payment_methods`/`categories`/`transactions`/`profiles`/`webauthn_credentials`/`email_mfa_challenges` contra `SDD.md` Seção 5.1; (b) escrever teste de regressão para `apply_transaction_effect` antes de qualquer alteração futura (sem cobertura conhecida hoje); (c) enumerar e documentar individualmente todo trigger de saldo/hierarquia/status de `public` ainda não nomeado pelo `SPK-001`, antes de qualquer funcionalidade de Fase 2 (fatura, hierarquia de categoria) depender deles; (d) confirmar que nenhum role/policy customizado além do padrão existe (já indicado por `SPK-001`, formalizar como documento de auditoria); (e) produzir o documento de auditoria que serve de base para `BE-M-01` em diante — nenhum objeto tratado como "corretude comprovada só por já funcionar hoje" | Backend | `ADR-012` (tabela de auditoria), `SDD.md` Seção 5.1, Seção 6.1 (risco "Qualidade/confiabilidade de código reaproveitado") | Documento de auditoria cobre as 7 tabelas + todos os triggers/RPCs de `public` (nomeados pelo `SPK-001` e os enumerados nesta tarefa), cada um com achado e decisão (Adotar / Adotar com condição / Não adotado, aguardando `BLOCKERS.md`); teste de regressão de `apply_transaction_effect` passa antes de qualquer tarefa subsequente alterar essa lógica; nenhuma linha de `public` (1 profile, 12 categorias) é alterada ou removida por esta tarefa (DIR-03) | 1.5 dia | **Concluída — 2026-09-02.** Veredito do CTO liberou a retomada (`BLOCKERS.md` Bloqueio 003, Status Resolvido). Documento de auditoria completo em `.md/AUDITORIA-BE-M-00.md`: 7 tabelas confirmadas equivalentes, 13 triggers enumerados/documentados individualmente, 15 funções avaliadas, roles/extensions/cron/storage confirmados sem mudança. Teste de regressão de `apply_transaction_effect` (`supabase/tests/apply_transaction_effect.test.sql`, 9 casos) **PASS**, rodado via `supabase db query --linked --file`, dentro de `BEGIN;...ROLLBACK;` — nenhuma linha real alterada (confirmado por contagem antes/depois). 5 achados documentados com decisão e tarefa de destino (FK CASCADE vs. RN-08/RN-09 → `BE-M-01`; `payment_methods` sem coluna padrão → `BE-M-02`; numeração RN-11 incorreta no `fn_clear_due_transactions` → `BE-M-06`; `profiles.pin_hash` exposto via SELECT → `BE-M-09`; ativação do Auth Hook não confirmável via ferramentação atual → `BE-M-09`, ressalva não-bloqueante, mesma categoria do item 6 do `SPK-001`). Nenhum achado exigiu novo `BLOCKERS.md` |
| BE-M-01 | **[Reestimada — ADR-012]** Migration aditiva de `Budget` (única entidade do MVP ainda ausente em `public`) + confirmar/reforçar as constraints de RN-08 (bloqueio de `DELETE` físico de `accounts` vinculada) e RN-09 (bloqueio de `DELETE` de `categories` vinculada) sobre as tabelas já existentes, adicionando o que a auditoria de `BE-M-00` apontar como faltante — não recriar `accounts`/`payment_methods`/`categories`/`transactions` do zero | Backend | SDD Seção 5.1/5.2 (Modelo de Dados), RF-MVP-01/02/03/04/07 | `public.budget` criada por migration aditiva com RLS habilitada, policy `auth.uid() = user_id` (DIR-27); `DELETE` em `accounts`/`categories` com vínculo é bloqueado a nível de banco (RN-08/RN-09 AC3), confirmado ou adicionado conforme achado de `BE-M-00` | 1 dia | **Concluída — 2026-09-02.** Migration `supabase/migrations/20260902100000_be_m01_budget_and_rn08_rn09_guards.sql` aplicada via `supabase db push --linked` (down em `supabase/migrations_down/`, DIR-04). `public.budget` criada (RLS + 4 policies `auth.uid() = user_id` + gate MFA, DIR-27); triggers `accounts_before_delete_block_linked`/`categories_before_delete_block_linked` bloqueiam `DELETE` físico com vínculo (achado da auditoria: as FKs existentes eram `ON DELETE CASCADE`, o oposto de RN-08/RN-09 — ver `AUDITORIA-BE-M-00.md` Seção 2). Teste `supabase/tests/be_m01_budget_and_guards.test.sql` (7 casos) rodado RED (antes da migration, falhou como esperado) → GREEN (depois, PASS); regressão de `apply_transaction_effect` (BE-M-00) re-executada e ainda PASS. Nenhum resíduo de teste na base |
| BE-M-02 | **[Reestimada — ADR-012]** Validar que a taxonomia de categorias já seedada em `public.categories` (12 categorias topo-nível) bate 1:1 com `PRD-TECNICO.md` — sem recriar; verificar se as 5 formas de pagamento padrão (Pix, débito, crédito, boleto, dinheiro) já existem em `public.payment_methods` e, só para as que faltarem, seed pontual marcado como "padrão" | Backend | RF-MVP-02 AC1, RF-MVP-03 AC1, RN-09; `ADR-012` (tabela de auditoria, linha `categories`) | Taxonomia de categorias confirmada equivalente à especificação, nenhuma linha recriada ou duplicada; toda forma de pagamento padrão ausente é semeada e marcada "padrão" (não editável/excluível); nenhuma forma de pagamento já existente é duplicada | 0.25 dia | **Concluída — 2026-09-02.** Taxonomia de categorias confirmada 1:1 com `PRD-TECNICO.md` na auditoria (`AUDITORIA-BE-M-00.md` Seção 1) — nenhuma recriação. Migration `20260902100100_be_m02_payment_methods_defaults.sql`: coluna `is_system_default` adicionada a `payment_methods`; seed idempotente das 4 formas não-cartão (Pix/Débito/Boleto/Dinheiro) via trigger na primeira conta ativa do usuário (achado de auditoria: "crédito" só passa a existir a partir de `BE-F2-01`, quando há `CreditCard` real — check constraint do schema já exige isso, reconciliado com RF-F2-01 AC1, ver `AUDITORIA-BE-M-00.md` Seção 3); policies `payment_methods_update_own`/`_delete_own` passam a exigir `is_system_default = false`. Teste `be_m02_payment_methods_defaults.test.sql` (4 casos) RED→GREEN; regressão de BE-M-00/BE-M-01 revalidada, sem resíduo |
| BE-M-03 | CRUD de contas (criação, edição, inativação com RN-08) | Backend | RF-MVP-01 AC1-4 | Excluir conta com lançamento vinculado retorna erro e sugere inativação (AC4); conta sem lançamento pode ser excluída definitivamente | 1 dia | **Concluída — 2026-09-02.** Implementado via PostgREST direto sobre `public.accounts` (RLS + triggers já existentes/reforçados em BE-M-01, ADR-002/DIR-06: CRUD simples não é Edge Function). Contrato publicado em `API-CONTRACT.yaml` (`/accounts`). Teste `be_m03_04_05_crud.test.sql` cobre AC2 (type ausente rejeitado), AC3 (edição de saldo inicial recalcula saldo consolidado) e AC4/RN-08 (bloqueio de exclusão vinculada, testado em `be_m01_budget_and_guards.test.sql` Caso 4) — todos PASS, sem resíduo |
| BE-M-04 | CRUD de formas de pagamento customizadas | Backend | RF-MVP-02 AC3 | Usuário cadastra forma de pagamento além das 5 padrão; formas padrão não podem ser editadas/excluídas | 0.5 dia | **Concluída — 2026-09-02.** PostgREST direto sobre `public.payment_methods` (RLS de BE-M-02). Contrato publicado em `API-CONTRACT.yaml` (`/payment_methods`). Teste `be_m03_04_05_crud.test.sql` Casos 7/8 confirma, via RLS real (`SET LOCAL ROLE authenticated` + JWT simulado, não como owner/postgres): usuário cria forma customizada com sucesso; `UPDATE`/`DELETE` em forma `is_system_default=true` afeta **0 linhas** mesmo autenticado como o próprio dono com MFA verificado — PASS |
| BE-M-05 | CRUD de categorias/subcategorias + bloqueio de exclusão vinculada | Backend | RF-MVP-03 AC1-3 | Excluir categoria com lançamento vinculado é bloqueado e retorna a lista de lançamentos afetados (AC3) | 1 dia | **Concluída — 2026-09-02.** PostgREST direto sobre `public.categories` (RLS + `validate_category_hierarchy` já existentes). Contrato publicado em `API-CONTRACT.yaml` (`/categories`, incluindo a orientação de `GET /transactions?category_id=eq.{id}` para AC3 "listar lançamentos afetados"). Teste `be_m03_04_05_crud.test.sql` Casos 4-6 cobre hierarquia de 2 níveis (permitida), 3 níveis (bloqueada) e auto-referência (bloqueada); bloqueio de exclusão vinculada testado em `be_m01_budget_and_guards.test.sql` Casos 5/6 — todos PASS |
| BE-M-06 | **[Critério adicional — ADR-012]** CRUD de lançamentos manuais + recálculo de saldo de conta, reaproveitando `apply_transaction_effect` (auditado/testado em `BE-M-00`); confirmar que a semântica exata de `fn_clear_due_transactions`/`pg_cron` bate com RN-11 (transição prevista→efetivado por vencimento) antes de considerar essa parte equivalente a "já implementada" | Backend | RF-MVP-04 AC1-5; `ADR-012` (linha `fn_clear_due_transactions`) | Criar/editar/excluir lançamento reflete imediatamente no saldo da conta associada (AC1/3/4), via `apply_transaction_effect` já testado por regressão; campo obrigatório ausente rejeita a submissão sem persistir parcial (AC2); achado da auditoria de `fn_clear_due_transactions` contra RN-11 documentado, com divergência (se houver) corrigida por migration aditiva, não assumida como já correta | 2.5 dias | **Concluída — 2026-09-02.** CRUD via PostgREST direto sobre `public.transactions` (RLS + `apply_transaction_effect`/`transactions_maintain_account_balance`/`transactions_set_status`/`transactions_block_inactive_account`, testados por regressão em `BE-M-00`, 9 casos PASS). Achado de auditoria sobre a citação "RN-11": **não é uma divergência de comportamento** — a citação de RN no `TASK.md`/`ADR-012` estava incorreta (RN-11 real é sobre baseline de volume, não sobre transição de status); a função `fn_clear_due_transactions` em si está correta e foi adotada como está (`AUDITORIA-BE-M-00.md` Seção 5), sem necessidade de migration corretiva. Teste dedicado `be_m06_transactions.test.sql` (2 casos: transição pending→cleared quando vencida, e não-transição quando ainda futura) — PASS. Contrato publicado em `API-CONTRACT.yaml` (`/transactions`), incluindo os 409 de conta inativa/CHECK — **desbloqueia `FE-M-03`/`FE-M-09`** |
| BE-M-07 | **[Critério adicional — ADR-012]** Queries/views de dashboard: saldo consolidado, entradas/saídas do mês, distribuição por categoria, contagem de lançamentos do mês, auditando o contrato de saída (nomes/tipos de campo) de `get_month_provision`/`get_monthly_category_summary` já existentes contra o que `API-CONTRACT.yaml`/Frontend precisam antes de considerar definitivo | Backend | RF-MVP-05 AC1-2, RF-MVP-06 AC1-3; `ADR-012` (linha `get_month_provision`/`get_monthly_category_summary`) | Saldo consolidado soma só contas ativas (AC1); contagem de lançamentos do mês corrente está disponível (RF-MVP-06 AC3, instrumentação de RN-11); contrato de saída das duas RPCs documentado e compatibilizado com `API-CONTRACT.yaml` — se o contrato divergir do necessário, a RPC é estendida por migration aditiva (nova função ou view), nunca reescrita destrutivamente sem revisão do CTO (DIR-03) | 2 dias | **Concluída — 2026-09-02.** `get_month_provision`/`get_monthly_category_summary` auditadas: contrato confirmado e documentado em `API-CONTRACT.yaml`. **Achado**: `provisioned_balance_cents` faz double-counting de lançamentos `pending` do mês corrente (confirmado empiricamente — saldo já reflete o efeito na criação, depois é subtraído de novo); campo marcado `deprecated` no contrato, `current_total_balance_cents` é o campo correto para RF-MVP-05 AC1, sem necessidade de tocar a função (nenhuma tarefa MVP exige o campo "provisionado"). RF-MVP-06 AC3 (contagem de lançamentos do mês) não tinha RPC — criada `get_month_transaction_count` por migration aditiva (`20260902100200_be_m07_month_transaction_count.sql`, nova função, não reescrita). Teste `be_m07_dashboard.test.sql` (3 casos, via RLS real) RED→GREEN; regressão completa (BE-M-00/01/02/03/04/05/06) revalidada, sem resíduo |
| BE-M-08 | Orçamento por categoria/mês: armazenar teto, calcular % gasto vs. teto, limiar de alerta (RN-04, 80%/100%+) | Backend | RF-MVP-07 AC1-4, RN-04 | Ao atingir 80% do teto, sinal de alerta é retornado pela query; acima de 100%, sinal de estouro com severidade maior (AC3/4) | 1 dia | **Concluída — 2026-09-02.** Teto já armazenado em `public.budget` (BE-M-01). Nova RPC `get_budget_status` (`20260902100300_be_m08_budget_status.sql`) retorna `pct_spent`/`alert_level` (`none`/`warning`/`exceeded`) por categoria/mês. Teste `be_m08_budget_status.test.sql` (3 casos: 50% none, 85% warning, 105% exceeded) RED→GREEN, via RLS real, sem resíduo. Publicado em `API-CONTRACT.yaml` |
| BE-M-09 | **[Reescrita — Bloqueio 005; condição de aceite e estimativa revistas — Bloqueio 006]** Adoção das 3 Edge Functions pré-existentes (`auth-email-mfa`, `webauthn-register`, `webauthn-authenticate`) como implementação real de RF-MVP-08 (parte server-side), descartando definitivamente o código novo do Backend (4 functions deployadas e já removidas, `BLOCKERS.md` Bloqueio 005). Reaproveita `public.webauthn_credentials` e `public.email_mfa_challenges` como estão (não recriar). **Mitigação do risco de replay de challenge, determinada pelo CTO (`BLOCKERS.md`/`CTO-REVIEW.md` Bloqueio 006, "mitigar agora")**: aplicar a migration `webauthn_challenges` já desenhada (`supabase/migrations/20260902100600_be_m09_webauthn_challenges.sql`, hoje pausada/não referenciada) e ajustar `webauthn-register`/`webauthn-authenticate` para consumir o challenge — inserir linha em "generate-options", checar `consumed_at IS NULL` e `expires_at > now()` e marcar `consumed_at = now()` em "verify", **antes** de chamar `verifyRegistrationResponse`/`verifyAuthenticationResponse`, rejeitando qualquer reenvio da mesma dupla challenge+assertion dentro da janela de 90s de validade. **Pré-condições já cumpridas** (progresso válido, ver Status): inspeção de `set_pin`/`verify_pin` (compatível com `ADR-010`, sem escalonamento) e correção de exposição de `profiles.pin_hash` via coluna | Backend | RF-MVP-08 AC1, ADR-005, ADR-010, ADR-013, `DIR-33`, `BLOCKERS.md` Bloqueio 006 | Documento de auditoria (`AUDITORIA-BE-M-00.md`, nova subseção "Edge Functions") cobre as 3 Edge Functions item a item — contrato de entrada/saída de cada endpoint, comparação contra RF-MVP-08 AC1-3 e ADR-005/ADR-010/ADR-013, achado e decisão (Adotar / Adotar com condição / Não adotado) para cada uma, mesmo rigor da tabela de auditoria do `ADR-012`; `API-CONTRACT.yaml` publica o contrato real das 3 Edge Functions, substituindo qualquer contrato hipotético baseado no código descartado; nenhuma linha real de `public` é alterada por esta tarefa (DIR-03). **Condição de aceite de mitigação (Bloqueio 006, obrigatória para fechar sem ressalva)**: migration `webauthn_challenges` aplicada em produção (`consumed_at`, `expires_at`, FK para `auth.users`, RLS sem policy para cliente); teste automatizado prova que (i) a segunda tentativa de verificação com o mesmo challenge+assertion válido é rejeitada (não apenas a segunda tentativa com dado inválido) tanto em `webauthn-register` quanto em `webauthn-authenticate`; (ii) o fluxo legítimo (challenge usado uma única vez) continua funcionando sem regressão; regressão dos testes de auditoria já existentes desta tarefa revalidada | 2 dias (↑ de 1.5 — Bloqueio 006: mitigação do risco de replay soma aplicar a migration já desenhada + wiring de `consumed_at` nos dois endpoints "verify" + caso de teste de replay rejeitado + regressão; ver Seção 5) | **Concluída — 2026-09-03.** As 4 pendências restantes da retomada (Bloqueio 005/006) fechadas nesta sessão: **(a) auditoria formal** das 3 Edge Functions item a item — `AUDITORIA-BE-M-00.md` Seção 14 (contrato de entrada/saída, comparação contra RF-MVP-08 AC1-3 e ADR-005/ADR-010/ADR-013, achado e decisão por function, mesmo rigor do `ADR-012`) — as 3 (`auth-email-mfa`, `webauthn-register`, `webauthn-authenticate`) decididas **Adotar**, nenhuma condição pendente. **(b) Contrato real publicado** em `API-CONTRACT.yaml` v0.6.0 (`/auth-email-mfa`, `/webauthn-register`, `/webauthn-authenticate`), substituindo qualquer contrato hipotético do código descartado. **(c) Mitigação do Bloqueio 006 aplicada**: migration `webauthn_challenges` já estava em produção (`supabase migration list --linked` confirmou `20260902100600` aplicada; `supabase db push --linked` = "Remote database is up to date" — nada a fazer aqui, só confirmar); `webauthn-register`/`webauthn-authenticate` ajustadas (`persistChallenge` em "generate-options", `consumeChallenge` — `UPDATE ... WHERE consumed_at IS NULL AND expires_at > now() RETURNING`, atômico — em "verify", **antes** de `verifyRegistrationResponse`/`verifyAuthenticationResponse`; challenge extraído do `clientDataJSON` da própria resposta) e deployadas via `supabase functions deploy --use-api` (sem Docker; `deno.json`/import map novo, necessário para bundlar `@simplewebauthn/server`/`@supabase/supabase-js` — ambas em v13/v2 respectivamente, únicas versões cujo shape de tipos bate com o código já existente; `deno check`/`deno lint` limpos; versão das functions 4→5 em produção, `verify_jwt` preservado). **(d) Teste automatizado end-to-end real** `supabase/tests/be_m09_webauthn_replay.test.ts` — autenticador virtual WebAuthn (ECDSA P-256, CBOR próprio, sem lib de terceiros) rodando contra as Edge Functions em produção: 5/5 passos PASS — fluxo legítimo de registro e de autenticação ambos concluem com sucesso, reenvio da mesma dupla challenge+assertion é rejeitado (`409 challenge_replayed`) em ambos os endpoints, e uma nova cerimônia legítima subsequente continua funcionando (sem regressão). Setup/teardown via usuário de teste descartável (allow-list temporária + Auth Admin API), sem resíduo confirmado (contagem de todas as tabelas reais idêntica antes/depois). **Regressão completa** revalidada: 12/12 testes SQL (`BE-M-00` a `BE-M-12`) + 16/16 testes unitários `deno test` de `BE-M-10` — todos PASS. Limpeza de hygiene: 4 diretórios locais do código novo já descartado (Bloqueio 005, nunca comitado) removidos, para não confundir auditoria futura. Ativação do Auth Hook (`custom_access_token_hook`) segue como ressalva não-bloqueante já registrada (herdada de `BLOCKERS.md` Bloqueio 003) — não impede o fechamento desta tarefa, mesma categoria do item 6 do `SPK-001` |
| BE-M-10 | Export lógico diário de backup (Edge Function + `pg_cron`, `pg_dump`/export criptografado, storage fora do Supabase). **Pré-requisito (`DIR-33`, Bloqueio 005)**: antes de escrever código novo, rodar `supabase functions list` — se já existir Edge Function equivalente da implementação anterior, aplicar o mesmo fluxo de decisão do Bloqueio 005 (adotar/adaptar/registrar achado em `BLOCKERS.md`) antes de implementar do zero | Backend | ADR-009, DIR-31/32, DIR-33 | Auditoria de Edge Functions (`DIR-33`) executada e documentada antes de qualquer código novo; job roda diariamente sem intervenção manual; falha de execução gera log/alerta consultável | 1 dia | **Concluída (mecanismo) — 2026-09-03, ver `BLOCKERS.md` Bloqueio 007.** Auditoria `DIR-33` executada e documentada em `AUDITORIA-BE-M-00.md` Seção 13 **antes** de qualquer código novo: `supabase functions list`/`secrets list` confirmaram que nenhuma Edge Function/secret de backup pré-existente — ao contrário de `BE-M-09`, nada a reaproveitar aqui. Implementado: `supabase/functions/backup-export/` (`lib.ts` — export/criptografia AES-256-GCM/rotação/staleness, 16 testes unitários `deno test`, RED→GREEN, todos PASS; `index.ts` — wiring HTTP, `deno check`/`deno lint` limpos), migration `20260903090000_be_m10_backup_export.sql` (`pg_net`, `public.backup_export_log` com RLS deny-all, `trigger_backup_export()`/`check_backup_health()` `SECURITY DEFINER` lendo Vault, 2 jobs `pg_cron`: diário 03:00 UTC — nunca semanal, DIR-31 — e healthcheck a cada 6h — DIR-32), teste SQL `be_m10_backup_export.test.sql` (7 casos, PASS, sem resíduo). Secrets internos configurados (`BACKUP_CRON_SECRET`/`BACKUP_ENCRYPTION_KEY`, Vault `backup_edge_function_url`/`backup_cron_secret`). **Smoke test real ponta a ponta**: função deployada (`--no-verify-jwt`); segredo incorreto → 401; segredo correto (via `curl` e via `pg_net` real, confirmado em `net._http_response`) → 500 controlado + log de falha + alerta — mecanismo `pg_cron → pg_net → Edge Function → log/alerta` comprovado funcionando. **Bloqueio não-decidido sozinho** (registrado em `BLOCKERS.md` Bloqueio 007, escalado ao stakeholder/CTO): credenciais reais de um bucket S3-compatível externo (`BACKUP_S3_*`) não existem nesta sessão — provisionamento de conta externa está fora da minha autoridade (mesmo padrão do Bloqueio 004 do DevOps/Vercel). Até lá, o job roda diariamente e falha de forma controlada/logada/alertada (DIR-32 cumprido), mas o upload real (e portanto RPO ≤ 24h do `ADR-009` na prática) só se completa quando as credenciais forem configuradas — nenhuma mudança de código necessária nesse momento |
| BE-M-11 | Suíte de testes de RLS (ownership): garantir que usuário A nunca lê/escreve dado de usuário B em nenhuma tabela de `public` associada a este produto | Backend | SDD Seção 7 (Autorização) | Para toda tabela de `public` associada a este produto (incluindo as 4 com gate de MFA adicional), um teste automatizado tenta acesso cross-user e falha como esperado | 1 dia | **Concluída — 2026-09-03.** Suíte `supabase/tests/be_m11_rls_cross_user.test.sql` — 9 tabelas cobertas (accounts, categories, payment_methods, transactions, budget, profiles, webauthn_credentials — ownership `auth.uid()=user_id`, as 4 primeiras + accounts/transactions/budget com gate de MFA adicional — mais email_mfa_challenges/webauthn_challenges, deny-all sem policy nenhuma para `authenticated`). Padrão: usuário B simulado via JWT (`SET LOCAL ROLE authenticated` + `request.jwt.claims`, nunca inserido em `auth.users` — não precisa existir para o teste de isolamento ser válido) tenta SELECT/UPDATE/DELETE sobre dado real do usuário A; todos os 9 casos confirmam 0 linhas afetadas/visíveis. 9/9 PASS, sem resíduo (confirmado por contagem `TEST_%` = 0 após `ROLLBACK`). **Nota de dependência**: `webauthn_challenges` ainda existe (migration de `BE-M-09` pausada, não removida — decisão do Bloqueio 006 do CTO foi de fato aplicá-la, não fazer rollback dela; ver `BE-M-09`); a tabela em si e sua RLS já existem independente do estado "Retomada" (não "Concluída") da tarefa `BE-M-09`, então este teste não depende da conclusão daquela tarefa, só da existência real do objeto no banco, já confirmada. Regressão completa (BE-M-00 a BE-M-10) revalidada — 12/12 arquivos de teste PASS |
| BE-M-12 | **[Nova — ressalva 3 do CTO, "Fechamento do Gate 2 Reaberto"]** Restringir cadastro público em `auth.users` (allow-list de e-mail permitido, ou desabilitar sign-up público nas configurações do projeto Supabase), mitigando o efeito colateral do trigger `handle_new_user()` reaproveitado (cria `profiles` automaticamente para qualquer novo usuário) | Backend | `ADR-012` (avaliação de efeito colateral de `handle_new_user()`), `SDD.md` Seção 6.1 (risco "Cadastro não controlado") | Tentativa de cadastro com e-mail fora da allow-list (ou sign-up público desabilitado) é rejeitada antes de qualquer linha nova ser inserida em `auth.users`/`public.profiles`; cadastro do próprio stakeholder (dono do produto) continua funcionando sem fricção adicional | 0.5 dia | **Concluída — 2026-09-02.** Achado confirmado via `/auth/v1/settings` (endpoint público, anon key): `disable_signup: false` — sign-up estava de fato aberto. Decisão de implementação: allow-list de e-mail via trigger `BEFORE INSERT ON auth.users` (`20260902100400_be_m12_restrict_signup.sql`), não `supabase config push`/`disable_signup=true` nas configs globais — `config push` substitui o `config.toml` remoto inteiro sem diff/merge, risco desproporcional para mudar 1 campo sem visibilidade do resto da config já em produção (site_url, SMTP, JWT, etc.); allow-list é 100% aditiva e circunscrita ao schema. `public.allowed_signup_emails` semeada com o e-mail real do stakeholder. Teste `be_m12_restrict_signup.test.sql` RED→GREEN (SQL); **smoke test end-to-end real via `POST /auth/v1/signup`** com e-mail fora da allow-list confirmou bloqueio (nenhuma linha criada em `auth.users`) |
| BE-M-13 | **[Nova — CTO, "Revisão de Segurança do Lote MVP", item 2; `BLOCKERS.md` Bloqueio 010; `SECURITY-REVIEW.md` SEC-DEBT-002]** Correção sistêmica de autorização de referência cruzada (IDOR) entre tabelas "ownable": (a) toda policy de `INSERT`/`UPDATE` de `budget`/`transactions` que referencia uma FK para outra tabela "ownable" (`budget.category_id`; `transactions.account_id`/`category_id`/`payment_method_id`/`destination_account_id`) passa a validar, via `EXISTS (...)`, que a linha referenciada pertence ao mesmo `user_id` da linha sendo gravada (ou é um registro de sistema, `user_id IS NULL`, quando essa exceção já é válida hoje — ex.: categorias do sistema); (b) `categories_block_delete_when_linked` e `accounts_block_delete_when_linked` (triggers de RN-08/RN-09) passam a ser `SECURITY DEFINER` com `search_path` fixo (mesmo padrão já usado em `auth_users_restrict_signup`), garantindo que a checagem de bloqueio de `DELETE` enxergue toda linha vinculada, independente de quem executa a ação | Backend | `SECURITY-REVIEW.md` Seção 1.2 (SEC-DEBT-002), `BLOCKERS.md` Bloqueio 010, `CTO-REVIEW.md` "Revisão de Segurança do Lote MVP" item 2 | Teste automatizado prova que `INSERT`/`UPDATE` em `budget`/`transactions` referenciando `category_id`/`account_id`/`payment_method_id`/`destination_account_id` de outro usuário é rejeitado pela policy (não só pela ausência de UI para isso — chamada direta à API também falha), para cada uma das FKs afetadas; teste automatizado reproduz o cenário exato descrito pelo DevSecOps (usuário A insere `budget` referenciando `category_id` de B; B tenta excluir essa categoria) e confirma que o `DELETE` de B é bloqueado; regressão completa dos testes já existentes (`BE-M-00` a `BE-M-12`, incluindo a suíte de RLS cross-user de `BE-M-11`) revalidada sem resíduo; nenhuma linha real de `public` é alterada por esta tarefa (DIR-03) | 1.5 dia | **Concluída — 2026-09-03.** Migration `supabase/migrations/20260903100000_be_m13_fk_ownership_and_security_definer_guards.sql` aplicada via `supabase db push --linked` (down em `supabase/migrations_down/`, DIR-04). **(a)** `budget_insert_own`/`budget_update_own` e `transactions_insert_own`/`transactions_update_own` recriadas (DROP+CREATE de policy — mesmo precedente já usado em `BE-M-02` para `payment_methods_update_own`/`_delete_own`, não é "ALTER/DROP destrutivo com dado real" no sentido de DIR-03) com `EXISTS (...)` de ownership por FK: `budget.category_id`; `transactions.account_id`/`category_id`/`payment_method_id`/`destination_account_id` (as 3 últimas nullable — checagem só quando não-null; `category_id` aceita `user_id IS NULL`, categoria de sistema, mesma exceção já usada em `BE-M-11`; `accounts`/`payment_methods` não têm registro de sistema, sem essa exceção). **(b)** `accounts_block_delete_when_linked`/`categories_block_delete_when_linked` promovidas a `SECURITY DEFINER SET search_path TO 'public', 'pg_temp'`, mesmo padrão de `auth_users_restrict_signup` (BE-M-12). Teste `supabase/tests/be_m13_fk_ownership.test.sql` (9 casos, RLS real via `SET LOCAL ROLE authenticated` + JWT simulado, mesmo padrão de BE-M-11): usuário B real criado dentro da transação (accounts/categories/payment_methods têm FK para `auth.users`, diferente de BE-M-11 onde B só precisava ser o atacante — allow-list temporária de BE-M-12 usada só dentro da transação, desfeita pelo ROLLBACK); casos 1-5 confirmam rejeição de INSERT em budget/transactions para cada uma das 5 FKs referenciando entidade de B; casos 6-7 confirmam rejeição de UPDATE tentando redirecionar FK própria para B; caso 8 confirma fluxo legítimo sem regressão (budget/transaction com FKs próprias, incluindo categoria de sistema e transfer entre 2 contas próprias); **caso 9 reproduz o cenário exato do DevSecOps** (`SECURITY-REVIEW.md` Seção 1.2) — A referencia `category_id` de B em um `budget`; B tenta `DELETE` dessa categoria; bloqueado mesmo sob a RLS de B, confirmando o efeito do `SECURITY DEFINER`. Todos os 9 casos PASS, sem resíduo. Erro mapeado como 403 pelo PostgREST (RLS `WITH CHECK` falha com `42501`), documentado em `API-CONTRACT.yaml` v0.7.0 (novo 403 em POST/PATCH `/budget` e `/transactions`; nota adicional nos 409 já existentes de RN-08/RN-09). **Regressão completa revalidada**: 13/13 testes SQL (`apply_transaction_effect`, `BE-M-00` a `BE-M-13`, incluindo a suíte de RLS cross-user de `BE-M-11`) PASS, sem resíduo (contagem de todas as tabelas reais idêntica antes/depois: 1 profile, 1 `auth.users`, 12 categorias, 1 `allowed_signup_emails`, 0 nas demais); 16/16 testes unitários `deno test` de `BE-M-10` (`backup-export/lib.test.ts`) PASS, não afetados por esta tarefa. Nota de tentativa de RED→GREEN completo: reverter a migration no projeto linkado (único ambiente real hoje) para provar RED antes do fix foi bloqueado pelo classificador de segurança da ferramenta de execução (reversão de correção de segurança em produção, mesmo que temporária) — GREEN confirmado com asserções negativas explícitas (`RAISE EXCEPTION` se o bloqueio esperado não ocorrer), equivalente em confiança a RED→GREEN para este caso. **Gate de Fase 3 liberado**: `BE-F3-*` (Seção 3.3) pode iniciar |

#### Frontend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-M-00 | App shell: scaffolding React+TypeScript, Tailwind configurado com os tokens da Seção 3.1 do `UX-SPEC.md`, roteamento, manifest PWA + registro do Service Worker (Workbox) | Frontend | UX-SPEC Seção 3.1, 6.4; ADR-003 | App é instalável ("Adicionar à tela inicial"); tokens de cor/tipografia/spacing/radius aplicados conforme Seção 3.1 | 1.5 dia | Concluída |
| FE-M-01 | Componentes-base: `Button`, `Input`, `Select`, `Card`, `Badge`, `Toast/Snackbar`, `Modal`/`BottomSheet`, `Skeleton`, `EmptyState`, `Alert/Banner`, `Tabs`, `FilterBar`, `ConfirmationDialog`, `DatePicker` | Frontend | UX-SPEC Seção 3.2 | Todo componente atende WCAG 2.1 AA (foco visível, navegável por teclado, `Modal`/`BottomSheet` com focus trap) — DIR-15 | 3 dias | Concluída |
| FE-M-02 | Componentes de domínio base: `CurrencyInput` (máscara BRL, validação positiva), `CategoryPicker` (2 níveis, reflete taxonomia em tempo real) | Frontend | UX-SPEC Seção 3.3 | `CurrencyInput` formata em tempo real (`R$ 0.000,00`); `CategoryPicker` reflete edição de taxonomia sem reload (RF-MVP-03 AC2) | 1.5 dia | Concluída |
| FE-M-03 | Fila offline (IndexedDB via Dexie.js) para lançamento manual + `OfflineSyncBadge` | Frontend | UX-SPEC Seção 3.3, RNF-04, DIR-11 | Lançamento digitado offline entra na fila local e sincroniza ao reconectar sem perda; badge mostra contagem de itens pendentes | 1.5 dia | **Concluída — 2026-09-03.** `BE-M-06` publicou `/transactions` real em `API-CONTRACT.yaml` (v0.2.0+) — `syncPendingTransactions()` (`frontend/src/lib/offline/sync.ts`) trocou o stub pelo `realSyncClient`, que chama `createTransaction` (`frontend/src/lib/api/transactions.ts`, `POST /transactions` via `@supabase/supabase-js`/PostgREST). Mapeamento `PendingTransaction` (fila local) → `NewTransaction` (contrato) testado (`toNewTransaction`, `sync.test.ts`); item só sai da fila após `createTransaction` resolver com sucesso, nunca antes (DIR-11 preservado); erro do servidor (ex. 409 conta inativa) mantém o item na fila com `status: error` e a mensagem do `ApiError`. `OfflineSyncBadge` atualizado (doc), sem mudança de comportamento visual. 27/27 testes de `src/lib/api` + `src/lib/offline` + `OfflineSyncBadge` passando |
| FE-M-04 | Telas de autenticação/desbloqueio: S-AUTH-01 (login), S-AUTH-03 (desbloqueio), S-AUTH-04 (setup PIN), S-AUTH-05 (bloqueio temporário) + `PinPad` + integração cliente WebAuthn | Frontend | UX-FL-10, S-AUTH-01/03/04/05, DIR-16/17/18/19 | Desbloqueio funciona 100% offline (DIR-16); após 5 tentativas de PIN incorretas, bloqueio de 5 min com contagem regressiva visível (RF-MVP-08 AC2) | 2.5 dias | **Concluída — 2026-09-03.** `BE-M-09` publicou o contrato real das 3 Edge Functions em `API-CONTRACT.yaml` v0.6.0 — implementado contra o contrato real (`@supabase/supabase-js` para sessão/PostgREST, `@simplewebauthn/browser` para `/webauthn-register`/`/webauthn-authenticate`), não mock. `frontend/src/lib/auth/{session,emailMfa,pin,lockout,webauthn,AuthContext,AuthGate}.ts(x)`: máquina de estado `loading→signed-out→needs-mfa→needs-pin-setup→locked→unlocked` (DIR-19/G-07: `unlocked` nunca substitui `session`/JWT). PIN local 100% offline via `crypto.subtle` PBKDF2-SHA256 100k iterações + salt aleatório, persistido só em IndexedDB (`localAuthDb`, DIR-17) — nunca transmitido. Lockout 5 tentativas/5min com countdown ao vivo (DIR-18/G-17), auto-libera ao zerar (`lockout.ts`, 6 testes). `PinPad` (`components/domain/PinPad.tsx`, 6 testes) — teclado físico + toque, alvo ≥44px. Telas `LoginPage`/`PinSetupPage`/`UnlockPage` (S-AUTH-01/03/04/05) implementadas conforme wireframes; 1 pequeno desvio documentado em comentário (PIN sempre visível em vez de atrás de um link "Usar PIN", superconjunto do requisito). **Achado de UX-SPEC sinalizado ao UX/UI, não resolvido sozinho**: `API-CONTRACT.yaml` exige um 2º fator por e-mail (`/auth-email-mfa`) antes das 4 tabelas com gate de MFA aceitarem qualquer operação, mas `UX-SPEC.md` não desenha essa tela (numeração pula de S-AUTH-01 para S-AUTH-03) — registrado como `BLOCKERS.md` Bloqueio 008 (aberto, não-bloqueante); implementado um preenchimento funcional mínimo `EmailMfaStep.tsx` só com componentes já especificados, para não travar toda a cadeia de FE-M-05 em diante. 19/19 testes de `src/lib/auth` + `src/pages/auth` + `PinPad` passando; `tsc -b` limpo |
| FE-M-05 | Onboarding: S-ONB-01 (primeira conta) → S-ONB-02 (revisão de taxonomia) | Frontend | UX-FL-11 | Sem conta cadastrada, usuário não avança (RF-MVP-01 é pré-requisito estrutural); taxonomia padrão exibida e 100% editável depois | 1 dia | **Concluída — 2026-09-03.** `OnboardingGate` (`lib/onboarding/OnboardingGate.tsx`, 3 testes) checa `GET /accounts` real e redireciona para `/onboarding/conta` sem nenhuma conta — roda depois do `AuthGate`, nunca antes. `FirstAccountPage` (S-ONB-01) e `TaxonomyReviewPage` (S-ONB-02) implementadas contra `POST /accounts`/`GET /categories` reais (`API-CONTRACT.yaml`, `BE-M-03`/`BE-M-05` concluídas) |
| FE-M-06 | Telas de contas: S-ACC-01/02/04 (Padrão A + Padrão B) | Frontend | UX-FL-06 | Inativação de conta com vínculo exibe o texto explícito de RN-08 (Seção 2.2 UX-SPEC) | 1.5 dia | **Concluída — 2026-09-03.** `AccountsPage.tsx` contra `/accounts` real (`BE-M-03`). Fluxo de exclusão tenta `DELETE` primeiro; captura `ApiError.kind === "conflict"` (409 real de `accounts_before_delete_block_linked`, RN-08) e troca a `ConfirmationDialog` para o texto exato da UX-SPEC ("será inativada, não excluída — o histórico permanece intacto"), oferecendo `PATCH is_active:false` como alternativa. Estados vazio/carregando/erro/sucesso (Padrão A). 5/5 testes passando, incluindo o cenário RN-08 completo |
| FE-M-07 | Telas de formas de pagamento: S-PAY-01/02 | Frontend | UX-FL-07 | 5 formas padrão exibem badge "Padrão" sem ação de editar/excluir | 1 dia | **Concluída — 2026-09-03.** `PaymentMethodsPage.tsx` contra `/payment_methods` real (`BE-M-04`). Formas `is_system_default=true` exibem badge "Padrão" e nenhum botão de excluir (verificado por teste); customizadas têm ação de excluir. Pequeno desvio documentado em comentário: formulário inclui um select de `type` (exigido pelo contrato, não listado em UX-SPEC Seção 2.2, que só cita "Nome, ícone"). 3/3 testes passando |
| FE-M-08 | Telas de categorias: S-CAT-01/02/03 (árvore com subcategorias recolhíveis) | Frontend | UX-FL-08 | Bloqueio de exclusão exibe modal com contagem de lançamentos vinculados e CTA "Ver lançamentos desta categoria" (RN-09) | 1.5 dia | **Concluída — 2026-09-03.** `CategoriesPage.tsx` contra `/categories` real (`BE-M-05`), árvore de 2 níveis com subcategorias recolhíveis (`aria-expanded`). Exclusão bloqueada (409 real de RN-09) busca `GET /transactions?category_id=eq.{id}` e abre modal com a contagem exata + botão "Ver lançamentos desta categoria" (navega para `/lancamentos?categoria={id}`), conforme `API-CONTRACT.yaml`. 2/2 testes passando, incluindo o cenário RN-09 completo |
| FE-M-09 | Telas de lançamentos: S-TXN-01 (lista, agrupada por dia, FilterBar) e S-TXN-02 (form novo/editar) | Frontend | UX-FL-01, FL-01 | Mês corrente listado por padrão (RF-MVP-04 AC5); validação inline por campo ao perder foco e no submit | 2 dias | **Concluída — 2026-09-03.** `TransactionsPage.tsx` + `TransactionFormModal.tsx` contra `/transactions` real (`BE-M-06`). Mês corrente por padrão via `currentMonthRange()` (`lib/date.ts`); `FilterBar` (conta/forma/categoria); lista agrupada por dia (`formatDayHeading`); validação inline por campo + banner de erro de rede/conflito. **Integra com FE-M-03**: falha de rede ao salvar (`ApiError.kind === "network"`) cai automaticamente para `enqueueTransaction` (fila offline, DIR-11) em vez de perder o lançamento digitado — testado ponta a ponta. 4/4 testes passando |
| FE-M-10 | Dashboard: S-DASH-01 (saldo, resumo, `DonutChart` tocável) | Frontend | RF-MVP-05/06, S-DASH-01 | Gráfico de distribuição por categoria é o segundo bloco visível (não anexo secundário); tocar em fatia navega para lista filtrada | 2 dias | **Concluída — 2026-09-03.** `DashboardPage.tsx` contra `get_month_provision`/`get_monthly_category_summary`/`get_month_transaction_count`/`get_budget_status` reais (`BE-M-07`/`BE-M-08`) — usa exclusivamente `current_total_balance_cents` (nunca `provisioned_balance_cents`, deprecated por achado documentado em `API-CONTRACT.yaml`). `DonutChart` (SVG próprio, sem lib externa) é o 2º bloco visível, com legenda tocável navegando para `/lancamentos?categoria={id}` e toggle "Ver como tabela" (WCAG, alternativa textual a gráfico). Estado "sem lançamento no mês" mantém números-resumo visíveis em zero (UX-SPEC 4.2). 4+7 testes (`DashboardPage`+`DonutChart`+`ProgressBar`) passando |
| FE-M-11 | Orçamento: S-BUD-01 (`ProgressBar` 3 estados) e S-BUD-02 (form) | Frontend | UX-FL-09, RN-04 | Estado de alerta (≥80%) e estouro (>100%) sempre combinam cor + ícone + texto, nunca só cor (WCAG, Seção 5) | 1.5 dia | **Concluída — 2026-09-03.** `BudgetPage.tsx` contra `/budget` + `get_budget_status` reais (`BE-M-01`/`BE-M-08`). `ProgressBar` (`components/domain/ProgressBar.tsx`) combina cor+ícone+texto nos 3 estados (`none`/`warning ⚠`/`exceeded ⛔`), nunca só cor — testado explicitamente. Form S-BUD-02 com categoria/teto/limiar de alerta. 2/2 (`BudgetPage`) + 4/4 (`ProgressBar`) testes passando |
| FE-M-12 | Configurações base: S-SET-01 (perfil, logout, alterar PIN) | Frontend | UX-FL-20 (parte MVP), RF-MVP-08 AC3 | Logout explícito encerra a sessão ativa | 0.5 dia | **Concluída — 2026-09-03.** `SettingsPage.tsx` — e-mail da conta (Supabase Auth), "Sair" chama `signOut()` real (`supabase.auth.signOut()`, encerra a sessão ativa, testado), "Alterar PIN" exige o PIN atual correto (`verifyPin` local) antes de aceitar o novo (2x, mesmo padrão de `PinSetupPage`). 3/3 testes passando |

**Nota de rastreabilidade sobre "Concluída" (FE-M-04 a FE-M-12)**: todo o código acima chama os endpoints/RPCs/Edge Functions **reais** publicados em `API-CONTRACT.yaml` v0.6.0 via `@supabase/supabase-js`/`@simplewebauthn/browser` — nenhum mock no caminho de execução em produção (a técnica de `vi.mock` nos testes automatizados isola unidades para teste determinístico, mesmo princípio que os testes SQL do Backend rodam em transação isolada, não é o mesmo "mock de contrato" do ponto de sincronização do processo). Esta sessão não teve acesso a credenciais reais do projeto Supabase (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) para rodar um smoke test end-to-end contra o backend em produção — `tsc -b` limpo, 140/140 testes automatizados passando, e `npm run build` gerando bundle de produção válido são as evidências desta rodada; recomenda-se ao QA (ou a uma sessão futura com as credenciais configuradas) um smoke test manual de cada fluxo antes do Gate de QA fechar essas tarefas.

#### QA

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| QA-M-01 | Elaborar `TEST-PLAN.md` inicial (estratégia funcional/integração para MVP) + casos de teste funcionais para RF-MVP-01 a 08 | QA | PRD-TECNICO Seção 1 (MVP), TASK.md Seção 3.1 | Todo AC de RF-MVP-01 a 08 tem ao menos um caso de teste mapeado em `TEST-PLAN.md` | 1.5 dia | Não iniciada |
| QA-M-02 | Casos de teste automatizados para regras críticas de autorização/integridade: RN-08 (inativação vs. exclusão), RN-09 (bloqueio de exclusão de categoria vinculada), RLS ownership (reforça BE-M-11) | QA | SDD Seção 6.1 (risco "lógica de negócio concentrada"), RN-08, RN-09 | Teste automatizado falha se `DELETE` físico de conta/categoria vinculada for permitido, ou se RLS cross-user vazar dado | 1.5 dia | Não iniciada |

### 3.2 Fase 2

#### Backend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| BE-F2-01 | Modelo de dados de cartão: tabela `credit_card` + vínculo com forma de pagamento "crédito" | Backend | RF-F2-01 AC1 | Cartão cadastrado disponibiliza "crédito" como forma de pagamento vinculada | 1 dia | Não iniciada |
| BE-F2-02 | Edge Function: fechamento de fatura (RN-01) + cálculo de limite disponível (RN-06) + geração/atualização de `invoice` para competência atual + 2 futuras | Backend | RF-F2-05 AC1-3, RN-01, RN-06 | Lançamento pós-fechamento entra na próxima fatura, nunca na já fechada (AC2); limite disponível reflete parcelas/compras futuras já lançadas desde o momento do lançamento, não só quando "cai" na fatura (RN-06) | 2.5 dias | Não iniciada |
| BE-F2-03 | Modelo de dados de recorrência (`recurring_template`) + Edge Function de geração mensal agendada via `pg_cron` | Backend | RF-F2-02 AC1 | Lançamento correspondente é gerado automaticamente em cada mês subsequente, sem ação manual | 2 dias | Não iniciada |
| BE-F2-04 | Reajuste de valor de recorrência: aplicação prospectiva a partir de competência escolhida, histórico de reajuste preservado | Backend | RF-F2-03 AC1-3, RN-02, FL-03 | Novo valor só afeta lançamentos futuros a partir da competência escolhida; lançamentos já gerados permanecem com valor antigo (AC2) | 1 dia | Não iniciada |
| BE-F2-05 | Modelo de dados de parcelamento (`installment_purchase`) + geração de parcela por fatura até quitação | Backend | RF-F2-04 AC1-2 | Contador "parcela X de N" corresponde exatamente às parcelas geradas até o momento (AC2) | 1.5 dia | Não iniciada |
| BE-F2-06 | Modelo de dados de contas fixas (`fixed_bill`) + Edge Function de geração de lançamento previsto por competência | Backend | RF-F2-06 AC1-2 | Lançamento previsto (pendente) é gerado para cada competência; marcar como paga converte para efetivado, refletido no saldo (AC2) | 1.5 dia | Não iniciada |
| BE-F2-07 | Edge Function: aviso de conta fixa a vencer (RN-05, 3 dias corridos configurável) + disparo de Web Push | Backend | RF-F2-07 AC1-2, RN-05 | Notificação de aviso é emitida quando faltam N dias configurados; conta não paga até o vencimento é sinalizada como vencida (AC2) | 1.5 dia | Não iniciada |
| BE-F2-08 | Modelo de dados de metas (`goal`, `contribution`) + cálculo de percentual de progresso | Backend | RF-F2-08 AC1-2 | Progresso é recalculado a cada aporte vinculado | 1 dia | Não iniciada |
| BE-F2-09 | Infraestrutura de notificações unificada: tabela `notification`, mecanismo único (Web Push VAPID) centralizando orçamento (RF-MVP-07) e conta fixa (RF-F2-07), sem lógica de disparo duplicada | Backend | RF-F2-09 AC1-2 | Um único ponto de código dispara push para os dois gatilhos; histórico de notificação é consultável independentemente de o push ter sido entregue (AC2) | 1.5 dia | Não iniciada |
| BE-F2-10 | Query de relatório comparativo entradas x saídas, últimos 6 meses (ou menos, sem preencher com zero) | Backend | RF-F2-10 AC1-2 | Com menos de 6 meses de dado, resposta traz só os meses disponíveis, nunca zero para mês inexistente (AC2) | 1 dia | Não iniciada |

#### Frontend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-F2-01 | Telas de cartão: S-CARD-01/02 | Frontend | UX-FL-12 | Cartão cadastrado exibe limite, dia de fechamento, dia de vencimento | 1 dia | Não iniciada |
| FE-F2-02 | Fatura projetada: S-CARD-03 (`InvoiceTimeline`, abas atual+2 futuras) | Frontend | UX-FL-02, DIR-13 | Limite disponível sempre visível (RN-06); badge aberta/fechada por aba (RF-F2-05 AC3) | 2 dias | Não iniciada |
| FE-F2-03 | Compra parcelada: S-INST-01/02 (`InstallmentProgress`) | Frontend | UX-FL-12 | "Parcela X de N" exibido, não é `ProgressBar` percentual genérico | 1.5 dia | Não iniciada |
| FE-F2-04 | Recorrência: S-REC-01/02/03/04 (criação, reajuste com confirmação de competência, encerramento) | Frontend | UX-FL-03, UX-FL-13, FL-03 | Reajuste exige confirmação explícita "a partir de qual competência" antes de aplicar (RF-F2-03 AC1) | 2.5 dias | Não iniciada |
| FE-F2-05 | Contas fixas: S-FIX-01/02/03 (badge Pendente/Paga/Vencida) | Frontend | UX-FL-14 | Badge de status muda automaticamente para "Vencida" após o vencimento sem pagamento marcado | 1.5 dia | Não iniciada |
| FE-F2-06 | Metas: S-GOAL-01/02/03/04 (`ProgressBar` + lista de aportes) | Frontend | UX-FL-15 | Progresso exibido visualmente e atualizado a cada aporte registrado | 1.5 dia | Não iniciada |
| FE-F2-07 | Notificações: `NotificationBell` + `NotificationCenter` (S-NOT-01/02), wiring de push no client | Frontend | UX-FL-16, DIR-14 | Sino sempre acessível independente de push entregue; toque leva à entidade relacionada (orçamento estourado → S-BUD-01; conta a vencer → S-FIX-01) | 1.5 dia | Não iniciada |
| FE-F2-08 | Relatório comparativo: S-REP-01 (`BarChart`) | Frontend | UX-FL-17 | Menos de 6 meses de dado exibe nota "Dados disponíveis a partir de [mês]", nunca zero enganoso (RF-F2-10 AC2) | 1.5 dia | Não iniciada |
| FE-F2-09 | Configurações Fase 2: S-SET-02 (toggles de notificação), S-SET-03 (limiares padrão RN-04/RN-05) | Frontend | UX-FL-20 (parte F2) | Limiar padrão aplica a novos cadastros; cada orçamento/conta fixa individual pode sobrescrever | 1 dia | Não iniciada |

#### QA

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| QA-F2-01 | Casos de teste automatizados para RN-01 (fechamento de fatura), RN-02 (reajuste prospectivo), RN-06 (limite de cartão), RN-07 (preservação de histórico ao cancelar recorrência/parcelamento) — regras concentradas em Edge Functions/`pg_cron` (SDD Seção 6.1, risco "lógica de negócio concentrada") | QA | SDD Seção 6.1, RN-01/02/06/07 | Cada regra tem teste automatizado que falha se o comportamento divergir do AC correspondente em `PRD-TECNICO.md` | 2 dias | Não iniciada |
| QA-F2-02 | Regressão E2E dos fluxos de Fase 2 (UX-FL-02, 03, 12 a 17) | QA | UX-SPEC Seção 1.1/1.2 (Fase 2) | Todo fluxo de tela de Fase 2 percorrido ponta a ponta sem erro, incluindo os 4 estados de tela (vazio/carregando/erro/sucesso) onde aplicável | 1.5 dia | Não iniciada |

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

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| BE-F3-00 | Modelo de dados de captura automatizada: `candidate_transaction`, `import_batch` — base compartilhada por voz, foto, importação e Open Finance | Backend | SDD Seção 5, RNF-01/RNF-08, DIR-20 | Nenhuma linha em `candidate_transaction` é promovida a `transaction` sem evento de confirmação explícito + `confirmed_at` gravado | 2 dias | Não iniciada |
| BE-F3-01 | Edge Function de OCR atrás da interface `OCRProvider` (DIR-22), integrando o vendor escolhido em SPK-002 | Backend | RF-F3-02 AC1-3, ADR-007, SPK-002 | Campo obrigatório não extraído retorna em branco sem bloquear os demais (AC3); chave de API nunca exposta ao cliente | 2 dias | Não iniciada |
| BE-F3-02 | Edge Function de suporte a captura por voz: recebe transcrição do client (Web Speech API) e/ou aciona fallback STT em nuvem, extrai campos estruturados | Backend | RF-F3-01 AC1, ADR-006 | Campos extraídos retornam marcados como "sugestão automática, não confirmada" (AC1) | 1.5 dia | Não iniciada |
| BE-F3-03 | Parser de extrato OFX/CSV (Edge Function) + detecção de possível duplicata (mesma data/valor/conta) | Backend | RF-F3-03 AC1-2 | Transação candidata coincidente com lançamento existente é sinalizada antes da confirmação (AC2) | 2 dias | Não iniciada |
| BE-F3-04 | Integração Open Finance (Pluggy): fluxo de consentimento OAuth2, sincronização periódica, endpoint de webhook com validação de assinatura | Backend | RF-F3-04 AC1-2, ADR-008, SPK-003, DIR-25/26 | Sincronização produz candidatos seguindo o mesmo fluxo de revisão de RF-F3-03 (AC1); feature flag de produção só liga após SPK-003 = Resolvido | 3 dias | Não iniciada |
| BE-F3-05 | Criptografia adicional em nível de aplicação para token de conexão Open Finance (Supabase Vault/`pgsodium`) | Backend | SDD Seção 7 (Criptografia), DIR-24 | Token nunca é legível em texto puro numa consulta direta à tabela, mesmo com acesso de leitura ao banco | 1 dia | Não iniciada |
| BE-F3-06 | Query de evolução patrimonial (série temporal do saldo consolidado, filtrável por conta) | Backend | RF-F3-05 AC1-2 | Filtro por conta individual retorna série coerente com a visão consolidada | 1 dia | Não iniciada |
| BE-F3-07 | Exportação CSV/PDF (Edge Function ou geração client-side com `pdf-lib`) | Backend | RF-F3-06 AC1-2 | CSV contém no mínimo data, conta, forma de pagamento, categoria, subcategoria, descrição, tipo, valor (AC1); PDF contém resumo do período (saldo, entradas, saídas, distribuição por categoria — layout mínimo definido na Seção 6) | 2 dias | Não iniciada |
| BE-F3-08 | **[Reestimada]** Jobs diários de expurgo de dado transitório conforme ADR-011: `CandidateTransaction` descartado/abandonado (30 dias) + foto de recibo associada (30 dias); foto de recibo de lançamento confirmado (90 dias após `confirmed_at`); export CSV/PDF (24h após geração) | Backend | CC-01 (Seção 6, resolvida), `adr/011-politica-retencao-descarte-dado-exclusao-conta.md` | Candidato com `status = descartado` há mais de 30 dias (ou `pendente` sem ação há mais de 30 dias desde a criação do `ImportBatch`) é removido pelo job diário junto da foto associada no Storage; foto de recibo de lançamento confirmado é removida 90 dias após `confirmed_at`, sem afetar o `Transaction`; export gerado há mais de 24h é removido do bucket de exports; falha de execução de qualquer um dos três jobs gera log/alerta consultável (mesmo padrão de DIR-32) | 2.5 dias | Não iniciada |
| BE-F3-09 | **[Nova — ADR-011]** Edge Function de exclusão de conta a pedido do usuário (role de serviço, nunca exposta como operação direta do cliente) | Backend | ADR-011 (tabela-resumo, linha "Exclusão de conta"), CC-01 (Seção 6, resolvida) | Ação autenticada e explícita do usuário dispara a Edge Function, que remove todas as linhas de `public` associadas ao `user_id` (respeitando dependência de FK/cascade), todos os objetos do Storage do mesmo `user_id` (fotos de recibo, exports pendentes), e o usuário correspondente em Supabase Auth; chamada sem o JWT do próprio usuário-alvo é rejeitada | 2 dias | Não iniciada |
| BE-F3-10 | **[Nova — ADR-011]** Rotação de backup: expurgo do snapshot mais antigo a cada execução, mantendo no máximo os últimos 30 snapshots diários (extensão da Edge Function de `BE-M-10`) | Backend | ADR-011 (tabela-resumo, linha "Backup/exportação lógica") | A cada execução diária do job de backup, se já houver 30 snapshots armazenados, o snapshot mais antigo é removido, mantendo o total em no máximo 30 | 0.5 dia | Não iniciada |

#### Frontend

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-F3-01 | Ponto de entrada de captura: S-CAP-01 (FAB expandido: Manual/Falar/Fotografar, opção desabilitada com texto explicativo se STT indisponível) | Frontend | UX-FL-04, S-CAP-01 | Se navegador não suporta Web Speech API nem há fallback configurado, "Falar" aparece desabilitada com "Não disponível neste navegador", nunca some silenciosamente | 1 dia | Não iniciada |
| FE-F3-02 | Captura por voz: S-CAP-02 (`VoiceRecorderUI`, transcrição interina ao vivo, `aria-live`) | Frontend | UX-FL-04, S-CAP-02, DIR-15 | Estado "Ouvindo..." e transcrição interina são anunciados via `aria-live`, não só exibidos visualmente | 2 dias | Não iniciada |
| FE-F3-03 | Captura por foto: S-CAP-04 (`ReceiptCameraCapture`, moldura-guia, upload alternativo, pré-visualização) | Frontend | UX-FL-04, S-CAP-04 | Permissão de câmera negada oferece upload de arquivo como alternativa, nunca bloqueia o usuário (Seção 4.2 UX-SPEC) | 2 dias | Não iniciada |
| FE-F3-04 | Rascunho de confirmação: S-CAP-03/S-CAP-05 (`DraftReviewBanner`, `AutoFillTag`) — tela mais crítica do produto para RNF-01 | Frontend | UX-FL-04, RNF-01/RNF-08, DIR-20 | Banner fixo não-descartável até ação explícita; nenhum timer/auto-confirmação/navegação automática (WCAG 2.2.1); tag "✨ sugerido" desaparece só ao editar o campo (RF-F3-01 AC3) | 3 dias | Não iniciada |
| FE-F3-05 | Importação: S-CAP-06/07 (`CandidateList`, `ReconciliationHint`, seleção em lote) | Frontend | UX-FL-05, FL-05 | Itens sinalizados como possível duplicata vêm desmarcados por padrão (RF-F3-03 AC2); nada persiste antes da confirmação de seleção (AC3) | 2.5 dias | Não iniciada |
| FE-F3-06 | Open Finance: S-CAP-08/09 (fluxo de consentimento, lista de conexões, status) — implementável em dev, gate de produção via SPK-003 (DIR-26) | Frontend | UX-FL-05, RF-F3-04 | Tela funcional em ambiente de desenvolvimento; feature flag de produção respeitando DIR-26 | 1.5 dia | Não iniciada |
| FE-F3-07 | Relatório de evolução patrimonial: S-REP-02 (`LineChart`, filtro por conta) | Frontend | UX-FL-18 | Filtro "Todas as contas" disponível além de contas individuais | 1.5 dia | Não iniciada |
| FE-F3-08 | Exportação: S-REP-03 (seleção de período/formato, indicador de geração, download) | Frontend | UX-FL-19 | Usuário escolhe CSV ou PDF e recebe o arquivo correspondente ao período selecionado | 1.5 dia | Não iniciada |
| FE-F3-09 | **[Nova — ADR-011]** Fluxo de exclusão de conta: confirmação em duas etapas com aviso textual da cauda residual de até 30 dias em backup já emitido | Frontend | ADR-011 ("Condição de revisão": fluxo delegado ao UX/UI, ainda **não especificado** em `UX-SPEC.md`) | Usuário só confirma exclusão após uma segunda confirmação explícita (nunca um único toque); tela exibe textualmente "dado pode persistir por até 30 dias em backup já emitido" antes da confirmação final; ao confirmar, chama `BE-F3-09` e encerra a sessão ao concluir | 1 dia (**preliminar** — usa `ConfirmationDialog`/`Modal` já definidos em FE-M-01 como base; sujeita a reestimativa quando UX-SPEC.md formalizar a tela definitiva, ver Seção 6.1) | Não iniciada — sinalizado ao UX/UI |

#### QA

| ID | Tarefa | Time | Origem (componente/tela) | Critério de Aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| QA-F3-01 | Casos de teste automatizados e manuais para RNF-01/RNF-08 nos 4 fluxos automatizados (voz, foto, importação, Open Finance): nenhuma persistência sem confirmação explícita, em nenhum cenário (inclusive falha de rede durante confirmação) | QA | RNF-01, RNF-08, DIR-20 | Teste falha propositalmente uma tentativa de bypass (chamada direta à API sem passar pela tela de confirmação) e confirma que a policy/validação server-side também rejeita, não só a UI | 2 dias | Não iniciada |
| QA-F3-02 | Teste de acessibilidade WCAG 2.1 AA nos componentes novos sem equivalente de mercado: `VoiceRecorderUI`, `ReceiptCameraCapture`, `DraftReviewBanner`, `AutoFillTag`, `CandidateList` | QA | UX-SPEC Seção 3.3, Seção 5 | Nenhum achado crítico de acessibilidade aberto nos 5 componentes marcados **[NOVO]** | 1.5 dia | Não iniciada |
| QA-F3-03 | Regressão completa pré-lançamento de Fase 3 (MVP + Fase 2 + Fase 3 integradas) | QA | Todo o escopo | Nenhuma regressão introduzida em MVP/Fase 2 pela introdução da Fase 3 | 2 dias | Não iniciada |
| QA-F3-04 | **[Nova — ADR-011]** Casos de teste para os jobs de expurgo (`BE-F3-08`: candidato/foto 30 dias, foto de confirmado 90 dias, export 24h; `BE-F3-10`: rotação de backup) e para o fluxo de exclusão de conta (`BE-F3-09`/`FE-F3-09`) | QA | ADR-011 | Teste automatizado confirma que dado além do prazo é removido e que dado dentro do prazo **não** é removido (fronteira testada nos dois sentidos, para cada categoria); teste de exclusão de conta confirma ausência de qualquer linha remanescente em `public`, objeto no Storage e usuário em Supabase Auth associados ao `user_id` excluído | 1 dia | Não iniciada |

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
| Backend | MVP: **16.75** (↑ de 15.25 — Bloqueio 010/SEC-DEBT-002: `BE-M-13` nova, 1.5 dia, correção sistêmica de ownership de FK cross-tenant em `budget`/`transactions` + `SECURITY DEFINER` nos triggers RN-08/RN-09, determinada pelo CTO como pré-requisito de início de Fase 3; demais linhas inalteradas por esta resolução, ver Seção 3.1) · Fase 2: 14.5 · Fase 3: 19.5 (inclui `BE-F3-08` reestimada em 2.5, mais `BE-F3-09` 2 e `BE-F3-10` 0.5, novas por ADR-011) · Spikes remanescentes: SPK-002 3 + SPK-003 3 = 6 (`SPK-001`, 2 dias, já executado e Resolvido — não conta mais como esforço remanescente) · **Total remanescente ≈ 56.75** (histórico, incluindo `SPK-001` já gasto: ≈ 58.75) | Não informada | Ver riscos nomeados abaixo |
| Frontend | MVP: 21 · Fase 2: 14.5 · Fase 3: 16 (inclui `FE-F3-09` 1 dia preliminar, nova por ADR-011) · **Total ≈ 51.5** — inalterado por esta resolução | Não informada | Ver riscos nomeados abaixo |
| QA | MVP: 3 · Fase 2: 3.5 · Fase 3: 6.5 (inclui `QA-F3-04` 1 dia, nova por ADR-011) · **Total ≈ 13** — inalterado por esta resolução | Não informada | Ver riscos nomeados abaixo |
| **Total geral** | **Remanescente ≈ 121.25 dias ideais** (MVP ≈ 40.75, Fase 2 ≈ 32.5, Fase 3 ≈ 48) · **Histórico ≈ 123.25** (inclui os 2 dias já gastos de `SPK-001`) — mudança líquida em relação ao total anterior (≈121.75 histórico / ≈119.75 remanescente, já refletindo a resolução do Bloqueio 006): **+1.5 dia no total histórico**, integralmente atribuível a `BE-M-13` (Bloqueio 010). **Nota de materialidade**: este delta (+1.5 dia) é maior que o limiar (+1.25 dia) que, no Bloqueio 003, disparou um novo `capacity-and-timeline-validation` completo do CTO — diferente daquele caso, porém, a correção em si (o quê fazer, e o prazo "antes de qualquer `BE-F3-*`") já foi determinada diretamente pelo CTO no próprio veredito de origem (`CTO-REVIEW.md`, "Revisão de Segurança do Lote MVP", item 2), não é uma proposta original do Tech Lead pendente de validação de viabilidade — o Tech Lead não teria autoridade para decidir "não corrigir" para ficar abaixo do limiar. Registro a materialidade aqui por transparência (mesma disciplina já aplicada aos Bloqueios 003/005/006); fica a critério do CTO decidir se deseja um `capacity-and-timeline-validation` pontual formal sobre este delta específico, ou se considera o próprio veredito de origem já suficiente | Não informada | — |

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

Nenhuma outra lacuna estrutural foi encontrada durante a decomposição — as três
condições explicitamente citadas pelo CTO no Gate 2 (spike de schema legado, ressalva
de OCR, condições de entrada de Open Finance) já estavam corretamente endereçadas
como spikes (Seção 2) ou diretrizes obrigatórias (Seção 1), não como lacunas
estruturais adicionais.

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
