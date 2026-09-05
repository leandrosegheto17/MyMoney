
# ADR-017: Arquitetura técnica do design system — tokens CSS via Tailwind v4 `@theme` + biblioteca de componentes React compartilhada, sem extração para pacote/monorepo/Storybook

- **Data**: 2026-09-04
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, frontend, design-system, decision-review
- **Origem**: `PRD-TECNICO.md` Adendo B (RF-RS-00, RNF-16); `CTO-REVIEW.md`,
  "Gate 1 (Nova Iniciativa — Redesign Visual 'MyMoney v2.0')", seção "Impacto em
  usuários e dados já em produção", item 2 ("Stack e design system existentes são
  o ponto de partida, não uma decisão em aberto... não haveria decisão de
  build-vs-buy nova aqui a menos que o Software Architect identifique necessidade
  real de trocar de framework de UI, o que nada no briefing sugere").
- **Relacionado**: `SDD.md` Seção 3 (stack já aprovada: React + TypeScript +
  Tailwind CSS), `UX-SPEC.md` Seção 3 ("Design System e Componentes"), ADR-018
  (estratégia de rollout incremental, decisão irmã desta).

## Context and Problem Statement

O Lote 0 do Adendo B (RF-RS-00) precisa produzir um design system "genuinamente
reutilizável para os 13 lotes seguintes, não uma solução pontual para 4 telas"
(orientação recebida). Isso exige uma decisão de arquitetura prévia a qualquer
token/componente concreto (que é trabalho do `ux-ui`): **onde e como o design
system vive tecnicamente no código**, de forma que (a) uma mudança de token se
propague de forma previsível para toda a base de código, (b) componentes
compartilhados por Grupo A e Grupo B não divirjam em implementação, e (c) o custo
de manutenção permaneça proporcional a um projeto solo sem orçamento formal
(princípio 3, `SDD.md` Seção 1).

O projeto já opera, desde o MVP, com um design system de fato, não greenfield:

- **Camada de tokens**: bloco `@theme` único em `frontend/src/index.css`,
  consumido pelo Tailwind CSS v4 (`@tailwindcss/vite`) para gerar as classes
  utilitárias (`bg-primary`, `rounded-lg`, `shadow-elevation-md`, etc.) usadas em
  toda a árvore de componentes. Já existe **precedente real em produção** de
  substituição de token em bloco sem qualquer mudança de componente: a
  "repaginada visual" de 2026-09-04 (`UX-SPEC.md` Seção 3.1) trocou a paleta
  inteira (`--color-primary`, escala neutra, radius, elevação) só editando os
  valores desse bloco — nenhum arquivo de componente foi tocado, porque todos já
  referenciam os nomes semânticos das variáveis (`bg-primary`, não `bg-[#2563eb]`).
- **Camada de componentes primitivos** (`frontend/src/components/base/*` — 14
  componentes: `Button`, `Input`, `Select`, `Card`, `Badge`, `Toast`, `Modal`,
  `Skeleton`, `EmptyState`, `Alert`, `Tabs`, `FilterBar`, `ConfirmationDialog`,
  `DatePicker`), reexportados por um único barrel (`components/base/index.ts`).
- **Camada de componentes de domínio** (`frontend/src/components/domain/*` —
  ex. `CurrencyInput`, `CategoryPicker`, `DonutChart`, `BarChart`, `ProgressBar`,
  `InstallmentProgress`, `InvoiceTimeline`, `NotificationBell`,
  `OfflineSyncBadge`, `PinPad`, `ShortcutBar`/`ShortcutChip`, `CategoryCard`,
  `BudgetCard`), que compõem os primitivos com lógica/dado específico do produto.

Ambas as camadas já são **compartilhadas por construção** entre todos os domínios
do produto (MVP, Fase 2, Pacote de Refinamento) — não existe hoje nenhuma
duplicação de biblioteca de componente por tela ou por domínio. A questão deste
ADR é se essa estrutura deve ser preservada como a base técnica do Lote 0, ou se
o volume do Grupo B (13 lotes) justifica uma reestruturação (pacote npm separado,
monorepo, Storybook dedicado).

## Decision Drivers

- Orientação explícita do CTO: stack e design system existentes são ponto de
  partida, não decisão em aberto — qualquer proposta de reescrita de stack
  exigiria necessidade técnica real, ausente aqui.
- Projeto de execução solo, sem orçamento formal (`RNF-09`, princípio 3 do
  `SDD.md`) — custo de manutenção de uma segunda ferramenta (Storybook) ou de um
  pacote publicável separado (versionamento semântico, changelog, processo de
  release) é desproporcional a uma única aplicação frontend consumidora.
  \n- Design system precisa ser reutilizável pelos 14 lotes, não redesenhado por
  lote — a estrutura precisa favorecer **um único ponto de mudança** por
  token/componente.
- Nenhuma indicação, em nenhum artefato upstream (`PRD.md`/`PRD-TECNICO.md`
  Adendo B), de um segundo consumidor do design system (ex. app nativo, outro
  produto) que justificaria extração para pacote reutilizável entre múltiplos
  projetos.

## Considered Options

1. **Preservar a estrutura vigente**: tokens em `@theme` (`frontend/src/index.css`),
   componentes em `components/base/`+`components/domain/`, dentro do mesmo
   `frontend/` — nenhuma reestruturação.
2. **Extrair para pacote npm interno** (ex. `packages/design-system`, workspace
   monorepo) consumido pelo `frontend/` via `workspace:*`.
3. **Introduzir Storybook** (ou ferramenta equivalente de catálogo de
   componentes) como camada adicional de documentação/desenvolvimento isolado
   de componente.

