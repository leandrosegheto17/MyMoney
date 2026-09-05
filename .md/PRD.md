# PRD.md

**Dono**: PM (Product Manager)
**Data**: 2026-09-02
**Gate de entrada**: `CTO-REVIEW.md` — Gate 1 (Pré-descoberta), veredito **Aprovado com
ressalvas** em 2026-09-02.
**Fonte de negócio**: briefing verbatim do stakeholder (único artefato de negócio
existente; não há `VISAO-PRODUTO.md` separado — Seções 1-3 abaixo absorvem esse papel,
conforme `PIPELINE-CONVENTIONS.md` §1, notas de consolidação).
**Consumidor imediato**: `business-analyst` (aprofunda em requisitos detalhados a
partir da Seção 5 deste documento e das perguntas da Seção 7).

As 4 ressalvas do Gate 1 foram carregadas explicitamente neste documento:
1. Hipótese de orçamento/prazo declarada + escopo faseado (MVP/Fase 2/Fase 3) — ver
   Seções 3, 4 e 5.
2. Confirmação humana antes de salvar lançamento capturado por voz/foto registrada
   como requisito não-funcional obrigatório — ver Seção 4 (Fase 3) e Seção 5.
3. Decisão de Open Finance direto vs. agregador terceirizado e web responsivo/PWA vs.
   app nativo permanecem em aberto para o Software Architect (`SDD.md`) — não são
   decididas aqui; registradas como premissa em Seção 6.
4. Nenhum gap de roster — nada a tratar neste documento.

---

## 1. Problema e Contexto

**Problema observável hoje**: o controle financeiro pessoal do stakeholder é feito
inteiramente em planilha manual. Isso já produz consequências verificáveis relatadas
pelo próprio stakeholder: perda de controle sobre saldo consolidado entre contas
(corrente, poupança, carteira, investimentos), ausência de visão prévia da fatura de
cartão de crédito (parcelas e recorrências futuras não projetadas), e alto esforço
manual para manter cada lançamento (entrada/saída) atualizado — esforço apontado
literalmente como "o maior problema hoje".

**Contexto do projeto** (herdado do Gate 1, `CTO-REVIEW.md`):
- Projeto pessoal, sem empresa ou time formal por trás.
- Usuário único: o próprio stakeholder que encomendou o projeto — não há outros
  titulares de dados envolvidos.
- Sem orçamento ou prazo formalmente declarados. Hipótese adotada pelo PM (a validar
  com o stakeholder, ver Seção 6): entrega incremental por fase, sem data-alvo fixa,
  priorizando stack e serviços de baixo/nenhum custo (free-tier), dado o contexto de
  projeto pessoal sem orçamento declarado.
- Este é o primeiro projeto tratado por este pipeline de agentes — não existe roadmap
  prévio para comparar; esta iniciativa é o roadmap inaugural.

**Hipótese de valor**: Se o app centralizar contas, formas de pagamento e
categorização (com subcategorias) em um único lugar, com dashboard visual de saldo e
fluxo do mês e orçamento por categoria, então o stakeholder abandona a planilha
manual e recupera visibilidade e capacidade de decisão sobre suas finanças, porque a
dispersão de informação e o esforço manual da planilha são a causa direta da perda de
controle relatada — e cada fase seguinte (automação de captura, projeção de fatura,
metas) reduz progressivamente o esforço manual restante, sem o qual o abandono da
planilha não se sustenta no longo prazo.

## 2. Público-Alvo

Usuário único e nomeado: **o próprio stakeholder que encomendou o projeto**, na
função de gestor de suas próprias finanças pessoais. Não é "todos os usuários" —
é uma única pessoa física, com o seguinte perfil observável no briefing:
- Hoje usa planilha (Excel/Google Sheets) como ferramenta de controle financeiro.
- Movimenta múltiplas contas (corrente, poupança, carteira, investimentos) e formas
  de pagamento (Pix, débito, crédito, boleto, dinheiro).
- Tem cartão de crédito com compras parceladas e assinaturas recorrentes.
- Tem contas fixas mensais (aluguel, internet) com vencimento.
- Quer acessar o controle tanto em desktop (web) quanto em uso confortável no celular.
- Trata dados financeiros como sensíveis e espera padrão de segurança de produção
  (login forte, criptografia) mesmo sendo o único usuário.

Não há personas adicionais nesta iniciativa — qualquer expansão futura para
multi-usuário (ex.: uso compartilhado com cônjuge) está fora do escopo atual (ver
Seção 4) e, se vier a ser necessária, exige nova rodada de definição de público-alvo.

## 3. Objetivo de Sucesso

Duas métricas mensuráveis, amarradas ao problema da Seção 1. Nenhuma é "melhorar a
experiência do usuário" — ambas têm meta numérica e horizonte de medição.

| # | Métrica | Baseline | Meta | Quando medir |
|---|---|---|---|---|
| M1 (norte) | % de meses em que o controle financeiro do stakeholder ocorre inteiramente no app (zero uso da planilha) | 0% (hoje 100% do controle é feito na planilha, conforme briefing) | 100% de aderência ao app por 2 meses consecutivos após o lançamento do MVP | A partir do 1º mês completo pós-MVP |
| M2 (automação) | % dos lançamentos mensais registrados sem digitação manual campo a campo (via voz, foto ou importação) | 0% (nenhuma automação existe antes da Fase 3) | ≥ 70% dos lançamentos do mês entrando via voz/foto/importação | Ao final da Fase 3 |

**Baseline de M1 e M2 depende de um número que o briefing não fornece**: o volume
médio de lançamentos mensais do stakeholder hoje na planilha. Sem esse número, M2 não
pode ser expressa também em valor absoluto (hoje só em %). Marcado explicitamente
como **"a levantar junto ao stakeholder"** — registrado como pergunta em aberto
(Seção 7) e como risco de produto com dono e prazo (Seção 6). Não foi inventado um
número para não violar o critério de "métrica mensurável e verificável".

**Fora desta seção, por não ser objetivo de produto e sim expectativa de NFR**: a
exigência do stakeholder de "não posso perder lançamento nem ter o app fora do ar" é
real e será cobrada, mas definir a meta técnica (ex.: % de disponibilidade, estratégia
de backup) é decisão do Software Architect, não do PM — registrada como risco de
produto a formalizar tecnicamente no Gate 2 (Seção 6).

## 4. Escopo desta Release (dentro / fora)

Escopo tratado como **iniciativa faseada**, não uma release única — conforme ressalva
1 do Gate 1. "Dentro" cobre as 3 fases (MVP, Fase 2, Fase 3); "fora" são itens
excluídos indefinidamente desta iniciativa, com justificativa.

### Dentro — MVP (Fase 1)

Critério de corte: só entra no MVP o que é (a) pré-requisito estrutural para tudo o
resto (cadastro de contas/formas de pagamento/categorização/lançamento manual — sem
isso não existe produto) ou (b) ataca diretamente a métrica M1 (abandono da planilha)
sem depender de nenhuma automação ainda não construída, ou (c) é requisito de
segurança de linha de base (não "extra", conforme Gate 1).

- Cadastro de contas (corrente, poupança, carteira, investimentos)
- Cadastro de formas de pagamento (Pix, débito, crédito, boleto, dinheiro)
- Categorização de lançamentos com subcategorias
- Lançamento manual de transações (entrada/saída) — base sobre a qual toda automação
  futura (Fase 3) vai atuar
- Dashboard inicial: saldo total, entradas/saídas do mês, para onde o dinheiro está
  indo, com gráficos (não só números)
- Orçamento por categoria por mês, com alerta ao se aproximar do teto
- Login seguro (biometria/PIN) e criptografia de dados em repouso — requisito de
  linha de base, não opcional, mesmo em uso pessoal (herdado do Gate 1)
- NFR: confiabilidade de persistência (não perder lançamento) — meta técnica concreta
  fica a cargo do Software Architect (ver Seção 6), mas a exigência de produto entra
  já no MVP, não é algo a adiar

### Dentro — Fase 2

Critério de corte: funcionalidades que reduzem trabalho manual **recorrente**
(recorrência/parcelamento) e de **planejamento** (contas fixas, metas, cartão), todas
dependentes apenas do que já existe no MVP — não dependem de nenhuma decisão de
provedor terceiro (voz/OCR/Open Finance) ainda em aberto.

- Gastos recorrentes (assinaturas) lançados automaticamente mês a mês
- Gastos parcelados no cartão, lançados automaticamente mês a mês
- Cadastro de cartão de crédito (limite, fechamento, vencimento) — pré-requisito da
  fatura projetada abaixo
- Fatura de cartão projetada, com parcelas e recorrências futuras já previstas
  (depende dos 3 itens anteriores desta fase)
- Contas fixas com vencimento e aviso antes de vencer
- Metas (ex.: "Reserva de Emergência") com acompanhamento de progresso
- Notificações (infraestrutura compartilhada pelos dois itens acima: orçamento perto
  de estourar e conta fixa perto de vencer)
- Relatório comparativo de entradas vs. saídas mês a mês (extensão do dashboard do
  MVP, não uma nova frente de risco)

### Dentro — Fase 3

Critério de corte: tudo que depende de decisão de **build vs. buy** com provedor
terceiro (STT, OCR, agregador de Open Finance) ainda não tomada — decisão do
Software Architect, revisada pelo CTO no Gate 2 — e por isso não pode ser dimensionado
com confiança suficiente para entrar antes.

- Captura de lançamento por voz (NLP) — **com confirmação humana obrigatória antes de
  salvar** (ver NFR obrigatório abaixo)
- Captura de lançamento por foto/OCR de recibo/nota fiscal — **com confirmação humana
  obrigatória antes de salvar** (mesmo NFR)
- Importação de extrato bancário (OFX/CSV)
- Integração com Open Finance (direto ou via agregador terceirizado — decisão técnica
  do Software Architect/CTO no Gate 2)
- Relatório de evolução patrimonial ao longo do tempo
- Exportação de relatórios em PDF/CSV

**NFR obrigatório desta fase (ressalva 2 do Gate 1, não-negociável)**: nenhum
lançamento capturado por voz ou por foto é salvo automaticamente sem confirmação
explícita do stakeholder antes da gravação. Isso é requisito não-funcional de
produto, não detalhe de UX opcional — o Business Analyst detalha o fluxo exato de
confirmação (Seção 7, pergunta 6), mas a exigência em si não é negociável nesta fase.

### Fora do escopo desta iniciativa (indefinidamente, com justificativa)

- **Multi-usuário / compartilhamento familiar** (ex.: uso conjunto com cônjuge): o
  briefing e o Gate 1 definem usuário único; suportar múltiplos titulares muda modelo
  de dados e autenticação de forma não trivial. Corte: revisitar só se o stakeholder
  declarar essa necessidade explicitamente (ver premissa em Seção 6).
- **App nativo para loja (iOS/Android)**: o briefing pede "web, com uso confortável
  também no celular", que sugere web responsivo/PWA como primeira hipótese. Decisão
  final é do Software Architect no `SDD.md` (ressalva 3 do Gate 1) — não decidida
  aqui. Corte: não impedir, apenas não assumir nativo por padrão.
- **Gestão avançada de investimentos** (cotações em tempo real, corretora,
  rebalanceamento de carteira): o briefing menciona "investimentos" apenas como um
  tipo de conta a cadastrar (saldo), não como uma plataforma de gestão de
  investimentos. Corte: fora de escopo; o app trata investimento como conta com
  saldo, não como produto de analytics de mercado.
