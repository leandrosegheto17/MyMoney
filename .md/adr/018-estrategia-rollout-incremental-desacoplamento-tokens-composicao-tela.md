
# ADR-018: Estratégia de rollout incremental do redesign — desacoplamento entre camada de tokens/componentes (global, Lote 0) e camada de composição de tela (migrada lote a lote); corte direto por lote, sem feature flag nem tela antiga mantida em paralelo

- **Data**: 2026-09-04
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, frontend, rollout, decision-review
- **Origem**: `PRD-TECNICO.md` Adendo B (RNF-19 — "Estratégia de Corte em Produção
  — NÃO decidido aqui", delega explicitamente ao Software Architect; RNF-15/RN-19
  — guardrail de camada de apresentação; RNF-16 — fonte única de design system);
  `PRD.md` Adendo B, Seção B.7, pergunta 3 (preferência de manter tela antiga
  como fallback — não pôde ser validada pelo BA); `BLOCKERS.md` Bloqueio 021,
  resolução do CTO (condição vinculante: nenhuma estimativa agregada de prazo dos
  Lotes 5-13 antes de Lote 0 + 1 lote do Grupo A validados em produção).
- **Relacionado**: ADR-017 (arquitetura técnica do design system, decisão irmã
  desta), ADR-003 (PWA/web responsivo), ADR-002 (monólito modular, princípio de
  custo operacional mínimo).

## Context and Problem Statement

O redesign cobre 14 lotes (Lote 0 + Grupo A de 4 lotes + Grupo B de 9 domínios),
executados de forma solo/serial ao longo de um período extenso — o próprio CTO
recusou-se a validar qualquer estimativa aritmética de prazo agregado para o
Grupo B antes de pelo menos Lote 0 + 1 lote do Grupo A estarem em produção. Isso
significa, na prática, que **o produto vai operar por um tempo real
não-trivial — potencialmente vários meses — com uma parte das telas já
redesenhadas (Grupo A, conforme cada lote for concluído) e a maioria ainda no
padrão visual anterior (Grupo B, ainda não iniciado)**, com 1 usuário real
dependendo do produto no dia a dia durante toda essa janela (mesma classe de
risco de continuidade que já motivou `ADR-004`/`ADR-009`, RPO/backup).

A pergunta arquitetural central deste ADR: como uma mesma sessão de usuário pode
navegar entre uma tela já redesenhada (ex. Dashboard, Lote 1) e uma tela ainda
não tocada (ex. Configurações, Lote 13) sem que isso pareça "dois produtos
brigando entre si" — dado que os dois RFs (RF-RS-01..04) e o inventário do Grupo
B (`PRD-TECNICO.md` Adendo B, Seção B.1.2) confirmam que **nenhuma mudança de
dado/comportamento acontece**, só a camada visual.

Duas subdecisões compõem este ADR: (1) qual mecanismo técnico evita a divergência
visual "brigando" dentro da mesma sessão; (2) qual estratégia de corte em
produção (RNF-19) é usada a cada lote.

## Decision Drivers

- RNF-19 (delegado a este agente): a transição não pode degradar a continuidade
  de uso do produto em produção real.
- RNF-15/RN-19: nenhuma mudança de regra de negócio/dado decorre do redesign, em
  nenhum lote — logo, qualquer mecanismo de corte que dependa de duplicar lógica
  de negócio (ex. dois caminhos de API) estaria resolvendo um problema que não
  existe e introduzindo risco que RN-19 proíbe.
- RNF-16: nenhuma tela redesenhada deve conviver, deliberadamente, com o
  conjunto de tokens anterior — mas o produto inteiro, durante a transição,
  necessariamente terá screens em dois "estágios de composição" diferentes.
- Princípio 3 do `SDD.md` (custo operacional mínimo) e a Declaração de
  capacidade do CTO (execução solo/serial) — qualquer mecanismo de corte que
  exija manter duas implementações completas da mesma tela simultaneamente
  (dual-tree) tem custo de manutenção que se paga a cada lote, por muitos lotes,
  incompatível com a capacidade real do projeto.
- Pergunta 3 do BA (`PRD-TECNICO.md` Adendo B, Seção B.6.2) segue sem resposta do
  stakeholder sobre manter tela antiga como fallback — decisão delegada a este
  agente por RNF-19 na ausência de resposta, não uma omissão.

## Considered Options

### Subdecisão 1 — Mecanismo que evita divergência visual dentro da mesma sessão

- **A1. Camada única, global, compartilhada** (ADR-017): tokens (`@theme`) e
  componentes-base/domínio são globais e atualizados in-place; a composição de
  cada tela (JSX/layout específico da página) é o único artefato migrado lote a
  lote.
- **A2. Fork visual temporário**: manter uma segunda árvore de tokens/componentes
  ("v2") coexistindo com a v1 durante toda a transição, cada tela escolhendo
  explicitamente qual árvore usar.
