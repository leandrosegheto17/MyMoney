
# ADR-019: Tipografia numérica seletiva (segunda família serif via classe `.num`) não cabe na premissa "zero mudança de componente" do ADR-017 — introdução do primitivo `Num`, migrado lote a lote

- **Data**: 2026-09-04
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, frontend, design-system, typography, decision-review
- **Origem**: `BLOCKERS.md` Bloqueio 022 (escalado por `ux-ui`, leitura real dos 8
  artboards do canvas "MyMoney v2.0").
- **Relacionado/Amends**: ADR-017 (não superseded — Decision Outcome da Opção 1
  permanece correto e não é revertido; este ADR corrige e delimita o alcance de
  uma afirmação empírica específica de seu racional, e acrescenta uma
  sub-decisão nova que o ADR-017 não cobria). ADR-018 (o mecanismo de migração
  incremental aqui adotado é uma aplicação direta do mesmo desacoplamento
  token/componente global vs. composição migrada lote a lote já decidido lá).
  ADR-003 (PWA/offline-first — relevante para a decisão de carregamento de
  fonte, ver Racional).

## Context and Problem Statement

O ADR-017 justificou a Opção 1 ("preservar estrutura vigente, sem
reestruturação") citando como evidência empírica um precedente real: a
repaginada visual de 2026-09-04, que substituiu a paleta inteira de cores só
editando valores dentro do mesmo bloco `@theme`, "nenhum arquivo de componente
foi tocado".

O Bloqueio 022 (`ux-ui`) trouxe o conteúdo real dos 8 artboards do canvas
"MyMoney v2.0", só disponível de forma limitada quando o ADR-017 foi escrito.
Além da substituição completa de paleta (que de fato segue o mesmo padrão do
precedente — mesmos nomes de variável, novos valores, ver "Racional — Parte 1"
abaixo), os mockups introduzem algo que o precedente de 2026-09-04 não cobria:
uma segunda família tipográfica (`Newsreader`, serif) aplicada seletivamente,
via uma classe `.num`, a todo elemento que renderiza número (valores
monetários, contadores, percentuais), complementando `Public Sans` no restante
da interface. A pergunta do UX/UI, correta e não decidida por ele: isso ainda é
"substituição de token em bloco, zero mudança de componente", ou é grande o
suficiente para ser uma decisão arquitetural própria?

Antes de responder no abstrato, inspecionei o código real de
`frontend/src/`:

- **Não existe hoje nenhuma infraestrutura real de web font.** `--font-sans:
  "Inter", ui-sans-serif, system-ui, ...` está declarado em
  `frontend/src/index.css`, mas `frontend/index.html` não tem nenhum
  `<link>`/`@font-face`/import de fonte, e `frontend/package.json` não tem
  nenhum pacote de fonte (`@fontsource/*` ou equivalente). Na prática, "Inter"
  nunca foi carregada — o navegador sempre caiu no fallback `ui-sans-serif`/
  `system-ui`. Introduzir `Public Sans` **e** `Newsreader` não é "adicionar uma
  segunda fonte a uma primeira já carregada": é ligar, pela primeira vez neste
  projeto, um mecanismo real de carregamento de web font.
- **A renderização de número não passa por um ponto único de composição.**
  `formatCentsToBRL()` (`frontend/src/lib/currency.ts`) é uma função pura que
  devolve uma `string` (`"R$ 1.234,56"`), consumida por interpolação direta em
  JSX em **17 arquivos**, **25+ pontos de chamada**
  (`BudgetCard.tsx`, `CategoryCard.tsx`, `DashboardPage.tsx`,
  `InvoiceTimeline.tsx`, `AccountsPage.tsx`, `CreditCardsPage.tsx`,
  `RecurringPage.tsx`, `FixedBillsPage.tsx`, `GoalProgressBar.tsx`,
  `BarChart.tsx`, `DonutChart.tsx`, `TransactionsPage.tsx`,
  `OfflineSyncBadge.tsx`, `GoalsPage.tsx`, `CurrencyInput.tsx`, entre outros).
  Em vários desses pontos, o número **não está isolado em seu próprio nó de
  texto** — está concatenado, dentro da mesma `string`/nó de texto, com texto
  não-numérico:
  - `BudgetCard.tsx:88` — `` detailText={`${formatCentsToBRL(spentCents)} de ${formatCentsToBRL(limitCents)}`} `` —
    dois números e a palavra "de" dentro de uma única `string` passada como
    prop (`detailText: string`) para outro componente (`ProgressBar`).
  - `DashboardPage.tsx:109`/`113`, `TransactionsPage.tsx:268`,
    `OfflineSyncBadge.tsx:78` — `` `${seta} ${formatCentsToBRL(...)}` `` (glifo
    "↑"/"↓" e o valor no mesmo nó de texto).
  - `FixedBillsPage.tsx:158`, `RecurringPage.tsx:229` — `` `Vence dia ${dia} · ${formatCentsToBRL(...)}` ``
    (dia + separador + valor no mesmo nó).
  - `DonutChart.tsx:93` — `` `${formatCentsToBRL(...)} (${pct}%)` `` (dois
    números de tipos diferentes — moeda e percentual — no mesmo nó, dentro de
    um gráfico SVG/HTML híbrido).

  Aplicar `.num` **seletivamente só ao número**, nesses casos, exige separar o
  número do texto em nós/elementos JSX distintos — não é uma edição de
  `className` num elemento que já existe isolado. No caso de `BudgetCard`, o
  valor sequer chega como nó React: chega como `string` já concatenada dentro
  de uma prop (`detailText`) de outro componente — mudar isso é alterar o
  contrato do componente (`string` → `ReactNode`, ou dividir em props
  separadas), não adicionar uma classe.

Isso confirma, com evidência concreta e não no abstrato, a suspeita do UX/UI:
**a introdução da tipografia numérica seletiva não cabe na premissa "zero
mudança de componente" do ADR-017** — nem pelo volume de arquivos, nem pela
natureza da mudança (estrutural/JSX, não só CSS), nem pelo carregamento de
fonte novo (que hoje não existe em nenhum grau).

## Decision Drivers

- Precisão sobre o próprio racional do ADR-017: uma afirmação empírica
  ("zero mudança de componente") só deve ser reutilizada para justificar uma
  decisão nova até onde a evidência real a sustenta — não pode ser estendida
  por analogia superficial ("também é troca de token") a um caso
  qualitativamente diferente.
- ADR-018 já resolveu exatamente esta classe de problema (mudança de alcance
  grande demais para caber num único lote/PR) para a camada de composição de
  tela — o mesmo mecanismo (camada global introduzida uma vez, migração
  incremental do que consome) se aplica aqui, sem precisar inventar um
  mecanismo novo.
- Princípio 3 do `SDD.md` (custo operacional mínimo, execução solo/serial): não
  é proporcional pedir que o Lote 0 toque, atomicamente, os 17 arquivos/25+
  pontos de chamada de número da aplicação inteira só para viabilizar duas
  telas do Grupo A.
- ADR-003 (PWA/web responsivo) e RNF-04 (confiabilidade offline): o projeto já
  tem infraestrutura de PWA real (`vite-plugin-pwa` em
  `frontend/package.json`) — qualquer novo carregamento de fonte deveria ser
  coerente com o objetivo de funcionar offline, não introduzir uma dependência
  de rede de terceiro (Google Fonts CDN) que quebra silenciosamente sem
  conexão.
- Não cabe a este agente decidir se a segunda família tipográfica é desejável
  do ponto de vista de conteúdo/marca — isso é decisão do `ux-ui`/mockup já
  expressa de forma consistente nos 8 artboards. Cabe a este agente decidir
  **como** isso é viabilizado tecnicamente, e a que custo real.

## Considered Options

1. **Tratar como "só CSS"**: adicionar a regra `.num { font-family:
   "Newsreader", serif; font-variant-numeric: tabular-nums; }` e orientar que
   cada desenvolvedor aplique a classe ad-hoc onde achar necessário, sem
   primitivo compartilhado.
2. **Migração atômica no Lote 0**: introduzir `.num` e tocar, de uma vez, os
   17 arquivos/25+ pontos de chamada de número já existentes na aplicação
   inteira, dentro do próprio Lote 0.
3. **Introduzir um primitivo `Num` compartilhado agora (Lote 0), migração
   incremental lote a lote** — mesmo desacoplamento token/componente global
   vs. composição já usado no ADR-018.
4. **Rejeitar a segunda família tipográfica**, pedir ao `ux-ui` que
   simplifique o mockup para uma família única.

## Decision Outcome

**Opção 3 — Primitivo `Num` introduzido no Lote 0 (peça nova de
`components/base`, junto com o CSS/fonte), migração dos 17 arquivos/25+ pontos
de chamada feita lote a lote, não atomicamente.**

### Racional

**Parte 1 — o que continua valendo do ADR-017, sem reabrir nada**: a
substituição de paleta de cor (`--color-primary`, `--color-income`,
`--color-expense`, escala neutra, radius, sombra) segue exatamente o padrão do
precedente de 2026-09-04 — mesmos nomes de variável dentro do mesmo bloco
`@theme`, só valores novos, zero toque em `className`/JSX. As duas
particularidades de conteúdo que a tabela do Bloqueio 022 levantou não mudam
isso architeturalmente: (a) `--color-danger` pode continuar existindo como
variável declarada mesmo que nenhum dos 8 artboards a exercite (ausência de
exemplo visual ≠ ausência de necessidade do token — RN de estouro de
orçamento >100% continua existindo no produto); (b) `income` receber o mesmo
valor de `accent` é uma escolha de **valor**, não de estrutura — os dois
seguem sendo tokens de nomes distintos, só coincidem numericamente. Nenhuma das
duas exige revisão do ADR-017. Essa parte do Bloqueio 022 está resolvida sem
necessidade de tocar o ADR-017 ou criar ADR novo — cabe ao `ux-ui` decidir os
valores finais desses dois pontos como conteúdo de design system (`UX-SPEC.md`
Seção 3), não como arquitetura.

**Parte 2 — o que este ADR decide, especificamente para tipografia
numérica seletiva**:

- **Opção 1 (só CSS, sem primitivo) rejeitada**: pelo menos um caso real
  (`BudgetCard.tsx`, prop `detailText: string`) não tem elemento isolado para
  receber a classe sem antes mudar o contrato do componente — "só adicionar
  `.num`" não é fisicamente possível nesse ponto sem refatoração. Padronizar
  via convenção informal ("adicione `.num` quando lembrar") também não garante
  consistência ao longo de 14 lotes executados de forma solo/serial ao longo de
  meses — o mesmo argumento de governança que já levou o ADR-017 a preferir
  componentes compartilhados a classes soltas.
- **Opção 2 (migração atômica no Lote 0) rejeitada**: tocar 17 arquivos/25+
  pontos de chamada — vários deles em telas do Grupo B que sequer serão
  redesenhadas visualmente nesta fase — não é proporcional ao escopo real do
  Lote 0 (que cobre a fundação do design system para 2 telas do Grupo A, não
  uma varredura da aplicação inteira). Contraria a mesma lógica que fez o CTO
  recusar estimativa agregada do Grupo B antes de Lote 0 + 1 lote validados
  (`ADR-018`, Origem) — inflaria o Lote 0 com trabalho de lotes futuros.
- **Opção 4 (rejeitar a segunda fonte) fora da minha autoridade**: os 8
  artboards mostram a aplicação de `Newsreader`/`.num` de forma consistente e
  deliberada, não um acidente de um mockup isolado — é decisão de conteúdo
  visual do `ux-ui`/mockup, não uma questão de viabilidade técnica (é
  viável, só não é grátis). Meu papel é dizer o custo real e desenhar o
  mecanismo, não vetar a direção de design. Se o custo acumulado ao longo dos
  14 lotes for considerado desproporcional em algum momento, essa é uma
  discussão de escopo/prazo a escalar ao Business Analyst/CTO com números
  concretos — não uma decisão unilateral do Architect de remover o requisito.
- **Opção 3 escolhida**: aplica ao problema exatamente o mesmo desacoplamento
  já validado pelo ADR-018 (camada global introduzida de uma vez; consumo
  migrado lote a lote). O primitivo `Num` (nome de trabalho — `ux-ui`/
  `frontend` podem ajustar) vive em `components/base/`, mesmo diretório e
  mesma disciplina de teste (`Num.test.tsx`) dos outros 14 componentes-base já
  existentes — nenhuma reestruturação de camada, plenamente compatível com a
  Opção 1 do ADR-017 (que continua vigente sem alteração). A partir do Lote 0:
  - Todo número **novo** escrito em código a partir de agora usa `<Num
    value={...} />` (ou equivalente) em vez de interpolar
    `formatCentsToBRL()`/percentual cru direto em JSX.
  - Os pontos de chamada já existentes (17 arquivos) são migrados **um a um,
    junto do lote que já vai tocar aquela tela** — a mesma tela que ganha o
    layout do Grupo A/B (ADR-018) ganha, no mesmo PR, a troca de
    `{formatCentsToBRL(x)}` cru por `<Num value={x} />`. Nenhum PR muda
    número de tela que não é o alvo do próprio lote.
  - Até sua migração, um ponto de chamada permanece renderizando o número na
    fonte única atual — registrado explicitamente como dívida técnica nova
    (`SDD.md` Adendo B, Seção B.6.2), não absorvido em silêncio.
  - Casos como `BudgetCard.tsx` (prop `string` misturando dois números e
    texto) são resolvidos no momento em que aquele componente for tocado por
    seu próprio lote — a mudança de contrato (`detailText: string` → aceitar
    `ReactNode`, ou dividir em `spentCents`/`limitCents` como props tipadas
    e formatação interna) é trabalho real de componente, corretamente
    identificado pelo UX/UI como maior que "editar `@theme`".
- **Mecanismo de carregamento de fonte — self-hosted, não Google Fonts CDN**:
  como o projeto já tem infraestrutura de PWA real (`vite-plugin-pwa`) e RNF-04
  exige confiabilidade offline, as duas famílias (`Public Sans`, `Newsreader`)
  devem ser adicionadas via pacote local (ex. `@fontsource/public-sans`,
  `@fontsource/newsreader`, importados no bundle da aplicação) em vez de um
  `<link>` para `fonts.googleapis.com`. Isso garante que o service worker do
  PWA já existente cacheia os arquivos de fonte como qualquer outro asset
  estático, sem depender de uma requisição de rede a um domínio de terceiro
  toda vez que o app abre — coerente com um requisito de arquitetura já
  aprovado (ADR-003/RNF-04), não uma preferência estética. Custo real: aumento
  do tamanho do bundle de assets estáticos (fontes), não de código JS —
  registrado como consequência negativa abaixo, não escondido.

### Consequências

- Positivas: nenhuma reestruturação de camada (ADR-017 Opção 1 permanece
  intacto); custo do Lote 0 fica bem delimitado (introduzir o primitivo +
  fonte, migrar só as telas que o próprio Lote 0/Grupo A tocam); migração dos
  17 arquivos restantes se paga sozinha, lote a lote, sem PR dedicado só para
  isso; mecanismo de fonte self-hosted preserva a garantia de funcionamento
  offline (RNF-04/ADR-003) em vez de introduzir uma dependência de rede nova.
- Negativas/trade-offs aceitos: durante toda a janela de transição (mesma
  classe de risco já aceita pelo ADR-018 para composição de tela), a aplicação
  terá números em `Newsreader` (telas já migradas) convivendo com números na
  fonte única atual (telas ainda não migradas) — inconsistência tipográfica
  transitória, de severidade equivalente à já aceita em `SDD.md` Adendo B,
  Seção B.6.2, para composição de layout; pelo menos um componente
  (`BudgetCard`, e possivelmente outros descobertos durante a migração) exige
  mudança de contrato de prop, não só de estilo, no momento em que for
  migrado; aumento do peso de assets estáticos por duas famílias de fonte
  novas (mitigado por self-hosting + cache do service worker, mas não é peso
  zero).
- Este ADR **não** supersede o ADR-017 — a Decision Outcome da Opção 1
  (preservar estrutura vigente, sem pacote/monorepo/Storybook) permanece
  válida e não é revertida. Este ADR corrige o alcance de uma afirmação
  específica do racional do ADR-017 ("zero mudança de componente" não se
  generaliza a toda e qualquer mudança de token) e acrescenta a sub-decisão de
  tipografia numérica, que o ADR-017 nunca cobriu — mesmo padrão já usado
  entre ADR-005/ADR-010 (Bloqueio 001): o ADR original permanece `Accepted`,
  sem edição, complementado por um ADR de esclarecimento/extensão.

## Pros and Cons of the Options

### Opção 3: Primitivo `Num` no Lote 0, migração incremental lote a lote ✅ Chosen

- ✅ Reaproveita o mecanismo já validado pelo ADR-018 (camada global vs.
  composição migrada lote a lote), nenhuma ferramenta/padrão novo a aprender
- ✅ Escopo do Lote 0 permanece proporcional (fundação + telas do próprio lote,
  não a aplicação inteira)
- ✅ Resolve corretamente o caso `BudgetCard` (mudança de contrato) no momento
  em que já será tocado por outro motivo
- ❌ Inconsistência tipográfica transitória durante a janela de migração —
  mitigada como dívida técnica explícita (`SDD.md` B.6.2), mesma classe de
  risco já aceita pelo ADR-018

### Opção 1: Só CSS, sem primitivo

- ❌ Fisicamente inviável em pelo menos um ponto real (`BudgetCard`) sem
  refatorar o componente de qualquer forma
- ❌ Sem governança/consistência ao longo de 14 lotes solo/serial
- ❌ Rejeitada

### Opção 2: Migração atômica no Lote 0

- ❌ Desproporcional ao escopo real do Lote 0 (toca telas de lotes futuros
  que ainda nem foram planejados em detalhe)
- ❌ Contraria a lógica já usada pelo CTO para recusar estimativa agregada do
  Grupo B antes de tempo
- ❌ Rejeitada

### Opção 4: Rejeitar a segunda família tipográfica

- ❌ Decisão de conteúdo/design, fora da autoridade do Software Architect
- ❌ Rejeitada nesta rodada — não descarta uma escalada futura de custo
  desproporcional ao Business Analyst/CTO, se os números acumulados ao longo
  dos 14 lotes justificarem

## Links

- Origem: `BLOCKERS.md` Bloqueio 022
- Amends/Relacionado: ADR-017 (Decision Outcome preservado, racional
  delimitado), ADR-018 (mecanismo de migração incremental reaproveitado),
  ADR-003 (PWA/offline-first — mecanismo de carregamento de fonte)
- Consumidores: `ux-ui` (define a API visual do `Num`/onde `.num` se aplica —
  moeda, percentual, contador — e os valores finais de `--color-danger`/
  `income` na Parte 1), `tech-lead` (decompõe a migração incremental por lote
  em `TASK.md`, incluindo o caso `BudgetCard`), `frontend` (implementa o
  primitivo + fontes self-hosted), `qa` (garante que a suíte de testes cobre
  `Num` isoladamente e que a migração por lote não regride os pontos já
  migrados)