- **Consultoria financeira automatizada / recomendações por IA** (ex.: sugestões
  personalizadas de economia): não solicitado pelo stakeholder em nenhum momento do
  briefing. Corte: fora de escopo, para não expandir a iniciativa além do que foi
  pedido.
- **Suporte a múltiplas moedas**: não solicitado; assume-se BRL como única moeda em
  todas as fases. Corte: reavaliar apenas se o stakeholder declarar necessidade.

## 5. Requisitos de Alto Nível Priorizados

**Framework usado**: MoSCoW para separar o corte MVP (Must) do restante, complementado
por RICE (via `product-roadmap-prioritization`) para sequenciar os itens de Fase 2 e
Fase 3 entre si — justificado porque há 14 candidatos concorrentes por essas duas
fases (acima do limiar de ~5 que aciona RICE conforme `scope-prioritization`).

**Adaptação de RICE para usuário único**: a dimensão *Reach* clássica ("quantos
usuários por período") não diferencia nada num produto de usuário único — foi
substituída por **frequência de uso esperada** (quantas vezes por mês a
funcionalidade entrega valor observável ao stakeholder), estimativa arredondada do
PM, não medição real. *Effort* é estimativa relativa do PM (1 = pequeno, 5 = muito
grande), **não validada pela engenharia** — o Software Architect/Tech Lead podem
revisar; se o esforço real divergir muito, o sequenciamento entre Fase 2 e Fase 3 pode
ser reavaliado, mas o corte de fase em si (dependência de decisão de provedor
terceiro) não muda com a revisão de esforço.

### MVP — Must have (MoSCoW), sem RICE (não são itens concorrentes entre si — são
pré-requisitos estruturais ou requisitos de linha de base)

| Item | Amarrado a | Justificativa |
|---|---|---|
| Cadastro de contas e formas de pagamento | M1 | Sem isso não há o que categorizar nem exibir no dashboard |
| Categorização com subcategorias | M1 | Base para "para onde o dinheiro está indo" no dashboard |
| Lançamento manual | M1, M2 | Pré-requisito funcional de toda automação futura (Fase 3) |
| Dashboard (saldo, entradas/saídas, gráficos) | M1 | É a resposta direta a "perco o controle" |
| Orçamento por categoria + alerta | M1 | Item de planejamento com maior RICE score entre todos os candidatos avaliados (9,6 — ver tabela Fase 2/3 abaixo para comparação), por isso adiantado para o MVP mesmo dependendo só do lançamento manual |
| Login seguro + criptografia em repouso | Nenhuma métrica de produto diretamente, mas requisito de linha de base (Gate 1) | Dado explícito do Gate 1: segurança não é "extra" em dado financeiro sensível, mesmo de usuário único |

### Fase 2 e Fase 3 — RICE (Should/Could, MoSCoW), matemática visível

`Score = (Frequência de uso × Impacto × Confiança) / Esforço`. Impacto em escala
3/2/1/0,5/0,25 (massivo/alto/médio/baixo/mínimo); Confiança em 100%/80%/50%/30%
(30% usado quando a incerteza é regulatória/de provedor externo, abaixo da escala
padrão de RICE, com essa ressalva explícita).

| Item | Fase (dependência) | Freq./mês | Impacto | Confiança | Esforço | Score |
|---|---|---|---|---|---|---|
| Contas fixas + lembrete | 2 | 6 | 2 | 80% | 1 | 9,6 |
| Parcelamento no cartão | 2 | 10 | 2 | 80% | 2 | 8,0 |
| Relatório entradas vs. saídas mês a mês | 2 | 4 | 2 | 80% | 1 | 6,4 |
| Recorrência (assinaturas) | 2 | 5 | 2 | 80% | 2 | 4,0 |
| Metas com progresso | 2 | 4 | 1 | 80% | 1 | 3,2 |
| Cadastro de cartão (limite/fechamento/vencimento) | 2 (pré-req. de fatura projetada) | 2 | 1 | 100% | 1 | 2,0 |
| Fatura projetada | 2 (depende de cadastro cartão + parcelamento + recorrência) | 4 | 2 | 50% | 3 | 1,33 |
| Captura por voz (NLP) | 3 (depende de build-vs-buy Gate 2) | 30 | 3 | 50% | 3 | 15,0 |
| Integração Open Finance | 3 (depende de build-vs-buy Gate 2) | 30 | 3 | 30% | 5 | 5,4 |
| Captura por foto/OCR | 3 (depende de build-vs-buy Gate 2) | 15 | 2 | 50% | 3 | 5,0 |
| Importação OFX/CSV | 3 | 2 | 2 | 50% | 2 | 1,0 |
| Relatório de evolução patrimonial | 3 | 2 | 1 | 80% | 2 | 0,8 |
| Exportação PDF/CSV | 3 | 1 | 0,5 | 80% | 1 | 0,4 |

**Nota importante sobre a Fase 3**: Captura por voz tem o maior score RICE da tabela
(15,0) — maior até que vários itens de Fase 2. Isso **não** move voz para a Fase 2. O
motivo não é de priorização de valor, é de dependência real e decisão ainda não
tomada: voz/foto/Open Finance dependem de uma decisão de build vs. buy de provedor
terceiro que só o Software Architect resolve, revisada pelo CTO no Gate 2
(`build-vs-buy-analysis`) — sequenciar antes disso seria assumir um contrato técnico
que ainda não existe. Dentro da própria Fase 3, porém, o score confirma a ordem
sugerida pelo Gate 1: voz primeiro, depois OCR, depois OFX/Open Finance/relatórios
avançados/exportação.

**Dependências respeitadas no sequenciamento**: cadastro de cartão → fatura projetada
(a fatura não existe sem o cadastro); parcelamento + recorrência → fatura projetada
(a fatura projeta parcelas e recorrências futuras); lançamento manual (MVP) →
qualquer automação de captura (Fase 3) — a automação substitui um fluxo que precisa
existir primeiro.

## 6. Premissas e Riscos de Produto

| # | Premissa/Risco | Impacto se falsa/concretizado | Severidade | Dono | Prazo de validação |
|---|---|---|---|---|---|
| 1 | Volume médio de lançamentos mensais do stakeholder hoje (baseline de M2) não foi informado no briefing | M2 fica sem baseline quantitativo, só percentual; dificulta medir progresso real da automação | Média | PM (com o stakeholder) | Antes do Business Analyst iniciar o detalhamento (imediato) |
| 2 | Stakeholder aceita lançar manualmente todos os registros durante MVP e Fase 2, antes de qualquer automação existir na Fase 3, sem abandonar o app por fricção | Se falsa, adoção falha antes da automação chegar, invalidando M1 | Alta | PM (validar tolerância do stakeholder ao esforço manual do MVP) | Antes de liberar o MVP para desenvolvimento (checagem qualitativa com o stakeholder) |
| 3 | Premissa de "usuário único" se mantém verdadeira por toda a iniciativa (MVP a Fase 3) | Se mudar (ex.: uso compartilhado com cônjuge), todo o corte "fora de escopo" de multi-usuário (Seção 4) precisa ser revisitado, com impacto em modelo de dados/autenticação | Média | Stakeholder (avisar o PM se a necessidade mudar) | Revisitar no início de cada fase (MVP, Fase 2, Fase 3) |
| 4 | Expectativa de confiabilidade de produção ("não perder lançamento, não ficar fora do ar") é declarada qualitativamente pelo stakeholder, sem meta técnica formal (SLA, estratégia de backup) ainda definida | Expectativa do stakeholder pode ficar desalinhada com o que um projeto pessoal sem orçamento formal consegue entregar | Alta | Software Architect (formalizar NFR concreta no `SDD.md`), validado pelo CTO | Até o Gate 2 |
| 5 | Automação por voz e foto depende de provedor terceiro (STT/OCR) ainda não escolhido; decisão de build vs. buy pode alterar custo (mesmo em free-tier) e esforço real da Fase 3 | Estimativa de esforço/score RICE da Fase 3 (Seção 5) pode mudar após a decisão técnica | Média | Software Architect/CTO (`build-vs-buy-analysis`, Gate 2) | Até o Gate 2, antes do BA detalhar requisitos de voz/foto |
| 6 | Open Finance direto exige certificação regulatória (BACEN); via agregador terceirizado pode ter custo mensal incompatível com "sem orçamento formal declarado" | Item de maior custo potencial da Fase 3 pode precisar ser adiado ou cortado após a decisão técnica | Alta | CTO/Software Architect (Gate 2) | Até o Gate 2, antes do BA detalhar requisitos de Open Finance |
| 7 | Autenticação biométrica/PIN e criptografia são aceitas pelo stakeholder mesmo sendo usuário único (sem terceiros como titulares de dados envolvidos) | Se a exigência regulatória real for menor que a assumida, pode haver sobre-engenharia de segurança para um projeto sem orçamento declarado; se for maior, pode faltar cobertura | Média | PM + CTO (`risk-and-compliance-check`, Gate 2) | Até o Gate 2 |
| 8 | Ausência de orçamento/prazo formal (Gate 1): hipótese adotada pelo PM é "sem data-alvo fixa, priorizando stack de baixo/nenhum custo" (Seção 1) | Se o stakeholder tiver uma expectativa de prazo não declarada, o faseamento proposto (Seção 4/5) pode não atender essa expectativa | Média | PM (registrar hipótese) + Stakeholder (confirmar ou corrigir) | Antes do Business Analyst iniciar o detalhamento; revalidar a cada início de fase |

## 7. Perguntas em Aberto para o Business Analyst

Perguntas que exigem elicitação direta com o stakeholder (`requirement-elicitation`) e
detalhamento de regra de negócio — não lacunas que o PM deveria ter fechado aqui:

1. Qual é o volume médio de lançamentos mensais do stakeholder hoje na planilha
   (baseline quantitativo de M2, Seção 3)?
2. Quais categorias e subcategorias específicas o stakeholder já usa na planilha
   atual? (para mapear a categorização do MVP sem obrigar recomeço do zero)
3. Regra de negócio de fechamento de cartão: um lançamento que ocorre depois do
   fechamento da fatura entra na fatura atual ou na próxima? Isso precisa ser
   confirmado com o stakeholder antes de detalhar a fatura projetada (Fase 2).
4. Quando um gasto recorrente muda de valor (ex.: reajuste anual de assinatura), o
   sistema deve pedir confirmação do stakeholder antes de atualizar o valor lançado
   automaticamente, ou atualizar direto? (regra de negócio de recorrência, Fase 2)
5. Qual o formato exato esperado de exportação (campos do CSV, layout do PDF) para os
   relatórios da Fase 3?
6. Qual o fluxo exato de confirmação humana antes de salvar lançamentos capturados
   por voz/foto (Fase 3) — edição inline do campo interpretado antes de confirmar,
   ou tela de revisão separada? O requisito de confirmação em si é obrigatório e
   não-negociável (Seção 4); o desenho do fluxo cabe ao BA detalhar (e depois ao
   UX/UI especificar).

---

### Stakeholder Alignment Check

Checklist comparado item a item contra `CTO-REVIEW.md` Gate 1:

- **Objetivo de negócio**: igual ao avaliado no Gate 1 — substituir a planilha,
  reduzir lançamento manual, dar visibilidade e capacidade de planejamento. Sem
  divergência.