- **A3. Feature flag de tema**: alternar entre tema antigo/novo por flag de
  runtime, afetando toda a aplicação de uma vez (all-or-nothing) até o fim da
  transição.

### Subdecisão 2 — Estratégia de corte por lote (RNF-19)

- **B1. Corte direto por lote**: cada lote substitui a tela em um único PR
  mergeado em `main`, publicado pelo pipeline de CI/CD já existente (Vercel/CDN,
  `SDD.md` Seção 3), sem manter a versão anterior acessível.
- **B2. Feature flag por tela**: cada tela redesenhada fica atrás de uma flag
  (ex. querystring, config remota), permitindo alternar entre versão antiga e
  nova em produção sem novo deploy.
- **B3. Rota paralela**: tela redesenhada publicada em uma rota nova
  (ex. `/v2/dashboard`), convivendo com a rota antiga até uma decisão explícita
  de desativar a antiga.

## Decision Outcome

**Subdecisão 1: A1 — camada única global (confirma ADR-017), com desacoplamento
explícito entre "camada de design system" (tokens + componentes-base/domínio,
global) e "camada de composição de tela" (JSX específico de cada página,
migrado lote a lote).**

Esse desacoplamento é a resposta técnica direta à pergunta central deste ADR:

1. **Tokens e componentes-base/domínio são globais e atualizados in-place**
   (mesmo mecanismo do ADR-017). No instante em que o Lote 0 publica uma nova
   versão de `--color-primary`, `Button`, `Card`, `Input`, etc., **toda tela da
   aplicação — inclusive as 9 do Grupo B, ainda não redesenhadas —
   automaticamente herda a nova cor/tipografia/raio/sombra e o novo
   comportamento visual desses componentes**, sem esperar seu próprio lote. Isso
   elimina, desde o Lote 0, a divergência mais visível e mais barata de
   corrigir (paleta, espaçamento base, aparência de botão/campo/card), em toda a
   aplicação simultaneamente.
2. **O que de fato é migrado lote a lote é a composição específica de cada
   tela** — a disposição de blocos, o padrão de layout (grade vs. lista vs.
   card), a hierarquia visual particular daquela tela (ex. o grid multi-coluna
   do Dashboard, RF-RS-01; os cards de categoria, RF-RS-04). Uma tela do Grupo B
   ainda não migrada continua com sua composição atual (ex. Padrão A de lista
   simples em `SettingsPage.tsx`), mas já renderizada com os componentes-base e
   tokens atualizados do Lote 0 — não com a paleta/tipografia antiga.
3. **Consequência arquitetural explícita**: durante toda a janela de transição
   (potencialmente vários meses, dado o sequenciamento solo/serial), o produto
   não terá "duas linguagens visuais" coexistindo na mesma sessão no sentido
   forte (dois sistemas de token, dois `Button` diferentes) — terá, sim, telas
   com **composição/layout ainda não atualizado** rodando sobre um **sistema de
   token/componente já unificado**. Essa é uma característica normal e aceita de
   rollout incremental de design system (desacoplar token/componente de
   composição de página), não um estado de erro a esconder — registrado
   explicitamente como dívida técnica de transição em `SDD.md` Adendo B,
   Seção B.6.2, com sua própria condição de encerramento (lote correspondente
   concluído).
4. **Nenhuma "brigar" entre dois idiomas visuais incompatíveis**: como a
   camada de token/componente é sempre uma só (nunca duas em paralelo — A2 e A3
   descartadas), o pior caso possível é "esta tela ainda usa um layout antigo",
   nunca "esta tela usa cores/componentes incompatíveis com aquela" — risco
   qualitativamente menor, mitigado desde o Lote 0.

**Subdecisão 2: B1 — corte direto por lote, um PR por tela redesenhada, deploy
via pipeline já existente, sem feature flag e sem rota paralela.**

### Racional da Subdecisão 2

- **RN-19/RNF-15 já garantem que não há mudança de comportamento/dado a
  reverter** — o único risco de um corte direto é puramente visual/de
  regressão de UI, coberto por N3 (WCAG, RNF-17) e N4 (suíte de testes, RNF-18)
  como condição de "lote pronto" (`FL-09`, já formalizado pelo BA) **antes** do
  merge, não depois. Diferente de uma mudança de regra de negócio (onde um
  rollback rápido é crítico por risco de dado incorreto), um redesign revertido
  não deixa rastro de dado corrompido — reforça que o mecanismo de reversão
  padrão do projeto (`git revert` + redeploy imediato via CI/CD já existente,
  Vercel) é suficiente como "rede de segurança", sem precisar de um mecanismo de
  toggle em produção dedicado.
