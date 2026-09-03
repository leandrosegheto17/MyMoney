# ADR-012: Adotar o schema `public` existente como base real de persistência, reaproveitando implementação anterior do stakeholder (supersede ADR-001)

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: cto (decisão estratégica, vinculante — `CTO-REVIEW.md`, "Gate 2 (Reaberto por Bloqueio 003)"), software-architect (desenho técnico do "como")
- **Tags**: architecture, database, vendor, compliance, migration, data-reuse
- **Supersedes**: ADR-001 (`001-reaproveitar-supabase-legado-como-persistencia.md`)

## Context and Problem Statement

`SPK-001` (Backend) inspecionou o schema real do projeto Supabase `xrcxbzrglndetrrhavhc`
e encontrou que a premissa central do `ADR-001` — "o projeto reaproveitado contém dado
de outro produto não relacionado, a isolar" — não se sustenta. O projeto tem
`name = "mymoney"`, foi criado em 2026-08-27 (5 dias antes deste ciclo de
planejamento começar), e o schema `public` já implementa, de forma avançada, o mesmo
domínio que o `SDD.md` Seção 5 desenhou do zero: 7 tabelas (`accounts`, `categories`
já seedada com 12 categorias, `payment_methods`, `transactions` com colunas que já
antecipam Fase 2/3, `profiles` com 1 usuário real cadastrado, `webauthn_credentials`,
`email_mfa_challenges`), 15 funções (incluindo trigger de saldo, RPCs de dashboard,
gate de MFA via JWT claim, gestão de PIN), RLS habilitada nas 7 tabelas com o padrão
`auth.uid() = user_id`, e 13 migrations aplicadas entre 2026-08-27 e 2026-08-28.

Achado técnico completo em `BLOCKERS.md`, Bloqueio 003. Confirmação direta do
stakeholder (fora da cadeia de agentes, mesma natureza da restrição original que deu
origem ao `ADR-001`): `public` **é uma implementação anterior deste mesmo produto
MyMoney**, feita por ele próprio e abandonada antes deste ciclo de planejamento
começar — não é dado de terceiro. O stakeholder quer **reaproveitar**, não recomeçar
do zero em `mymoney` isolado.

O CTO decidiu o **quê** (`CTO-REVIEW.md`, "Gate 2 (Reaberto por Bloqueio 003)"):
`ADR-001` é superseded; a nova estratégia adota `public` como schema de fato de
persistência, com 6 condições de aceite obrigatórias. Este ADR registra o **como**
técnico, dentro dessas condições.

## Decision Drivers

- Confirmação direta do stakeholder: `public` é implementação anterior própria, não
  produto alheio — a razão de ser do isolamento por schema do `ADR-001` (evitar
  colisão com dado de terceiro) deixa de existir.
- Dado real de produção já existente (1 `profile`, 12 `categories` seedadas) não pode
  ser perdido nem duplicado em paralelo — condição de aceite nº 1 do CTO.
- Duplicar a modelagem em `mymoney` geraria dois modelos de dado paralelos e
  divergentes para o mesmo domínio (`public.accounts` vs. `mymoney.account`, etc.) —
  o pior dos três caminhos nomeados pelo Backend no Bloqueio 003.
- Evitar refazer meses de trabalho de modelagem/regra de negócio já funcional
  (trigger de saldo, RPCs de dashboard, MFA gate, WebAuthn) — desproporcional para
  projeto pessoal sem orçamento/prazo formal.
- Reaproveitamento não é aceitação cega — cada objeto reaproveitado precisa ser
  auditado contra os requisitos atuais antes de aceito como definitivo (condição de
  aceite nº 2 do CTO).
- Internals do Supabase (PostgREST expõe `public` por padrão, GoTrue Auth Hooks como
  `custom_access_token_hook` resolvem função por padrão em `public`, trigger já
  amarrado a `auth.users`) tornam mover objetos para um schema novo uma operação de
  risco não-trivial sobre código já em produção, sem benefício real agora que não há
  mais "produto alheio" a isolar.