- **Público-alvo e escopo**: usuário único mantido; escopo faseado (MVP/Fase 2/
  Fase 3) segue de perto a sugestão do Gate 1, com ajustes justificados (orçamento
  adiantado para o MVP por RICE; relatório comparativo mês a mês adiantado para a
  Fase 2 por proximidade de dependência com o dashboard). Sem divergência que
  contradiga o que foi aprovado.
- **Orçamento/prazo**: hipótese informal declarada explicitamente na Seção 1 e
  registrada como premissa a validar na Seção 6, conforme exigido pela ressalva 1 do
  Gate 1. Sem contradição.
- **Gap de roster**: nenhum papel novo foi identificado como necessário durante este
  levantamento. Consistente com a observação 4 do Gate 1.

**Resultado: sem divergência não resolvida em relação ao Gate 1.** `PRD.md` liberado
para o Business Analyst em 2026-09-02.

---

# Adendo A — Pacote de Refinamento de Produção ("Fase 2.1 — Melhorias Contínuas")

**Dono**: PM (Product Manager)
**Data**: 2026-09-04
**Natureza**: **adendo** ao `PRD.md` original — não reescreve nem invalida nenhuma
seção anterior (Seções 1-7 acima seguem vigentes para MVP/Fase 2/Fase 3). Este
adendo cobre uma rodada de escopo nova, levantada a partir de uso real do produto
já em produção (`https://mymoney-lsm.vercel.app`), sem competir com o faseamento
já aprovado — é trabalho de refinamento contínuo, não uma nova fase numerada do
roadmap original.
**Gate de entrada**: `CTO-REVIEW.md`, seção "Gate 1 — Pré-descoberta (Pacote de
Refinamento: Dashboard/Lançamentos/Formas de Pagamento/Categorias/Orçamento) —
2026-09-04", veredito **Aprovado com ressalvas**.
**Fonte de negócio**: briefing verbatim do dono do produto (6 pontos de melhoria),
avaliado pelo CTO no gate acima; referência visual externa
(`github.com/leandrosegheto17/FinancialControl`) tratada como inspiração de
layout, não escopo funcional.
**Consumidor imediato**: `business-analyst` (aprofunda a partir da Seção A.5 e das
perguntas da Seção A.7 deste adendo).

As 5 ressalvas do Gate 1 desta rodada foram carregadas explicitamente:
1. Itens 1, 2, 5, 6 tratados como refinamento visual de baixo risco, reaproveitando
   as convenções de responsividade já formalizadas em `UX-SPEC.md` (2026-09-04) —
   ver Seção A.4.
2. Item 3: regra de negócio fechada com precisão testável nesta seção (Seção A.5) —
   critério de "mais usadas recentemente", algoritmo de forma de pagamento
   associada, desempate, pré-preenchimento e fallback de conta nova, todos
   definidos abaixo.
3. Item 4: definição de **produto** (regra de nomenclatura de exibição) fechada
   nesta seção (Seção A.5) — a decisão de **arquitetura** (ADR completo) segue
   pendente do Software Architect, com as 3 condições de aceite do Gate 1
   preservadas como pré-condição de implementação (Seção A.6, risco A3).
4. Nenhum gap de roster — nada a tratar neste documento.
5. Priorização entre os 6 itens, não feita pelo dono do produto, levantada
   explicitamente na Seção A.5 com framework RICE (mais de 5 itens concorrentes,
   aciona `product-roadmap-prioritization` conforme `scope-prioritization`).

## A.1 Problema e Contexto

**Problema observável hoje, relatado a partir de uso real em produção** (não
hipótese — o app já está em uso desde a entrega do MVP/Fase 2):

1. O dashboard, no desktop, exige rolagem vertical excessiva porque o layout
   empilha cards em coluna única, sem aproveitar a largura de tela disponível.
2. Na lista de lançamentos, a hierarquia visual atual não destaca a informação
   mais relevante para reconhecimento rápido (subcategoria); descrição e forma de
   pagamento competem visualmente com ela, e a ausência de descrição é preenchida
   com o texto redundante "(sem descrição)" em vez de simplesmente omitida.
3. Lançar uma transação manualmente ainda exige preencher todos os campos do zero
   a cada vez, mesmo quando a mesma subcategoria se repete com alta frequência
   (ex.: "Uber", "Supermercado") — não há atalho para o caso comum.
4. O formulário de lançamento exige escolher "conta" e "forma de pagamento" como
   dois campos independentes, quando o vínculo entre eles já existe no modelo de
   dados (`payment_methods.account_id`) — é uma pergunta redundante ao usuário.
5. e 6. A visualização de Categorias e de Orçamento é uma lista expansível, que
   exige clique adicional para ver o conteúdo de cada categoria/mês — ruim de usar
   quando o usuário quer uma visão geral rápida.

