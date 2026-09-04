# ADR-016: Unificação de Conta + Forma de Pagamento no formulário de lançamento — resolução server-side de `account_id`, rótulo calculado em exibição, e sequenciamento com o Bloqueio 013

- **Data**: 2026-09-04
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, data-model, api-contract, security, decision-review
- **Origem**: `PRD-TECNICO.md` Adendo A (RF-REF-04, RN-14, RN-15, RN-16, RNF-13,
  FL-07); `CTO-REVIEW.md`, "Gate 1 — Pré-descoberta (Pacote de Refinamento...)",
  avaliação do item 4 (3 condições de aceite fixadas para o Gate 2:
  `architecture-decision-review` completo cobrindo (a) regra de
  geração/nomenclatura de forma de pagamento por conta, (b) conformidade G-02,
  (c) Bloqueio 013 fechado antes ou junto da implementação).
- **Relacionado**: ADR-012 (adoção de `public` como base real — auditoria
  original de `payment_methods_account_or_card_check`), `BLOCKERS.md` Bloqueio
  013, `GUARDRAILS.md` G-02, `API-CONTRACT.yaml` (`Transaction`,
  `PaymentMethod`), `SDD.md` Seção 5.1.
- **Nota de escopo**: este ADR cobre exclusivamente o formulário de lançamento
  manual (RF-MVP-04) e o fluxo unificado de FL-06/FL-07. Os formulários de
  `RecurringTemplate`/`InstallmentPurchase`/`FixedBill` (Fase 2, já em
  produção) continuam com seleção independente de conta + forma de pagamento
  — não fazem parte do texto de RF-REF-04 e não são alterados por este ADR
  (ver "Fora de Escopo" abaixo).

## Context and Problem Statement

O formulário de lançamento manual hoje (`TransactionFormModal.tsx`) apresenta
dois `<Select>` completamente independentes — "Conta" (populado a partir de
`GET /accounts`) e "Forma de pagamento" (populado a partir de `GET
/payment_methods`) — e envia ambos como campos separados e obrigatórios em
`POST /transactions` (`account_id`, `payment_method_id`). Nada no client nem
no banco hoje garante que os dois valores sejam consistentes entre si (ex.:
nada impede escolher a conta "Nubank" e a forma de pagamento "Débito Itaú"
simultaneamente).

O CTO confirmou (Gate 1 desta rodada) que o vínculo forma de
pagamento↔conta **já existe no schema**: `public.payment_methods.account_id`
(FK para `accounts`, obrigatória quando `type <> 'credit_card'`) e
`credit_card_id` (FK para `credit_cards`, obrigatória quando
`type = 'credit_card'`), mutuamente exclusivos via
`payment_methods_account_or_card_check` (auditado em ADR-012). RF-REF-04 pede
para remover o campo "Conta" do formulário e resolver a conta implicitamente
a partir da forma de pagamento escolhida.