## Considered Options

- **Opção A**: manter a estratégia original do `ADR-001` — criar `mymoney` do zero,
  isolado, e tratar `public` como legado a ignorar ou migrar manualmente depois.
- **Opção B**: mover fisicamente as 7 tabelas/15 funções/dado real de `public` para um
  schema `mymoney` novo (`ALTER TABLE ... SET SCHEMA` ou dump/restore), preservando a
  mecânica de isolamento por schema do `ADR-001`, só trocando a origem dos objetos.
- **Opção C (escolhida, mandatada pelo CTO)**: adotar `public` como schema de fato de
  persistência deste produto, sem mover nada; toda entidade nova (Fase 2/Fase 3) é
  criada dentro do próprio `public`, com migrations aditivas.

## Decision Outcome

**Opção C escolhida.** `public` passa a ser o único schema de persistência deste
produto daqui para frente — não há mais split `mymoney`/`public`. Nenhum objeto
existente é movido, renomeado ou reescrito por este ADR; toda entidade ainda ausente
(Seção "Plano de Evolução" abaixo) é criada dentro de `public`, por migration aditiva
(`CREATE`, nunca `ALTER`/`DROP` destrutivo sobre objeto com dado real sem revisão
explícita do CTO — o espírito do `G-02` original sobrevive, só muda o escopo textual,
a ser atualizado pelo Tech Lead em `GUARDRAILS.md`).

**Opção B foi descartada** por risco desproporcional ao ganho: internals do Supabase
assumem `public` por convenção (PostgREST expõe `public` como schema padrão da API
REST; `custom_access_token_hook` e o trigger `on_auth_user_created` em `auth.users` já
apontam para objetos de `public`; Storage/Realtime têm integrações internas que
presumem o schema padrão) — mover 7 tabelas + 15 funções + 1 trigger já amarrado a
`auth.users`, com 1 usuário real ativo, para reconfigurar tudo em um schema novo é uma
operação de alto risco sobre código já funcionando, sem nenhum benefício agora que a
razão original do isolamento (produto alheio a isolar) deixou de existir. A Opção B
recriaria o próprio risco que a Opção C evita: reintroduzir dois schemas concorrentes
temporariamente durante a migração, mesmo que a intenção final fosse consolidar em um
só.

### Preservação de Dado Real (condição não-negociável)

O `profile` já cadastrado (1 usuário real) e as 12 `categories` já seedadas são dado de
produção, não seed a recriar nem a descartar. Nenhuma migration sobre `public` a partir
de agora pode ser destrutiva sobre esses dados. Toda migration segue o mesmo princípio
que já regia `mymoney`: aditiva por padrão. Qualquer `ALTER`/`DROP` sobre objeto de
`public` que tenha dado real exige revisão explícita do CTO antes de aplicar — sem
exceção, mesmo em ambiente de desenvolvimento, dado que é o único ambiente existente
hoje (não há staging separado confirmado).

### Auditoria de Objetos Reaproveitados

Reaproveitamento **não é aceitação cega** (condição de aceite nº 2 do CTO). Cada
função/trigger/policy/tabela já existente foi avaliada contra os requisitos atuais de
`PRD-TECNICO.md`/`SDD.md`:

