# ADR-015: RPC de sugestão para atalhos de lançamento rápido (RF-REF-03) e mecanismo de rastreamento de origem (RNF-12)

- **Data**: 2026-09-04
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, performance, data-model, product-analytics
- **Origem**: `PRD-TECNICO.md` Adendo A (RF-REF-03, RN-12, RN-13, RNF-12, RNF-14);
  `CTO-REVIEW.md`, "Gate 1 — Pré-descoberta (Pacote de Refinamento...)", avaliação do
  item 3 ("não é puro front-end: exige uma nova consulta agregada (RPC ou view)...
  Software Architect confirma no Gate 2 se precisar de índice novo ou view
  materializada").
- **Relacionado**: `SDD.md` Seção 2.1 (componentes), Seção 3 (stack), Seção 5
  (modelo de dados), ADR-012 (schema `public` como base real).

## Context and Problem Statement

RF-REF-03 pede uma barra de até 10 atalhos de subcategoria no topo da tela de
lançamentos, ranqueados por frequência de uso numa janela móvel de 90 dias
(RN-12), com fallback para o histórico completo quando há menos de 10
subcategorias distintas na janela, e cada atalho pré-preenche também a forma
de pagamento mais associada àquela subcategoria (RN-13, mesmo critério de
frequência). O CTO já classificou isto como risco técnico baixo/médio no Gate 1
desta rodada, mas apontou explicitamente que não é uma reorganização pura de
UI — é uma consulta agregada nova sobre `transactions`, potencialmente repetida
a cada carregamento da tela (RF-REF-03 AC8: "recalcular... toda vez que a tela
... for carregada"), e delegou a mim decidir se isso exige índice novo, view
materializada, ou uma RPC simples é suficiente (RNF-14).

Separadamente, RNF-12 exige um mecanismo auditável para distinguir lançamentos
criados via atalho dos criados via formulário completo, necessário para medir
a métrica de produto M6, e delega explicitamente a mim a escolha do mecanismo
(extensão do enum `transactions.source`, novo campo booleano, ou outro).

## Decision Drivers

- RNF-09 já fixa o volume de referência do produto como baixo (60–120
  lançamentos/mês, usuário único) — qualquer solução desproporcional (view
  materializada com refresh agendado, índice composto dedicado) seria
  engenharia prematura para esse volume
- RF-REF-03 AC8 exige recálculo a cada carregamento de tela — a solução não
  pode depender de um job assíncrono/cache que atrase a atualização
- RN-12/RN-13 têm regra de desempate determinística (frequência → recência →
  ordem alfabética) que precisa ser reproduzida de forma idêntica sempre que
  calculada — melhor centralizada em um único lugar (banco) do que duplicada
  em lógica client-side, para não divergir entre telas (mesmo princípio já
  aplicado a RN-14/RNF-13 no item 4)
- `transactions.source` (enum `manual/audio/ocr/import/openfinance`) já
  representa uma dimensão semanticamente diferente ("canal de captura":
  manual vs. automatizado) da dimensão que RNF-12 precisa capturar ("ponto de
  entrada dentro da captura manual": atalho vs. formulário completo) —
  misturar as duas dimensões no mesmo enum quebraria RNF-01/RNF-08 (a barreira
  de confirmação humana obrigatória é definida sobre `source`; um atalho
  também é 100% manual e também exige confirmação explícita antes de salvar,
  RF-REF-03 AC5)

## Considered Options

### RPC vs. view materializada vs. cálculo client-side

- **Opção A — RPC `SECURITY INVOKER`/`STABLE`, calculada sob demanda**: uma
  função SQL que roda a agregação em tempo real a cada chamada, filtrada por
  `auth.uid()`.
- **Opção B — View materializada com refresh agendado (`pg_cron`)**: mesma
  agregação, mas persistida e atualizada periodicamente.
- **Opção C — Cálculo inteiramente client-side**: o frontend busca todos os
  lançamentos dos últimos 90 dias (ou de todo o histórico, no caso de
  fallback) e agrega em memória no navegador.

### Mecanismo de rastreamento de origem (RNF-12)

- **Opção D — Estender o enum `transactions.source`** com um novo valor
  (ex. `manual_shortcut`).
- **Opção E — Novo campo booleano `transactions.created_via_shortcut`**,
  ortogonal a `source`.
- **Opção F — Nova tabela de eventos de auditoria** dedicada a registrar a
  origem de cada lançamento.

## Decision Outcome

**Opção A (RPC sob demanda) + Opção E (campo booleano ortogonal) escolhidas.**

### Decisão 1 — RPC `public.get_transaction_shortcuts()`

Nova função SQL, `SECURITY INVOKER`, `STABLE`, mesma convenção das RPCs de
dashboard já existentes (`get_month_provision`,
`get_monthly_category_summary`, `get_month_transaction_count` — todas
`SECURITY INVOKER` filtrando por `auth.uid()` no próprio corpo, conforme
`SDD.md` Seção 2.1/Seção 7 "Autenticação"), retornando até 10 linhas
`(category_id uuid, payment_method_id uuid nullable)`, já ordenadas conforme
o critério de desempate de RN-12. Algoritmo, em nível lógico (SQL exato e
plano de execução são responsabilidade do Backend na implementação):

1. Agrega `transactions` do usuário autenticado (`user_id = auth.uid()`,
   `category_id is not null`) dos últimos 90 dias corridos, contando
   ocorrências por `category_id` e capturando a data do lançamento mais
   recente por categoria.
2. Se o resultado tiver menos de 10 categorias distintas, completa com a
   mesma agregação sobre todo o histórico (excluindo categorias já
   selecionadas na janela de 90 dias), até atingir 10 ou esgotar (RN-12
   regra 5).
3. Ordena o conjunto combinado por frequência desc., data mais recente desc.,
   nome da subcategoria asc. (join com `categories.name` só para o
   desempate final — RN-12, desempates (i) e (ii)) e limita a 10.
4. Para cada categoria selecionada, resolve `payment_method_id` como a forma
   de pagamento mais frequente usada com aquela categoria (mesmo critério de
   frequência simples + desempate por uso mais recente, RN-13); `NULL`
   quando a subcategoria nunca teve lançamento com nenhuma forma de
   pagamento (RN-13, exceção).
5. Se o usuário não tiver nenhum lançamento no histórico, a função retorna
   conjunto vazio — o frontend usa isso diretamente para decidir omitir a
   barra de atalhos (RF-REF-03 AC2), sem precisar de uma chamada adicional
   para "o usuário tem lançamento?".

**Addendum — 2026-09-04 (revisão de spec-compliance/qualidade da implementação
de `BE-REF-02`, 2 pontos não explícitos na redação original acima):**

- **Janela de 90 dias tem limite superior implícito (hoje), não só inferior.**
  "Últimos 90 dias corridos" (passo 1) é lido como o intervalo fechado
  `[hoje - 90, hoje]`, não `[hoje - 90, +∞)`. A revisão de implementação
  encontrou que, sem o limite superior, um lançamento futuro `pending`
  (conta fixa/recorrência/parcelamento, que geram lançamento com
  `transaction_date` no futuro) poderia vencer o desempate de recência de
  RN-12/RN-13 contra atividade real já ocorrida — mesmo padrão de
  `get_month_transaction_count`/`get_income_expense_report`, que já limitam
  os dois lados da janela. Corrigido na implementação (migration
  `20260904120000_be_ref_02_transaction_shortcuts.sql`), sem mudança de
  algoritmo em nível lógico (o texto original já pressupunha "os últimos 90
  dias", não "90 dias atrás em diante").
- **`kind = 'transfer'` NÃO é excluído da agregação do passo 1 — decisão
  explícita, antes implícita apenas por omissão.** Diferente de
  `get_monthly_category_summary`/`get_income_expense_report` (que excluem
  `kind = 'transfer'` porque somam `amount_cents` por categoria para totais
  financeiros, e incluir uma transferência duplicaria dinheiro que só mudou
  de conta do próprio usuário), `get_transaction_shortcuts()` nunca soma
  valor monetário — só conta ocorrências de `category_id` para ranquear
  frequência de uso. A distorção que justifica excluir nas outras duas RPCs
  não se aplica aqui. `RN-16`/`SDD.md` já estabelecem que `kind = 'transfer'`
  não usa `category_id`/`payment_method_id` no fluxo normal do produto (o
  `CHECK transactions_non_transfer_requires_method_and_category` só
  **tolera**, nunca **exige**, `category_id` numa transferência) — na
  prática esta distinção quase nunca é exercida. Mantida a inclusão por
  fidelidade ao algoritmo literal do passo 1 acima (que já falava só em
  `category_id is not null`, sem menção a `kind`), sem reinterpretar a
  decisão original sem necessidade. Consequência aceita: a exceção de
  `NULL` em `payment_method_id` (passo 4, RN-13) permanece alcançável no
  schema real via uma transferência com `category_id` preenchido e
  `payment_method_id` nulo (incomum no fluxo normal do produto, mas
  permitida pelo `CHECK`) — coberta por teste automatizado dedicado
  (`supabase/tests/be_ref_02_transaction_shortcuts.test.sql`, CASO 4).

**Sem índice novo, sem view materializada.** Os índices já existentes
(`transactions_user_id_idx`, `transactions_category_id_idx`,
`transactions_transaction_date_idx`, `transactions_payment_method_id_idx`)
são suficientes para o volume de referência de RNF-09 (60–120/mês); uma
agregação sobre no máximo alguns milhares de linhas por usuário, mesmo sem
índice composto dedicado, não deve produzir latência perceptível (RNF-14).
Isto é registrado como dívida técnica de baixa severidade (Seção 6.2 do
`SDD.md`), não como lacuna — ver "Negative Consequences" abaixo.

Chamada a cada carregamento da tela de lançamentos (RF-REF-03 AC8) — sem
cache client-side entre navegações, consistente com o volume baixo e com a
exigência explícita de refletir uso real mais recente.

### Decisão 2 — `transactions.created_via_shortcut boolean not null default false`

Nova coluna, migration aditiva (`ALTER TABLE ... ADD COLUMN ... DEFAULT
false NOT NULL` — não destrutiva, G-02 não se aplica: nenhuma linha existente
perde ou tem dado alterado, todas recebem `false` por definição do próprio
tipo do lançamento até hoje ser sempre "formulário completo"). O client passa
`true` explicitamente apenas quando o lançamento se originou de um clique em
atalho (FL-06, RF-REF-03 AC6); todo o resto do fluxo de persistência é
idêntico ao já existente (RF-MVP-04 AC1/AC3, RNF-01 — a confirmação
explícita do usuário antes de salvar continua obrigatória mesmo vindo de
atalho, RF-REF-03 AC5).

`source` permanece inalterado, continuando a representar exclusivamente o
canal de captura (manual/voz/foto/importação/Open Finance) — a barreira de
RNF-01/RNF-08 continua definida sobre essa coluna, sem risco de a extensão
deste ADR enfraquecê-la.

### Positive Consequences

- Nenhuma infraestrutura nova (sem `pg_cron` adicional, sem tabela de
  auditoria separada) — coerente com o princípio de custo operacional mínimo
  (`SDD.md` Seção 1, princípio 3)
- Regra de desempate de RN-12/RN-13 centralizada em um único lugar (a RPC),
  eliminando risco de divergência entre telas que a consumam
- `created_via_shortcut` é auditável e trivialmente consultável para M6 sem
  reprocessar `source`, sem risco de conflito com RNF-01/RNF-08

### Negative Consequences

- Sem índice composto dedicado, a RPC reavalia a agregação inteira a cada
  carregamento de tela — aceito como dívida técnica (ver `SDD.md` Seção 6.2
  deste adendo), condição de revisão: volume real medido (RN-11) ultrapassar
  consistentemente a faixa de referência de RNF-09
- Mais uma coluna em `transactions` a manter (`created_via_shortcut`), ainda
  que de baixo custo cognitivo por ser booleana e auto-descritiva

## Pros and Cons of the Options

### Opção A: RPC sob demanda ✅ Chosen

- ✅ Reflete uso real mais recente a cada chamada, sem lag de refresh
- ✅ Sem infraestrutura de agendamento nova
- ❌ Custo de CPU por chamada não é amortizado entre usuários (irrelevante em
  produto de usuário único)

### Opção B: View materializada com `pg_cron`

- ✅ Mais rápida em leitura para volume alto
- ❌ Desproporcional ao volume de referência (RNF-09); introduz lag entre o
  refresh e o "uso real mais recente" que RF-REF-03 AC8 exige
- ❌ Rejeitada por desproporcionalidade

### Opção C: Cálculo client-side

- ❌ Exigiria trazer para o cliente todo o histórico de lançamentos (não só
  os últimos 90 dias, por causa do fallback de RN-12 regra 5) — mais dado
  trafegado do que o necessário, sem ganho real
- ❌ Duplicaria a lógica de desempate de RN-12/RN-13 em JavaScript, com risco
  de divergir de qualquer outro consumidor futuro da mesma regra
- ❌ Rejeitada

### Opção D: Estender `transactions.source`

- ❌ Mistura duas dimensões ortogonais (canal de captura vs. ponto de entrada
  dentro da captura manual) no mesmo enum, arriscando acoplar RNF-01/RNF-08
  (que hoje dependem de `source` para decidir o que exige confirmação) a uma
  distinção que não tem nada a ver com origem automatizada
- ❌ Rejeitada

### Opção E: Campo booleano ortogonal ✅ Chosen

- ✅ Não toca a semântica já estabelecida de `source`
- ✅ Migration aditiva trivial, sem risco de G-02
- ❌ Mais uma coluna a documentar (aceito)

### Opção F: Tabela de auditoria dedicada

- ❌ Desproporcional para capturar 1 bit de informação por lançamento
- ❌ Rejeitada por desproporcionalidade

## Links

- Origem: `PRD-TECNICO.md` Adendo A (RF-REF-03, RN-12, RN-13, RNF-12, RNF-14);
  `CTO-REVIEW.md` "Gate 1 — Pré-descoberta (Pacote de Refinamento...)"
- Relacionado: `SDD.md` Seção 2.1 (componentes — RPCs de dashboard já
  existentes usadas como precedente de padrão), ADR-012 (schema `public`)
- Consumidores: `tech-lead` (decompõe em `TASK.md`), `backend` (implementa a
  RPC e a coluna), `frontend` (consome a RPC e envia `created_via_shortcut`),
  `qa` (testa RN-12/RN-13 e o fallback de AC7), `devsecops` (confirma que a
  RPC não vaza dado de outro usuário — filtra por `auth.uid()` internamente,
  mesmo padrão já auditado nas RPCs de dashboard)