**Achado técnico desta auditoria, não antecipado pelo `PRD-TECNICO.md`/Adendo
A**: o vínculo `credit_card_id` aponta para `credit_cards`, **não** para
`accounts` — não existe, hoje, nenhuma conta associada a uma forma de
pagamento do tipo cartão de crédito. Ao mesmo tempo,
`public.apply_transaction_effect` (função auxiliar do trigger
`transactions_maintain_account_balance`, inalterada desde o schema legado
reaproveitado, ADR-012) debita/credita **incondicionalmente**
`accounts.current_balance_cents` a partir de `transactions.account_id` para
todo lançamento de `kind in (income, expense)` — **inclusive lançamentos de
cartão de crédito**, que hoje já exigem uma conta escolhida manualmente pelo
usuário no formulário atual, sem nenhuma validação de consistência com a
forma de pagamento. Isso significa que a leitura literal de RF-REF-04 AC2
("resolver a conta associada via vínculo já existente
`payment_methods.account_id`/`credit_card_id`") não é diretamente executável
para formas de pagamento de cartão de crédito — não porque seja inviável,
mas porque o pressuposto de que `credit_card_id` também resolve uma conta é
factualmente incorreto frente ao schema real. Este ADR resolve essa lacuna
sem alterar o comportamento financeiro hoje observado pelo usuário (ver
Decisão 3).

## Decision Drivers

- **G-02** (`GUARDRAILS.md`): nenhum `ALTER`/`DROP` destrutivo sobre objeto de
  `public` com dado real sem revisão explícita do CTO — o produto está em uso
  real, com contas/formas de pagamento/lançamentos reais
- **Bloqueio 013** (`BLOCKERS.md`): policies de `INSERT`/`UPDATE` de
  `payment_methods` não validam que `account_id` pertence ao mesmo usuário —
  fixado pelo CTO como pré-condição de implementação deste item
- **RN-16**: o campo "conta" deixa de existir como seleção independente —
  sem exigir nenhuma seleção adicional do usuário (RF-REF-04 AC2)
- **RNF-13**: o rótulo desambiguado (RN-14) deve ser idêntico em toda
  superfície que exibe forma de pagamento
- Nenhuma regressão em RN-01/RF-F2-05 (fechamento de fatura, já implementado
  na Fase 2) — condição explícita pedida pelo CTO
- Princípio 3 do `SDD.md` (Seção 1): custo operacional mínimo — preferir
  solução aditiva simples a redesenho de schema

## Considered Options

### Onde resolver `transactions.account_id` a partir de `payment_method_id`

- **Opção A — Resolução 100% client-side**: o frontend, que já carrega as
  listas completas de `accounts` e `payment_methods`, calcula `account_id` a
  partir da forma de pagamento selecionada e o envia como hoje.
- **Opção B — Trigger server-side que preenche `account_id` só quando o
  client o omite** (`BEFORE INSERT/UPDATE`, dispara quando `NEW.account_id IS
  NULL`).
- **Opção C — Trigger server-side que sempre sobrescreve `account_id`** a
  partir de `payment_method_id`, mesmo se o client enviar um valor.

### O que fazer com `account_id` quando a forma de pagamento é cartão de crédito (sem conta vinculada)

- **Opção D — Preservar o comportamento atual**: `account_id` continua
  obrigatório e é resolvido para uma conta padrão determinística (primeira
  conta ativa por `created_at`), sem expor a escolha ao usuário.
- **Opção E — "Corrigir" o modelo financeiro**: tornar `account_id` nullable
  para lançamentos de cartão e alterar `apply_transaction_effect` para não
  debitar nenhuma conta nesse caso (compra de cartão só afeta a fatura, nunca
  o saldo de conta, até o pagamento da fatura).

### Onde/como gerar as 4 formas de pagamento por conta nova (RN-15)

- **Opção F — Estender o trigger existente** `accounts_seed_default_payment_methods`
  (hoje só dispara na 1ª conta) para dispar em toda conta ativa nova.
- **Opção G — Deixar a criação manual pelo usuário**, sem automação.

## Decision Outcome

### Decisão 1 — Rótulo de exibição (RN-14): confirma que "calcular em exibição" é suficiente e correto

O rótulo `"{Forma de Pagamento} {Nome da Conta}"` (ou simples, quando só há 1
conta ativa) é calculado **inteiramente no frontend**, a partir das listas já
carregadas (`GET /accounts`, `GET /payment_methods`), centralizado em uma
única função utilitária compartilhada (ex.:
`derivePaymentMethodLabel(paymentMethod, accounts)`), consumida por todas as
superfícies exigidas por RNF-13 (formulário de lançamento, lista, filtros,
atalhos do item 3, relatórios). **Nenhum dado é persistido/renomeado no
banco** — confirma a decisão do PM registrada em RN-14. Nenhum endpoint novo,
nenhuma view nova, nenhum dado sensível cruzado: o frontend só enxerga
`accounts` do próprio usuário (RLS `accounts_select_own`), então mesmo uma
linha de `payment_methods` malformada (Bloqueio 013) não teria como vazar o
nome de uma conta de outro usuário através deste cálculo — a busca por
`accounts.find(a => a.id === pm.account_id)` simplesmente não encontraria
correspondência, já que a lista de contas do frontend nunca contém contas de
terceiros. **Resposta à pergunta 1 do escopo deste ADR: sim, calcular em
exibição é suficiente para o rótulo em si — mas RN-15 (Decisão 2) e a
resolução de `account_id` (Decisão 3) exigem, sim, mudança real de
trigger/banco, o que confirma que o item 4 não é puramente cosmético, exatamente como o CTO
antecipou no Gate 1.**

### Decisão 2 — Geração automática de forma de pagamento por conta nova (RN-15): Opção F

O trigger `accounts_after_insert_seed_default_payment_methods` /
`accounts_seed_default_payment_methods()` (`BE-M-02`,
`20260902100100_be_m02_payment_methods_defaults.sql`) hoje só semeia as 4
formas de pagamento padrão (Pix, Débito, Boleto, Dinheiro) quando **nenhuma**
linha `is_system_default = true` existe ainda para o usuário (ou seja, só na
1ª conta ativa). É reescrito (`CREATE OR REPLACE FUNCTION`, migration
aditiva) para semear as 4 formas de pagamento em **toda conta ativa nova**
(2ª, 3ª, ...), vinculadas a essa conta específica, mantendo
`is_system_default = true` (mesma semântica de "não editável/excluível pelo
usuário" já aplicada à 1ª conta — consistente, já que são geradas pelo
sistema do mesmo jeito). "Crédito" continua fora do seed automático — segue
exigindo cadastro explícito de cartão (RF-F2-01), inalterado.

Isto **é** uma mudança de trigger sobre um objeto real já em produção, mas
**não é destrutiva**: `CREATE OR REPLACE FUNCTION` substitui o corpo da
função, não apaga nem altera nenhuma linha de dado já existente em
`payment_methods` — as formas de pagamento já semeadas para a 1ª conta de
hoje permanecem exatamente como estão. G-02 não se aplica (ver Decisão 4).

### Decisão 3 — Resolução server-side de `transactions.account_id`: Opção B + Opção D

Novo trigger `BEFORE INSERT OR UPDATE ON transactions FOR EACH ROW`
(`transactions_default_account_from_payment_method`), com a seguinte lógica:

```
WHEN (NEW.account_id IS NULL)
```

1. Se `NEW.kind = 'transfer'` ou `NEW.payment_method_id IS NULL`: não faz
   nada — `account_id` continua obrigatório e explícito nesses casos (ver
   "Fora de Escopo": transferência não usa `payment_method_id`, RF-REF-04 não
   cobre `kind=transfer`).
2. Busca a forma de pagamento: `SELECT account_id, credit_card_id, type FROM
   payment_methods WHERE id = NEW.payment_method_id AND user_id =
   auth.uid()`. Se não encontrar (forma de pagamento não pertence ao usuário
   autenticado), levanta exceção explícita (400) — mesma disciplina
   defensiva de `BE-M-13`, dando um erro claro em vez de deixar a violação de
   `NOT NULL` estourar sem contexto.
3. Se `type <> 'credit_card'`: `NEW.account_id := payment_method.account_id`
   (o vínculo já existente e auditado em ADR-012).
4. Se `type = 'credit_card'` (**Opção D escolhida** sobre o dilema do
   "Context" acima): `NEW.account_id := ` a conta ativa mais antiga do
   usuário (`SELECT id FROM accounts WHERE user_id = auth.uid() AND is_active
   = true ORDER BY created_at ASC LIMIT 1`) — **preserva exatamente o
   comportamento financeiro já observado hoje** (toda transação de cartão já
   debita/credita alguma conta, via `apply_transaction_effect`, mesmo antes
   deste pacote), sem inventar nem corrigir uma regra de negócio que não foi
   pedida nesta rodada.

Como o gatilho só atua quando `NEW.account_id IS NULL`, **nenhum fluxo
existente que já envia `account_id` explicitamente é afetado** — em
particular, `RecurringTemplate`/`InstallmentPurchase`/`FixedBill` (Fase 2,
já em produção) continuam enviando `account_id` explícito nas transações que
geram automaticamente (via suas próprias Edge Functions/jobs), e o trigger
não interfere com esses caminhos. O frontend do formulário unificado
(RF-MVP-04) passa a **omitir** `account_id` do payload de `POST/PATCH
/transactions` sempre que envia `payment_method_id` — é essa omissão que
aciona a resolução server-side.

Migration 100% aditiva: `CREATE TRIGGER`/`CREATE FUNCTION` novos, nenhuma
constraint existente é alterada (`account_id` continua `NOT NULL` na
tabela, sem qualquer `ALTER COLUMN`), nenhuma linha existente é tocada.

**Opção E (tornar `account_id` nullable e parar de debitar conta em compra de
cartão) foi rejeitada nesta rodada** — ver "Pros and Cons" abaixo. É
tecnicamente o modelo financeiro mais correto, mas mudaria um comportamento
já em produção com dado real (o saldo consolidado de contas que já têm
lançamentos de cartão mudaria retroativamente ou exigiria decisão sobre dado
histórico) sem que nenhum requisito desta rodada tenha pedido essa mudança —
fora do escopo de decisão unilateral do Software Architect. **Sinalização ao
Business Analyst/PM**: se o comportamento atual (compra de cartão debita uma
conta imediatamente, além de compor a fatura) não for o esperado pelo
usuário, é um requisito de negócio novo a levantar explicitamente — este ADR
não o assume nem o decide, apenas preserva o status quo com o mínimo de
intervenção necessária para cumprir RF-REF-04.

### Decisão 4 — Conformidade com G-02: nenhuma migration deste item é destrutiva

Revisão explícita, item a item:

| Mudança | Tipo de operação SQL | G-02 se aplica? |
|---|---|---|
| Rótulo de exibição (Decisão 1) | Nenhuma — só frontend | Não |
| Seed de payment methods por conta nova (Decisão 2) | `CREATE OR REPLACE FUNCTION` (corpo novo, mesmo nome) | Não — não é `ALTER`/`DROP` sobre dado, é redefinição de função; nenhuma linha existente é lida, alterada ou apagada |
| Resolução de `account_id` (Decisão 3) | `CREATE FUNCTION` + `CREATE TRIGGER`, ambos novos | Não — aditivo puro; `account_id` continua `NOT NULL`, sem `ALTER COLUMN` |
| Nenhum backfill/normalização de `payment_methods`/`transactions` existentes é executado | — | Não se aplica (nenhuma operação) |

**Conclusão: o item 4, como desenhado por este ADR, não aciona G-02 —
nenhuma revisão adicional do CTO sobre `ALTER`/`DROP` destrutivo é necessária
além da aprovação deste próprio ADR no Gate 2.** Isto responde formalmente à
condição de aceite (b) fixada pelo CTO no Gate 1 desta rodada.

### Decisão 5 — Interação com o Bloqueio 013 e sequenciamento

Reavaliação do risco real, mais precisa do que a formulação original do
Bloqueio 013 (que já classificava a exploração como pouco provável hoje):

- **O que o Bloqueio 013 NÃO permite, mesmo sem correção**: um usuário
  autenticado não consegue, através da lacuna de `payment_methods`, fazer o
  trigger da Decisão 3 debitar/creditar a conta de **outro** usuário. A
  policy `transactions_insert_own`/`_update_own` (`BE-M-13`) já valida, de
  forma independente, que `account_id` referenciado pertence a
  `auth.uid()` (`EXISTS(SELECT 1 FROM accounts WHERE id = account_id AND
  user_id = auth.uid())`) — essa camada roda **depois** do trigger `BEFORE`
  desta ADR, sobre o valor final de `NEW.account_id`. Se uma linha de
  `payment_methods` do atacante apontar (via Bloqueio 013) para uma conta de
  outro usuário, o trigger da Decisão 3 tentaria resolver `account_id` para
  essa conta alheia, e o `INSERT`/`UPDATE` seria **rejeitado pela RLS
  existente** (403) — não uma escrita cross-tenant bem-sucedida.
- **O que o Bloqueio 013 passa a permitir, sem correção, uma vez que o item 4
  estiver no ar**: (i) um lançamento legítimo do próprio usuário falharia de
  forma confusa (403 inesperado) sempre que ele selecionasse, sem saber, uma
  forma de pagamento cuja `account_id` foi corrompida para apontar a uma
  conta que não é dele — quebra de UX/confiabilidade, não vazamento; (ii)
  mais relevante: uma vez que múltiplos `auth.users` existam de fato (a
  mesma condição de gatilho já fixada pelo CTO para o Bloqueio 010), a
  listagem de formas de pagamento do próprio atacante ficaria em estado
  inconsistente/indefinido no frontend (`accounts.find(...)` não encontra a
  conta referenciada, já que RLS de `accounts` também escopa por
  `auth.uid()`), sinalizando visivelmente que algo está errado — não um
  vazamento de nome de conta alheia (ver Decisão 1), mas uma superfície de
  erro que só existe porque o item 4 tornou o vínculo `account_id` central ao
  fluxo principal do produto, exatamente como o CTO apontou.
- **Conclusão sobre sequenciamento**: confirma o precedente do CTO
  (Bloqueio 010) — a correção do Bloqueio 013 (`EXISTS(...)` nas policies
  `payment_methods_insert_own`/`_update_own`, já desenhada pelo DevSecOps) é
  **pré-condição de exposição em produção** do item 4, não porque exista hoje
  um caminho de escrita cross-tenant (não existe — RLS de `transactions` já
  contém isso), mas para não colocar em produção um estado onde uma
  inconsistência de dado interno (`payment_methods.account_id` órfão de
  ownership) se torna visível/impactante para o fluxo principal do produto.
  Confirmo, como Software Architect, a recomendação já registrada em
  `BLOCKERS.md`: **implementação pode prosseguir em paralelo** (o trigger da
  Decisão 3 já inclui sua própria checagem de ownership — `AND user_id =
  auth.uid()` na busca da forma de pagamento — como defesa em profundidade
  independente da correção do Bloqueio 013), **mas o deploy/exposição do item
  4 em produção fica condicionado à confirmação do DevSecOps de que o
  Bloqueio 013 está fechado** — sequenciamento tático exato (mesmo PR vs. PRs
  separados, feature flag vs. merge direto) permanece decisão do Tech Lead,
  não deste ADR.

### Decisão 6 — Impacto no Contrato de API (`API-CONTRACT.yaml`)

Mudanças a formalizar pelo Tech Lead/Backend na próxima revisão do contrato,
já especificadas aqui como requisito de arquitetura:

- **`POST /transactions` / `PATCH /transactions?id=eq.{id}`**: `account_id`
  passa a ser **opcional no payload** quando `payment_method_id` é enviado e
  `kind != transfer` — o servidor resolve via trigger (Decisão 3). Continua
  **obrigatório** quando `kind = transfer` (transferência não usa
  `payment_method_id` — fora de escopo de RF-REF-04, ver "Fora de Escopo").
  Enviar `account_id` explicitamente continua tecnicamente aceito (não é
  removido do schema, só deixa de ser exigido pela UI) — não há motivo para
  rejeitar um valor explícito consistente, e uso futuro por outro client
  (ex. importação, Fase 3) pode legitimamente precisar enviá-lo.
- **`GET /transactions`**: sem mudança de schema de resposta — `account_id`
  continua presente, agora podendo refletir um valor resolvido pelo servidor
  em vez de escolhido pelo usuário.
- **`GET /payment_methods` / `POST /payment_methods`**: sem mudança de
  schema — `account_id`/`credit_card_id` já existem e já são retornados; a
  mudança real é de RLS (Bloqueio 013, fora do escopo deste ADR, já
  desenhada pelo DevSecOps) e de comportamento do trigger de seed (Decisão
  2), não de contrato.
- **Nenhum endpoint novo**: o rótulo (Decisão 1) é 100% client-side, sem
  necessidade de expor "conta ativa" como contagem via API — o frontend já
  tem `GET /accounts` completo.
- **`RecurringTemplate`/`InstallmentPurchase`/`FixedBill`**: schemas
  inalterados — continuam exigindo `account_id` + `payment_method_id`
  explícitos (ver "Fora de Escopo").

### Decisão 7 — Não-regressão em RN-01/RF-F2-05 (fechamento de fatura)

Confirmado por leitura direta do fluxo real: a resolução de `card_invoice_id`
(RN-01, "lançamento após fechamento entra na próxima fatura") já é feita por
um mecanismo **totalmente independente** do `account_id` — resolvida
automaticamente pelo servidor a partir de `payment_method_id` apontar para
uma forma `type=credit_card` (`API-CONTRACT.yaml`, campo `card_invoice_id`,
"resolvido automaticamente pelo servidor quando `payment_method_id` aponta
para... `credit_card`"), sem qualquer dependência de `account_id`. O trigger
novo desta ADR (Decisão 3) só escreve em `NEW.account_id`, nunca em
`NEW.card_invoice_id` — **nenhuma interferência entre os dois mecanismos**.
RF-F2-05/RN-01 continuam funcionando exatamente como hoje, sem necessidade de
reteste de regressão além do já coberto por `be_f2_02_invoices.test.sql`
(QA deve, ainda assim, adicionar um caso cobrindo "lançamento de cartão via
formulário unificado, sem account_id explícito, ainda resolve
card_invoice_id corretamente" — não uma regressão a corrigir, uma cobertura
nova a somar).

### Fora de Escopo (explícito)

- **`kind = transfer`**: continua exigindo `account_id` +
  `destination_account_id` explícitos, sem `payment_method_id`. RF-REF-04 não
  menciona transferências; nenhuma mudança de UI/contrato para esse fluxo.
- **`RecurringTemplate`/`InstallmentPurchase`/`FixedBill`** (formulários de
  Fase 2, já em produção): mantêm seleção independente de conta + forma de
  pagamento. Poderiam, em tese, receber a mesma unificação por consistência
  (RNF-13 pede rótulo consistente em "toda superfície", mas RF-REF-04 AC1
  restringe a remoção do campo especificamente ao formulário de RF-MVP-04) —
  registrado aqui como possível trabalho futuro, não decidido nem
  recomendado como obrigatório por este ADR; se o BA/PM quiser estender,
  é um novo requisito a levantar formalmente.

## Pros and Cons of the Options

### Opção A: Resolução 100% client-side

- ✅ Zero mudança de backend
- ❌ Nenhuma garantia server-side de consistência entre `account_id` e
  `payment_method_id` — um client desatento (ou uma implementação futura de
  Fase 3, ex. importação) poderia enviar um par inconsistente sem que o
  banco nunca percebesse
- ❌ Rejeitada — RF-REF-04 é justamente uma oportunidade de fechar essa
  lacuna de integridade que já existe hoje (dois campos independentes sem
  validação cruzada), não só de simplificar a UI

### Opção B: Trigger que preenche só quando o client omite ✅ Chosen

- ✅ Zero risco de regressão em fluxos que já enviam `account_id`
  explicitamente (Fase 2: recorrência, parcelamento, contas fixas)
- ✅ Fecha a lacuna de integridade para o caminho novo (formulário unificado)
  sem tocar nos caminhos antigos
- ❌ Convivem dois comportamentos (alguns callers enviam `account_id`
  explícito, outros deixam o servidor resolver) — aceito, documentado

### Opção C: Trigger que sempre sobrescreve

- ✅ Garante consistência absoluta em 100% dos casos, inclusive Fase 2
- ❌ Risco real de regressão silenciosa: se algum template de Fase 2 tiver
  `account_id` inconsistente com seu `payment_method_id` (nunca validado até
  hoje), a próxima geração automática mudaria qual conta é debitada sem
  aviso — dado real de produção, comportamento não coberto por nenhum teste
  de regressão existente
- ❌ Rejeitada por risco desproporcional ao benefício nesta rodada

### Opção D: Preservar comportamento atual para cartão de crédito ✅ Chosen

- ✅ Não inventa nem corrige uma regra de negócio não pedida
- ✅ Zero mudança de dado histórico, zero risco de G-02
- ❌ Perpetua um comportamento financeiro que pode não ser o que o stakeholder
  realmente quer (compra de cartão debita conta imediatamente) — sinalizado
  explicitamente ao BA/PM como possível requisito futuro, não decidido aqui

### Opção E: Corrigir o modelo financeiro (account_id nullable para cartão)

- ✅ Tecnicamente mais correto (compra de cartão não deveria afetar saldo de
  conta até o pagamento da fatura)
- ❌ Muda comportamento observável já em produção sem requisito explícito
  pedindo essa mudança — decisão de negócio, não de arquitetura
- ❌ Exigiria decisão sobre dado histórico (lançamentos de cartão já
  existentes com `account_id` preenchido) — risco de G-02 real, não hipotético
- ❌ Rejeitada nesta rodada — candidata a ADR futuro se o BA/PM levantar o
  requisito

### Opção F: Estender o trigger de seed existente ✅ Chosen

- ✅ Reaproveita o mecanismo já testado e em produção (`BE-M-02`)
- ✅ Migration aditiva, sem risco de G-02
- ❌ Nenhum — opção estritamente superior a criar um mecanismo paralelo

### Opção G: Criação manual das formas de pagamento por conta

- ❌ Contradiz RN-15 diretamente ("o sistema deve gerar automaticamente")
- ❌ Rejeitada — não atende ao requisito

## Links

- Origem: `PRD-TECNICO.md` Adendo A (RF-REF-04, RN-14, RN-15, RN-16, RNF-13,
  FL-07); `CTO-REVIEW.md` "Gate 1 — Pré-descoberta (Pacote de Refinamento...)",
  avaliação do item 4 e as 3 condições de aceite
- Relacionado: ADR-012 (auditoria original de `payment_methods_account_or_card_check`),
  `BLOCKERS.md` Bloqueio 013 (pré-condição de exposição, não de código),
  `GUARDRAILS.md` G-02 (conformidade confirmada, Decisão 4)
- Consumidores: `tech-lead` (decompõe em `TASK.md`, define sequenciamento
  exato com o Bloqueio 013), `backend` (implementa os 2 triggers e a coluna
  de RN-15), `frontend` (remove o campo "Conta" do formulário, implementa
  `derivePaymentMethodLabel`), `devsecops` (fecha o Bloqueio 013, confirma
  ownership check do novo trigger), `qa` (cobre RF-REF-04 AC1-AC6 + a
  não-regressão de RN-01, Decisão 7)
- Pendência sinalizada ao Business Analyst/PM (não decidida aqui): se o
  comportamento atual de "compra de cartão de crédito debita uma conta
  imediatamente, além de compor a fatura" (Decisão 3, Opção D) deve ser
  revisto — candidato a requisito de negócio novo, fora do escopo desta
  rodada