| Objeto | Tipo | Achado da auditoria | Decisão |
|---|---|---|---|
| `accounts`, `payment_methods`, `categories` | Tabelas | Estrutura compatível com `Account`/`PaymentMethod`/`Category` (`SDD.md` Seção 5); `categories` já seedada com as mesmas 12 categorias que `BE-M-02` exigiria criar do zero | **Adotar como estão.** Backend confirma equivalência campo a campo na tarefa de auditoria (substitui a criação do zero) |
| `transactions` | Tabela | Estrutura compatível com `Transaction`; já antecipa FKs nullable para `RecurringTemplate`/`InstallmentPurchase`/`Invoice`/`ImportBatch`-`CandidateTransaction` (`recurring_rule_id`, `installment_plan_id`, `card_invoice_id`, `import_staging_id`), mais `source`, `external_ref`, `attachment_id` | **Adotar como está.** Migrations evolutivas adicionam `FOREIGN KEY` a essas colunas só quando as tabelas referenciadas forem criadas (Fase 2/3); nenhuma redefinição de coluna existente |
| `profiles` | Tabela | Não modelada no `SDD.md` Seção 5 original; contém 1 usuário real; carrega dado de PIN (via `set_pin`/`verify_pin`) | **Adotar.** Promovida a entidade explícita `Profile` no `SDD.md` Seção 5 (ver atualização) |
| `webauthn_credentials` | Tabela | Colunas (`credential_id`, `public_key`, `sign_count`, `device_label`) compatíveis com o que `BE-M-09`/`ADR-005` precisam | **Adotar como a tabela real de `BE-M-09`**, não recriar. Detalhe em ADR-013 |
| `email_mfa_challenges` | Tabela | Suporta o gate de MFA (ver ADR-013) | **Adotar.** Promovida a entidade explícita `EmailMfaChallenge` |
| `apply_transaction_effect` | Trigger | Aplica efeito de saldo em `accounts` a partir de `transactions` — equivalente à regra que RN-01/RN-06 exigem | **Adotar**, condicionado a: Backend escreve teste automatizado de regressão antes de qualquer alteração futura (sem cobertura de teste conhecida hoje — é código de uma implementação anterior própria, não corretude comprovada só por já funcionar) |
| `fn_clear_due_transactions` (+ `pg_cron */15 * * * *`) | Função + job agendado | Análoga à regra RN-11/`BE-M-06` (transição prevista→efetivado por vencimento) — já em produção | **Adotar**, condicionado a: Backend confirma que a semântica exata bate com RN-11 do `PRD-TECNICO.md` antes de considerar `BE-M-06` como "já implementado" (nome análogo não é prova de equivalência semântica) |
| `get_month_provision`, `get_monthly_category_summary` | RPCs | Análogas às necessidades de RF-MVP-05/07 (dashboard) | **Adotar**, condicionado a: Backend audita o contrato de saída (nomes/tipos de campo) contra o que `API-CONTRACT.yaml`/Frontend precisam antes de considerar definitivo |
| `handle_new_user()` (trigger `on_auth_user_created` em `auth.users`) | Trigger global, `SECURITY DEFINER` | Ver subseção dedicada abaixo | **Adotar**, com recomendação de mitigação de efeito colateral (ver abaixo) |
| `custom_access_token_hook` | Função (assinatura de Auth Hook do GoTrue) | Ver ADR-013 | **Adotar como está**, condicionado à confirmação de que está de fato habilitada nas configurações de Auth do projeto (função existir não prova que está ativa) |
| `set_pin` / `verify_pin` | RPCs | Mecanismo real de verificação não inspecionado em profundidade nesta rodada — risco de conflito com `ADR-010` | **Não adotado cegamente.** Ver ADR-013 — Backend deve inspecionar o corpo das duas funções antes de `BE-M-09` entrar em implementação |
| Demais triggers de saldo/hierarquia/status não nomeados individualmente pelo `SPK-001` | Triggers | Existência confirmada, detalhe não levantado por `SPK-001` | Backend enumera e audita cada um individualmente durante a tarefa de auditoria de `BE-M-00`, antes de qualquer funcionalidade de Fase 2 (fatura, hierarquia de categoria) depender deles |
| Roles (`anon`, `authenticated`, `service_role`, etc.) | Roles | Nenhum role customizado de aplicação existe — só os roles padrão de um projeto Supabase novo | Nenhuma ação — usar os roles padrão, como qualquer projeto novo faria |
| Extensions (`pg_cron`, `pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp`) | Extensions | Todas de infraestrutura padrão Supabase, baixo risco de colisão | Adotar sem ressalva |
| RLS policies (`auth.uid() = user_id`; 4 tabelas com gate adicional `(auth.jwt() ->> 'app_email_mfa_verified') = 'true'`) | Policies | Mesmo padrão que `SDD.md` Seção 7 (Autorização) exige, já implementado | **Adotar o padrão `user_id`** como convenção real do projeto daqui em diante (substitui `owner_id`, que o `SDD.md` original assumira sem inspeção — ver atualização da Seção 7) |

