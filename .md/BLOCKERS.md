# BLOCKERS.md

Log de inconsistências/bloqueios entre agentes, conforme `PIPELINE-CONVENTIONS.md`
§4. Cada entrada é resolvida pelo dono do artefato afetado, nunca reinterpretada por
quem reportou.

---

## Bloqueio 001 — 2026-09-02

- **Reportado por**: ux-ui
- **Escalado para**: software-architect
- **Artefato/trecho afetado**: `SDD.md` Seção 7 (Autenticação) + `adr/005-autenticacao-supabase-auth-webauthn-pin-local.md` ("Negative Consequences": "PIN local exige atenção redobrada do DevSecOps para não ser trivialmente contornável (nunca confiar só na checagem client-side sem revalidação de sessão do lado do servidor)")
- **Descrição**: o `SDD.md` exige desbloqueio via WebAuthn/PIN antes de exibir
  qualquer dado financeiro (RF-MVP-08), e a ADR-005 registra que o PIN local precisa
  de "revalidação de sessão do lado do servidor". O texto não deixa claro se essa
  revalidação server-side é (a) parte do próprio gesto de desbloqueio — nesse caso, o
  app exigiria rede toda vez que o usuário abre/retoma o app, mesmo offline — ou (b)
  aplicada só às chamadas de API que vêm depois do desbloqueio (leitura/escrita no
  Postgres via PostgREST/Edge Functions), caso em que o desbloqueio em si (WebAuthn e
  checagem local de hash de PIN, ambos nativamente locais ao dispositivo por definição
  do próprio padrão WebAuthn) continuaria funcionando sem conexão.
  `UX-SPEC.md` (`.md/UX-SPEC.md`, Seção 2.2 "Autenticação e sessão", tela S-AUTH-03, e
  Seção 7.2 "Conflito 1") foi desenhado assumindo a interpretação (b), por ser a única
  compatível com a promessa de fila offline (RNF-04) que o próprio `SDD.md` define
  como parte da confiabilidade do produto — mas essa assunção não está confirmada pelo
  Software Architect.
- **Impacto se não resolvido**: o Tech Lead pode estimar a tela de desbloqueio
  (S-AUTH-03/04/05) com a assunção (b) documentada, mas a estimativa muda se a
  resposta correta for (a) — nesse caso a tela precisa de um estado adicional "sem
  conexão, desbloqueio indisponível", e a fila offline de lançamento manual perde
  parte do seu valor de produto na prática (o usuário não consegue nem abrir o app
  para colocar algo na fila sem rede), o que também pode gerar um conflito de escopo a
  escalar ao PM depois.
- **Sugestão (opcional)**: confirmar a interpretação (b) — desbloqueio (WebAuthn ou
  checagem local do hash de PIN) funciona sem chamada de rede; "revalidação
  server-side" da ADR-005 se refere exclusivamente à validação do JWT de sessão nas
  chamadas subsequentes ao Postgres/Edge Functions, que naturalmente falham/enfileiram
  offline sem impedir o desbloqueio em si.
- **Resolução**: interpretação **(b)** confirmada pelo Software Architect, exatamente
  como o UX/UI já havia assumido em `UX-SPEC.md`. O gesto de desbloqueio
  (WebAuthn ou checagem local do hash de PIN) é 100% local ao dispositivo e funciona
  offline; "revalidação de sessão do lado do servidor" no ADR-005 se refere
  exclusivamente à validação do JWT que o Supabase já aplica nativamente a toda
  chamada subsequente ao PostgREST/Edge Functions — comportamento já existente da
  stack, não um mecanismo novo. Sem conexão, essas chamadas falham/enfileiram na fila
  offline (RNF-04) normalmente, sem impedir o desbloqueio. Nenhum estado adicional
  "sem conexão, desbloqueio indisponível" é necessário em S-AUTH-03/04/05. Registrado
  formalmente em `adr/010-escopo-revalidacao-servidor-desbloqueio-local.md` (esclarece
  o ADR-005 sem alterar seu Decision Outcome — ADR-005 permanece `Accepted`, sem
  edição, conforme regra de imutabilidade de ADR). `SDD.md` Seção 4 (índice de ADRs) e
  Seção 7 (Autenticação) atualizadas com a referência ao ADR-010 e uma frase de
  esclarecimento — nenhuma outra parte do `SDD.md` foi reaberta.
- **Status**: Resolvido — 2026-09-02, por `software-architect`. `UX-SPEC.md` Seção
  7.2 "Conflito 1" e o item pendente do Checklist de Pronto do UX/UI podem ser
  atualizados para refletir a confirmação; S-AUTH-03/04/05 liberadas para estimativa
  do Tech Lead sem ressalva.

---

## Bloqueio 002 — 2026-09-02