- **B2 (feature flag) e B3 (rota paralela) exigem manter duas implementações
  completas da mesma tela simultaneamente** (o componente antigo E o novo,
  ambos compiláveis e roteáveis) até a flag ser removida/a rota antiga
  desativada — isso é exatamente o tipo de dual-tree que a Subdecisão 1 evita na
  camada de design system, reintroduzido na camada de página se adotado aqui.
  Para um projeto solo/serial de 14 lotes, isso significaria carregar código
  morto por lote, por potencialmente meses, sem que nenhum requisito (RNF-19
  pede apenas "não degradar continuidade", não "permitir alternância em
  produção") exija esse custo.
- **Resposta à pergunta 3 do BA (manter tela antiga como fallback)**: não
  adotada como padrão, por decisão deste ADR — o `git revert` + redeploy via
  CDN (minutos, não horas, dado o pipeline já existente e a ausência de
  migration de dado associada) cumpre a mesma função de "voltar atrás
  rapidamente" sem o custo permanente de manter duas árvores de UI. Se o
  stakeholder, ao ser consultado pelo PM, expressar preferência explícita e
  forte por um mecanismo de alternância em produção (ex. para comparar as duas
  versões lado a lado antes de decidir), isso é tratado como novo requisito a
  formalizar (RNF-19 revisitada), não uma mudança silenciosa deste ADR.
- **Proporcional à Declaração de capacidade do CTO**: corte direto por lote é o
  mecanismo de menor custo operacional recorrente, coerente com "esforço
  decorrido tende ao somatório" — qualquer custo fixo por lote (manter toggle,
  manter rota dupla) se multiplica por 14, o que o CTO já sinalizou como
  desproporcional ao recusar validar extrapolação aritmética ingênua de prazo.

### Requisito de arquitetura decorrente, não opcional: regressão completa a cada lote

Como consequência direta da Subdecisão 1 (componentes-base/domínio são globais e
compartilhados por todos os domínios, não só pelo lote em execução), **qualquer
mudança de componente-base/token tem alcance igual à aplicação inteira, mesmo
quando o lote em execução visa apenas uma tela**. RNF-18 já exige "suíte de
testes existente reexecutada sem novas falhas" por lote — este ADR torna
explícito que essa reexecução **não pode ser escopada só às telas do lote
corrente**: deve cobrir toda a suíte (todos os domínios, Grupo A e Grupo B, migrados
ou não), precisamente porque uma tela do Grupo B ainda não migrada já consome os
mesmos componentes-base que o lote está alterando. Isso não é uma mudança de
RNF-18 (que já pedia "suíte de testes existente", sem escopo reduzido) — é uma
clarificação de por que esse critério, especificamente neste redesign, não
admite interpretação de "só testar o que o lote tocou" (ver risco correspondente
em `SDD.md` Adendo B, Seção B.6.1).

## Pros and Cons of the Options

### A1: Camada única global + composição migrada lote a lote ✅ Chosen

- ✅ Elimina divergência de token/componente em toda a aplicação desde o Lote 0
- ✅ Zero manutenção de árvore paralela de design system
- ✅ Consistente com o mecanismo já validado em produção (repaginada de
  2026-09-04, ver ADR-017)
- ❌ Composição de página (layout) ainda diverge até cada lote — aceito como
  dívida de transição, não como falha

### A2: Fork visual temporário / A3: Feature flag de tema

- ❌ Duas árvores de design system a manter simultaneamente por potencialmente
  meses
- ❌ Nenhum requisito pede alternância em produção do sistema de tokens inteiro
- ❌ Rejeitadas

### B1: Corte direto por lote ✅ Chosen

- ✅ Custo operacional mínimo, alinhado à capacidade solo/serial
- ✅ Mecanismo de reversão (`git revert` + redeploy) já existente e suficiente,
  dado que nenhuma mudança de dado/comportamento acompanha o redesign (RN-19)
- ❌ Sem alternância em produção pós-deploy — aceito, sem requisito que a exija

### B2: Feature flag por tela / B3: Rota paralela

- ✅ Permitiria comparação lado a lado ou rollback instantâneo sem novo deploy
- ❌ Custo fixo de manutenção por lote, multiplicado por 14
- ❌ Reintroduz dual-tree exatamente onde a Subdecisão 1 o eliminou
- ❌ Rejeitadas nesta rodada — candidatas a reavaliação pontual só se o
  stakeholder expressar essa preferência explicitamente (pergunta 3 do BA)

## Links

- Origem: `PRD-TECNICO.md` Adendo B (RNF-19, RNF-15, RNF-16, RN-19); `PRD.md`
  Adendo B Seção B.7 pergunta 3; `BLOCKERS.md` Bloqueio 021 (resolução do CTO)
- Relacionado: ADR-017, ADR-003, ADR-002, ADR-004/ADR-009 (RPO/RTO — mesma
  classe de risco de continuidade em produção real)
- Consumidores: `ux-ui` (aplica o desacoplamento token/composição ao publicar
  cada lote), `tech-lead` (decompõe `TASK.md` assumindo corte direto por lote,
  sem orçar mecanismo de flag), `frontend` (implementa), `qa` (garante suíte
  completa, não escopada, a cada lote, conforme "Requisito de arquitetura
  decorrente" acima)