### `handle_new_user()` — Avaliação de Efeito Colateral

Este trigger insere automaticamente uma linha em `public.profiles(id)` para todo novo
usuário criado em `auth.users`. `ADR-001` já havia citado esse cenário como risco
hipotético; ele existe de fato. Como `auth.users` é compartilhado por definição
(mesmo Supabase Auth, independente de qual schema hospeda as tabelas de negócio),
qualquer cadastro futuro continua gerando uma linha em `profiles`. Isso deixa de ser
um risco de colisão com produto alheio (não há mais um produto alheio) e passa a ser
uma questão de **superfície de acesso**: como este produto é de uso pessoal de um
único usuário (RNF-09), qualquer cadastro adicional em `auth.users` (acidental, de
teste, ou malicioso) criaria automaticamente um `profile` com acesso a um app
projetado para um único dono.

**Decisão**: adotar `handle_new_user()` como está (a função em si só insere `id`, sem
efeito colateral adicional identificado); **recomendação de mitigação, não decidida
por este ADR** — Backend/DevSecOps devem avaliar restringir novos cadastros (ex.:
desabilitar sign-up público no projeto Supabase, ou lista de e-mail permitido),
coerente com o modelo de usuário único do produto. Esta recomendação não é uma
decisão de arquitetura de autorização nova (RLS por `user_id` já impede um segundo
usuário de ver dado do primeiro) — é uma medida de higiene operacional a avaliar na
fase tática, registrada aqui para não se perder.

## Plano de Evolução — Entidades Ausentes

Mapeamento completo (entidade lógica ↔ tabela real, e o que falta) está em `SDD.md`
Seção 5 — este ADR não duplica a tabela completa (ver convenção de handoff,
`PIPELINE-CONVENTIONS.md` §1: "o `SDD.md` não copia conteúdo de ADR, só indexa" — aqui
o inverso também vale, o detalhe físico-lógico vive no `SDD.md`). Resumo da decisão:

- **7 entidades já existem** em `public`, sob os nomes reais das tabelas (`accounts`,
  `payment_methods`, `categories`, `transactions`, `profiles`, `webauthn_credentials`,
  `email_mfa_challenges`) — adotadas conforme tabela de auditoria acima.
- **12 entidades ainda não existem** e são criadas por migration aditiva dentro do
  próprio `public`, nunca em schema separado: `Budget`, `CreditCard`, `Invoice`,
  `RecurringTemplate`, `InstallmentPurchase`, `FixedBill`, `Goal`, `Contribution`,
  `Notification`, `ImportBatch`, `CandidateTransaction`, `OpenFinanceConnection`.
- **1 entidade adicional identificada nesta auditoria**, não citada na lista original
  do CTO: `Attachment` (evidência de foto de recibo) — a coluna `transactions.attachment_id`
  já antecipa essa referência, mas nenhuma tabela `attachments` existe ainda. Registrado
  como achado adicional (o CTO previu explicitamente que a lista de 12 não seria
  exaustiva — "o Software Architect pode achar outros na auditoria").
- Colunas de `transactions` que já antecipam entidades futuras (`recurring_rule_id`,
  `installment_plan_id`, `card_invoice_id`, `import_staging_id`) são **aproveitadas
  como estão** — nenhum redesenho; a migration evolutiva de cada entidade futura inclui
  a `FOREIGN KEY` correspondente no momento em que a tabela referenciada é criada.