- **Reportado por**: tech-lead
- **Escalado para**: software-architect
- **Artefato/trecho afetado**: `SDD.md` — nenhuma seção define política de retenção/
  descarte de dado (ausência confirmada em toda a Seção 7, "Requisitos de Segurança e
  Compliance", e em qualquer outra seção do documento)
- **Descrição**: durante a decomposição do `TASK.md` (Seção 3.3, bloco de tarefas de
  Fase 3), o Tech Lead confirmou que o `SDD.md` não define, em nenhuma seção, por
  quanto tempo lançamentos, exportações (CSV/PDF) e fotos de recibo ficam retidos, nem
  qual é o processo de exclusão/descarte de conta ou dado a pedido do usuário. Esse
  achado já havia sido registrado pelo CTO no Gate 2 (`risk-and-compliance-check`,
  severidade Média) e pelo UX/UI no `UX-SPEC.md` Seção 7.1 (que corretamente não
  desenhou tela sem base arquitetural correspondente). O CTO recomendou explicitamente
  ao Tech Lead, na seção "Recomendação" do Gate 2, que isso "vire requisito explícito
  antes de a Fase 3 entrar em desenvolvimento" — não é uma lacuna de detalhe de
  implementação que o Tech Lead possa decidir sozinho (não há decisão arquitetural
  prévia para traduzir em regra prática); é a ausência de uma decisão estrutural sobre
  o que é retido, por quanto tempo, e como/quando é descartado (possivelmente
  envolvendo `Storage` de fotos de recibo, exports gerados, e o próprio ledger em caso
  de exclusão de conta do usuário).
- **Impacto se não resolvido**: todo o bloco de tarefas de Fase 3 em `TASK.md` Seção
  3.3 (18 tarefas de Backend/Frontend, ≈31 dias ideais de esforço estimado, mais 3
  tarefas de QA) permanece bloqueado de iniciar desenvolvimento, conforme guardrail
  proposto `G-13` em `GUARDRAILS.md`. A tarefa `BE-F3-08` (implementação técnica da
  política) não pode nem ser estimada com confiança até a política existir — está
  marcada em `TASK.md` com estimativa preliminar explicitamente sujeita a
  reestimativa.
- **Sugestão (opcional)**: dado o contexto de projeto pessoal de usuário único (sem
  terceiros como titulares de dado distintos do próprio stakeholder), uma política
  proporcional poderia ser: retenção do ledger por tempo indefinido enquanto a conta
  estiver ativa (é o próprio propósito do produto — histórico financeiro contínuo);
  fotos de recibo (Storage) retidas por prazo definido após a confirmação do
  lançamento (ex.: 90 dias, suficiente para conferência, depois descartadas
  automaticamente, já que o dado estruturado extraído já foi confirmado e persistido
  separadamente); exports gerados sob demanda (não retidos além do necessário para
  download); processo de exclusão de conta a pedido do usuário removendo todo dado do
  schema `mymoney` associado ao `owner_id`. Esta é uma sugestão do Tech Lead, não uma
  decisão — cabe ao Software Architect confirmar, ajustar ou substituir, formalizando
  como nova seção do `SDD.md` ou novo ADR.
- **Resolução**: sugestão do Tech Lead **confirmada e detalhada com números
  concretos** pelo Software Architect, registrada formalmente em
  `adr/011-politica-retencao-descarte-dado-exclusao-conta.md` (decisão nova, não
  supersede nenhum ADR existente — preenchia uma lacuna estrutural, não uma decisão
  já tomada). Política final por categoria de dado:
  - **Ledger** (lançamentos e demais entidades de planejamento): retenção indefinida
    enquanto a conta estiver ativa — confirmado como o Tech Lead sugeriu.
  - **Candidato de importação (`CandidateTransaction`) descartado ou abandonado**:
    30 dias, então excluído por job diário — ponto **adicionado** pelo Software
    Architect, não coberto pela sugestão original (o Tech Lead havia tratado só o
    caso de fotos/exports/ledger; candidatos de OFX/CSV/Open Finance rejeitados ou
    nunca revisados também são dado persistido no schema, sujeitos ao mesmo princípio
    de minimização).
  - **Foto de recibo vinculada a lançamento confirmado**: 90 dias após
    `confirmed_at`, então descartada automaticamente — confirmado exatamente como o
    Tech Lead sugeriu.
  - **Foto de recibo vinculada a candidato descartado/abandonado**: 30 dias (mesmo
    prazo do candidato associado) — detalhamento adicional do Software Architect;
    evita reter imagem além da janela de retomada quando não há lançamento
    confirmado por trás dela.
  - **Exports (CSV/PDF)**: até 24h após geração — confirmado como o Tech Lead
    sugeriu ("não retidos além do necessário para download"), com número concreto
    definido.
  - **Backup/exportação lógica de disaster recovery (ADR-009)**: rotação dos
    últimos 30 snapshots diários — ponto **adicionado** pelo Software Architect
    (não estava na sugestão original); necessário para responder honestamente até
    quando um dado excluído pode persistir em algum snapshot.
  - **Exclusão de conta a pedido do usuário**: confirmado como o Tech Lead sugeriu
    (remove todo dado do schema `mymoney` associado ao `owner_id`), com dois
    detalhes adicionados: também remove os arquivos correspondentes no Storage e o
    usuário no Supabase Auth; e a tensão exclusão-vs.-backup é declarada
    honestamente (até 30 dias de cauda residual em backup já emitido antes do
    pedido, não purgado retroativamente por ser desproporcional ao contexto de
    projeto pessoal sem orçamento formal).

  Todos os jobs de expurgo reaproveitam exclusivamente o padrão já existente
  (`pg_cron` + Edge Function), sem infraestrutura nova. `SDD.md` Seção 7 recebeu uma
  nova subseção ("Retenção e Descarte de Dado", tabela-resumo + referência ao
  ADR-011) e Seção 4 (índice de ADRs) foi atualizada com a entrada do ADR-011 —
  nenhuma outra parte do `SDD.md` foi reaberta.
- **Status**: Resolvido — 2026-09-02, por `software-architect`. Libera a tarefa
  `BE-F3-08` em `TASK.md` para estimativa com confiança (a política que ela precisa
  implementar agora existe e está formalizada em ADR-011) e desbloqueia o guardrail
  `G-13`, liberando as 18 tarefas de Backend/Frontend de Fase 3 (`TASK.md` Seção
  3.3, ≈31 dias de esforço estimado) mais as 3 tarefas de QA associadas para
  iniciar desenvolvimento. Tech Lead pode remover a ressalva de "estimativa
  preliminar sujeita a reestimativa" de `BE-F3-08` e propagar os prazos concretos
  do ADR-011 para as tarefas relevantes de Backend (jobs de expurgo) e UX/UI (fluxo
  de confirmação de exclusão de conta, incluindo aviso sobre a cauda de 30 dias em
  backup, delegado ao UX/UI conforme "Condição de revisão" do ADR-011).

---

## Bloqueio 003 — 2026-09-02

- **Reportado por**: backend
- **Escalado para**: cto
- **Artefato/trecho afetado**: `ADR-001` (seção "Premissa a Validar" e "Negative
  Consequences"), `SDD.md` Seção 5 ("Modelo de Dados de Alto Nível") e Seção 7,
  `TASK.md` Seção 2 (`SPK-001`) e Seção 4.1 (dependência `BE-M-00`), `GUARDRAILS.md`
  G-01/G-02
- **Descrição**: `SPK-001` (inspeção do schema real do projeto Supabase
  `xrcxbzrglndetrrhavhc`) foi executado conforme as perguntas definidas em `TASK.md`
  Seção 2. Os achados técnicos completos estão abaixo; a conclusão é que **a premissa
  central do `ADR-001`/`SDD.md` — de que o projeto reaproveitado contém dado de "outro
  produto não relacionado" — não se sustenta**. O projeto tem `name = "mymoney"` na
  própria API de billing/organização do Supabase (`supabase projects list`, campo
  `name`), foi criado em 2026-08-27 (5 dias antes do início deste pipeline, em
  2026-09-02), e o schema `public` já implementa, de forma avançada, **o mesmo domínio
  que `SDD.md` Seção 5 desenhou do zero** — não uma sobreposição parcial ou
  coincidência de nomenclatura, mas o mesmo produto em um estágio de desenvolvimento
  anterior, aparentemente abandonado a meio caminho.

  **1. Roles**: apenas os roles padrão de um projeto Supabase novo (`anon`,
  `authenticated`, `authenticator`, `dashboard_user`, `postgres`, `service_role`,
  `supabase_admin`, `supabase_auth_admin`, `supabase_etl_admin`,
  `supabase_privileged_role`, `supabase_read_only_user`, `supabase_realtime_admin`,
  `supabase_replication_admin`, `supabase_storage_admin`) mais `cli_login_postgres`
  (sessão local do CLI já linkado). **Nenhum role customizado de aplicação existe** —
  não há isolamento de role dedicado para nenhum produto, nem "role do legado" que
  precise ser preservado/evitado.

  **2. Trigger global em `auth.users`**: existe — `on_auth_user_created` (`AFTER
  INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()`), habilitado.
  A função `handle_new_user()` (`SECURITY DEFINER`, `search_path = public, pg_temp`)
  insere automaticamente uma linha em `public.profiles (id)` para todo novo usuário
  criado em `auth.users`. **Isto é exatamente o cenário de colisão que `ADR-001`
  citou como risco hipotético** ("pode existir trigger global em `auth.users`") — e
  ele existe de fato. Como `auth.users` é compartilhado por definição (é o mesmo
  Supabase Auth, independente de schema `mymoney` vs. `public`), qualquer novo
  cadastro no produto vai continuar dessa forma inserindo uma linha em
  `public.profiles`, mesmo que todas as tabelas novas deste produto vivam
  exclusivamente em `mymoney` conforme DIR-01/G-01. Isso não bloqueia teoricamente a
  criação de uma tabela `mymoney.profile` separada, mas cria uma ambiguidade de qual
  tabela de perfil é a "fonte da verdade", e um efeito colateral silencioso
  (`public.profiles` crescendo para sempre) que ninguém no `SDD.md` previu.

  **3. Extensions**: `pg_cron` 1.6.4, `pg_stat_statements` 1.11, `pgcrypto` 1.3,
  `plpgsql` 1.0, `supabase_vault` 0.3.1, `uuid-ossp` 1.1. Todas de baixo risco de
  colisão (extensões de infraestrutura padrão Supabase, não específicas de um
  produto). Há um job de `pg_cron` já ativo: `fn-clear-due-transactions`
  (`*/15 * * * *`, chama `public.fn_clear_due_transactions()`) — regra de negócio já
  em produção, análoga ao que `BE-M-06`/RN-11 do MVP precisa implementar.

  **4. RLS policies**: todas as 7 tabelas de `public` têm RLS habilitada
  (`accounts`, `categories`, `email_mfa_challenges`, `payment_methods`, `profiles`,
  `transactions`, `webauthn_credentials`), com policy padrão `auth.uid() = user_id`
  para `SELECT`/`INSERT`/`UPDATE`/`DELETE` — **o mesmo padrão que `DIR-27`/`G-04`
  exigem para o schema `mymoney` novo**, já implementado. `accounts`, `categories`,
  `payment_methods` e `transactions` adicionalmente exigem
  `(auth.jwt() ->> 'app_email_mfa_verified') = 'true'` em toda policy — um gate de
  MFA por claim de JWT customizado, coerente com a migration `custom_access_token_hook`
  já aplicada (função `custom_access_token_hook(event jsonb)` existe em `public`,
  assinatura de Auth Hook do GoTrue — não confirmado se está de fato ativada nas
  configurações de Auth do projeto, só que a função existe).

  **5. Quota de Storage compartilhada**: `storage.buckets` está vazio (nenhum bucket
  criado ainda) — sem colisão de bucket hoje, mas a quota de Storage é por projeto
  Supabase (não por schema), então qualquer uso futuro por este produto compartilha o
  mesmo teto de quota do projeto, independente de schema.

  **6. Plano/tier contratado**: **não determinado com confiança via CLI/API
  disponível nesta máquina**. `supabase projects list` não expõe plano/tier;
  `max_connections = 60` e `shared_buffers ≈ 224MB` são consistentes tanto com o tier
  Free quanto com um Pro de compute mínimo — não são conclusivos. Não tentei extrair
  o token de acesso do CLI para chamar a Management API de billing diretamente (fora
  do escopo seguro desta inspeção). **Recomendo confirmação manual do stakeholder ou
  do CTO na aba Billing do dashboard** (`https://supabase.com/dashboard/project/xrcxbzrglndetrrhavhc/settings/billing`)
  antes de a decisão sobre `ADR-009`/PITR ser dada como encerrada — este item do
  `SPK-001` fica **parcialmente respondido**.

  **7. O achado estrutural principal — sobreposição de domínio, não dado alheio**:
  as 7 tabelas de `public` (`accounts`, `categories`, `email_mfa_challenges`,
  `payment_methods`, `profiles`, `transactions`, `webauthn_credentials`) mais 15
  funções (`apply_transaction_effect`, `custom_access_token_hook`,
  `fn_clear_due_transactions`, `get_month_provision`, `get_monthly_category_summary`,
  `handle_new_user`, `set_pin`/`verify_pin`, triggers de saldo/hierarquia/status) e o
  histórico de 13 migrations aplicadas entre 2026-08-27 e 2026-08-28 **implementam,
  quase 1:1, o mesmo modelo lógico que `SDD.md` Seção 5 desenhou "do zero"**:
  `Account`→`accounts`, `PaymentMethod`→`payment_methods`, `Category`
  (self-reference `parent_category_id`, exatamente como `SDD.md` descreve)
  →`categories` (já seedada com a mesma taxonomia de 12 categorias topo-nível que o
  `BE-M-02` do `TASK.md` precisa criar: Alimentação, Assinaturas, Compras, Educação,
  Investimentos, Lazer, Moradia, Outras Despesas, Outras Receitas, Salário, Saúde,
  Transporte), `Transaction`→`transactions` (com campo `source` — default `'manual'`,
  o enum sugere outros valores como voz/foto/importação/open finance, e colunas
  `recurring_rule_id`, `installment_plan_id`, `card_invoice_id`, `import_staging_id`,
  `external_ref`, `attachment_id` já antecipando exatamente as entidades de Fase
  2/Fase 3 do `SDD.md` — `RecurringTemplate`, `InstallmentPurchase`, `Invoice`,
  `ImportBatch`/`CandidateTransaction` — mesmo essas tabelas ainda não existindo).
  Além disso: 1 `profile` já cadastrado (dado real de um usuário, não seed vazio),
  RPCs de dashboard (`get_month_provision`, `get_monthly_category_summary`) análogas
  a `BE-M-07`, um gate de MFA por JWT claim mais sofisticado que o que `ADR-005`
  desenha, e WebAuthn já modelado (`webauthn_credentials`, colunas
  `credential_id`/`public_key`/`sign_count`/`device_label` — praticamente pronto para
  `BE-M-09`).

  Em suma: isto não é "dado legado de outro produto" que `ADR-001` precisa isolar por
  segurança — é muito provavelmente **uma implementação anterior deste mesmo produto
  MyMoney**, iniciada e pausada antes deste ciclo de planejamento (`PRD.md` em
  diante) começar, da qual nenhum agente upstream (Software Architect, UX/UI, Tech
  Lead) parece ter tido conhecimento ao desenhar `SDD.md`/`TASK.md` do zero.
- **Impacto se não resolvido**: `BE-M-00` (bootstrap do schema `mymoney`) e toda
  tarefa `BE-M-01` em diante ficam paradas — como já determinam `DIR-02`/`G-01`, e
  agora por um motivo adicional: prosseguir com a estratégia do `ADR-001` (criar
  `mymoney` do zero, ignorando `public`) sem uma decisão explícita corre o risco de
  (a) duplicar meses de trabalho de modelagem/regra de negócio que já existe e
  funciona em `public` (incluindo 1 usuário e uma taxonomia de categoria reais já
  cadastrados), ou (b) o produto final acabar com dois modelos de dado paralelos e
  divergentes para o mesmo domínio (`public.accounts` vs. `mymoney.account`,
  etc.), o que nenhum ADR/SDD atual antecipa nem resolve. Isto é precisamente o tipo
  de achado que o Gate 2 (subseção "ADR-001": "aqui formalizo isso como condição de
  aceite, não sugestão") e o Gate 3 (risco nº1: "se a inspeção revelar achado
  estrutural que o spike não resolva dentro do próprio escopo... deve virar
  `BLOCKERS.md` escalado a mim [CTO] imediatamente, em vez de absorver a descoberta
  silenciosamente em decisões de implementação") pediram para não ser absorvido em
  silêncio por Backend.
- **Sugestão (opcional)**: três caminhos possíveis, nenhum decidido aqui — cabe ao
  CTO (e, dependendo do veredito, ao Software Architect para atualizar `ADR-001`/
  `SDD.md`, já que envolve reabrir uma decisão arquitetural aceita):
  1. **Confirmar com o stakeholder** (fora da cadeia de agentes, só ele sabe) se
     `public` é de fato um MVP anterior deste mesmo produto MyMoney abandonado, ou um
     produto genuinamente distinto que por coincidência usa nomenclatura/domínio
     financeiro semelhante (menos provável dado `name = "mymoney"` no próprio
     projeto Supabase, mas não posso descartar sem confirmação humana).
  2. Se confirmado que é uma implementação anterior deste produto: avaliar
     formalmente **reaproveitar `public` como base** (renomear/mover para `mymoney`
     via migration teórica, ou adotar `public` como schema de fato e reescrever
     `ADR-001`) em vez de recomeçar do zero em `mymoney` — evita perder trabalho
     já funcional (triggers de saldo, RPCs de dashboard, MFA gate, WebAuthn) e o
     único dado real existente (1 profile, 12 categorias).
  3. Se decidido manter a estratégia original do `ADR-001` (schema `mymoney` novo,
     isolado): registrar explicitamente a decisão de **não** reaproveitar `public`
     apesar da sobreposição de domínio confirmada, com o racional documentado (ex.:
     código/schema anterior não confiável, preferência por recomeçar limpo), e uma
     política clara para os dados já existentes em `public` (mantidos e ignorados
     indefinidamente? migrados manualmente para `mymoney` depois? removidos?) — isso
     ainda exige uma decisão explícita do CTO/Software Architect, não pode ser
     assumido por omissão.
- **Resolução**: confirmação direta do stakeholder (fora da cadeia de agentes, só
  ele tinha essa informação — mesma natureza da restrição original que deu origem ao
  `ADR-001`): o schema `public` do projeto `xrcxbzrglndetrrhavhc` **é de fato uma
  implementação anterior deste mesmo produto MyMoney**, feita pelo próprio
  stakeholder e abandonada antes deste ciclo de planejamento começar — confirma a
  hipótese mais provável que Backend já havia levantado no achado técnico acima, e
  descarta a hipótese alternativa (produto genuinamente distinto). O stakeholder quer
  **reaproveitar** o que já funciona (trigger de saldo, RPCs de dashboard, MFA gate,
  WebAuthn) e os dados reais já existentes (1 profile, 12 categorias) — não recomeçar
  do zero em `mymoney` isolado.

  **Decisão do CTO** (parecer estruturado completo em `CTO-REVIEW.md`, seção "Gate 2
  (Reaberto por Bloqueio 003)"): dos três caminhos que Backend colocou como sugestão,
  o caminho **2** é adotado — `ADR-001` será **superseded** por novo ADR (sugestão de
  numeração `ADR-012`) que adota `public` como schema de fato de persistência deste
  produto, com plano de evolução formal para as entidades do `SDD.md` Seção 5 que
  ainda não existem (`Budget`, `CreditCard`, `Invoice`, `RecurringTemplate`,
  `InstallmentPurchase`, `FixedBill`, `Goal`, `Contribution`, `Notification`,
  `ImportBatch`, `CandidateTransaction`, `OpenFinanceConnection`). `ADR-001` em si
  nunca é editado (permanece `Status: Accepted` como registro histórico, marcado
  `Superseded by ADR-012` pelo novo ADR, mesma regra de imutabilidade já aplicada ao
  caso `ADR-004`→`ADR-009`).

  O **quê** foi decidido por mim (CTO); o **como** técnico é delegado ao Software
  Architect, com 6 condições de aceite obrigatórias fixadas no parecer de
  `CTO-REVIEW.md` (não repetidas aqui na íntegra): (1) nenhuma perda do dado real já
  existente; (2) reaproveitamento não é aceitação cega — cada função/trigger/policy
  reaproveitado precisa ser auditado contra os requisitos atuais antes de aceito como
  definitivo, e o risco "schema legado desconhecido" da Seção 6.1 do `SDD.md` precisa
  ser reclassificado de "colisão com produto alheio" para "qualidade de código
  próprio não revisado"; (3) `SDD.md` Seção 5 mapeada às tabelas reais de `public`,
  com plano de evolução aditivo para o que falta, tudo em um único schema (`public`)
  daqui para frente — sem split `mymoney`/`public`; (4) `SDD.md` Seção 7 reconciliada
  em três pontos (padrão real `auth.uid() = user_id` em vez de `owner_id`; MFA gate
  via JWT claim já implementado avaliado frente ao `ADR-005`/`ADR-010`; subseção
  "Isolamento Multi-Tenant" reescrita, já que a premissa de "nunca em `public`
  compartilhado com produto alheio" não existe mais); (5) nota de vendor lock-in
  revisitada; (6) item 6 do `SPK-001` (plano/tier) segue em aberto, não resolvido por
  esta decisão.

- **Resolução técnica (fechamento)**: Software Architect entregou `ADR-012`
  (supersede `ADR-001`), `ADR-013` (esclarece `ADR-005`/`ADR-010`) e `SDD.md`
  reescrito (Nota de Reabertura, Seções 1-5, 6.1/6.2, e as subseções Autenticação/
  Autorização/Isolamento Multi-Tenant da Seção 7). CTO executou
  `architecture-decision-review` completo (`CTO-REVIEW.md`, "Gate 2 (Reaberto por
  Bloqueio 003)", subseção "Fechamento do Gate 2 Reaberto"), verificando as 6
  condições de aceite uma a uma — todas satisfeitas com rigor, nenhuma diluída,
  nenhuma resolvida por presunção. **Veredito: Aprovado com ressalvas.**
  `ADR-012`/`ADR-013`/`SDD.md` (partes reabertas) são a arquitetura vigente;
  `ADR-001` permanece `Status: Superseded by ADR-012`, imutável, confirmado que
  nenhum outro campo foi alterado.
- **Status**: **Resolvido — 2026-09-02.** Cascata completa: técnico
  (`software-architect`, `ADR-012`/`ADR-013`/`SDD.md`), estratégico (`cto`, "Gate 2
  (Reaberto por Bloqueio 003)" + "Fechamento do Gate 2 Reaberto"), tático
  (`tech-lead`, `TASK.md`/`GUARDRAILS.md` reabertos) e o último elo — novo veredito do
  CTO (`guardrails-governance` sobre `G-01`/`G-02`: **Aprovado**;
  `capacity-and-timeline-validation` pontual sobre a reestimativa de `TASK.md` (+1,25
  dia histórico): **Aprovado com ressalvas**) — registrado em `CTO-REVIEW.md`, seção
  "Gate 3 (Reaberto por Bloqueio 003)". **Backend está liberado para retomar
  `BE-M-00`** a partir deste registro. `GUARDRAILS.md` `G-01`/`G-02` (nova redação,
  escopo `public`) estão em vigor. Nota de processo: o CTO não edita `TASK.md`
  diretamente (fora do seu guardrail de escopo) — cabe ao Tech Lead/Backend atualizar
  a célula de Status de `BE-M-00` (hoje "Não iniciada — aguardando novo veredito do
  CTO") para refletir a liberação, usando este registro como autorização formal.
  Ressalvas não-bloqueantes carregadas para a execução (detalhe completo em
  `CTO-REVIEW.md`): (a) `BE-M-00` pode exigir reestimativa pontual se a auditoria
  revelar mais triggers/funções do que o esperado; (b) `set_pin`/`verify_pin`,
  ativação do Auth Hook e triggers não nomeados seguem como pontos de maior atenção
  da execução; (c) item 6 do `SPK-001` (plano/tier) segue sob confirmação pessoal do
  CTO na aba Billing do dashboard.

  Histórico da cascata (passos concluídos):
  1. ~~Software Architect produz o novo ADR + `SDD.md` atualizado~~ — **concluído**.
  2. ~~CTO revisa (`architecture-decision-review` completo)~~ — **concluído,
     Aprovado com ressalvas** (5 ressalvas registradas em `CTO-REVIEW.md`, não
     bloqueantes para a arquitetura, mas condições explícitas para a execução —
     ver `set_pin`/`verify_pin`, ativação do Auth Hook, restrição de cadastro,
     auditoria de triggers remanescentes, e item 6 do `SPK-001`).
  3. ~~Tech Lead reabre `TASK.md` e `GUARDRAILS.md`~~ — **concluído, 2026-09-02.**
     `TASK.md` Seção 1.1 (`DIR-01` a `DIR-05`) reescrita de "criar em `mymoney`,
     nunca em `public`" para migrations aditivas sobre `public` com auditoria
     obrigatória por objeto reaproveitado (`ADR-012`); `SPK-001` fechado como
     Resolvido na Seção 2, com link para este Bloqueio e para `ADR-012`; `BE-M-00`
     reescrita de bootstrap de schema para auditoria/formalização dos objetos
     reaproveitados (12 entidades ausentes + `Attachment`, mapeadas em `SDD.md`
     Seção 5.2); `BE-M-01`/`BE-M-02` reestimadas para baixo (tabelas/taxonomia já
     existentes); `BE-M-06`/`BE-M-07`/`BE-M-09` ganharam critério de aceite
     adicional incorporando as ressalvas do CTO (regressão de
     `apply_transaction_effect`, semântica de `fn_clear_due_transactions` vs.
     RN-11, contrato de `get_month_provision`/`get_monthly_category_summary`,
     inspeção de `set_pin`/`verify_pin`, confirmação de ativação do Auth Hook);
     `BE-M-12` criada (restrição de cadastro, mitigação de `handle_new_user()`).
     Seção 4.1 e Seção 5 (esforço/riscos) recalculadas — mudança líquida de
     **+1.25 dia no total histórico** (120.5 → 121.75; remanescente ≈119.75 após
     excluir os 2 dias já gastos de `SPK-001`). `GUARDRAILS.md` `G-01`/`G-02`
     reescritos como proposta (marcados "aguardando aprovação do CTO"); `G-03`/
     `G-04` corrigidos pontualmente na referência de schema/coluna, sem reabertura
     de mérito. Detalhe completo em `.md/TASK.md` e `.md/GUARDRAILS.md`.

  4. ~~CTO executa `guardrails-governance` (`G-01`/`G-02`) +
     `capacity-and-timeline-validation` pontual (reestimativa)~~ — **concluído,
     2026-09-02.** `guardrails-governance`: **Aprovado**, sem ressalva.
     `capacity-and-timeline-validation` pontual: **Aprovado com ressalvas** (ver
     ressalvas (a)-(c) acima). Parecer completo em `CTO-REVIEW.md`, seção "Gate 3
     (Reaberto por Bloqueio 003)".

  Item 6 (plano/tier) segue não confirmado, pendente de checagem manual na aba
  Billing do dashboard — sob responsabilidade pessoal do CTO, conforme registrado
  acima; não bloqueia esta cascata, mas segue relevante para a validade do
  `ADR-009`.

---

## Bloqueio 004 — 2026-09-02

- **Reportado por**: devops
- **Escalado para**: stakeholder/CTO (credenciais e conta real de hospedagem) e
  software-architect/tech-lead (confirmação de estrutura de projeto do
  Frontend, não-bloqueante)
- **Artefato/trecho afetado**: `DEPLOY.md` Seção 1 (Infraestrutura como Código —
  Hospedagem do Frontend), `frontend/vercel.json`,
  `.github/workflows/frontend-ci-cd.yml`
- **Descrição**: durante `infrastructure-as-code-provisioning` +
  `cicd-pipeline-configuration` (preparação de IaC/CI-CD em paralelo à
  implementação, independente do achado de schema do Backend em Bloqueio 003 —
  meu trabalho aqui é só hospedagem do frontend estático e pipeline, sem tocar
  em Supabase/schema), três lacunas de informação que não posso assumir
  sozinho:
  1. **Provedor de CDN real**: `SDD.md` Seção 3 deixa em aberto "Vercel/
     Cloudflare Pages, free tier" sem decidir entre os dois. Provisionei
     `frontend/vercel.json` e o pipeline assumindo **Vercel** (rationale
     completo em `DEPLOY.md` §1.1), mas não sei se o stakeholder já tem conta
     em algum dos dois provedores (mesma lógica do reaproveitamento do
     Supabase legado — pode haver uma preferência/conta já existente que eu
     não tenho visibilidade).
  2. **Credenciais reais de deploy**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
     `VERCEL_PROJECT_ID` (GitHub Actions Secrets) e o valor de `STAGING_ALIAS`
     (domínio real de staging) não existem ainda — preciso que alguém com
     acesso à conta Vercel real (stakeholder) crie o projeto e gere o token, e
     que alguém com permissão de admin no repositório GitHub cadastre os
     secrets/variables e configure a proteção "Required reviewers" no
     GitHub Environment `production` (Settings → Environments).
  3. **Estrutura de projeto do Frontend**: assumi `frontend/` como diretório do
     app e **Vite** como build tool (rationale em `DEPLOY.md` §1.3), na
     ausência de qualquer código de frontend existente e de qualquer
     confirmação do Tech Lead/Frontend sobre isso em `TASK.md`. Não é
     bloqueante para o meu trabalho seguir (o pipeline já está pronto, só
     ocioso até `FE-M-00`), mas se o Frontend escolher outro diretório/tool ao
     executar `FE-M-00`, o `vercel.json` e os `working-directory`/comandos do
     workflow precisam ser ajustados.
- **Impacto se não resolvido**: itens 1-2 bloqueiam qualquer deploy real
  (`deployment-execution`) — o pipeline está pronto em código, mas não pode
  executar sem conta/credenciais reais. Item 3 não bloqueia a preparação, mas
  pode exigir um pequeno ajuste de caminho quando `FE-M-00` for implementada, se
  a assunção divergir da escolha real do Frontend.
- **Sugestão (opcional)**: (1) confirmar Vercel como provedor definitivo — ou
  informar que já existe conta em Cloudflare Pages, caso em que troco
  `vercel.json`→`wrangler.toml` e os steps de deploy do workflow (impacto
  baixo, resto do pipeline não muda); (2) stakeholder cria a conta/projeto
  Vercel e gera o token, e alguém com admin do repositório cadastra os secrets
  e a proteção do Environment `production`; (3) Tech Lead/Frontend confirma ou
  corrige a assunção de `frontend/` + Vite ao planejar `FE-M-00`.
- **Status**: Aberto — não bloqueia a preparação de IaC/CI-CD em si (que está
  concluída em código, versionada e pronta para uso assim que as pendências
  acima forem resolvidas), mas bloqueia qualquer deploy real em staging ou
  produção até os itens 1 e 2 serem resolvidos.

---

## Bloqueio 005 — 2026-09-03

- **Reportado por**: backend
- **Escalado para**: tech-lead (replanejamento tático de `BE-M-09`); provável
  cascata a `software-architect`/`cto` se a resolução exigir uma decisão
  formal de arquitetura análoga ao `ADR-012` (ver "Impacto" abaixo) — mesmo
  padrão de escalonamento do Bloqueio 003
- **Artefato/trecho afetado**: `TASK.md` `BE-M-09` (execução), `ADR-012`
  (tabela de auditoria — escopo incompleto), `AUDITORIA-BE-M-00.md` (auditoria
  formal de `BE-M-00` — mesma lacuna de escopo), `GUARDRAILS.md` `G-01`
  (auditoria obrigatória antes de depender de objeto reaproveitado)
- **Descrição**: durante a implementação de `BE-M-09` (fluxo server-side de
  registro de credencial WebAuthn), escrevi e **cheguei a deployar em produção**
  4 Edge Functions novas (`webauthn-register-options`, `webauthn-register-verify`,
  `webauthn-login-options`, `webauthn-login-verify`) antes de descobrir que **o
  projeto Supabase já tem 3 Edge Functions da implementação anterior, ativas em
  produção, cobrindo exatamente o mesmo escopo**:

  - `auth-email-mfa` — MFA por e-mail em 2 passos (`request`/`verify`) sobre
    `email_mfa_challenges`, exatamente o par funcional de `custom_access_token_hook`
    já auditado em `BE-M-00`/`ADR-013`.
  - `webauthn-register` — registro de credencial WebAuthn (`generate-options`/
    `verify`), o mesmo escopo literal de `BE-M-09`.
  - `webauthn-authenticate` — assinatura/asserção WebAuthn de desbloqueio local
    complementar à sessão já existente (`generate-options`/`verify`).

  **Como o achado apareceu**: ao gerar as opções de registro, minha própria
  função leu `Deno.env.get("WEBAUTHN_ORIGIN")` e o valor já veio preenchido
  (`https://mymoney-lsm.vercel.app`) — um secret que eu nunca configurei.
  `supabase secrets list --project-ref xrcxbzrglndetrrhavhc` confirmou
  `WEBAUTHN_ORIGIN`/`WEBAUTHN_RP_ID`/`WEBAUTHN_RP_NAME` (e também
  `RESEND_API_KEY`/`EMAIL_FROM`, usados por `_shared/email.ts`) já existentes,
  datados de 2026-08-28 — mesma janela de tempo das 13 migrations e do dado
  real já conhecidos desde o Bloqueio 003. `supabase functions list
  --project-ref xrcxbzrglndetrrhavhc` confirmou as 3 functions ativas
  (`status: ACTIVE`, `verify_jwt: true`), publicadas a partir de
  `file:///Users/leand/OneDrive/Projetos/MyMoney_4/supabase/functions/...` —
  um caminho de máquina/pasta completamente diferente deste repositório
  (`MyMoney_4`, estilo macOS `/Users/...`, enquanto esta sessão roda em
  `C:\Users\leand\...\MyMoney`), confirmando de novo (mesma conclusão do
  Bloqueio 003) que é uma implementação anterior própria do stakeholder, feita
  em outra pasta/máquina, e não algo deste pipeline.

  **Inspecionei o código-fonte das 3 functions** (`supabase functions download`,
  somente leitura) e o que encontrei é **substancialmente mais maduro** que o
  que eu tinha acabado de escrever:
  - Referenciam um esquema de numeração de tarefa próprio e diferente
    (`F1-BE-11`, `F1-BE-13`, `F1-BE-14`, `F1-DEVOPS-07`) e um `SDD.md §3/§2.16/
    §9.4/§10.1` **que não é o `SDD.md` deste pipeline** — confirma, mais uma
    vez, um ciclo de planejamento completo anterior (PRD→SDD→TASK próprios),
    não só um schema criado à mão.
  - `auth-email-mfa`: rate limit (5 envios/30min, cooldown 60s), hash SHA-256
    com comparação em tempo constante, 5 tentativas máx. de verificação,
    logging estruturado que **nunca** loga o código/hash em claro, geração de
    código via `crypto.getRandomValues` com rejection sampling (sem viés de
    módulo).
  - `webauthn-register`/`webauthn-authenticate`: **arquitetura de challenge
    diferente da minha** — em vez de uma tabela (`webauthn_challenges`, que eu
    criei via migration `20260902100600_be_m09_webauthn_challenges.sql`), usam
    um challenge **stateless assinado por HMAC-SHA256** (chave derivada de
    `SUPABASE_SERVICE_ROLE_KEY`, TTL 90s, payload com `uid`/`purpose`/`exp`/
    `nonce`), com o racional explícito no próprio código ("Edge Function não
    pode depender de estado em memória entre invocações"). **Risco já
    autoidentificado pelo autor anterior, nunca resolvido**: como não há tabela
    de challenges consumidos, uma assertion capturada poderia em tese ser
    reenviada dentro da janela de 90s — comentário no código sinaliza
    explicitamente "revisão futura do CTO/DevSecOps", nunca endereçado antes
    do abandono do ciclo anterior.
  - Confirma de forma independente uma conclusão a que eu já tinha chegado
    sozinho na auditoria de `BE-M-09` (`AUDITORIA-BE-M-00.md` Seção 7): "WebAuthn
    aqui é desbloqueio local complementar à sessão já existente, não um segundo
    fator independente do Supabase Auth" — a mesma leitura de `ADR-005`/`ADR-010`
    que eu tinha documentado de forma independente.

  **O erro de processo que cometi**: `BE-M-00` (auditoria) e a tabela de
  auditoria do `ADR-012` cobriram exaustivamente tabelas/triggers/RPCs/RLS/
  roles/extensions/cron/storage do schema `public` — mas **nunca cobriram Edge
  Functions**. Nem o `SPK-001` original (Bloqueio 003) nem a minha própria
  auditoria de `BE-M-00` rodaram `supabase functions list`. `DIR-02`/`G-01`
  ("nenhuma funcionalidade nova pode depender de objeto reaproveitado antes de
  auditado") deveriam ter me impedido de escrever `BE-M-09` do zero sem antes
  verificar se já existia uma Edge Function cobrindo o mesmo escopo — mas o
  processo de auditoria (`BE-M-00`, `ADR-012`) nunca listou "Edge Functions"
  como categoria de objeto a auditar, então eu não verifiquei antes de começar
  a implementar.

  **Ação de contenção que já tomei, dentro da minha autoridade** (reversível,
  sem dado real em risco — G-02 não se aplica a código recém-criado por mim
  mesmo sem uso): apaguei via `supabase functions delete` as 4 functions que eu
  tinha acabado de deployar, deixando o projeto exatamente como estava antes
  desta sessão tocar em Edge Functions (confirmado por `functions list` antes/
  depois). **Não toquei** nas 3 functions pré-existentes (`auth-email-mfa`,
  `webauthn-authenticate`, `webauthn-register`) nem em nenhum dos secrets já
  configurados — inspecionei só por leitura (`functions download`). A migration
  de `public.webauthn_challenges` (tabela nova, aditiva, sem dado real) **fica
  como está**, pausada/não referenciada por nenhum código até esta decisão ser
  tomada — não atrapalha nenhuma outra tarefa e é descartável sem custo se a
  decisão for adotar o esquema stateless da implementação anterior em vez do
  meu.
- **Impacto se não resolvido**: `BE-M-09` não pode ser considerada concluída
  sem essa decisão — se eu simplesmente redeployasse minhas 4 functions
  ignorando as 3 já existentes, o produto final ficaria com **dois conjuntos
  paralelos e divergentes de Edge Functions para o mesmo domínio de
  autenticação** (exatamente o risco (b) que o Backend já tinha nomeado no
  Bloqueio 003 para o schema, agora recorrendo na camada de Edge Functions).
  Além disso, a implementação anterior parece **estritamente superior** à
  minha em maturidade (rate limiting, tratamento de erro, logging, timeout
  explícito por chamada externa) — descartá-la para manter a minha seria
  desperdiçar trabalho real e provavelmente entregar uma versão pior. Isto
  também reabre uma pergunta sobre o próprio `ADR-012`/`AUDITORIA-BE-M-00.md`:
  a tabela de auditoria e o processo de `BE-M-00` provavelmente precisam ganhar
  "Edge Functions" como categoria explícita de objeto a auditar, senão o mesmo
  erro se repete em `BE-M-10` (backup — pode já existir uma function de backup
  também) e em toda a Fase 3 (`BE-F3-01`/`BE-F3-02`/`BE-F3-03`/`BE-F3-04`, todas
  Edge Functions).
- **Sugestão (opcional)**: três caminhos, nenhum decidido aqui:
  1. **Adotar as 3 Edge Functions existentes como estão** (mesmo princípio do
     `ADR-012` para o schema), descartando definitivamente o meu código
     (mantido só em `git diff`/histórico se algum dia for útil como
     referência) — provavelmente o caminho de menor risco e maior
     aproveitamento, dado que a implementação existente parece mais madura,
     mas exige auditoria formal item a item (mesmo rigor da tabela do
     `ADR-012`), incluindo decidir conscientemente sobre o risco de replay de
     challenge já autoidentificado (aceitar como está / mitigar agora com uma
     tabela de challenges consumidos, como a que eu cheguei a desenhar em
     `webauthn_challenges`).
  2. **Adaptar o meu código para o padrão da implementação anterior** (challenge
     stateless HMAC em vez de tabela, um único endpoint por cerimônia com
     `action` em vez de dois endpoints separados) — mantém a divisão em
     endpoints "options"/"verify" mais explícita no meu, mas exige reescrever
     bastante para chegar ao nível de maturidade (rate limit, timeout,
     logging) que a implementação anterior já tem.
  3. **Definir explicitamente que Edge Functions entram na tabela de auditoria
     do `ADR-012`/`BE-M-00`** como categoria própria, independente de qual das
     3 acima for escolhida para o caso específico do WebAuthn/MFA — isso evita
     o mesmo erro de processo se repetir nas próximas tarefas com Edge
     Function (`BE-M-10`, toda a Fase 3).
- **Resolução tática (Tech Lead, replanejamento de `BE-M-09`)**: decisão dentro
  da autoridade do Tech Lead — mesmo princípio já mandatado pelo CTO em
  `ADR-012` (reaproveitar objeto existente mediante auditoria formal, não
  reescrever do zero), agora aplicado explicitamente à camada de Edge
  Functions. Não configura lacuna estrutural do `SDD.md`, não reabre `ADR-012`
  (que permanece imutável, `Status: Accepted`) e não exige novo ADR.

  1. **Caminho escolhido: 1 — adotar as 3 Edge Functions existentes
     (`auth-email-mfa`, `webauthn-register`, `webauthn-authenticate`) como
     implementação real de RF-MVP-08 (parte server-side), descartando
     definitivamente o código novo do Backend.** Racional: o próprio achado
     técnico do Backend já demonstra maturidade estritamente superior (rate
     limit, comparação em tempo constante, 5 tentativas máx., logging que
     nunca expõe segredo, geração de código sem viés de módulo,
     tratamento de erro/timeout explícito) sem nenhum motivo técnico
     concreto em sentido contrário — o Caminho 2 (adaptar o código novo ao
     padrão stateless) foi descartado por gerar esforço maior para um
     resultado provavelmente inferior, sem nenhum ganho compensatório
     identificado. Detalhe de execução (auditoria formal, estimativa,
     critério de aceite) em `TASK.md`, `BE-M-09` (Seção 3.1) e `DET-05`
     (Seção 6.2).
  2. **Caminho 3 adotado explicitamente, independente do caso específico do
     WebAuthn/MFA**: `TASK.md` Seção 1.1 ganhou `DIR-33`, tornando "Edge
     Functions" categoria obrigatória de auditoria (`supabase functions
     list`, e `functions download` só leitura se houver candidata a
     sobreposição) antes de qualquer funcionalidade nova depender/substituir
     uma — mesmo nível de disciplina que `DIR-02` já exige para tabela/
     função/trigger/policy. Aplicado como pré-requisito explícito de
     `BE-M-10` (backup — pode já existir Edge Function equivalente) e de
     `BE-F3-00` a `BE-F3-04` (Fase 3, todas Edge Functions). Esta é uma
     correção de **processo** (a tabela de auditoria do `ADR-012` nunca
     listou Edge Functions como categoria — lacuna de escopo do processo de
     `BE-M-00`, não do mérito da decisão já tomada por `ADR-012`); o `ADR-012`
     em si não é editado nem reaberto — imutabilidade de ADR preservada. A
     correção vive só em `TASK.md` (`DIR-02`/`DIR-33`), que é o artefato que
     rege o processo de execução.
  3. **Risco de replay de challenge (HMAC stateless, TTL 90s, sem tabela de
     consumo, autoidentificado no código da implementação anterior — "revisão
     futura do CTO/DevSecOps", nunca endereçado) — NÃO decidido aqui.** É uma
     lacuna de segurança conhecida e não resolvida, de severidade a avaliar
     por quem tem autoridade sobre risco aceito (CTO) e sobre mitigação
     técnica de segurança (DevSecOps) — fora da minha autoridade decidir
     sozinho se "aceitável como está" ou "precisa de mitigação agora"
     (guardrail do Tech Lead: nunca decide lacuna de segurança não resolvida
     por conta própria). **Escalado formalmente abaixo como Bloqueio 006,
     para o próximo dispatch.**

  Consequência em `TASK.md`: `BE-M-09` reescrita (Critério de Aceite,
  Estimativa 2→1.5 dia, Status) — Seção 3.1; `DIR-02` e `DIR-33` (nova) —
  Seção 1.1; nota de pré-requisito em `BE-M-10` — Seção 3.1; nota de
  pré-requisito em `BE-F3-00` a `BE-F3-04` — Seção 3.3; Seção 4.1/4.3
  (dependências) e Seção 5 (esforço/riscos) atualizadas; `DET-05` — Seção
  6.2. Delta de esforço: **-0.5 dia** no total histórico (121.75 → 121.25;
  remanescente 119.75 → 119.25) — não considerado material o suficiente
  para exigir novo `capacity-and-timeline-validation` completo (delta bem
  abaixo do +1.25 dia que disparou o Gate 3 pontual do Bloqueio 003); fica a
  critério do CTO revisar mesmo assim, dado que toca `BE-M-09` que já estava
  sob ressalva ativa dele.
- **Status**: **Resolvido (tático) — 2026-09-03, por `tech-lead`.** `BE-M-09`
  liberada para retomada em `TASK.md` (Status "Retomada", não mais
  "Bloqueada") com o novo critério de aceite/estimativa. O item (3) acima
  (risco de replay) **permanece aberto**, formalizado como Bloqueio 006
  abaixo — não bloqueia a retomada de `BE-M-09` (auditoria/wiring podem
  prosseguir), mas bloqueia tratar o fluxo WebAuthn como aprovado para uso
  em produção sem ressalva até o veredito do CTO/DevSecOps.

---

## Bloqueio 006 — 2026-09-03

- **Reportado por**: tech-lead (identificado durante o replanejamento tático
  do Bloqueio 005, não decidido ali por estar fora da autoridade do Tech
  Lead)
- **Escalado para**: cto (decisão de risco aceito) e devsecops (avaliação
  técnica de mitigação) — mesmo padrão de cascata do Bloqueio 003, mas
  escopo pontual (um risco de segurança específico, não uma revisão de
  arquitetura completa)
- **Artefato/trecho afetado**: Edge Function `webauthn-register`/
  `webauthn-authenticate` (implementação anterior, reaproveitada por decisão
  do Bloqueio 005), mecanismo de challenge stateless assinado por
  HMAC-SHA256 (chave derivada de `SUPABASE_SERVICE_ROLE_KEY`, TTL 90s,
  payload `uid`/`purpose`/`exp`/`nonce`); `TASK.md` `BE-M-09` (condição de
  aceite explícita, não fecha "sem ressalva" até este bloqueio ser resolvido)
- **Descrição**: o Backend, ao inspecionar (só leitura) o código das 3 Edge
  Functions pré-existentes agora adotadas como implementação real de
  RF-MVP-08 (Bloqueio 005), encontrou um risco de segurança já
  autoidentificado pelo autor da implementação anterior e nunca resolvido:
  como o challenge de cerimônia WebAuthn é stateless (HMAC-SHA256, sem
  tabela de challenges consumidos — racional explícito no próprio código:
  "Edge Function não pode depender de estado em memória entre invocações"),
  uma assertion capturada poderia em tese ser reenviada dentro da janela de
  90s de validade do challenge (replay). O comentário no código sinaliza
  literalmente "revisão futura do CTO/DevSecOps" — nunca endereçado antes do
  abandono do ciclo de planejamento anterior.

  Contexto que reduz (mas não elimina) a severidade, já documentado
  independentemente em `AUDITORIA-BE-M-00.md` Seção 7 e reafirmado por
  `ADR-013`: WebAuthn neste produto é **desbloqueio local complementar à
  sessão já existente do Supabase Auth, não um segundo fator independente**
  — toda chamada de servidor subsequente ainda exige JWT de sessão válido +
  RLS (`DIR-19`), então um replay bem-sucedido da cerimônia WebAuthn em si
  não concede, sozinho, acesso a dado do usuário sem uma sessão já
  autenticada. Mesmo assim, é uma falha real do mecanismo de prova de posse
  do fator (registro ou reautenticação de credencial poderia ser forjado
  dentro da janela), o que não é aceitável presumir como "sem impacto" sem
  uma avaliação formal.
- **Impacto se não resolvido**: `BE-M-09` pode ser considerada "Concluída com
  ressalva" (auditoria + wiring completos), mas **não pode ser tratada como
  aprovada para uso em produção sem ressalva** enquanto este risco não for
  avaliado — tratado com o mesmo nível de disciplina que os demais achados de
  segurança não confirmados desta cadeia (ativação do Auth Hook, item 6 do
  `SPK-001`), nenhum decidido por presunção.
- **Sugestão (opcional, não decidida)**: duas opções levantadas pelo Backend,
  nenhuma escolhida aqui — cabe ao CTO/DevSecOps: (a) aceitar o risco como
  está, documentando o racional (ex.: janela de 90s é curta, WebAuthn é só
  complementar/local, superfície de exploração real é baixa dado o modelo de
  usuário único do produto — RNF-09); (b) mitigar agora, introduzindo uma
  tabela de challenges consumidos (equivalente ao que o Backend já havia
  desenhado em `public.webauthn_challenges`, migration
  `20260902100600_be_m09_webauthn_challenges.sql` — pausada, não aplicada ao
  fluxo adotado, mas reaproveitável como ponto de partida técnico se a
  decisão for mitigar).

- **Parecer técnico do DevSecOps** (`security-requirement-validation` +
  `finding-severity-classification`, sobre o código real de
  `supabase/functions/webauthn-register/index.ts` e
  `webauthn-authenticate/index.ts`, lidos linha a linha nesta rodada — não só
  o comentário deixado pelo autor anterior):

  **Mecanismo confirmado**: o challenge é HMAC-SHA256 (payload `uid`/
  `purpose`/`exp`/`nonce`, TTL 90s), verificado com `crypto.subtle.verify`
  (comparação em tempo constante nativa do WebCrypto — sem falha de timing
  aqui). O `purpose` ("registration" vs. "authentication") impede replay
  cross-cerimônia. Mas, de fato, **nada consome o challenge nem o `nonce`** —
  a mesma dupla challenge+assertion, se capturada íntegra, verifica com
  sucesso repetidamente até `exp`. Confirmo o achado do Backend: violação real
  da propriedade "challenge de uso único" que o próprio padrão WebAuthn
  pressupõe — não é alarme falso nem leitura excessivamente conservadora do
  comentário do autor anterior.

  **Verificação anti-replay por `sign_count` não cobre este cenário.**
  `verifyAuthenticationResponse` (biblioteca `@simplewebauthn/server`) compara
  `newCounter` contra o `sign_count` já persistido, mas autenticadores de
  plataforma (Touch ID/Face ID/Windows Hello, o caso mais provável de uso real
  deste produto pessoal) tipicamente reportam contador fixo em `0` — a
  biblioteca trata isso como "contador não suportado" e não rejeita por essa
  via. Ou seja, o replay de uma assertion capturada não é bloqueado por essa
  camada na configuração mais provável de uso. Este ponto não estava explícito
  no achado original do Backend e é uma confirmação adicional de que o risco é
  real, não só teórico.

  **Precondições reais de exploração** (o que de fato reduz a severidade, sem
  zerar o risco): (1) TLS 1.2+ é obrigatório em toda comunicação
  cliente-Edge Function (`DIR-28`/`SDD.md` Seção 7 "Criptografia") — captura
  de assertion em trânsito exige quebra de TLS (proxy malicioso com CA
  confiada no dispositivo, MITM corporativo) ou comprometimento do próprio
  cliente (malware local, extensão maliciosa, XSS que exfiltre o payload
  antes/durante o envio); nenhum desses cenários é "qualquer atacante na
  internet contra endpoint público", mas nenhum é hipotético a ponto de
  descartar. (2) **Mais relevante**: `getAuthenticatedUser` exige um JWT de
  sessão Supabase válido só para *chamar* qualquer uma das duas ações — um
  atacante sem sessão roubada não alcança o endpoint (401). Isso significa que
  todo cenário de exploração pressupõe que o atacante já tem acesso à sessão
  do usuário (mesmo canal comprometido que permitiria capturar a assertion
  provavelmente também expõe o JWT do header `Authorization`).

  **Avaliação de impacto, dado o contexto arquitetural (`ADR-013`,
  `AUDITORIA-BE-M-00.md` Seção 7 — WebAuthn é desbloqueio local complementar à
  sessão já existente, não segundo fator independente)**: inspecionei o que
  cada ação realmente concede em caso de replay bem-sucedido.
  - `webauthn-authenticate`/`verify`: em sucesso, só atualiza
    `sign_count`/`last_used_at` e responde `{success:true}` — não emite
    sessão nova, não altera nenhum claim de JWT (`app_email_mfa_verified` vem
    do fluxo separado `auth-email-mfa`/`custom_access_token_hook`, não deste
    endpoint), não desbloqueia RLS de nada. Um replay bem-sucedido não confere
    ao atacante nenhuma capacidade que ele já não tivesse com o JWT
    presumivelmente também comprometido no mesmo cenário.
  - `webauthn-register`/`verify`: um replay tentaria reinserir a mesma
    `credential_id` — bloqueado pela constraint `unique_violation` (23505),
    já tratada no código como "already_registered" (409). Auto-limitado, sem
    efeito de segurança adicional.

  Ou seja: **hoje**, o "prêmio" de um replay bem-sucedido é próximo de zero —
  não há nenhuma ação sensível (exclusão de conta, exportação, revelação de
  PIN, alteração de credencial de outro dispositivo) que dependa desta
  cerimônia como prova de posse recente. Isso reduz materialmente o impacto
  em relação a um cenário onde WebAuthn fosse, de fato, o segundo fator
  independente que protege o dado.

  **Classificação de severidade: MÉDIA.** Não é Alta/Crítica — falta o
  requisito de "endpoint público sem precondição relevante" e o "prêmio" de
  exploração é hoje próximo de nulo dado o desenho de arquitetura vigente.
  Não é Baixa — é uma falha real de uma propriedade de segurança fundamental
  do protocolo (challenge de uso único), autoidentificada, documentada e
  nunca corrigida; tratá-la como cosmética/hygiene seria minimizar
  indevidamente um controle de prova de posse que existe precisamente para
  este cenário de ameaça (dispositivo comprometido/XSS/proxy malicioso — os
  mesmos citados no `SDD.md` como parte do modelo de ameaça implícito de
  "em trânsito"). **Achado condicional**: se, em qualquer fase futura
  (ex.: reautenticação antes de excluir conta — `ADR-011` — ou antes de
  exportar dado, revelar PIN, ou qualquer ação de alto risco), esta cerimônia
  passar a ser usada como sinal de prova de posse que gate algo além da
  sessão já existente, a severidade sobe imediatamente para **Alta** e a
  mitigação deixa de ser opcional — recomendo isso como condição de guardrail
  explícita para qualquer tarefa futura que proponha usar WebAuthn dessa
  forma (`DIR-33`/`G-01` já exigem auditoria de Edge Function reaproveitada;
  sugiro ao Tech Lead adicionar esta condição especificamente a qualquer
  tarefa de Fase 2/3 que reutilize `webauthn-authenticate` para reautenticação
  de ação sensível).

  **Recomendação técnica (não é o veredito final — decisão de risco aceito é
  do CTO, conforme meu limite de autoridade)**: pelo custo de implementação
  ser baixo — a migration `webauthn_challenges` já está desenhada e pronta
  (`consumed_at`, `expires_at`, FK para `auth.users`, RLS sem policy para
  cliente), e a mudança de código é pontual (inserir linha em
  "generate-options", checar+marcar `consumed_at` em "verify" antes de
  chamar `verifyRegistrationResponse`/`verifyAuthenticationResponse`) — minha
  inclinação técnica é **mitigar agora** em vez de carregar como débito:
  fecha definitivamente uma lacuna autoidentificada, sem custo relevante, e
  evita reabrir esta mesma discussão se uma tarefa futura decidir usar
  WebAuthn para reautenticação de ação sensível (cenário citado acima). Dito
  isso, aceitar como está — com racional documentado e um guardrail explícito
  impedindo qualquer uso futuro de "prova de posse" sem essa mitigação — é
  uma opção tecnicamente defensável dado o impacto atual próximo de nulo;
  **não bloqueio o deploy sozinho por este achado** (severidade Média, não
  Alta/Crítica, conforme guardrail deste agente), mas registro como achado de
  segurança em aberto com recomendação de correção. Achado adicional, menor,
  sem relação com o replay (severidade Baixa, débito de higiene): a chave
  HMAC deriva diretamente de `SUPABASE_SERVICE_ROLE_KEY` sem derivação por
  contexto (ex.: HKDF com label `"webauthn-challenge"`) — funciona, mas reusa
  o segredo de maior privilégio do projeto para um propósito criptográfico
  não relacionado; sugiro ao Backend/DevOps derivar uma chave dedicada como
  hardening de baixo custo, sem prazo urgente.

  Requisito de segurança operacional para o DevOps (independente do veredito
  acima): nenhuma rotação automática de `SUPABASE_SERVICE_ROLE_KEY` deve
  acontecer sem avaliar o impacto em challenges HMAC em voo (impacto real é
  desprezível — challenges têm TTL de 90s — mas deve constar no runbook de
  rotação de secret para não ser esquecido).

- **Veredito do CTO** (parecer completo em `CTO-REVIEW.md`, seção "Risco
  Aceito — Bloqueio 006 (Replay de Challenge WebAuthn)"): concordo com a
  classificação técnica do DevSecOps (severidade Média, precondições reais,
  "prêmio" de exploração hoje próximo de nulo) — não há divergência na
  camada técnica. A decisão que me cabe é de custo-benefício estratégico:
  **mitigar agora**, não aceitar como débito técnico documentado.

  Racional (detalhe completo em `CTO-REVIEW.md`): (1) o custo de mitigar é
  desproporcionalmente baixo para o benefício — a migration
  `webauthn_challenges` já está desenhada e pronta, a mudança de código é
  pontual; nenhum dos itens hoje aceitos como dívida técnica consciente em
  `SDD.md` Seção 6.2 tem esse perfil de "correção pronta, só falta aplicar";
  (2) precedente para o resto da Fase 3, que vai continuar reaproveitando
  Edge Functions da mesma implementação anterior (`DIR-33`) — aceitar um
  risco autoidentificado e barato de corrigir "porque hoje o impacto é
  baixo" corrói o princípio de auditoria rigorosa que sustenta `ADR-012`/
  `DIR-02`/`DIR-33`, tarefa a tarefa; (3) o próprio achado condicional do
  DevSecOps (severidade sobe a Alta se WebAuthn virar gate de ação sensível
  no futuro) é motivo para corrigir agora, não para esperar um evento
  futuro incerto que pode transformar a mitigação em bloqueio de última
  hora de uma tarefa não relacionada. Não é o mesmo tipo de dívida
  proporcional ao escopo que as demais entradas de `SDD.md` 6.2 — é uma
  correção de custo fixo baixo sendo adiada sem ganho real.

  Achado secundário (chave HMAC sem HKDF, severidade Baixa): aceito como
  dívida técnica consciente — este sim tem motivo real de
  desproporcionalidade (risco desprezível, sem correção pronta para
  aplicar). Registro de onde formalizar isso (`SDD.md` 6.2 ou backlog
  tático) fica a critério de Software Architect/Tech Lead, não decidido por
  mim. Requisito operacional do DevSecOps sobre rotação de
  `SUPABASE_SERVICE_ROLE_KEY` deve constar no runbook de secret do DevOps.

  **Ação delegada** (não executo mitigação — fora do meu guardrail de
  escopo): Tech Lead reabre `BE-M-09` (ou tarefa nova) em `TASK.md` com a
  mitigação como condição de aceite explícita antes de fechar "sem
  ressalva"; Backend aplica a migration `webauthn_challenges`
  (`20260902100600_be_m09_webauthn_challenges.sql`, hoje pausada) e ajusta
  `webauthn-register`/`webauthn-authenticate` para checar+marcar
  `consumed_at` antes de aceitar a verificação. Tech Lead também avalia
  propor, à minha aprovação (`guardrails-governance`), regra formal em
  `GUARDRAILS.md` cobrindo a recomendação do DevSecOps sobre uso futuro de
  WebAuthn como prova de posse para ação sensível — hardening de processo,
  não bloqueante, dado que a causa raiz do replay já estará corrigida.
- **Status**: **Resolvido — 2026-09-03, por `cto`.** Veredito de risco
  aceito dado (mitigar agora, não aceitar como débito). Não bloqueia a
  retomada de `BE-M-09` em andamento (auditoria/wiring das 3 Edge
  Functions), mas passa a ser condição de aceite explícita para
  `BE-M-09` fechar sem ressalva — acompanhamento tático de execução cabe a
  Tech Lead/Backend em `TASK.md`, não reabre este bloqueio de governança se
  a mitigação demorar (isso vira um problema de execução de tarefa, não um
  novo `BLOCKERS.md`).

---

## Bloqueio 007 — 2026-09-03

- **Reportado por**: backend
- **Escalado para**: stakeholder/cto (provisionamento de conta/bucket real de
  storage externo e credenciais correspondentes) — mesmo padrão do Bloqueio
  004 do DevOps (credenciais reais de deploy Vercel), não uma decisão de
  arquitetura
- **Artefato/trecho afetado**: `TASK.md` `BE-M-10` (execução), Edge Function
  `supabase/functions/backup-export/`, secrets `BACKUP_S3_ENDPOINT`/
  `BACKUP_S3_BUCKET`/`BACKUP_S3_REGION`/`BACKUP_S3_ACCESS_KEY_ID`/
  `BACKUP_S3_SECRET_ACCESS_KEY` (não configurados)
- **Descrição**: `DIR-31` exige que o export lógico diário de backup seja
  "armazenado criptografado **fora do Supabase**", mas nem `SDD.md` nem
  nenhum ADR nomeiam um provedor específico de storage externo — decisão de
  detalhe de implementação, resolvida como desvio pequeno (documentado, não
  escalado): interface **S3-compatível genérica** (funciona com AWS S3,
  Backblaze B2, Cloudflare R2, MinIO — vendor-agnóstico via variáveis de
  ambiente, mesmo espírito de `DIR-22`/`OCRProvider`), implementada em
  `supabase/functions/backup-export/index.ts` via `aws4fetch`.

  O que **não** pôde ser resolvido sozinho: uma conta/bucket real de storage
  externo e as credenciais correspondentes não existem nesta sessão — ao
  contrário de `BACKUP_CRON_SECRET`/`BACKUP_ENCRYPTION_KEY` (material
  criptográfico interno, gerado e configurado pelo próprio Backend, sem
  depender de conta externa), um bucket S3-compatível real exige uma conta
  em um provedor externo (custo, mesmo que free tier, e titularidade), que só
  o stakeholder pode decidir/provisionar — mesma natureza do Bloqueio 004
  (`VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`, credenciais reais que
  só quem tem acesso à conta pode gerar).

  **Verificado antes de escrever qualquer código** (`DIR-33`, ver
  `AUDITORIA-BE-M-00.md` Seção 13): `supabase functions list`/`secrets list`
  não mostraram nenhuma Edge Function nem secret de backup pré-existente —
  ao contrário de `BE-M-09` (Bloqueio 005), não há aqui um objeto da
  implementação anterior a reaproveitar; o gap é puramente de
  provisionamento de infraestrutura externa nova.

  **Confirmado por smoke test real** (2026-09-03): a Edge Function foi
  deployada (`--no-verify-jwt`) e testada ponta a ponta — `curl` direto com
  segredo incorreto → `401`; segredo correto (via `pg_net`/`trigger_backup_export()`
  e via `curl` direto) → `500` controlado, com a mensagem exata "Storage
  externo não configurado", logado em `public.backup_export_log`
  (`status='failure'`), e-mail de alerta acionado (best-effort, secrets
  `RESEND_API_KEY`/`EMAIL_FROM` já existentes reaproveitados só por leitura).
  O mecanismo completo (`pg_cron` → `pg_net` → Edge Function → log → alerta)
  está com fiação ponta a ponta comprovada — só falta a credencial externa
  real para o upload em si ter sucesso.
- **Impacto se não resolvido**: o job diário vai rodar (às 03:00 UTC) e
  falhar de forma controlada e logada todos os dias, sem nunca de fato
  produzir um snapshot de backup fora do Supabase — ou seja, `DIR-31`/meta de
  RPO ≤ 24h do `ADR-009` **não está de fato cumprida na prática** até esta
  pendência ser resolvida, mesmo com todo o mecanismo pronto e testado. Não é
  um "fire and forget" silencioso (o alerta de e-mail/log cobre isso, DIR-32),
  mas é uma lacuna real de proteção de dado até ser resolvida.
- **Sugestão (opcional)**: stakeholder cria conta em um provedor S3-compatível
  de baixo/zero custo adequado a um projeto pessoal sem orçamento formal
  (RNF-09) — ex.: Cloudflare R2 (free tier generoso, sem taxa de egress) ou
  Backblaze B2 (free tier) — e informa `BACKUP_S3_ENDPOINT`/`BACKUP_S3_BUCKET`/
  `BACKUP_S3_REGION`/`BACKUP_S3_ACCESS_KEY_ID`/`BACKUP_S3_SECRET_ACCESS_KEY`;
  Backend configura via `supabase secrets set` (nenhum valor comitado no
  repositório, DIR-30) assim que recebidos — nenhuma mudança de código
  necessária, a Edge Function já lê essas variáveis.
- **Status**: Aberto — não bloqueia o fechamento de `BE-M-10` como
  "implementação/mecanismo prontos e testados" (código, migration, testes e
  smoke test end-to-end todos completos e em produção), mas bloqueia a
  garantia real de `DIR-31`/RPO do `ADR-009` até as credenciais reais
  existirem. Mesmo padrão de não-bloqueio do Bloqueio 004: preparação
  concluída, execução real pendente de decisão/acesso do stakeholder.

---

## Bloqueio 008 — 2026-09-03

- **Reportado por**: frontend
- **Escalado para**: ux-ui
- **Artefato/trecho afetado**: `UX-SPEC.md` Seção 1.1 (`UX-FL-10`) e Seção 2.2
  ("Autenticação e sessão (MVP)") — tarefa `FE-M-04` (`TASK.md`)
- **Descrição**: `API-CONTRACT.yaml` v0.6.0 publica `/auth-email-mfa`
  (`BE-M-09`, Edge Function reaproveitada) como "segundo fator de login por
  e-mail, em 2 passos (RF-MVP-08)" — exigido antes de qualquer operação nas
  4 tabelas com gate de MFA (`accounts`/`categories`/`payment_methods`/
  `transactions`, RLS `app_email_mfa_verified = 'true'`, `ADR-013`). Sem
  passar por esse fluxo, toda tela de CRUD do MVP (contas, formas de
  pagamento, categorias, orçamento, lançamentos) recebe 403 do PostgREST,
  mesmo com login por e-mail/senha bem-sucedido.

  `UX-SPEC.md`, porém, não desenha uma tela para esse passo: `UX-FL-10`
  lista a sequência `S-AUTH-01 (login) → S-AUTH-04 (setup PIN, 1ª vez) →
  S-AUTH-03 (desbloqueio) → S-AUTH-05 (bloqueio temporário)`, e a Seção 2.2
  ("Autenticação e sessão") só descreve S-AUTH-01/03/04/05 — a numeração de
  tela pula de "S-AUTH-01" direto para "S-AUTH-03", sem nunca haver uma
  "S-AUTH-02" em nenhuma outra parte do documento. `RF-MVP-08` AC1
  (`PRD-TECNICO.md`) também só menciona "PIN ou biometria" como gate de
  exibição de dado financeiro, sem citar um segundo fator por e-mail.
  Interpretação mais provável: a lacuna é um acidente de numeração/escopo
  (o e-mail MFA reaproveitado de uma implementação anterior, achado só
  formalizado por `BE-M-09`/Bloqueio 005 em 2026-09-03, é posterior à
  publicação original de `UX-SPEC.md` em 2026-09-02) — mas não é decisão
  do Frontend reinterpretar isso sozinho (mesmo guardrail já aplicado pelo
  UX/UI ao escalar o Conflito 1 da Seção 7.2 ao Software Architect, em vez
  de resolver por conta própria).
- **Impacto se não resolvido**: sem alguma tela/passo cobrindo este 2º
  fator, o app trava logo após o login — nenhuma tela de CRUD do MVP
  funciona (todas dependem das 4 tabelas com gate de MFA).
- **O que foi feito para não bloquear toda a cadeia de tarefas de
  Frontend**: implementado um preenchimento funcional mínimo,
  `frontend/src/pages/auth/EmailMfaStep.tsx`, exibido pela máquina de
  estado de autenticação (`AuthGate`) entre o login e o setup/desbloqueio
  de PIN — reaproveita só componentes de design system já especificados em
  outras telas (`Input`, `Button`, `Alert`), sem inventar layout ou
  interação nova (ex.: nenhum novo padrão visual, nenhuma nova metáfora de
  interação). Não é tratado como "tela definitiva" — o comentário no topo
  do componente aponta para este Bloqueio e pede revisão contra a
  especificação formal assim que o UX/UI publicar "S-AUTH-02" (ou
  incorporar o passo a uma tela já existente, se essa for a decisão).
- **Sugestão (opcional)**: UX/UI formaliza "S-AUTH-02 — Verificação por
  e-mail" na Seção 2.2 (campo de código de 6 dígitos, reenvio com cooldown
  de 60s coerente com o rate limit real do contrato, estados de erro
  400/429 documentados) e atualiza `UX-FL-10` para incluir o passo
  explicitamente na sequência.
- **Resolução (UX/UI)**: "S-AUTH-02 — Verificação por e-mail (2º fator)"
  formalizada em `UX-SPEC.md` — Seção 1.1 (`UX-FL-10` atualizado com o passo
  explícito na sequência, mais nota de reabertura), Seção 2.2 (layout + tabela
  + wireframe da tela), Seção 3 (nota confirmando que nenhum componente novo é
  introduzido — reaproveita `Input`/`Button`/`Alert`, mais o padrão de
  interação "link de reenvio com cooldown" documentado para reuso futuro),
  Seção 4.2 (4 estados: vazio não aplicável com justificativa, carregando em
  2 momentos distintos — envio inicial vs. verificação —, erro com 5 casos
  distintos, sucesso), Seção 5 (acessibilidade: `aria-live="polite"` nos
  erros, política de anúncio do cooldown limitada a início/fim — não por
  segundo, para não gerar spam de leitor de tela —, e a exceção WCAG 2.2.1
  do TTL de 10min do código justificada explicitamente como "Essencial"),
  Seção 6.3 (comportamento responsivo, mesma família visual de
  S-AUTH-01/03/04), Seção 7.1 (3 novas linhas de restrição técnica aplicada:
  gap de numeração original, rate limit de envio, tentativas/TTL de
  verificação). Log de Alterações Pós-Publicação atualizado com a entrada
  correspondente, sinalizando ao Tech Lead que é **estimativa nova** (a tela
  nunca havia sido vista antes, não uma reestimativa de algo já estimado).

  **Avaliação do preenchimento mínimo do Frontend (`EmailMfaStep.tsx`)**: a
  base está certa e é aproveitável — usa exatamente os componentes corretos
  (`Input`/`Button`/`Alert`), sem inventar layout/interação fora do design
  system, e a estrutura de estados (`status`, `cooldown`, `isVerifying`) já
  cobre o esqueleto certo. **Não atende integralmente a especificação
  formal agora publicada**, três ajustes necessários, nenhum deles exige
  redesenho, todos writable com o que `ApiError` já expõe (`error.status`),
  sem depender de nada novo no Backend:
  1. **Texto do envio inicial em tempo verbal errado**: o parágrafo
     "Enviamos um código de 6 dígitos para {email}" (linha 78-80 do
     componente) é estático, exibido mesmo antes do 1º envio ser
     confirmado (`status === "sending"`) — deve condicionar esse texto ao
     status: "Enviando código..." enquanto pendente, só trocando para
     "Enviamos um código..." após sucesso confirmado (`status === "sent"`).
  2. **Erros tratados de forma genérica demais**: `handleVerify` usa uma
     única mensagem de fallback ("Código incorreto. Tente novamente.")
     para qualquer falha, e `requestCode` só repassa `cause.message` sem
     diferenciar por `cause.status`. A Seção 4.2 do `UX-SPEC.md` agora
     especifica 5 casos com mensagens próprias (502 no envio; 400
     incorreto; 400 expirado; 429 rate limit de envio; 429 tentativas de
     verificação esgotadas) — `ApiError.status` já carrega o dado
     necessário para essa distinção, não é preciso mudar nada no Backend
     nem em `errors.ts`.
  3. **Tentativas esgotadas (429 em `verify`) não trava a tentativa
     seguinte**: hoje o usuário pode continuar clicando "Verificar" mesmo
     depois de esgotar as 5 tentativas, gerando chamadas fadadas a
     retornar 429 de novo. A especificação agora exige desabilitar o campo
     de código e o botão "Verificar" nesse caso específico, até um novo
     código ser solicitado com sucesso.

  Nenhum desses três pontos é implementado por mim (UX/UI) — cabe ao
  Frontend ajustar `EmailMfaStep.tsx` contra esta especificação formal,
  conforme o próprio comentário já presente no topo do componente previa
  ("revisado contra essa especificação assim que publicada").
- **Status**: **Resolvido — 2026-09-03, por `ux-ui`.** `UX-SPEC.md` atualizado
  e liberado para o Tech Lead estimar "S-AUTH-02" como tela nova. Não bloqueia
  `FE-M-04` (que já está funcionalmente completo em produção, cobrindo RF-MVP-08
  na prática) — mas o componente `EmailMfaStep.tsx` fica marcado como pendente
  de um pequeno ajuste de revisão (os 3 pontos acima) contra a especificação
  formal, a cargo do Frontend, antes de ser considerado definitivo.

---

## Bloqueio 009 — 2026-09-03

- **Reportado por**: devsecops
- **Escalado para**: backend
- **Artefato/trecho afetado**: `supabase/functions/auth-email-mfa/index.ts:43-48`
  (`CORS_HEADERS`)
- **Descrição**: `auth-email-mfa` define CORS local com
  `"Access-Control-Allow-Origin": "*"`, enquanto `webauthn-register`/
  `webauthn-authenticate` (mesma classe de endpoint — autenticado, mutável) usam
  `supabase/functions/_shared/cors.ts` (`corsHeaders(origin)`, allowlist via
  `WEBAUTHN_ORIGIN`, comentário explícito "Origem restrita via env var (nunca
  '*')"). `auth-email-mfa` não usa o helper compartilhado. Detalhe completo e
  análise de exploitabilidade em `SECURITY-REVIEW.md` Seção 1.1 (SEC-DEBT-001,
  severidade Média, não bloqueia deploy, mas correção recomendada no próximo
  toque no arquivo — custo trivial).
- **Impacto se não resolvido**: nenhum impacto imediato ativo (modelo de
  autenticação por Bearer token limita a exploitabilidade prática), mas
  inconsistência com o padrão de segurança já estabelecido no próprio
  repositório para a mesma classe de endpoint.
- **Sugestão**: trocar `CORS_HEADERS` local por `corsHeaders(origin)` de
  `_shared/cors.ts`, reusando `WEBAUTHN_ORIGIN` ou criando uma env var própria
  (ex. `APP_ORIGIN`) se o escopo de origem permitida for diferente.
- **Status**: **Aberto.**

---

## Bloqueio 010 — 2026-09-03

- **Reportado por**: devsecops
- **Escalado para**: backend
- **Artefato/trecho afetado**:
  `supabase/migrations/20260902100000_be_m01_budget_and_rn08_rn09_guards.sql`
  (policies `budget_insert_own`/`budget_update_own`, função
  `categories_block_delete_when_linked`); e, por extensão, `transactions_insert_own`/
  `transactions_update_own` (confirmado via `supabase db query --linked`) — mesmo
  padrão em toda tabela com FK para outra tabela "ownable".
- **Descrição**: as policies de `INSERT`/`UPDATE` verificam só `auth.uid() =
  user_id` da própria linha, sem validar que colunas de FK referenciando outra
  tabela com ownership (`category_id`, `account_id`, `payment_method_id`,
  `destination_account_id`) pertencem ao mesmo usuário — gap de autorização de
  referência cruzada (IDOR/broken object-level authorization). Além disso,
  `categories_block_delete_when_linked`/`accounts_block_delete_when_linked` não
  são `SECURITY DEFINER`, então a checagem de RN-09/RN-08 roda sob a RLS de quem
  está executando o `DELETE` e pode não enxergar linhas de outro usuário que
  deveriam bloquear a exclusão. Detalhe completo, análise de exploitabilidade e
  correção sugerida em `SECURITY-REVIEW.md` Seção 1.2 (SEC-DEBT-002).
- **Impacto se não resolvido**: hoje, baixo — produto de usuário único
  (`SDD.md` Seção 7, RNF-09) com allow-list de signup ativo (`BE-M-12`) como
  mitigação primária, e `category_id`/`account_id` são UUID v4 (não
  enumeráveis). **Torna-se diretamente explorável assim que existir um segundo
  `auth.users` real** — cross-tenant write/IDOR sobre `budget`/`transactions`
  referenciando objetos de outro usuário.
- **Condição de bloqueio (não é prazo de calendário)**: este item bloqueia (a)
  qualquer adição de um segundo e-mail a `allowed_signup_emails`, (b) remoção/
  desativação do trigger `auth_users_before_insert_restrict_signup`, e (c)
  qualquer funcionalidade de compartilhamento/múltiplos usuários — nenhuma
  dessas mudanças pode ir a produção com este gap aberto. Recomendado corrigir
  proativamente antes do início da Fase 3 (evita replicar o padrão incorreto em
  tabelas novas).
- **Sugestão**: adicionar `EXISTS (...)` de ownership às policies de
  `INSERT`/`UPDATE` afetadas (ex.: `category_id` deve satisfazer
  `c.user_id = auth.uid() OR c.user_id IS NULL`); marcar os triggers de bloqueio
  de `DELETE` (RN-08/RN-09) como `SECURITY DEFINER`, mesmo padrão já usado em
  `auth_users_restrict_signup`.
- **Veredito do CTO** (parecer completo em `CTO-REVIEW.md`, seção "Revisão de
  Segurança do Lote MVP (SECURITY-REVIEW.md) — 2026-09-03", item 2): concordo com a
  classificação técnica do DevSecOps e ratifico integralmente o bloqueio condicional
  automático já aplicado (nenhuma expansão de allow-list/remoção do trigger de
  signup/feature multiusuário sem este gap corrigido). **Não aceito como débito
  registrado indefinidamente** — fixo prazo de correção: antes do início de qualquer
  tarefa de Fase 3 (`TASK.md` Seção 3.3), mesmo padrão de gate já usado para a
  política de retenção (`G-13`/`ADR-011`). Racional: correção com escopo delimitado
  e já especificado tecnicamente pelo DevSecOps; risco de composição (tabelas novas
  de Fase 2/3 herdam o padrão incorreto por cópia se não virar convenção corrigida
  agora); o gatilho de calendário "2º usuário" é o gatilho errado para esperar (mesmo
  racional do veredito do Bloqueio 006). Ação delegada: **Backend** implementa a
  correção antes de qualquer tarefa `BE-F3-*`; **Tech Lead** (a) adiciona esta
  correção como condição de bloqueio explícita de início da Fase 3 em `TASK.md`, (b)
  avalia propor à minha aprovação (`guardrails-governance`) regra estrutural nova em
  `GUARDRAILS.md` exigindo validação de ownership de FK em toda tabela "ownable"
  nova, desde a criação.
- **Status**: **Resolvido (decisão de risco) — 2026-09-03, por `cto`.** Veredito de
  risco dado (não é débito indefinido, prazo fixado). Execução técnica é
  acompanhamento tático de Backend/Tech Lead em `TASK.md` — não reabre este bloqueio
  de governança se a correção demorar; isso vira um problema de execução de tarefa,
  não um novo `BLOCKERS.md`.
- **Nota de execução (Backend, 2026-09-03)**: implementação bate com o veredito do
  CTO, sem divergência. `BE-M-13` concluída antes de qualquer tarefa `BE-F3-*`
  (`TASK.md` Seção 3.1/3.3) — correção aplicada exatamente conforme a sugestão
  técnica do DevSecOps: `EXISTS (...)` de ownership de FK nas 4 policies afetadas
  (`budget_insert_own`/`_update_own`, `transactions_insert_own`/`_update_own`) e
  `SECURITY DEFINER`/`search_path` fixo nos 2 triggers de bloqueio de `DELETE`
  (RN-08/RN-09), mesmo padrão de `auth_users_restrict_signup`. Teste automatizado
  (`supabase/tests/be_m13_fk_ownership.test.sql`, 9 casos) reproduz o cenário
  exato descrito neste bloqueio (usuário A referencia `category_id` de B em um
  `budget`; B tenta excluir a categoria; bloqueado) — detalhe completo em
  `TASK.md` Seção 3.1, linha `BE-M-13`. Gate de Fase 3 liberado.

---

## Bloqueio 011 — 2026-09-03

- **Reportado por**: devsecops
- **Escalado para**: backend, devops
- **Artefato/trecho afetado**: `supabase/schema-baseline-legacy.sql` (não
  referenciado em `supabase/config.toml` `schema_paths` nem em nenhuma
  migration); `supabase/functions/backup-export/index.ts` (dump só de dado, não
  de schema).
- **Descrição**: as 13 migrations `*_baseline_legacy.sql` são placeholders vazios
  ("Conteudo real nao versionado neste repositorio"). O schema real herdado
  (tabelas/functions/policies/triggers) só existe em
  `schema-baseline-legacy.sql`, que não é aplicado por nenhum mecanismo do
  projeto. O job de backup diário (`BE-M-10`/ADR-009) captura só linhas de
  dado via PostgREST, nunca DDL. Detalhe completo em `SECURITY-REVIEW.md`
  Seção 1.3.
- **Impacto se não resolvido**: se o projeto Supabase linkado for perdido/
  corrompido, ou for necessário reconstruir o ambiente a partir deste
  repositório (`supabase db reset`, CI, projeto novo), **o schema não seria
  recriado** — mesmo com o backup de dado funcionando perfeitamente, não há
  onde restaurá-lo. Isto é uma lacuna real no requisito de disaster recovery
  formalizado em `SDD.md` Seção 7/`ADR-009`/`ADR-011`.
- **Bloqueia**: o fechamento do requisito de DR de `BE-M-10`/ADR-009
  especificamente — não pode ser tratado como "disaster recovery funcional" até
  resolvido. Não bloqueia o deploy das funcionalidades do produto.
- **Sugestão**: gerar `supabase db dump --linked --schema-only` (ou
  equivalente) do projeto real, versionar como conteúdo verdadeiro de
  `schema-baseline-legacy.sql` e referenciar via `schema_paths` em
  `config.toml`; alternativa mais robusta — `backup-export` passar a capturar
  `pg_dump` completo (schema+dado) em cada snapshot diário. DevOps: agendar um
  drill real de restauração após a correção.
- **Veredito do CTO** (parecer completo em `CTO-REVIEW.md`, seção "Revisão de
  Segurança do Lote MVP (SECURITY-REVIEW.md) — 2026-09-03", item 3): concordo que
  isto não bloqueia o fechamento funcional do lote MVP (CRUD/telas não dependem
  disto), mas **rejeito o enquadramento de "resolver só antes do primeiro deploy em
  produção real"** — o projeto Supabase já contém dado real de produção hoje (herdado
  desde o Bloqueio 003), a exposição já existe agora, e, ao contrário do Bloqueio 007
  (credenciais S3, dependência externa do stakeholder), este item não depende de
  terceiro — Backend/DevOps podem agir sem esperar ninguém. Trato como **prioridade
  imediata deste mesmo ciclo de execução**, não item de calendário indefinido. Nota
  de rastreabilidade sobre `ADR-009` (sem reabrir/editar o ADR): a afirmação "RPO ≤
  24h verdadeiro desde já" só se torna literalmente verdadeira depois que este
  bloqueio **e** o Bloqueio 007 estiverem ambos resolvidos — até lá, tratar como
  "mecanismo implementado, cobertura real pendente" em qualquer comunicação. Ação
  delegada: **Backend** gera o schema-only dump (ou estende `backup-export` para
  `pg_dump` completo, a seu critério técnico); **DevOps** agenda e executa um drill
  real de restauração assim que resolvido, coordenado com o fechamento do Bloqueio
  007.
- **Status**: **Resolvido (decisão de priorização) — 2026-09-03, por `cto`.**
  Veredito de prioridade dado (prioridade imediata, não indefinida). Execução técnica
  é acompanhamento tático de Backend/DevOps em `TASK.md`/`DEPLOY.md` — não reabre
  este bloqueio de governança se a correção demorar; isso vira um problema de
  execução de tarefa, não um novo `BLOCKERS.md`.
- **Nota de execução (Backend, 2026-09-03)**: resolvido no mesmo ciclo, como
  determinado. **Divergência pontual da sugestão original, dentro do "a seu
  critério técnico" já delegado** — escolhida a opção (a) (schema-only dump
  referenciado, não a extensão de `backup-export` para `pg_dump` completo,
  chamada de "mais robusta" pelo próprio CTO): Edge Functions (Deno, sandbox sem
  acesso a binário `pg_dump` do sistema operacional) não conseguem invocar
  `pg_dump` de dentro do runtime — a alternativa "mais robusta" exigiria
  reimplementar a extração de DDL via `information_schema`/`pg_catalog` em SQL
  puro (superfície de erro maior, sem ganho real sobre o CLI, que já faz isso via
  `pg_dump` de verdade). Ação tomada: (1) `supabase db dump --linked -f
  supabase/schema-baseline-legacy.sql` — arquivo deixa de ser placeholder, passa a
  ser o dump schema-only real e atual do projeto; (2) esse mesmo conteúdo foi
  copiado para dentro de `supabase/migrations/20260827170841_baseline_legacy.sql`
  (posição cronológica mais antiga das 13 migrations `*_baseline_legacy`, os
  outros 12 arquivos passam a ser no-ops explícitos, cross-referenciando o
  primeiro) — é este arquivo, não o dump solto na raiz, que `supabase db push`
  contra um projeto novo de fato aplica, fechando o gap real de restore-via-
  migrations descrito neste bloqueio; (3) `schema-baseline-legacy.sql` também
  passou a ser referenciado em `supabase/config.toml`
  (`db.migrations.schema_paths`), fechando a lacuna literal apontada pelo
  DevSecOps para o workflow de schema declarativo (`supabase db diff`), embora
  esse não seja o mecanismo de restore em si. **Achado adicional durante esta
  correção**: o job `pg_cron` `fn-clear-due-transactions` (RN-11, a cada 15 min)
  existe no projeto real mas nunca foi criado por nenhuma migration nem é
  capturado por `pg_dump --schema-only` (linha de `cron.job`, dado da extensão,
  não DDL) — corrigido via nova migration aditiva/idempotente
  `20260903110000_dr_bloqueio011_fn_clear_due_transactions_cron.sql`. Nenhuma
  linha de dado real tocada (só DDL/schema); regressão completa (13/13 testes SQL
  + 16/16 testes unitários `deno test` de `BE-M-10`) revalidada sem resíduo.
  Drill real de restauração (criar projeto novo, `supabase link` + `db push`,
  confirmar schema idêntico) permanece com o DevOps, como delegado — não
  executado por este agente (fora do escopo de Backend, e criar um projeto
  Supabase novo é decisão de infraestrutura/custo que cabe ao DevOps coordenar).

---

## Bloqueio 012 — 2026-09-03

- **Reportado por**: devops
- **Escalado para**: backend
- **Artefato/trecho afetado**: `supabase/schema-baseline-legacy.sql` (conteúdo real
  já presente, 1317 linhas — tabelas/functions/triggers/policies/grants do schema
  `public` legado); `DEPLOY.md` §6.3 (runbook de drill de restauração, onde este
  achado está documentado em detalhe, seção 6.3.3)
- **Descrição**: ao preparar o runbook de drill de restauração (`DEPLOY.md` §6.3,
  determinado pelo CTO como prioridade imediata — `BLOCKERS.md` Bloqueio 011),
  inspecionei diretamente o conteúdo de `schema-baseline-legacy.sql` para escrever um
  procedimento preciso, não hipotético. O arquivo **já é mais completo do que uma
  leitura superficial sugeriria** — contém de fato `CREATE TABLE`, `CREATE OR REPLACE
  FUNCTION`, 11 `CREATE OR REPLACE TRIGGER` sobre as 7 tabelas legadas, e
  `CREATE POLICY`/`GRANT` para o schema `public`. Mas confirmei **três lacunas
  concretas** que impediriam uma restauração completa mesmo depois de o Bloqueio 011
  ser resolvido (`schema_paths` corrigido ou `backup-export` estendido) — nenhuma das
  três está presente no arquivo hoje:
  1. **Nenhum `CREATE EXTENSION`** — `pg_cron`, `pgcrypto`, `uuid-ossp`,
     `supabase_vault`, `pg_stat_statements` (confirmadas ativas no projeto real,
     `AUDITORIA-BE-M-00.md` Seção 11) não aparecem no dump. `set_pin`/`verify_pin`
     dependem de `extensions.crypt`/`extensions.gen_salt` (pgcrypto) — falhariam em
     um banco novo sem a extensão instalada primeiro.
  2. **Trigger `on_auth_user_created` em `auth.users` não está no arquivo** — só é
     citado em comentário (`schema-baseline-legacy.sql:788`). É um objeto
     cross-schema (`auth.users`, não `public`), plausivelmente fora do escopo de um
     dump `--schema=public`. Sem ele, `handle_new_user()` nunca dispara e nenhuma
     linha nova aparece em `public.profiles` para um usuário recriado via Auth.
  3. **`cron.schedule` do job legado `fn-clear-due-transactions` (`*/15 * * * *`) não
     está versionado em lugar nenhum do repositório** — existe hoje só como estado ao
     vivo do projeto real (`AUDITORIA-BE-M-00.md` Seção 11), nunca capturado como
     DDL. Sem reagendá-lo manualmente, a promoção `pending`→`cleared` (RN-11) não
     aconteceria no ambiente restaurado.
- **Impacto se não resolvido**: mesmo depois de `schema_paths`/`config.toml` (ou a
  alternativa de `pg_dump` completo em `backup-export`) estarem corrigidos pelo
  Bloqueio 011, um drill de restauração real falharia de forma previsível nestes três
  pontos específicos — não é um risco hipotético, é uma lacuna já confirmada por
  leitura direta do arquivo real.
- **Sugestão (opcional)**: incluir os três itens na mesma correção do Bloqueio 011, a
  critério técnico de Backend — ex.: `CREATE EXTENSION IF NOT EXISTS` explícito no
  topo do dump corrigido (idempotente, seguro mesmo se já instalada), captura do
  trigger de `auth.users` via `pg_dump --schema=auth --schema=public` (ou recriação
  manual documentada, já que `auth` é gerenciado pela plataforma Supabase), e um
  `cron.schedule` explícito para `fn-clear-due-transactions` versionado como migration
  (mesmo padrão já usado em `20260903090000_be_m10_backup_export.sql` para os 2 jobs
  novos de `BE-M-10`).
- **Status**: Aberto — não bloqueia nenhuma tarefa de Backend em andamento (é aditivo
  à correção do Bloqueio 011, mesmo dono, mesmo momento natural de correção). Bloqueia
  especificamente a execução do drill de restauração (`DEPLOY.md` §6.3) até fechado —
  DevOps já ajustou o runbook para tratar isto como pré-condição explícita (§6.3.4),
  não como suposição silenciosa de que o dump já está completo.
