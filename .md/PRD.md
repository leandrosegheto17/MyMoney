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