**Contexto herdado**: mesmo projeto pessoal, execução solo, usuário único, sem
orçamento/prazo formal (`CTO-REVIEW.md` Gate 1 original e Gate 3, "Declaração de
capacidade"). Este pacote **não é uma nova fase do roadmap original** — é
manutenção evolutiva sobre MVP+Fase 2 já entregues, equivalente em natureza à
repaginação visual já aprovada e implementada em 2026-09-04.

**Hipótese de valor**: se o dashboard e a lista de lançamentos exigirem menos
esforço de leitura/rolagem, se o lançamento manual mais comum (subcategoria
recorrente) exigir só a digitação do valor, e se a escolha de conta deixar de ser
um campo redundante, então o atrito diário de uso cai sem exigir nenhuma automação
nova (voz/foto/importação, que seguem Fase 3) — porque o problema relatado aqui não
é "falta de dado", é "esforço desnecessário para registrar/ler dado que o app já
tem".

## A.2 Público-Alvo

Mesmo público do `PRD.md` original (Seção 2) — usuário único, o próprio dono do
produto, agora **em uso real de produção**, não mais hipotético. Nenhuma mudança de
público nesta rodada.

## A.3 Objetivo de Sucesso

Quatro métricas mensuráveis, cada uma amarrada a um subconjunto dos 6 itens.
Nenhuma é "melhorar a experiência" sem meta — todas têm baseline (ou prazo
explícito para levantar baseline) e meta numérica.

| # | Métrica | Baseline | Meta | Quando medir |
|---|---|---|---|---|
| M3 (atrito de lançamento) | Nº de campos obrigatórios de preenchimento manual por lançamento | 4 (valor, subcategoria, forma de pagamento, conta) — descrição já é opcional hoje | Lançamento via atalho (item 3): 1 campo (valor). Lançamento fora do atalho: 2 campos (valor, forma de pagamento unificada — item 4 elimina "conta" como campo separado) | Imediatamente após deploy, por inspeção estática do formulário |
| M4 (rolagem do dashboard desktop) | A levantar — altura de rolagem (px) da tela atual, viewport de referência 1440x900 (breakpoint `lg`, `UX-SPEC.md`). Dono: UX/UI. Prazo: antes do início da implementação do item 1 | Reduzir em ≥ 40% a altura de rolagem vertical no mesmo viewport, sem alterar o comportamento mobile (single-column, já formalizado) | Imediatamente após deploy, mesma metodologia do baseline |
| M5 (redundância na lista de lançamentos) | 100% dos itens sem descrição hoje exibem o texto "(sem descrição)" | 0% dos itens exibem texto de preenchimento quando a descrição está vazia; hierarquia visual (subcategoria em destaque) aplicada a 100% dos itens | Imediatamente após deploy, inspeção visual/teste de snapshot |
| M6 (adoção do atalho de lançamento rápido) | 0% (funcionalidade não existe hoje) | ≥ 50% dos lançamentos manuais do mês criados via atalho de subcategoria | 30 dias corridos após o deploy do item 3 — requer rastreamento de origem do lançamento, ver risco A6 |

**Fora desta seção, por não ser objetivo de produto**: a correção do Bloqueio 013
(IDOR em `payment_methods.account_id`) é pré-condição de segurança do item 4, não
uma meta de produto — fica registrada como risco de dependência (Seção A.6),
seguindo o mesmo padrão já usado no `PRD.md` original para NFRs de arquitetura.

## A.4 Escopo desta Rodada (dentro / fora)

### Dentro

| Item | Descrição | Natureza |
|---|---|---|
| 1 | Dashboard: grid multi-coluna no desktop, sem quebrar a experiência mobile (single-column já formalizada) | Refinamento visual, baixo risco |
| 2 | Lançamentos: subcategoria como destaque principal do item de lista; descrição e forma de pagamento como texto secundário; "(sem descrição)" nunca mais exibido quando o campo está vazio | Refinamento visual, baixo risco |
| 3 | Atalhos de lançamento rápido: N subcategorias mais usadas recentemente como botões no topo da tela de lançamentos, pré-preenchendo o lançamento | Funcionalidade nova (regra de negócio fechada na Seção A.5) |
| 4 | Unificar a escolha de "conta" + "forma de pagamento" em uma escolha só, com nomenclatura de exibição que desambigua quando há múltiplas contas | Simplificação de contrato de API/UI (regra de nomenclatura de produto fechada na Seção A.5; arquitetura e pré-condições — ADR, G-02, Bloqueio 013 — permanecem com o Software Architect/CTO, Seção A.6) |
| 5 | Categorias: visualização em cards em vez de lista expansível | Refinamento visual, baixo risco |
| 6 | Orçamento: visualização em cards em vez de lista expansível | Refinamento visual, baixo risco |

Todos os 6 itens reutilizam as convenções de responsividade já formalizadas em
`UX-SPEC.md` (2026-09-04, Seções 2.1/3.1.1) — nenhum padrão visual paralelo é
criado nesta rodada.

### Fora do escopo desta rodada (com justificativa)

- **Customização manual dos atalhos de lançamento rápido** (fixar/remover um item
  específico da lista): não solicitado pelo dono do produto; a lista é
  100% automática por frequência de uso (Seção A.5). Corte: revisitar só se o
  stakeholder pedir explicitamente após uso real do item 3 (ver pergunta A.7.3).
- **Mudança de regra de cálculo de saldo, fechamento de fatura ou orçamento**: os 6
  itens deste pacote são de apresentação/simplificação de formulário — nenhum
  altera a lógica de negócio já implementada e testada em MVP/Fase 2.
- **Redesign mobile completo**: mobile já foi formalizado na repaginação de
  2026-09-04 (`UX-SPEC.md`); este pacote só introduz grid multi-coluna **no
  desktop** para o dashboard (item 1) — os demais itens (2, 3, 5, 6) aplicam-se a
  mobile e desktop igualmente, seguindo as convenções já existentes, sem redesenho
  adicional de mobile.
- **Novo tipo de conta ou de forma de pagamento**: fora de escopo; item 4 é
  simplificação de contrato/exibição sobre o modelo já existente, não uma
  expansão de tipos.
- **Qualquer item além dos 6 relatados pelo dono do produto**: por definição de
  escopo desta rodada — nenhuma iniciativa adicional foi incorporada por
  iniciativa do PM.

## A.5 Requisitos de Alto Nível Priorizados

**Framework usado**: RICE (`product-roadmap-prioritization`, via
`scope-prioritization`) — 6 itens concorrentes, acima do limiar de ~5 que aciona o
framework completo. Mesma adaptação já usada no `PRD.md` original: *Reach* vira
**frequência de uso esperada** (vezes/mês que o item entrega valor observável);
*Effort* é estimativa relativa do PM (1 pequeno a 5 muito grande), não validada
pela engenharia.

`Score = (Frequência × Impacto × Confiança) / Esforço`. Impacto em escala
3/2/1/0,5/0,25; Confiança em 100%/80%/50%/30% (50% usado quando a decisão depende
de um Gate 2 de arquitetura ainda não concluído, mesmo critério já usado no `PRD.md`
original para itens de Fase 3 pendentes de build-vs-buy).

| Item | Freq./mês | Impacto | Confiança | Esforço | Score |
|---|---|---|---|---|---|
| 3 — Atalhos de lançamento rápido | 30 | 3 | 80% | 2 | 36,0 |
| 1 — Dashboard grid desktop | 30 | 1 | 100% | 1 | 30,0 |
| 2 — Hierarquia visual da lista | 30 | 1 | 100% | 1 | 30,0 |
| 4 — Unificar conta + forma de pagamento | 30 | 2 | 50% | 3 | 10,0 |
| 6 — Orçamento em cards | 6 | 1 | 100% | 2 | 3,0 |
| 5 — Categorias em cards | 4 | 1 | 100% | 2 | 2,0 |

**Leitura do resultado**: o item 3 tem o maior score — é, ao mesmo tempo, o mais
alinhado ao objetivo-norte original ("reduzir ao mínimo o lançamento manual",
sinalizado como não-vinculante pelo CTO no Gate 1) e o que o próprio score confirma
como prioridade objetiva, não só intuição. Os itens 1 e 2 empatam logo atrás —
ambos são puramente visuais, mesma natureza de risco, podem ser sequenciados em
paralelo entre si e com o item 3 sem dependência cruzada. O item 4 fica
deliberadamente abaixo mesmo tendo frequência de uso alta, porque **confiança
50%** (decisão de arquitetura ainda não concluída) e **esforço 3** (toca contrato
de API, possivelmente migração de dado real) — consistente com o sinal do CTO de
que é "o item de maior risco/esforço" do pacote. Os itens 5 e 6 ficam por último
por frequência de uso claramente menor (Categorias/Orçamento são consultados, não
usados a cada lançamento).

**Ordem de início de implementação (não é o mesmo que o score)**: itens 1, 2 e 3
podem começar imediatamente após este adendo (nenhuma pré-condição de arquitetura
pendente). Itens 5 e 6 seguem o mesmo racional. **O item 4 não pode iniciar
implementação antes de 3 pré-condições estarem satisfeitas** (Seção A.6, risco
A3) — isso vale independentemente do que o score RICE sugerisse, porque são
condições de aceite fixadas pelo CTO no Gate 1, não uma preferência de
sequenciamento do PM.

### Regra de negócio fechada — Item 3 (Atalhos de Lançamento Rápido)

Fechada pelo PM nesta rodada, conforme exigido pelo Gate 1 antes de o BA
prosseguir:

1. **Quantidade (N)**: 10 subcategorias, conforme sugestão original do dono do
   produto — sem motivo identificado para reduzir. UX/UI decide, na especificação
   de tela, quantas ficam visíveis sem rolagem horizontal por breakpoint (isso é
   detalhe de layout, não de regra de negócio).
2. **Janela de "recente"**: janela móvel de **90 dias corridos** a partir de hoje.
   Justificativa: cobre um trimestre de uso (estabiliza a frequência sem deixar um
   gasto isolado antigo dominar o ranking) e evita esvaziar a lista por sazonalidade
   de curto prazo (ex.: um mês com poucos lançamentos).
3. **Critério de ranking**: **frequência simples** (contagem de lançamentos por
   subcategoria dentro da janela) — não recência ponderada. Justificativa:
   "mais usadas recentemente" é satisfeito por uma janela recente + contagem simples;
   um decaimento por recência adicionaria complexidade de implementação/teste sem
   demanda explícita do dono do produto.
4. **Desempate**: (i) subcategoria com lançamento mais recente dentro da janela
   vence; (ii) se ainda empatado, ordem alfabética do nome da subcategoria
   (determinístico, sem ambiguidade).
5. **Fallback de janela curta (conta nova ou baixo volume)**: se menos de 10
   subcategorias distintas tiverem uso nos últimos 90 dias, completar a lista com
   as subcategorias mais frequentes de **todo o histórico** (fora da janela),
   até atingir 10 ou esgotar as subcategorias já usadas alguma vez — o que vier
   primeiro. Nunca preencher posições vazias com sugestões sem uso real (isso
   seria "sugestão", escopo diferente de "mais usadas").
6. **Conta zerada (zero lançamentos no histórico)**: a barra de atalhos é
   **omitida** por completo; o formulário completo padrão continua disponível
   normalmente. Não exibir placeholders vazios.
7. **O que é pré-preenchido ao clicar**: subcategoria e a **forma de pagamento
   mais associada** a essa subcategoria — calculada pelo mesmo critério do item
   1-4 acima (frequência simples de forma de pagamento nos lançamentos dessa
   subcategoria, na janela de 90 dias; empate por uso mais recente). Data
   pré-preenchida = hoje. Descrição permanece vazia (não pré-preenchida, coerente
   com item 2 — descrição é sempre opcional). O campo obrigatório restante para o
   usuário é **somente o valor**. O tipo de lançamento (entrada/saída) depende de
   confirmação de schema real — ver pergunta em aberto A.7.1.

### Definição de produto fechada — Item 4 (Unificação Conta + Forma de Pagamento)

Fechada pelo PM nesta rodada — **decisão de produto**, não de arquitetura. A
decisão de arquitetura (ADR completo) e as 3 condições de aceite do Gate 1
permanecem com o Software Architect/CTO (Seção A.6, risco A3):

1. **Regra de nomenclatura de exibição quando há múltiplas contas do mesmo tipo**:
   rótulo = `"{Forma de Pagamento} {Nome da Conta}"` (ex.: "Débito Nubank", "Pix
   Itaú"), usando o nome que o próprio usuário já deu à conta ao cadastrá-la — não
   o tipo de conta. Regra de ativação: o sufixo com o nome da conta só aparece
   **quando existir mais de 1 conta ativa** no momento da exibição; com apenas 1
   conta ativa (cenário dominante hoje, mesmo padrão do seed original de
   `BE-M-02`/`BE-M-04`), o rótulo permanece simples ("Débito", "Pix"), sem
   sufixo redundante.
2. **O rótulo é calculado em tempo de exibição, não persistido/renomeado no banco.**
   Decisão deliberada do PM para reduzir a necessidade de qualquer migração que
   reorganize dado real já existente em `payment_methods` — evita acionar, por
   este mecanismo específico, a condição G-02 fixada pelo CTO no Gate 1 (revisão
   explícita antes de `ALTER`/reorganização de dado real). Isso não elimina a
   condição G-02 do Gate 1 em geral: se o Software Architect, no ADR, optar por
   qualquer estratégia que efetivamente altere/renomeie linhas já persistidas
   (ex.: normalizar `payment_methods` por conta), essa decisão segue exigindo
   revisão explícita do CTO — só não é a abordagem que o PM está definindo aqui
   como default de produto.
3. **Geração de novas linhas de `payment_methods` para contas adicionais**: ao
   cadastrar uma 2ª conta ativa (ou seguintes), o sistema gera automaticamente as
   4 formas de pagamento não-cartão (Pix, Débito, Boleto, Dinheiro) vinculadas a
   essa conta — mesmo padrão de seed já usado para a 1ª conta (`BE-M-02`/`BE-M-04`),
   estendido a toda conta nova. É criação aditiva de linha nova, não reorganização
   de dado existente — não aciona G-02.
4. **Campo removido do formulário de lançamento**: o seletor de "conta" deixa de
   existir como campo independente; o usuário escolhe apenas a forma de pagamento
   (já com o rótulo desambiguado acima), que resolve a conta implicitamente —
   exatamente a simplificação de contrato apontada pelo CTO no Gate 1.
5. **Formas de pagamento vinculadas a cartão de crédito** (`credit_card_id`, não
   `account_id`) não são afetadas por esta regra — seguem o padrão de nomenclatura
   já existente da Fase 2 (nome do cartão), fora do escopo deste item.

## A.6 Premissas e Riscos de Produto

| # | Premissa/Risco | Impacto se falsa/concretizado | Severidade | Dono | Prazo de validação |
|---|---|---|---|---|---|
| A1 | Volume médio real de lançamentos mensais do stakeholder segue não confirmado (mesmo gap do risco #1, Seção 6 do `PRD.md` original) | Dimensionamento de N=10 atalhos (item 3) e da meta M6 pode não corresponder ao volume real de uso | Média | PM (com o stakeholder) | Antes do BA detalhar o item 3 |
| A2 | Não confirmado se `categories` expõe um indicador de tipo (receita/despesa) reutilizável para inferir automaticamente o tipo do lançamento pré-preenchido pelo atalho (item 3) — `SDD.md` Seção 5 não documenta essa coluna | Sem essa confirmação, o BA não tem critério de aceite objetivo para o campo "tipo" no pré-preenchimento do atalho | Média | Business Analyst (com Software Architect, contra o schema real) | Antes de fechar o RF do item 3 |
| A3 | Item 4 depende de 3 pré-condições fixadas pelo CTO no Gate 1: (a) ADR completo do Software Architect revisado no Gate 2 (`architecture-decision-review`); (b) qualquer reorganização de dado real em `payment_methods` só com revisão explícita do CTO (G-02); (c) `BLOCKERS.md` Bloqueio 013 (IDOR em `payment_methods.account_id`) fechado antes ou junto da implementação | Enquanto uma das 3 não for satisfeita, nenhuma tarefa de implementação do item 4 pode entrar no `TASK.md` | Alta | Software Architect (ADR) + Backend/DevSecOps (Bloqueio 013) + CTO (Gate 2) | Antes de qualquer tarefa de implementação do item 4 ser criada |
| A4 | Baseline real de rolagem vertical do dashboard (M4) ainda não medido | Sem essa medição, a meta de redução de ≥ 40% não pode ser verificada objetivamente após o deploy | Baixa | UX/UI | Antes do início da implementação do item 1 |
| A5 | A decisão de produto deste adendo (rótulo de forma de pagamento calculado em exibição, não persistido) reduz a necessidade de acionar G-02 para este mecanismo específico, mas não a elimina caso o Software Architect adote, no ADR, uma estratégia que reorganize dado já persistido | Se o ADR optar por reorganizar dado real sem essa revisão, viola G-02 já fixado pelo CTO | Média | Software Architect (declarar a abordagem no ADR) + CTO (revisar se envolver dado real) | Gate 2 |
| A6 | Medir M6 (adoção do atalho) pode exigir um novo campo/flag de origem do lançamento em `transactions`, não previsto no modelo atual | Sem esse campo, M6 não é mensurável de forma automatizada | Baixa | Business Analyst (com Software Architect) | Antes de fechar o RF do item 3 |
| A7 | Cards de Categorias/Orçamento (itens 5/6) assumem volume pequeno de dados (12 categorias seed, usuário único); se o stakeholder já tiver criado muitas subcategorias customizadas, o layout pode exigir paginação/scroll interno não previsto | Card pode ficar poluído/ilegível se o volume real for maior que o assumido | Baixa | UX/UI (confirmar volume real de categorias/subcategorias em produção antes de desenhar) | Antes do início da implementação dos itens 5/6 |

## A.7 Perguntas em Aberto para o Business Analyst

1. Confirmar, contra o schema real (`categories`), se existe indicador de tipo
   (receita/despesa) reutilizável para o pré-preenchimento automático do tipo de
   lançamento no atalho (item 3) — ver risco A2.
2. Levantar com o stakeholder o volume médio real de lançamentos mensais (gap
   herdado da Seção 6/7 do `PRD.md` original, ainda não fechado) — necessário para
   validar se N=10 atalhos é dimensionamento realista (risco A1).
3. Confirmar com o stakeholder se deseja alguma personalização manual dos atalhos
   (fixar/remover um item específico) nesta rodada, ou se aceita a lista 100%
   automática por frequência, como assumido pelo PM (ver Seção A.4, "Fora do
   escopo").
4. Detalhar o fluxo de UX exato do clique no atalho (ex.: foco automático no campo
   valor, teclado numérico já aberto em mobile) — cabe ao BA levantar a expectativa
   do stakeholder e ao UX/UI especificar a tela.
5. Confirmar com o stakeholder a nomenclatura de exibição para "Dinheiro" quando
   vinculado a uma conta do tipo carteira (ex.: "Dinheiro Carteira" pode soar
   redundante) — pode exigir exceção pontual à regra geral do item 4 (Seção A.5).
6. Confirmar a necessidade de um novo campo/flag em `transactions` para rastrear
   lançamentos originados via atalho, necessário para medir M6 — ver risco A6.
7. Levantar com o stakeholder quais dados devem aparecer no card de Categoria e no
   card de Orçamento sem exigir clique adicional (ex.: total gasto no mês, número
   de subcategorias, % do orçamento consumido).

---

### Stakeholder Alignment Check (Adendo A)

Checklist comparado item a item contra `CTO-REVIEW.md`, "Gate 1 — Pré-descoberta
(Pacote de Refinamento...) — 2026-09-04":

- **Objetivo de negócio**: mesma linha do objetivo original ("reduzir ao mínimo o
  lançamento manual... dando visibilidade"), agora informado por uso real — sem
  divergência, o próprio Gate 1 já confirmou isso.
- **Escopo**: os 6 itens deste adendo correspondem exatamente aos 6 itens avaliados
  no Gate 1; nenhum item adicional foi incorporado por iniciativa do PM.
- **Item 3**: a regra de negócio fechada na Seção A.5 (N=10, janela de 90 dias,
  frequência simples, desempate, pré-preenchimento, fallback de conta nova) atende
  à ressalva 2 do Gate 1 — sem divergência.
- **Item 4**: a definição de **produto** fechada na Seção A.5 (regra de
  nomenclatura, rótulo calculado em exibição) atende à parte de produto da
  ressalva 3 do Gate 1. As 3 condições de aceite fixadas pelo CTO (ADR/Gate 2,
  G-02, Bloqueio 013) **não são resolvidas por este documento** — permanecem
  registradas como pré-condição de implementação (risco A3), não como decisão do
  PM. A decisão de rótulo calculado em exibição foi desenhada precisamente para
  reduzir a necessidade de acionar G-02, não para contorná-lo ou decidir por ele.
- **Priorização**: levantada explicitamente nesta rodada (RICE, Seção A.5),
  atendendo à ressalva 5 do Gate 1 — dono do produto não havia priorizado os 6
  itens entre si.
- **Gap de roster**: nenhum papel novo identificado, consistente com a observação
  do Gate 1.

**Resultado: sem divergência não resolvida em relação ao Gate 1 desta rodada.**
Nenhum conflito a escalar ao CTO via `stakeholder-alignment-check`. Adendo A do
`PRD.md` liberado para o Business Analyst em 2026-09-04.

---

# Adendo B — Redesign Visual ("MyMoney v2.0")

**Dono**: PM (Product Manager)
**Data**: 2026-09-04
**Natureza**: **adendo** ao `PRD.md` original — não reescreve nem invalida nenhuma
seção anterior (Seções 1-7 e Adendo A seguem vigentes). Decisão explícita do PM,
conforme pedido pelo CTO no gate de entrada: este é um **adendo**, não um `PRD.md`
separado, pela mesma lógica já usada para o Pacote de Refinamento — mesmo produto,
mesmo público-alvo, mesmo domínio de negócio já modelado e estável; o que muda é a
camada de apresentação, não o roadmap funcional. Diferente do Adendo A (refinamentos
pontuais e independentes), esta rodada tem escopo maior e uma referência visual
formal externa (canvas de mockups) — por isso recebe tratamento de seção completa
(B.1 a B.7) equivalente em profundidade ao `PRD.md` original, não um adendo enxuto
como o A.

**Correção de escopo pós-gate, 2026-09-04 (mesma data, mesma rodada)**: a primeira
versão deste adendo (produzida ainda hoje) delimitava o escopo às 4 telas com mockup
de referência. O stakeholder corrigiu diretamente essa delimitação: o redesign **não
se limita** às 4 telas com mockup — ele se estende a **todo o projeto**. Os 8
artboards continuam sendo a referência formal de padrão visual/qualidade, mas passam
a ter um papel duplo: (i) especificação direta das 4 telas que retratam, e (ii)
**fundação de design system** a partir da qual o `ux-ui` extrapola padrões
(tokens, componentes, convenções de layout) para todas as demais telas do produto,
que não têm mockup próprio. Esta versão do documento já reflete a correção — as
Seções B.4 e B.5 abaixo foram reescritas de acordo. Como o `CTO-REVIEW.md` (Gate 1
desta iniciativa) avaliou risco de escopo/capacidade especificamente sobre um
dimensionamento de "4 telas × 2 breakpoints", esta expansão muda a base sobre a qual
aquela avaliação foi feita — registrado como divergência a esclarecer com o CTO na
Seção "Stakeholder Alignment Check" abaixo, e como `BLOCKERS.md` Bloqueio 021,
**sem bloquear** a liberação dos Lotes 0-4 (que seguem dentro do que o Gate 1 já
avaliou) para o Business Analyst.
**Gate de entrada**: `CTO-REVIEW.md`, seção "Gate 1 (Nova Iniciativa — Redesign Visual
'MyMoney v2.0') — 2026-09-04", veredito **Aprovado com ressalvas**.
**Fonte de negócio**: (1) canvas Claude Design "MyMoney v2.0 — Mockups"
(`https://claude.ai/code/artifact/a0366a5f-641c-40db-bae9-9595cefdc8c1`), 8 artboards
— Dashboard, Lançamentos, Contas & Cartões, Categorias, cada uma em versão desktop e
Mobile — tratado como **alvo de qualidade/estilo**, não especificação formal; (2)
confirmação direta do stakeholder sobre o motivo de negócio, colhida pelo PM antes de
decompor escopo, conforme exigido pela ressalva 1 do Gate 1 (ver Seção B.1).
**Limitação registrada**: o PM não teve acesso visual direto ao conteúdo dos 8
artboards — o canvas é um app React interativo, e a tentativa de leitura via
`WebFetch` não retornou conteúdo renderizável (confirmado nesta rodada: a página
carrega vazia por trás de autenticação/render client-side). Este `PRD.md` é escrito,
portanto, no nível de escopo/objetivo macro que o PM pode definir sem a extração
visual detalhada (cor exata, espaçamento, componente por componente) — essa extração
é trabalho do `ux-ui` ao produzir a próxima versão do `UX-SPEC.md`, não do PM (ver
premissa B6.3). Isso não invalida o adendo: o volume e a existência dos 8 artboards já
foram aceitos como briefing genuíno pelo próprio CTO no gate de entrada.
**Consumidor imediato**: `business-analyst` (aprofunda a partir da Seção B.5 e das
perguntas da Seção B.7); `ux-ui` (consumidor primário do resultado do BA — dono
natural da extração detalhada dos mockups para uma nova versão de `UX-SPEC.md`).

As 6 ressalvas do Gate 1 desta rodada foram carregadas explicitamente:
1. Motivo de negócio real extraído do stakeholder antes de decompor escopo — ver
   Seção B.1 (combinação confirmada das hipóteses (a) e (c), (b) e (d) descartadas
   explicitamente).
2. Faseamento explícito por tela proposto (com uma camada de fundação de design
   system que precede as demais telas) — ver Seção B.4/B.5, com justificativa
   própria do PM para a ordem escolhida. **Atualizado pela correção de escopo
   acima**: o faseamento por tela agora cobre todo o projeto, não só as 4 telas com
   mockup — a lógica de fasear (em vez de assumir corte único) se aplica com ainda
   mais força a um escopo maior, não menos.
3. Escopo declarado, por padrão, como camada de apresentação; qualquer mudança de
   comportamento/regra de negócio que apareça junto vira requisito funcional nomeado
   — regra fixada na Seção B.4 e reforçada como guardrail candidato na Seção B.6.
4. "Mobile" confirmado como breakpoint responsivo (coerente com `ADR-003`), não app
   nativo — registrado como premissa explícita na Seção B.6 (risco B6.2), não
   presumido silenciosamente.
5. Estratégia de corte em produção (big-bang vs. gradual) e não-regressão de WCAG
   permanecem para o Software Architect/UX-UI resolverem no `SDD.md`/`UX-SPEC.md`
   desta iniciativa — registrado como premissa (Seção B.6) e como objetivo de
   sucesso mensurável (N3, Seção B.3), não decidido aqui.
6. Nenhum gap de roster — nada a tratar neste documento; `mobile` (papel) segue não
   acionado, condicionado à premissa B6.2.

## B.1 Problema e Contexto

**Motivo de negócio, confirmado diretamente pelo stakeholder** (respondendo à
ressalva 1 do Gate 1, antes de qualquer decomposição de escopo): a primeira versão do
MyMoney (MVP + Fase 2 + Pacote de Refinamento) não recebeu atenção adequada de
design/UI durante sua construção, e a interface entregue não ficou com qualidade
adequada. O redesign se justifica para **elevar a qualidade visual e de interação da
aplicação como um todo**.

Das 4 hipóteses levantadas pelo CTO no gate de entrada, o motivo confirmado é uma
**combinação de (a) modernização visual pura e (c) consistência/maturidade de design
system** — não (b) nem (d):
- **(a) Modernização visual**: confirmado — o produto funciona, mas o padrão visual
  atual está aquém do desejado; percepção qualitativa do próprio stakeholder é
  aceita como critério válido, desde que operacionalizada em critério de aceite
  verificável (Seção B.3), não deixada solta.
- **(c) Consistência/maturidade de design system**: confirmado como consequência
  direta — as 4 telas centrais (Dashboard, Lançamentos, Contas & Cartões,
  Categorias) foram implementadas em momentos diferentes do projeto (MVP, Fase 2,
  Pacote de Refinamento) e mesmo após a repaginação de tokens de 2026-09-04
  (`UX-SPEC.md` Seção 3.1), o padrão vigente foi definido **sem** uma referência
  visual formal previamente desenhada — os mockups do canvas são essa referência,
  agora formalizada pela primeira vez.
- **(b) Problema de usabilidade concreto**: **descartado explicitamente** pelo
  stakeholder — não há tela, fluxo ou sintoma comportamental nomeado como o motivo
  do redesign. Isso não significa que nenhuma melhoria de usabilidade ocorrerá como
  efeito colateral positivo do redesign — significa que nenhuma melhoria de
  usabilidade é o *critério de sucesso* desta iniciativa, e nenhuma mudança de
  comportamento pode ser justificada apenas "porque o redesign pede" (reforça a
  ressalva 3 do Gate 1, ver Seção B.4).
- **(d) Preparação para multiusuário**: **descartado explicitamente** pelo
  stakeholder — a iniciativa não muda a proporcionalidade do investimento em relação
  ao contexto já fixado desde o Gate 1 original (projeto pessoal, usuário único).

**Contexto herdado**: mesmo projeto pessoal, execução solo, usuário único, sem
orçamento/prazo formal declarado (`CTO-REVIEW.md` Gate 1 original e Gate 3,
"Declaração de capacidade" — segue valendo, sem confirmação de hipótese de prazo
específica para esta iniciativa; ver risco B6.7). MVP + Fase 2 + Pacote de
Refinamento estão entregues e em produção real (`https://mymoney-lsm.vercel.app`),
com 1 usuário real e dado real — a natureza de risco desta iniciativa é a mesma já
registrada para o Pacote de Refinamento (Adendo A): mudança sobre produto vivo, não
sobre produto ainda inexistente.

**Hipótese de valor**: se **todas as telas do produto** passarem a seguir uma
referência visual única e deliberada — as 4 telas com mockup diretamente, e as
demais por extrapolação consistente dos mesmos tokens/componentes — com design
system consistente entre si e formalizado em `UX-SPEC.md`, então a percepção de
qualidade do produto sobe de forma verificável (aderência aos mockups nas telas de
referência direta, aderência ao design system extrapolado nas demais, ausência de
divergência entre elas) sem que nenhuma funcionalidade existente regrida — porque o
problema relatado aqui é de padrão visual/consistência **do produto como um todo**,
não de uma funcionalidade ausente/incorreta nem de um subconjunto isolado de telas.
As 4 telas com mockup são o ponto de partida por terem especificação visual pronta,
não porque o problema relatado pelo stakeholder ("a interface entregue não ficou com
qualidade adequada") seja restrito a elas.

## B.2 Público-Alvo

Mesmo público-alvo do `PRD.md` original (Seção 2) e do Adendo A (Seção A.2) —
usuário único, o próprio stakeholder, na função de gestor de suas próprias finanças
pessoais, em uso real de produção. **Confirmado nesta rodada**: a hipótese (d)
("preparação para uso além do stakeholder único") foi descartada explicitamente pelo
stakeholder (Seção B.1) — não há expansão de público-alvo nesta iniciativa. Uso
continua sendo "desktop e celular", coerente com a premissa de Mobile = breakpoint
responsivo, não uma nova plataforma ou um novo tipo de usuário (Seção B.6, risco
B6.2).

## B.3 Objetivo de Sucesso

Quatro métricas mensuráveis, nenhuma delas "melhorar a experiência do usuário" sem
critério — a percepção subjetiva do stakeholder (legítima, é ele quem julga
qualidade visual) é **operacionalizada** em checklist objetivo (N2), não deixada
como julgamento livre e não verificável.

| # | Métrica | Baseline | Meta | Quando medir |
|---|---|---|---|---|
| N1 (aderência ao design system) | % das superfícies redesenhadas (toda tela do produto listada em `UX-SPEC.md` Seção 2.2, cada uma em seu(s) breakpoint(s) aplicável(is)) usando exclusivamente tokens/componentes de `UX-SPEC.md` Seção 3 (versão consolidada nesta iniciativa), sem estilo inline/ad-hoc divergente | A levantar via auditoria (`design-system-consistency-check`, mesma skill já usada em 2026-09-04) antes do Lote 0 — ver risco B6.5 | 100% das superfícies redesenhadas em cada lote, sem divergência registrada em auditoria pós-implementação — meta cumulativa lote a lote, não um corte único no fim da iniciativa | Ao final de cada lote (Seção B.5), não só ao final da iniciativa inteira |
| N2 (aderência à referência visual) | 0 telas hoje comparadas formalmente a uma referência visual deliberada | 100% das telas redesenhadas em cada lote com checklist de aprovação assinado pelo stakeholder — nas 4 telas com mockup direto (Lotes 1-4), comparação linha a linha contra o artboard correspondente; nas demais (Lotes 5+), comparação contra os tokens/padrões consolidados no Lote 0 (paleta de cor aplicada, tipografia, componentes-chave presentes, paridade de layout geral desktop/mobile) | Ao final de cada lote, antes de considerá-lo "pronto" |
| N3 (não regressão de acessibilidade) | Nível WCAG 2.1 AA já vigente em 100% das telas do produto (`UX-SPEC.md` Seção 5) | 0 regressões identificadas ao reaplicar o checklist de acessibilidade em cada tela redesenhada, em qualquer lote | A cada lote, antes do deploy (QA) |
| N4 (não regressão funcional) | 0 bugs conhecidos no produto em produção antes do redesign (estado estável) | 0 bugs de regressão introduzidos por lote, medido por reexecução da suíte de testes existente, em qualquer lote | A cada lote, antes do deploy (QA) |

**Fora desta seção, por não ser objetivo de produto**: a decisão de qual estratégia
de corte em produção usar (big-bang vs. gradual por tela/feature flag) é meta técnica
do Software Architect, não do PM — registrada como premissa a formalizar no `SDD.md`
desta iniciativa (Seção B.6, risco B6.6), mesmo padrão já usado no `PRD.md` original
para NFRs de arquitetura.

## B.4 Escopo desta Iniciativa (dentro / fora)

**Regra de corte, decorrente diretamente da ressalva 3 do Gate 1 (não-negociável)**:
esta iniciativa é, por padrão, **camada de apresentação** — nenhum requisito de
regra de negócio, modelo de dados ou contrato de API muda como consequência do
redesign. Se, na extração detalhada dos mockups (`ux-ui`, ao produzir a nova versão
de `UX-SPEC.md`) ou no detalhamento do BA, aparecer algo que pareça mudar
comportamento (ex.: um fluxo diferente de confirmação, um campo removido/adicionado,
uma ordenação diferente de lista com efeito funcional, não só visual), isso **não
pode ser absorvido silenciosamente como "parte do redesign"** — deve virar requisito
funcional nomeado, com o mesmo rigor de RF de qualquer outra rodada deste `PRD.md`,
sujeito a `PRD-TECNICO.md`/ADR se necessário. Fixo isto como guardrail candidato a
propor ao Tech Lead junto com `GUARDRAILS.md` desta iniciativa.

**Escopo corrigido (2026-09-04, ver "Correção de escopo pós-gate" no cabeçalho deste
adendo)**: o redesign cobre **todo o projeto** — todas as telas listadas em
`UX-SPEC.md` Seção 2.2, não apenas as 4 com mockup formal. As 4 telas com mockup
(Dashboard, Lançamentos, Contas & Cartões, Categorias) continuam sendo tratadas
como a **fundação de design system e ponto de partida da execução** (têm
especificação visual pronta, as demais não) — mas deixam de ser um teto de escopo.
As telas sem mockup próprio seguem o design system extraído/consolidado no Lote 0,
por **extrapolação do `ux-ui`** ao produzir a próxima versão do `UX-SPEC.md`, não
um redesign "solto" tela por tela sem referência comum.

### Dentro

**Grupo A — telas com mockup direto** (fundação + especificação pronta):

| Lote | Descrição | Natureza |
|---|---|---|
| Lote 0 | Fundação de design system: extrair tokens (cor, tipografia, espaçamento, raio, elevação, ícones) e padrões de componente **reutilizáveis** (não só 4 aplicações pontuais) dos 8 artboards de referência; atualizar `UX-SPEC.md` Seção 3 (nova versão, superando ou estendendo a atualização de 2026-09-04) | Pré-requisito comum a todos os lotes seguintes (Grupo A e B) — trabalho do `ux-ui` |
| Lote 1 | Redesign de Dashboard (desktop + mobile), seguindo os tokens/padrões do Lote 0 e os artboards "Main"/"MainMobile" como alvo | Camada de apresentação |
| Lote 2 | Redesign de Lançamentos (desktop + mobile), artboards "Lancamentos"/"LancamentosMobile" | Camada de apresentação |
| Lote 3 | Redesign de Contas & Cartões (desktop + mobile), artboards "ContasCartoes"/"ContasCartoesMobile" | Camada de apresentação |
| Lote 4 | Redesign de Categorias (desktop + mobile), artboards "Categorias"/"CategoriasMobile" | Camada de apresentação |

**Grupo B — telas sem mockup próprio, redesenhadas por extrapolação do design
system consolidado no Lote 0** (agrupadas por domínio de `UX-SPEC.md` Seção 2.2;
composição e sequenciamento exato de cada lote são refinados pelo `ux-ui`/Tech Lead
ao produzirem `UX-SPEC.md` v3/`TASK.md` desta iniciativa — o PM fixa aqui a
existência e a prioridade relativa dos grupos, não a decomposição tela a tela):

| Lote (indicativo) | Domínio / Telas (`UX-SPEC.md` Seção 2.2) | Natureza |
|---|---|---|
| 5 | Autenticação e Sessão + Onboarding (S-AUTH-01 a 05, S-ONB-01/02) | Camada de apresentação — telas isoladas, pré-sessão, sem navegação lateral |
| 6 | Orçamento (S-BUD-01/02) | Camada de apresentação — já em cards desde o Pacote de Refinamento, reaproveita Padrão C |
| 7 | Formas de Pagamento (S-PAY-01/02), se não integralmente absorvida pelo Lote 3 | Camada de apresentação |
| 8 | Cartão & Fatura detalhado (S-CARD-01/02/03), na parte não coberta pelo Lote 3 | Camada de apresentação — atenção a `InvoiceTimeline`, lógica de negócio sensível não pode ser tocada |
| 9 | Recorrência, Parcelamento, Contas Fixas, Metas (S-REC, S-INST, S-FIX, S-GOAL) | Camada de apresentação |
| 10 | Notificações (S-NOT-01) | Camada de apresentação |
| 11 | Relatórios e Exportação (S-REP-01/02/03) | Camada de apresentação |
| 12 | Captura Automatizada (S-CAP-01 a 09, Fase 3) | Camada de apresentação, com cautela adicional — RNF-01 (confirmação humana antes de salvar) é barreira arquitetural, não apenas visual; o redesign não pode alterar esse comportamento (ver risco B6.9) |
| 13 | Configurações (S-SET-01/02/03) | Camada de apresentação |

"Mobile", em todos os lotes (Grupo A e B), significa **breakpoint responsivo da
mesma PWA** (coerente com `ADR-003` já aprovado) — confirmado pelo stakeholder, não
é uma frente de app nativo nova (ver premissa B6.2).

### Fora do escopo desta iniciativa (com justificativa)

- **Qualquer mudança de regra de negócio/comportamento não nomeada explicitamente**:
  regra de corte central desta seção (acima) — nenhuma exceção silenciosa, em
  nenhum lote de nenhum dos dois grupos.
- **Resolver um problema de usabilidade específico nomeado**: hipótese (b)
  descartada explicitamente pelo stakeholder (Seção B.1) — se um problema pontual de
  usabilidade for identificado durante a extração dos mockups, a extrapolação para
  o Grupo B, ou o uso real, deve virar um RF/item de backlog próprio (mesmo padrão
  do Pacote de Refinamento, Adendo A), não ser absorvido dentro do critério de
  sucesso desta iniciativa.
- **Preparação para multiusuário/compartilhamento**: hipótese (d) descartada
  explicitamente pelo stakeholder (Seção B.1); mesmo corte já registrado no `PRD.md`
  original (Seção 4).
- **App nativo para loja (iOS/Android)**: "Mobile" confirmado como breakpoint
  responsivo (premissa B6.2); reabrir essa decisão exigiria reabrir `ADR-003`,
  escalado ao CTO no Gate 2 desta iniciativa, não decidido aqui.
- **Rescrita de stack de UI**: React + TypeScript + Tailwind CSS (`SDD.md` Seção 3)
  são o ponto de partida, não uma decisão em aberto (herdado do Gate 1 desta
  iniciativa) — nenhuma build-vs-buy nova é esperada aqui.
- **Revisão de copy/texto de UI não amarrada a um elemento visual dos mockups**:
  fora desta rodada por padrão — se o stakeholder quiser revisar textos, é uma
  rodada de conteúdo separada, não implícita ao redesign visual (ver pergunta B7.5).
- **Qualquer entidade/tela genuinamente nova, não listada em `UX-SPEC.md` Seção
  2.2 hoje**: esta iniciativa redesenha o que já existe; não introduz tela nova
  fora do inventário atual do produto.

## B.5 Requisitos de Alto Nível Priorizados

**Framework usado**: priorização por matriz de critérios (Uso/Risco/Dependência),
classificada em **Now/Next/Later** (`product-roadmap-prioritization`, dentro de
`scope-prioritization`), aplicada em dois níveis — Grupo A (mockup direto, matriz
completa) e Grupo B (extrapolado, classificação qualitativa por domínio, mais leve
por não ter ainda especificação tela a tela). RICE completo **não** aplicado: mesmo
com o escopo agora cobrindo todo o projeto, a unidade de priorização deste `PRD.md`
é o **lote/domínio** (14 no total, Lote 0 a 13), e a maior parte da comparação
relevante entre eles é resolvida por dependência estrutural (Lote 0 antes de todos)
e por uma matriz de 2-3 critérios nomeados — RICE completo ficaria com precisão
falsa para o Grupo B, cujo esforço real só é conhecido depois que o `ux-ui`
detalhar cada tela. Uma lista sem critério explícito, porém, violaria o critério de
pronto do PM ("prioridade justificada, não lista arbitrária") — por isso as duas
tabelas abaixo, cada uma com critério nomeado e comparável ao seu próprio nível de
granularidade.

### Grupo A — telas com mockup direto (matriz completa)

| Lote | Frequência de uso estimada | Risco de regressão funcional | Dependência | Classificação |
|---|---|---|---|---|
| 0 — Fundação de design system | N/A (não é tela) | Nenhum (não toca código de produção ainda) | Nenhuma — bloqueia todos os lotes seguintes (Grupo A e B) | **Now** (obrigatório antes de qualquer lote de tela) |
| 1 — Dashboard | Alta (aberto em toda sessão do stakeholder; tela mais citada como alvo de otimização no histórico do projeto — `CTO-REVIEW.md`, Gate 3 "Pacote de Refinamento", RF-REF-01) | Médio (gráficos e RPCs de resumo, mas já estáveis desde Fase 2/2.1) | Lote 0 | **Now** (primeira tela, por recomendação explícita do CTO no gate de entrada) |
| 2 — Lançamentos | Alta (tela de maior interação, ~30 lançamentos/mês por estimativa já usada no Adendo A) | Alto (núcleo funcional reaproveitado pela Fase 3 de captura automatizada — `UX-SPEC.md` Seção 2.2) | Lote 0 | **Next** |
| 3 — Contas & Cartões | Baixa-média (tela de cadastro/gestão, não de uso diário) | Alto (fatura projetada, parcelamento — lógica de negócio sensível, `InvoiceTimeline`) | Lote 0 | **Next** |
| 4 — Categorias | Baixa (tela de consulta ocasional; frequência já estimada em 4/mês no Adendo A, a menor das 4 telas) | Baixo (CRUD simples, já em cards desde o Pacote de Refinamento) | Lote 0 | **Later** |

**Leitura do resultado (Grupo A)**: o Lote 0 é `Now` por definição estrutural —
nenhum lote de tela pode começar sem os tokens/padrões extraídos dos mockups, sob
risco de repetir a extração de forma inconsistente entre si (o próprio problema que
esta iniciativa quer resolver, aplicado ao processo de trabalho, não só ao
produto). Entre as 4 telas com mockup, a ordem Dashboard → Lançamentos → Contas &
Cartões → Categorias segue a recomendação explícita do CTO no gate de entrada
(começar pela tela de maior uso/tempo de tela aberta) e é consistente com os dados
de frequência já levantados no Adendo A — Lançamentos e Contas & Cartões trocam de
posição em relação à frequência pura porque Contas & Cartões carrega risco de
regressão funcional maior (fatura projetada), então Lançamentos, mais frequente e
com risco comparável, é priorizada primeiro dentro do grupo `Next`.

### Grupo B — telas extrapoladas (classificação qualitativa por domínio)

| Lote | Domínio | Prioridade relativa | Justificativa |
|---|---|---|---|
| 5 | Autenticação/Sessão + Onboarding | **Next** | Alta visibilidade (primeira impressão do produto, toda sessão nova), mas risco de regressão baixo (formulários simples, isolados, sem navegação lateral) — bom retorno por esforço logo após o Grupo A |
| 6 | Orçamento | **Next** | Já está em cards (Padrão C) desde o Pacote de Refinamento — mesma família visual das Categorias (Lote 4), esforço de extrapolação incremental, não do zero |
| 9 | Recorrência/Parcelamento/Contas Fixas/Metas | **Later** | Frequência de uso baixa (telas de configuração pontual, não de uso diário); volume de telas (4 domínios) torna o lote maior, sem urgência de negócio nomeada |
| 7 | Formas de Pagamento | **Later** | Tela de cadastro pouco usada; forte sobreposição visual esperada com Contas (Lote 3), pode ser absorvida com esforço marginal quando o Lote 3 for feito — decisão final de agrupamento cabe ao `ux-ui`/Tech Lead |
| 10 | Notificações | **Later** | Tela de consulta ocasional, componente já simples |
| 11 | Relatórios e Exportação | **Later** | Uso ocasional; contém gráficos (`BarChart`/`LineChart`) que já herdam boa parte do estilo do Dashboard (Lote 1) uma vez redesenhado |
| 13 | Configurações | **Later** | Tela de uso raro, sem lógica de negócio sensível |
| 8 | Cartão & Fatura detalhado | **Later**, com nota de risco | Frequência baixa-média, mas risco de regressão **alto** (fatura projetada, `InvoiceTimeline`) — deliberadamente adiada para depois de o padrão de "telas com lógica de negócio sensível" já ter sido validado em produção pelo Lote 3 (Contas & Cartões) |
| 12 | Captura Automatizada (Fase 3) | **Later**, com cautela adicional | Frequência de uso variável (depende de adoção da Fase 3, já em produção mas de uso não garantido diariamente); risco de regressão **alto** por tocar componentes ligados a RNF-01 (barreira arquitetural de confirmação humana) — deliberadamente por último, para que o padrão de redesign já esteja maduro (validado nos lotes anteriores) antes de tocar a superfície mais sensível do produto |

**Nota sobre o Grupo B**: a granularidade desta tabela é de **domínio**, não de
tela individual — o `ux-ui`, ao consolidar o design system do Lote 0 e iniciar a
extrapolação, pode subdividir ou reagrupar estes lotes (ex.: unir Lote 7 ao Lote 3,
como já sinalizado) sem que isso reabra este `PRD.md`, desde que a ordem relativa
Next/Later e a cautela extra do Lote 12 sejam preservadas. Isso é delegação
proporcional de decisão de sequenciamento tático ao `ux-ui`/Tech Lead — o mesmo
padrão já usado no `PRD.md` original para o sequenciamento interno da Fase 3 (Seção
5, nota sobre captura por voz).

**Faseamento por tela/domínio, não por corte único (ressalva 2 do Gate 1)**: decisão
do PM, adotando a recomendação do CTO — reforçada, não enfraquecida, pela expansão
de escopo a todo o projeto. Justificativa própria, além da já registrada pelo CTO:
(1) cada lote entrega valor perceptível isoladamente (o stakeholder vê e usa a tela
redesenhada em produção antes do próximo lote começar), permitindo ajuste de rota
entre lotes sem custo afundado nos demais; (2) mesma lógica de execução solo/serial
já demonstrada nos ciclos anteriores (`CTO-REVIEW.md` Gate 3, "Declaração de
capacidade") — com 14 lotes em vez de 5, o risco de tratar o total como paralelo em
vez de somatório de esforço é ainda maior, não menor (ver risco B6.8, atualizado);
(3) reduz a superfície de regressão testável por ciclo (ver N4), em vez de arriscar
toda a aplicação de uma vez. **Nenhum compromisso de prazo total é assumido aqui**
para os 14 lotes — o faseamento existe justamente para permitir que a iniciativa
avance lote a lote sem depender de uma estimativa de esforço total ainda não
validada pelo Tech Lead (ver Bloqueio 021, Seção "Stakeholder Alignment Check"
abaixo).

## B.6 Premissas e Riscos de Produto

| # | Premissa/Risco | Impacto se falsa/concretizado | Severidade | Dono | Prazo de validação |
|---|---|---|---|---|---|
| B6.1 | Motivo de negócio é a combinação confirmada (a)+(c) — modernização visual + consistência de design system — não (b)/(d) (Seção B.1) | Se surgir, durante a execução, uma expectativa de correção de usabilidade específica ou preparação multiusuário não nomeada aqui, ela precisa de nova rodada de definição de escopo, não pode ser absorvida silenciosamente neste adendo | Média | PM (revalidar com o stakeholder se surgir sinal em contrário) | Contínuo, ao longo dos 14 lotes |
| B6.2 | "Mobile" nos mockups significa breakpoint responsivo da mesma PWA, coerente com `ADR-003` já aprovado — confirmado pelo stakeholder, não presumido | Se a intenção real for app nativo, reabre `ADR-003` e o papel `mobile` do roster — muda arquitetura, não só apresentação | Alta (se falsa) | CTO (reabertura formal de `ADR-003` no Gate 2 desta iniciativa, se necessário) | Antes do Software Architect iniciar o `SDD.md` desta iniciativa |
| B6.3 | PM não teve acesso visual direto aos 8 artboards (limitação técnica de `WebFetch` sobre app React interativo) — extração detalhada (cor, espaçamento, componente) é delegada ao `ux-ui` | Se a extração do UX/UI divergir da intenção real do stakeholder nos mockups, N2 (aprovação por checklist) não passa e o lote precisa de retrabalho | Média | UX/UI (extrair diretamente do canvas, com acesso real) + Stakeholder (validar por lote via N2) | Antes de cada lote de tela iniciar implementação |
| B6.4 | Design system já passou por uma atualização de tokens em 2026-09-04 (Pacote de Refinamento, `UX-SPEC.md` Seção 3.1) — esta iniciativa pode substituir ou estender esses tokens | Se o UX/UI tratar os dois conjuntos de tokens como coexistentes sem decisão explícita, risco de inconsistência dentro da própria Seção 3 do `UX-SPEC.md` | Média | UX/UI (decidir e documentar explicitamente: substituição total ou extensão) | No Lote 0, antes de qualquer lote de tela |
| B6.5 | Baseline de N1 (aderência ao design system) é desconhecido — nenhuma auditoria de consistência foi feita ainda sobre as 4 telas com os mockups como referência | Sem essa auditoria, N1 não tem baseline real, só a meta (100%) | Baixa | UX/UI (`design-system-consistency-check`) | Antes do início do Lote 0 |
| B6.6 | Estratégia de corte em produção (big-bang vs. gradual por tela/feature flag) ainda não definida | Sem definição explícita, risco de indisponibilidade ou inconsistência visual percebida durante a transição, mesma classe de risco já tratada para RPO/backup (`ADR-009`) | Média | Software Architect (`SDD.md` desta iniciativa) | Até o Gate 2 desta iniciativa |
| B6.7 | Ausência de orçamento/prazo formal para esta iniciativa segue não confirmada (mesma lacuna da Seção 6 do `PRD.md` original, nunca fechada) | Faseamento em 14 lotes assume tolerância do stakeholder a entrega incremental sem data-alvo; se houver expectativa de prazo não declarada, pode gerar desalinhamento — agravado pela expansão de escopo (Bloqueio 021) | Alta (agravada pela expansão de escopo a todo o projeto) | PM (com o stakeholder) | Antes do Business Analyst iniciar o detalhamento |
| B6.8 | Capacidade declarada como execução solo/serial (`CTO-REVIEW.md` Gate 3 original) segue valendo — 14 lotes tendem a somar esforço, não a rodar em paralelo real; o dimensionamento saltou de "4 telas × 2 breakpoints" (avaliado no Gate 1 desta iniciativa) para "todo o projeto" (~9 domínios adicionais, Grupo B) | Se assumido implicitamente que os 14 lotes correm em paralelo, ou que o esforço total é comparável ao que o Gate 1 avaliou, o cronograma real diverge fortemente do planejado — mesma classe de risco já demonstrada em rodadas anteriores, agora em escala maior | Alta (escalada em relação à versão anterior deste risco, por causa da expansão de escopo) | Tech Lead (ao decompor `TASK.md` desta iniciativa) + CTO (pulso de capacidade/prazo sobre o escopo ampliado, ver Bloqueio 021) | Ao planejar o `TASK.md` desta iniciativa; CTO antes disso, conforme Bloqueio 021 |
| B6.9 | Nenhuma mudança de comportamento/regra de negócio é esperada por padrão (Seção B.4); risco de que a extração dos mockups revele uma mudança de fluxo não intencional (disfarçada de "só visual") | Se não nomeada como RF explícito, pode ser implementada silenciosamente, violando a ressalva 3 do Gate 1 e o guardrail candidato desta seção | Alta (se ocorrer sem ser nomeada) | UX/UI (sinalizar ao BA/PM) + Business Analyst (formalizar como RF, se confirmado) | A cada lote, na extração dos mockups |
| B6.10 | Não-regressão de WCAG 2.1 AA (N3) depende de o `ux-ui` preservar as regras já formalizadas em `UX-SPEC.md` Seção 5 ao adaptar o visual aos mockups (ex.: contraste de cor pode mudar com nova paleta) | Se a nova paleta de cor dos mockups não atender ≥ 4.5:1 de contraste, N3 falha e a paleta precisa de ajuste antes do lote ser considerado pronto | Média | UX/UI (validar contraste da nova paleta antes de formalizar tokens no Lote 0) | No Lote 0 |
| B6.11 | O Grupo B (telas sem mockup próprio, Seção B.4) depende de o Lote 0 consolidar princípios de design system genuinamente **reutilizáveis** (tokens + padrões de componente generalizáveis), não apenas 4 aplicações pontuais aos artboards existentes — os mockups cobrem telas de lista/dashboard/cards, mas não cobrem, por exemplo, telas de formulário isolado pré-sessão (Auth), fluxo de captura por voz/foto, ou tabelas de fatura | Se o Lote 0 não abstrair além do que os 4 artboards mostram literalmente, a extrapolação para o Grupo B fica sujeita a interpretação divergente lote a lote, comprometendo N1/N2 nos Lotes 5-13 mesmo com N1/N2 satisfeitos nos Lotes 1-4 | Alta | UX/UI (consolidar o design system do Lote 0 com esse objetivo explícito, não só documentar o que os mockups mostram) | No Lote 0, antes de qualquer lote do Grupo B iniciar |
| B6.12 | Expansão de escopo (4 telas → todo o projeto) ocorreu **depois** do Gate 1 desta iniciativa, cuja análise de risco de execução (`CTO-REVIEW.md`) foi construída especificamente sobre o dimensionamento de "4 telas × 2 breakpoints" | Enquanto o CTO não revisar essa expansão, os Lotes 5-13 (Grupo B) não devem ser tratados como roadmap comprometido, apenas como direção de escopo já validada em natureza (redesign visual, camada de apresentação), não em tamanho | Alta | CTO (`BLOCKERS.md` Bloqueio 021) | Antes de o Tech Lead comprometer estimativa de prazo para os Lotes 5-13 em `TASK.md` |

## B.7 Perguntas em Aberto para o Business Analyst

1. Para cada um dos 14 lotes (Seção B.5), levantar junto ao UX/UI (que tem acesso
   real ao canvas, para o Grupo A; e que fará a extrapolação, para o Grupo B) se há
   algo que pareça mudar comportamento/fluxo, não só aparência — e, se houver,
   formalizar como RF novo nomeado (não absorver silenciosamente, ver risco B6.9).
2. Detalhar com o stakeholder o critério exato do checklist de aprovação por tela
   (N2, Seção B.3): quais elementos específicos serão comparados linha a linha
   contra cada artboard (paleta, tipografia, espaçamento, iconografia, disposição de
   componentes) — o PM fixou a existência do checklist, o BA detalha seu conteúdo
   exato.
3. Confirmar com o stakeholder se há preferência de manter uma tela antiga
   disponível como "fallback" durante a transição de cada lote (estratégia de corte
   é decisão do Software Architect, mas a expectativa do stakeholder sobre
   continuidade de uso durante a transição deve ser levantada pelo BA).
4. Confirmar se a ordem Dashboard → Lançamentos → Contas & Cartões → Categorias
   (Seção B.5) é aceitável para o stakeholder ou se há preferência diferente — a
   ordem proposta é estimativa do PM, não medição real de uso.
5. Confirmar se o redesign inclui revisão de copy/texto de UI (rótulos, mensagens)
   além do que aparece literalmente nos mockups, ou se todo texto atual é
   preservado por padrão (Seção B.4, "Fora do escopo").
6. Levantar com o UX/UI se a nova paleta de cor dos mockups mantém contraste
   WCOG ≥ 4.5:1 sobre `color.surface` (risco B6.10) — se não, formalizar com o
   stakeholder qual ajuste de tom é aceitável sem descaracterizar a referência
   visual.
7. Confirmar com o stakeholder a ordem/agrupamento indicativo do Grupo B (Lotes
   5-13, Seção B.4/B.5) — a classificação Next/Later e o agrupamento por domínio são
   estimativa do PM, não medição real de uso nem decisão já validada pelo CTO em
   termos de capacidade/prazo (ver Bloqueio 021); o BA deve levantar se o
   stakeholder tem preferência de ordem diferente antes de o Tech Lead comprometer
   sequenciamento em `TASK.md`.

---

### Stakeholder Alignment Check (Adendo B)

Checklist comparado item a item contra `CTO-REVIEW.md`, "Gate 1 (Nova Iniciativa —
Redesign Visual 'MyMoney v2.0') — 2026-09-04":

- **Objetivo de negócio**: extraído do stakeholder antes de decompor escopo
  (combinação (a)+(c), (b)/(d) descartadas explicitamente) — atende à ressalva 1 do
  Gate 1, que exigia exatamente essa extração antes de qualquer decomposição. Sem
  divergência.
- **Faseamento**: proposto explicitamente por tela/domínio, com uma camada de
  fundação de design system (Lote 0) precedendo todos os demais — atende à
  ressalva 2 (recomendação do CTO adotada e justificada com razões próprias do PM,
  Seção B.5, reforçada pela expansão de escopo). Sem divergência quanto à *forma*
  do faseamento (por lote, não corte único).
- **Camada de apresentação**: escopo declarado por padrão como visual; guardrail
  candidato formalizado para que mudança de comportamento vire RF nomeado — atende à
  ressalva 3. Sem divergência.
- **"Mobile" = breakpoint responsivo**: confirmado explicitamente pelo stakeholder e
  registrado como premissa (B6.2), não presumido — atende à ressalva 4. Sem
  divergência.
- **Estratégia de corte/WCAG**: deixadas para o Software Architect/UX-UI resolverem
  no Gate 2 desta iniciativa, registradas como premissa (B6.6) e objetivo mensurável
  (N3) — atende à ressalva 5. Sem divergência.
- **Gap de roster**: nenhum papel novo identificado; `mobile` segue não acionado,
  condicionado à premissa B6.2 — consistente com a observação 6 do Gate 1. Sem
  divergência.
- **Orçamento/prazo**: hipótese segue não confirmada para esta iniciativa
  específica, registrada como risco (B6.7), mesma natureza de lacuna não-bloqueante
  já aceita desde o Gate 1 original — não é uma divergência nova, é a mesma lacuna
  histórica reafirmada, coerente com a pergunta 5 do gate de entrada (que também não
  exigia resposta bloqueante). Agravada, não criada, pela expansão de escopo abaixo.

**Divergência identificada e escalada — dimensionamento do escopo (não o objetivo
de negócio nem a natureza do redesign)**: o Gate 1 desta iniciativa
(`CTO-REVIEW.md`) avaliou risco de execução e recomendou faseamento **sobre um
dimensionamento explícito de "4 telas × 2 breakpoints"** — a seção "Risco de
escopo" do gate cita esse tamanho especificamente ao aplicar a "Declaração de
capacidade" (execução solo/serial, `CTO-REVIEW.md` Gate 3 original) como base de
julgamento. A correção de escopo recebida do stakeholder **depois** da produção
inicial deste adendo (ver cabeçalho, "Correção de escopo pós-gate") expande o
tamanho real para todo o projeto (14 lotes, ~9 domínios adicionais ao Grupo A) —
uma mudança de magnitude, não só de detalhe, na variável que o Gate 1 usou para
julgar risco de execução. Por guardrail do PM ("nunca decidir sozinho que um
conflito percebido com o Gate 1 não deve ser um problema"), **não decido
unilateralmente que esta expansão está automaticamente coberta pelo veredito já
dado** — registro como:
1. Risco B6.8 (atualizado) e risco novo B6.12, Seção B.6.
2. `BLOCKERS.md`, Bloqueio 021, **escalado ao CTO**, pedindo um pulso de
   capacidade/prazo sobre o escopo ampliado (mesmo mecanismo de reabertura pontual
   já usado neste projeto para o ADR-004 e para o Bloqueio 003 — não é reprovação
   do que já foi decidido, é extensão de uma variável que a decisão original não
   cobria).

**Isto não bloqueia a liberação deste adendo para o Business Analyst.** O objetivo
de negócio, a natureza do redesign (camada de apresentação), a confirmação de
"Mobile" e a lógica de faseamento por lote — tudo o que o Gate 1 efetivamente
avaliou — permanece sem divergência (itens acima). O que fica pendente de
confirmação do CTO é especificamente a **viabilidade de tratar os Lotes 5-13 como
roadmap comprometido** de imediato; o BA pode prosseguir com o detalhamento dos
Lotes 0-4 (dentro do que o Gate 1 já avaliou) e com o levantamento inicial dos
Lotes 5-13 (natureza/conteúdo, não compromisso de prazo), sem aguardar essa
confirmação — mas o Tech Lead não deve comprometer estimativa de prazo agregado
para os Lotes 5-13 em `TASK.md` antes dela (ver risco B6.12).

**Resultado: uma divergência identificada e escalada (dimensionamento do escopo
vs. o que o Gate 1 avaliou) — não bloqueante para a liberação deste adendo, mas
registrada formalmente, não absorvida silenciosamente.** Adendo B do `PRD.md`
liberado para o Business Analyst em 2026-09-04, com a pendência acima explícita.