## Vendor Lock-in — Revisão

A nota geral de lock-in do Gate 2 original (`CTO-REVIEW.md`, Gate 2, "Vendor lock-in —
nota geral") descrevia o plano de saída como "dado portável via `pg_dump`; lógica de
negócio (Edge Functions/RLS) e autenticação não são portáveis sem reescrita". Isso
**não muda de conclusão de fundo** com esta decisão — mas dois pontos textuais do
`SDD.md`/`ADR-001` ficam desatualizados e são corrigidos aqui:

- O texto "isolamento por schema dedicado reduz risco de colisão" (`ADR-001`,
  "Positive Consequences" e Seção 3 do `SDD.md`) **não é mais verdade** como mitigação
  vigente — não há mais isolamento por schema, porque não há mais dois produtos a
  isolar. Isso não piora o lock-in em si (o Supabase já era compartilhado só com esta
  mesma implementação anterior, não com um produto alheio), mas remove uma mitigação
  que nunca existiu de fato.
- **Piora real e específica**: a "lógica de negócio não portável" (Edge
  Functions/RLS/triggers) aumenta de escopo — agora inclui triggers/RPCs/policies já
  escritos por uma implementação anterior (`apply_transaction_effect`,
  `custom_access_token_hook`, RPCs de dashboard, `set_pin`/`verify_pin`), não só o que
  este pipeline desenharia do zero. Reverter para outro provedor exigiria reescrever
  mais lógica do que o `SDD.md` original previa, porque parte dela já existe e será
  mantida em uso em vez de nunca ter sido escrita.
- **Melhora real e específica**: menos escopo novo a desenhar do zero (trigger de
  saldo, RPCs de dashboard, MFA gate, WebAuthn já existem e funcionam) — reduz o
  esforço de implementação deste ciclo, o que é uma vantagem de custo/prazo, não de
  portabilidade.

Conclusão: lock-in de **lógica** piora (mais código acoplado ao Supabase em uso real);
lock-in de **esforço de implementação** melhora (menos a construir). Nenhuma das duas
mudanças altera a conclusão do Gate 2 original de que este nível de lock-in é
proporcional ao contexto (projeto pessoal, sem orçamento formal, usuário único) — não
é motivo de reprovação, só precisa ser declarado com honestidade, não presumido.

## Item Fora de Escopo (não resolvido por este ADR)

Item 6 do `SPK-001` (plano/tier contratado do Supabase) **permanece em aberto**, não é
resolvido por esta decisão. Segue pendente de confirmação manual na aba Billing do
dashboard (`supabase.com/dashboard/project/xrcxbzrglndetrrhavhc/settings/billing`),
relevante para a validade do `ADR-009` (backup). Registrado em `BLOCKERS.md`, Bloqueio
003.

### Positive Consequences

- Preserva 100% do dado real já existente (1 `profile`, 12 `categories`) sem exigir
  migração de dado nem risco de perda durante uma movimentação de schema
  desnecessária
- Reaproveita trabalho de modelagem/regra de negócio já funcional (trigger de saldo,
  RPCs de dashboard, MFA gate, WebAuthn), reduzindo esforço de implementação do MVP
- Elimina o risco (b) nomeado pelo Backend no Bloqueio 003 (dois modelos de dado
  paralelos e divergentes) — um único schema, uma única fonte de verdade
- Evita a operação de alto risco de mover objetos já em produção (Opção B) para um
  schema novo sem nenhum benefício real, dado que a premissa que motivava o
  isolamento (produto alheio) não existe
- Auditoria por objeto (não aceitação cega) reduz o risco de herdar uma falha de
  segurança ou regra de negócio incorreta silenciosamente

### Negative Consequences

- Lock-in de lógica de negócio no Supabase se aprofunda (ver "Vendor Lock-in —
  Revisão" acima) — mais código já escrito e em uso, não só o que este pipeline
  desenharia
- Código reaproveitado (triggers/RPCs/policies) não tem cobertura de teste conhecida
  nem revisão de segurança prévia — tratado como dívida técnica/risco de qualidade
  (reclassificado em `SDD.md` Seção 6.1), não como corretude adquirida
- `handle_new_user()` cria superfície de risco de cadastro não controlado (ver
  subseção dedicada) — recomendação de mitigação registrada, mas não implementada por
  este ADR
- `custom_access_token_hook` e `set_pin`/`verify_pin` têm estado de ativação/
  comportamento não totalmente confirmado nesta rodada — tratados como condição a
  verificar antes de depender deles em produção (ver ADR-013 e tabela de auditoria)
- Nenhum ambiente de staging separado confirmado — toda migration aditiva em `public`
  roda no único ambiente existente, elevando a importância de backup/rollback antes de
  cada mudança (mesmo princípio já herdado do `ADR-001`, agora com dado real em jogo
  desde o primeiro dia, não só depois de uma migração)

## Pros and Cons of the Options

### Opção C: Adotar `public` como base real ✅ Chosen

- ✅ Zero movimentação de dado real — risco mínimo de perda
- ✅ Reaproveita trabalho já funcional (trigger de saldo, RPCs, MFA, WebAuthn)
- ✅ Elimina o risco de dois modelos de dado paralelos e divergentes
- ✅ Evita reconfigurar internals do Supabase que assumem `public` por convenção
- ❌ Aprofunda lock-in de lógica de negócio (aceito, ver revisão de lock-in)
- ❌ Exige auditoria disciplinada objeto a objeto antes de confiar em código não
  revisado (mitigado pela tabela de auditoria acima)

### Opção A: Manter `ADR-001` (mymoney isolado, ignorar `public`)

- ✅ Nenhuma mudança de estratégia a comunicar
- ❌ Contradiz a vontade explícita do stakeholder (reaproveitar, não recomeçar)
- ❌ Duplica meses de trabalho de modelagem/regra de negócio já funcional
- ❌ Risco de dois modelos de dado paralelos e divergentes no mesmo domínio
- ❌ Rejeitada pelo CTO como decisão vinculante

### Opção B: Mover objetos de `public` para `mymoney`

- ✅ Preserva a mecânica original de isolamento por schema, caso algum dia volte a
  fazer sentido
- ❌ Operação de alto risco sobre 7 tabelas + 15 funções + trigger em `auth.users` já
  em produção, com 1 usuário real ativo
- ❌ Reconfigurar internals do Supabase (PostgREST, Auth Hooks) que assumem `public`
  por convenção
- ❌ Nenhum benefício real, dado que a razão original do isolamento (produto alheio a
  isolar) não existe mais
- ❌ Rejeitada por risco desproporcional ao ganho

## Links

- Supersedes: ADR-001 (`001-reaproveitar-supabase-legado-como-persistencia.md`) —
  `Status: Superseded by ADR-012`
- Relacionado: ADR-002 (monólito modular sobre BaaS — inalterado), ADR-005/ADR-010
  (autenticação — esclarecidos adicionalmente por ADR-013), ADR-009 (backup — item 6
  do `SPK-001` segue relevante para sua validade), ADR-011 (retenção/descarte —
  referência de schema atualizada de `mymoney` para `public`, sem reabrir a decisão)
- Origem: `BLOCKERS.md`, Bloqueio 003 (reportado por `backend`, resolvido
  estrategicamente por `cto`, desenhado tecnicamente por `software-architect`);
  `CTO-REVIEW.md`, "Gate 2 (Reaberto por Bloqueio 003)"
- Consome: achado técnico completo do `SPK-001` (`TASK.md` Seção 2)
- Revisão pendente: CTO, novo Gate 2 completo (`architecture-decision-review` +
  `risk-and-compliance-check`) antes de o Backend retomar `BE-M-00`