## Decision Outcome

**Opção 1 — Confirmar/preservar a estrutura vigente, sem reestruturação.** O
Lote 0 estende esta mesma estrutura (novos tokens no mesmo bloco `@theme`, novos
componentes/variantes nos mesmos diretórios `components/base/`/`components/domain/`),
em vez de criar uma estrutura paralela.

### Racional

- **Ponto único de mudança já existe e já foi validado em produção real**: a
  repaginada de 2026-09-04 é evidência empírica (não hipotética) de que o
  mecanismo de token único se propaga corretamente por toda a aplicação sem
  exigir mudança de componente — exatamente a propriedade que o Lote 0 precisa
  para os 13 lotes seguintes.
- **Extração para pacote (Opção 2) resolveria um problema que não existe aqui**:
  pacotes internos publicáveis se justificam quando há múltiplos consumidores
  (vários frontends, vários times) que precisam de versionamento independente.
  Este projeto tem exatamente um frontend consumidor (`frontend/`) — introduzir
  workspace/monorepo adicionaria complexidade de build (resolução de pacote,
  versionamento, possível necessidade de publicar/linkar localmente) sem nenhum
  benefício real, e sem nenhum requisito do Adendo B pedindo isso.
- **Storybook (Opção 3) é uma ferramenta de desenvolvimento isolado de
  componente, não um requisito funcional ou de arquitetura** — nenhum RF/RNF do
  Adendo B pede documentação executável de componente; `UX-SPEC.md` Seção 3 já
  cumpre o papel de catálogo textual/tabular dos componentes e seus tokens, e os
  testes já existentes (`*.test.tsx` ao lado de cada componente-base, Vitest +
  Testing Library) já cobrem o comportamento funcional/acessibilidade de cada
  componente. Adicionar Storybook agora seria uma ferramenta nova a manter
  (dependência, configuração, build separado) sem requisito que a justifique —
  contraria o princípio de custo operacional mínimo. Não é uma rejeição
  permanente: se o volume real do Grupo B revelar necessidade concreta de
  desenvolvimento/revisão de componente isolado da aplicação, isso pode ser
  reavaliado lote a lote (condição de revisão registrada em `SDD.md` Adendo B,
  Seção B.6).
- **Reutilização entre Grupo A e Grupo B é automática, não um esforço à parte**:
  como ambas as camadas (tokens e componentes) já são globais/compartilhadas por
  toda a aplicação, qualquer token ou componente-base publicado no Lote 0 já está
  disponível, sem trabalho adicional, para qualquer tela do Grupo B assim que
  ela for redesenhada — não é preciso "portar" o design system para o Grupo B
  lote a lote, só adotar o que já está lá (ver ADR-018 para o desacoplamento
  entre esta camada e a camada de composição de tela).

### Consequências

- Positivas: zero custo de infraestrutura nova; mecanismo de propagação de token
  já validado empiricamente; nenhuma curva de aprendizado nova para o único
  desenvolvedor do projeto; Grupo B herda automaticamente qualquer melhoria de
  token/componente-base publicada durante o Grupo A, mesmo antes de sua própria
  tela ser redesenhada.
- Negativas/trade-offs aceitos: sem documentação executável isolada de
  componente (mitigado por `UX-SPEC.md` Seção 3 + testes automatizados
  existentes); qualquer mudança de token/componente-base tem alcance (blast
  radius) igual a toda a aplicação, o que exige disciplina de teste de regressão
  completo a cada lote — tratado explicitamente como requisito de arquitetura no
  ADR-018 e como risco na Seção B.6 do `SDD.md` Adendo B, não ignorado.
- Recomendação não-vinculante ao `ux-ui` (decisão de conteúdo, não de
  arquitetura — RF-RS-00 nota "não decidido aqui"): dado que o mecanismo de
  substituição em bloco de token já é o padrão comprovado do projeto, estender
  valores existentes em vez de introduzir nomes de variável novos reduz a
  necessidade de tocar em `className` de componente; a escolha final entre
  substituir e estender permanece do `ux-ui`.

## Pros and Cons of the Options

### Opção 1: Preservar estrutura vigente ✅ Chosen

- ✅ Zero custo de infraestrutura nova
- ✅ Mecanismo de propagação já validado em produção
- ✅ Compartilhamento automático entre Grupo A/Grupo B
- ❌ Blast radius de uma mudança de componente-base é a aplicação inteira —
  mitigado por regressão completa a cada lote (ADR-018)

### Opção 2: Extração para pacote/monorepo interno

- ✅ Fronteira de versionamento explícita
- ❌ Resolve um problema inexistente (um único consumidor)
- ❌ Complexidade de build/tooling nova, desproporcional ao projeto
- ❌ Rejeitada

### Opção 3: Introduzir Storybook

- ✅ Catálogo de componente navegável/isolado
- ❌ Ferramenta nova a manter sem requisito que a exija
- ❌ `UX-SPEC.md` Seção 3 + testes automatizados já cobrem o papel de catálogo
- ❌ Rejeitada nesta rodada — candidata a reavaliação futura, não descartada em
  definitivo

## Links

- Origem: `PRD-TECNICO.md` Adendo B (RF-RS-00, RNF-16); `CTO-REVIEW.md` Gate 1
  desta iniciativa
- Relacionado: `SDD.md` Seção 3 (stack), `UX-SPEC.md` Seção 3, ADR-018
- Consumidores: `ux-ui` (publica tokens/componentes dentro desta estrutura),
  `frontend` (implementa), `tech-lead` (decompõe `TASK.md` por lote assumindo
  esta estrutura)
