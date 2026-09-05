# UX-SPEC.md

**Dono**: UX/UI
**Data**: 2026-09-02
**Gate de entrada**: `SDD.md` aprovado com ressalvas no Gate 2 do CTO (2026-09-02,
`CTO-REVIEW.md`) + `PRD-TECNICO.md` liberado pelo Business Analyst (2026-09-02).
**Fonte**: `SDD.md` (arquitetura, stack, restrições técnicas, ADR-001 a 009) +
`PRD-TECNICO.md` (requisitos funcionais/não-funcionais, regras de negócio, fluxos
FL-01 a FL-05) + `CTO-REVIEW.md` Gate 2 (ressalvas de arquitetura relevantes à
experiência, em especial RNF-01 elevada a barreira arquitetural).
**Consumidor imediato**: `tech-lead` (estimativa de esforço, em paralelo — este
documento não espera o Tech Lead terminar nada, e o Tech Lead não espera este
documento fechar por completo); contexto futuro para `frontend`, `mobile`, `qa`.

**Nota de publicação**: este é o primeiro `UX-SPEC.md` do projeto — não existe design
system nem tela anterior a este pipeline. Por isso, toda tela e todo componente
listados abaixo são, por definição, novos nesta primeira versão. A Seção 3 organiza os
componentes em duas camadas (Base vs. Específicos de domínio) para dar ao Tech Lead o
mesmo sinal de atenção que uma checagem de consistência daria num projeto com sistema
pré-existente. Qualquer mudança futura a um componente já estimado pelo Tech Lead
entra como edição visível neste arquivo + registro no "Log de Alterações Pós-Publicação"
(final do documento), nunca como sobrescrita silenciosa.

**Escopo coberto**: MVP, Fase 2 e Fase 3, na mesma segmentação de fases do `PRD.md`/
`PRD-TECNICO.md`/`SDD.md`. Nenhuma tela de Fase 2/3 é pré-requisito de implementação do
MVP — a segmentação por fase é preservada também na experiência, não só no backlog.

**Convenção de IDs**: `S-<DOMÍNIO>-NN` para telas, `UX-FL-NN` para fluxos (`UX-FL-01` a
`UX-FL-05` espelham 1:1 os fluxos `FL-01` a `FL-05` do `PRD-TECNICO.md`, adicionando o
detalhamento de tela; `UX-FL-06` em diante cobrem fluxos de CRUD que o BA não
diagramou em Mermaid por serem estruturalmente simples, mas que ainda precisam de tela
mapeada).

---

## 1. Fluxos de Tela

### 1.1 Fluxos com diagrama no `PRD-TECNICO.md` (detalhados em tela)

| Fluxo UX | Fluxo PRD-TECNICO | Telas na sequência | Requisitos | Fase |
|---|---|---|---|---|
| UX-FL-01 | FL-01 — Lançamento Manual | S-AUTH-03 (se sessão bloqueada) → S-TXN-01 → S-TXN-02 (novo) → toast sucesso → S-DASH-01 (saldo atualizado) | RF-MVP-04, RF-MVP-05 AC2 | MVP |
| UX-FL-02 | FL-02 — Fechamento de Fatura e Lançamento no Cartão | S-TXN-02 (lançamento no cartão) → sistema decide fatura (sem tela própria, é regra de negócio invisível ao usuário) → S-CARD-03 (fatura projetada, total recalculado) | RF-F2-05 AC2, RN-01, RN-06 | Fase 2 |
| UX-FL-03 | FL-03 — Reajuste de Valor de Recorrência | S-REC-01 → S-REC-02 (editar valor) → S-REC-03 (confirmação "a partir de qual competência?") → confirma/cancela → S-REC-01 atualizada | RF-F2-03, RN-02 | Fase 2 |
| UX-FL-04 | FL-04 — Captura Automatizada com Confirmação Humana Obrigatória (voz/foto) | S-CAP-01 (escolher método) → S-CAP-02 (voz) ou S-CAP-04 (foto) → processamento → **S-CAP-03/S-CAP-05 (rascunho de confirmação, RNF-01)** → confirma → toast + flag de origem → S-DASH-01 / S-CARD-03 se aplicável | RF-F3-01, RF-F3-02, RNF-01, RNF-08 | Fase 3 |
| UX-FL-05 | FL-05 — Importação de Extrato / Open Finance | S-CAP-06 (upload OFX/CSV) ou S-CAP-08/09 (conexão Open Finance) → S-CAP-07 (lista de candidatos, duplicatas sinalizadas) → confirma seleção → toast "N lançamentos importados" → S-TXN-01 | RF-F3-03, RF-F3-04, RNF-01 (extensão AMB-06b) | Fase 3 |
| UX-FL-21 **[NOVO, 2026-09-04]** | FL-06 — Lançamento Manual com Atalho de Subcategoria e Forma de Pagamento Unificada (`PRD-TECNICO.md` Adendo A) | S-TXN-01 (barra de atalhos, `ShortcutBar`) → clique em atalho → S-TXN-02 (formulário unificado, sem campo "Conta", foco automático no campo Valor) **ou** botão "+ Novo" → S-TXN-02 (formulário completo) → confirma → toast sucesso → S-DASH-01 (saldo atualizado) | RF-REF-02, RF-REF-03, RF-REF-04, RN-12 a RN-16 | Fase 2.1 (Pacote de Refinamento) |
| UX-FL-22 **[NOVO, 2026-09-04]** | FL-07 — Cadastro de Conta Nova e Geração Automática de Formas de Pagamento (`PRD-TECNICO.md` Adendo A) | S-ACC-02 (nova conta) → sistema gera automaticamente Pix/Débito/Boleto/Dinheiro vinculados à nova conta (sem tela própria, efeito de backend) → S-PAY-01 (lista reflete as novas formas, rótulos passam a exibir sufixo de conta se a conta ativa total é > 1) | RN-15, RN-14 | Fase 2.1 (Pacote de Refinamento) |

> **Nota de reabertura (2026-09-03, `BLOCKERS.md` Bloqueio 008)**: a publicação
> original deste documento (2026-09-02) pulava de "S-AUTH-01" direto para
> "S-AUTH-03" — lacuna de numeração, não uma omissão deliberada. O 2º fator por
> e-mail (`/auth-email-mfa`, Edge Function reaproveitada por `BE-M-09`/Bloqueio
> 005) só foi confirmado como parte real de RF-MVP-08 quando `API-CONTRACT.yaml`
> publicou seu contrato em v0.6.0 (2026-09-03) — posterior à publicação original
> deste `UX-SPEC.md`. "S-AUTH-02" está formalizada nesta atualização (Seção 2.2),
> preenchendo o gap. Nenhuma outra tela é afetada por esta reabertura.

> **Nota de descontinuação (2026-09-04, `adr/014-remocao-definitiva-do-segundo-fator-por-email.md`)**:
> S-AUTH-02 (verificação por e-mail, 2º fator) foi **removida definitivamente** do
> fluxo — decisão do stakeholder, não uma reversão temporária. O fluxo de login
> passa a ser S-AUTH-01 → S-AUTH-04 (setup PIN, 1ª vez)/S-AUTH-03 (desbloqueio,
> demais vezes), sem passo intermediário de verificação por e-mail. O wireframe e
> as referências a S-AUTH-02 abaixo (Seções 2.2, 4.2, 5, 6.3, 7.1) são mantidos
> como registro histórico do que foi especificado, não como tela ativa — nenhuma
> implementação deve renderizá-la.

> **Nota de extensão (2026-09-04, Pacote de Refinamento de Produção — `UX-SPEC.md`
> Adendo A)**: `PRD-TECNICO.md` Adendo A nomeia dois novos fluxos diagramados como
> `FL-06` e `FL-07`. Este documento **não** os batiza como "UX-FL-06"/"UX-FL-07"
> porque esses dois números já estão ocupados desde a publicação original (Seção
> 1.2, "Cadastro/gestão de contas" e "Cadastro/gestão de formas de pagamento") —
> reaproveitá-los criaria uma colisão de numeração, o mesmo tipo de problema que a
> Nota de reabertura acima (Bloqueio 008) já teve de corrigir. Os novos fluxos
> recebem `UX-FL-21` e `UX-FL-22`, continuando a sequência a partir do último ID
> livre (`UX-FL-20`, Seção 1.2). Além dos dois fluxos novos, este pacote também
> **reutiliza** fluxos e telas já mapeados sem introduzir ID novo: RF-REF-01
> (dashboard) afeta apenas o layout de `S-DASH-01`, já coberto por múltiplos fluxos
> existentes; RF-REF-05/06 (Categorias/Orçamento em cards) afetam apenas o layout de
> `S-CAT-01`/`S-BUD-01`, já cobertos por `UX-FL-08`/`UX-FL-09` (Seção 1.2) — nenhum
> desses três itens exige fluxo novo, só mudança de wireframe (Seção 2), registrada
> como tal abaixo.

> **Nota de extensão (2026-09-04, Redesign Visual "MyMoney v2.0" — `PRD-TECNICO.md`
> Adendo B, `SDD.md` Adendo B, ADR-017/ADR-018, `CTO-REVIEW.md` Gate 2 desta
> iniciativa "Aprovado com ressalvas")**: os 4 lotes do Grupo A (RF-RS-01 a 04)
> **não introduzem fluxo de usuário novo** — cada um reaplica a camada visual sobre
> um fluxo já mapeado (`UX-FL-01`/`UX-FL-21` para Lançamentos, Lote 2; fluxos de
> CRUD estrutural da Seção 1.2 para Dashboard/Contas & Cartões/Categorias, Lotes
> 1/3/4), confirmando RN-20 (nenhuma regra de negócio ou fluxo já fixado é
> reaberto). Nenhum `UX-FL-NN` novo é criado por este redesign — a mudança é só de
> wireframe/token, registrada na Seção 2 e na Seção 3.0. O Lote 0 (RF-RS-00,
> fundação do design system) também não é um fluxo de usuário — é processo de
> trabalho do próprio `ux-ui`, já diagramado pelo BA como `FL-08`
> (`PRD-TECNICO.md` Adendo B), sem contraparte de tela. O Grupo B (Lotes 5-13)
> recebe diretrizes leves de aplicação do design system (Seção 2.3), sem RF/AC
> tela a tela, conforme resolução do CTO ao `BLOCKERS.md` Bloqueio 021.
>
> **Nota de execução — limitação de ferramenta nesta rodada, não uma decisão de
> design**: RF-RS-00 AC1/AC2 e RF-RS-01 a 04 AC2 pressupõem acesso visual direto do
> `ux-ui` aos 8 artboards do canvas Claude Design ("MyMoney v2.0 — Mockups"). Nesta
> sessão de trabalho, a ferramenta de leitura de artifact necessária para abrir
> esse canvas **não está disponível** no ambiente de execução deste agente — uma
> tentativa de acesso via busca web genérica ao link do canvas retornou apenas o
> invólucro da página (sem conteúdo visual/artboards), confirmando a
> indisponibilidade, não uma escolha de não tentar. É a mesma classe de limitação
> que o BA já registrou para si mesmo (risco B6.3, `PRD-TECNICO.md` Adendo B: "BA
> também não tem acesso visual ao canvas nesta rodada") e que o Software Architect
> também registrou (`SDD.md` Adendo B, B6.3/B6.10) — mas, aqui, atinge diretamente
> o dono natural da extração (`ux-ui`), que é quem deveria resolvê-la. Consequência
> aplicada de forma consistente em toda esta extensão do documento:
> 1. Nenhum valor de token (cor/tipografia/raio/elevação) é inventado a partir de
>    uma paleta que não foi vista — a Seção 3.0/3.1 **estende** o conjunto de
>    tokens já vigente e validado em produção (repaginada 2026-09-04), em vez de
>    substituí-lo por valores fabricados (decisão exigida explicitamente por
>    RF-RS-00 AC1, nunca deixada implícita).
> 2. A comparação "linha a linha" contra cada artboard (meta N2, RF-RS-01 a 04
>    AC2) permanece **ação pendente explícita**, não escondida — mesmo tratamento
>    já dado ao baseline de rolagem M4 (RF-REF-01 AC4) na revisão anterior deste
>    documento.
> 3. A validação de contraste de "nova paleta" (RF-RS-00 AC3) não pode ser fechada
>    como um evento novo nesta rodada porque não há paleta nova a validar — os
>    tokens de cor já vigentes já foram validados quanto a contraste na revisão de
>    2026-09-04 (Seção 5); essa validação permanece o estado de fato até que
>    acesso visual real ao canvas confirme se os mockups pedem algo além disso.
>
> Ver Seção 3.0 para o detalhamento da fundação do Lote 0 sob esta restrição, e
> Seção 7.2 para o registro formal desta pendência como restrição de execução (não
> um conflito com o Software Architect).

### 1.2 Fluxos de CRUD estrutural (mapeados pelo UX/UI, sem diagrama próprio no BA por serem simples, mas com tela obrigatória)

| Fluxo UX | Descrição | Telas | Requisitos | Fase |
|---|---|---|---|---|
| UX-FL-06 | Cadastro/gestão de contas | S-ACC-01 → S-ACC-02 (novo/editar) → S-ACC-04 (inativação, se houver vínculo) | RF-MVP-01, RN-08 | MVP |
| UX-FL-07 | Cadastro/gestão de formas de pagamento | S-PAY-01 → S-PAY-02 (customizada) | RF-MVP-02 | MVP |
| UX-FL-08 | Cadastro/gestão de categorias/subcategorias | S-CAT-01 → S-CAT-02 (novo/editar) → S-CAT-03 (bloqueio de exclusão com sugestão de reclassificação) | RF-MVP-03, RN-09 | MVP |
| UX-FL-09 | Definição de orçamento por categoria | S-BUD-01 → S-BUD-02 (definir teto) → alerta inline (80%/100%+) | RF-MVP-07, RN-04 | MVP |
| UX-FL-10 | Login e desbloqueio seguro | S-AUTH-01 (login) → ~~S-AUTH-02 (verificação por e-mail)~~ **removida, ADR-014** → S-AUTH-04 (setup PIN, 1ª vez) → S-AUTH-03 (desbloqueio local, toda abertura/retomada do app) → S-AUTH-05 (bloqueio temporário) → S-SET-01 (logout explícito) | RF-MVP-08 | MVP |
| UX-FL-11 | Onboarding de primeiro acesso | S-ONB-01 (boas-vindas + 1ª conta) → S-ONB-02 (revisão da taxonomia padrão) → S-DASH-01 | RF-MVP-01, RF-MVP-03, RN-09 | MVP |
| UX-FL-12 | Cadastro de cartão + compra parcelada | S-CARD-01 → S-CARD-02 (novo cartão) → S-INST-01 (nova compra parcelada) → S-INST-02 (progresso de parcelas) | RF-F2-01, RF-F2-04 | Fase 2 |
| UX-FL-13 | Recorrência: criação e encerramento | S-REC-01 → S-REC-02 (novo template) / S-REC-04 (encerrar, preserva histórico RN-07) | RF-F2-02, RN-07 | Fase 2 |
| UX-FL-14 | Contas fixas: cadastro, vencimento e pagamento | S-FIX-01 → S-FIX-02 (nova) → aviso 3 dias antes (S-NOT-01/S-NOT-02) → S-FIX-03 (marcar como paga) → badge "vencida" se não paga | RF-F2-06, RF-F2-07, RN-05 | Fase 2 |
| UX-FL-15 | Metas: criação, aporte e progresso | S-GOAL-01 → S-GOAL-02 (nova meta) → S-GOAL-03 (registrar aporte) → S-GOAL-04 (progresso) | RF-F2-08 | Fase 2 |
| UX-FL-16 | Notificações (central + push) | S-NOT-02 (toast/push no momento do gatilho) → S-NOT-01 (histórico, sempre disponível independentemente de push) | RF-F2-09 | Fase 2 |
| UX-FL-17 | Relatório entradas vs. saídas mês a mês | S-DASH-01 (card de entrada) → S-REP-01 | RF-F2-10 | Fase 2 |
| UX-FL-18 | Relatório de evolução patrimonial | S-REP-02, filtrável por conta | RF-F3-05 | Fase 3 |
| UX-FL-19 | Exportação de relatórios | S-REP-03 (escolher período + formato CSV/PDF) → download/compartilhamento | RF-F3-06 | Fase 3 |
| UX-FL-20 | Configurações e preferências de alerta | S-SET-01 → S-SET-02 (notificações) → S-SET-03 (limiares de orçamento/aviso de conta fixa, RN-04/RN-05) | RF-MVP-08 AC3, RN-04, RN-05 | MVP/F2 |

> **Nota (2026-09-04, Pacote de Refinamento — `UX-SPEC.md` Adendo A)**: `UX-FL-08`
> (Categorias) e `UX-FL-09` (Orçamento) passam a renderizar `S-CAT-01`/`S-BUD-01`
> como grade de cards em vez de lista expansível (RF-REF-05, RF-REF-06) — a
> sequência de telas de cada fluxo não muda (ainda é lista → novo/editar →
> bloqueio de exclusão, no caso de Categorias), só o wireframe do 1º passo. Ver
> Seção 2.2 para o novo layout.

---

## 2. Wireframes / Descrição de Layout por Tela

### 2.1 Padrões de layout reutilizáveis (definidos uma vez, referenciados pelas telas de CRUD)

**Padrão A — Lista + Formulário CRUD** (usado por Contas, Formas de Pagamento,
Categorias, Cartões, Recorrências, Contas Fixas, Metas):

```
[Topo] Título da seção + botão "+ Novo"
[Corpo] Lista de itens (card ou linha), cada item com:
        - identificação principal (nome/descrição)
        - dado secundário relevante (saldo, valor, dia do mês, etc.)
        - badge de status quando aplicável (ativa/inativa, aberta/fechada, vencida)
        - ação rápida (editar / três-pontinhos com mais ações)
[Rodapé] Estado vazio com CTA quando lista vazia (ver Seção 4)
```

Formulário (novo/editar), aberto como modal (desktop) ou tela cheia/bottom sheet
(mobile — ver Seção 6):

```
[Topo] Título ("Nova conta" / "Editar conta") + botão fechar (X)
[Corpo] Campos do domínio (ver tabela por tela abaixo), validação inline
[Rodapé] Botão secundário "Cancelar" + botão primário "Salvar"
```

> **Adendo 2026-09-04 — regras de responsividade que previnem corte de conteúdo
> (revisão geral de layout + "skin" visual, `technical-constraint-check` não
> aplicável aqui: é ajuste dentro do que o `SDD.md` já permite, sem conflito de
> arquitetura)**. Esta revisão nasce de um problema real reportado pelo dono do
> produto ("muitos campos estão cortando em tela") depois de auditoria do código
> em `frontend/src/pages/**` e `frontend/src/components/{base,domain}/**` — não é
> um redesenho especulativo. Duas regras passam a ser parte obrigatória do
> Padrão A/B a partir desta data, para toda tela nova e toda tela existente
> revisitada pelo `frontend`:
>
> 1. **Linha de item de lista com ação (o "Card de item")**: quando o item combina
>    bloco de identificação (nome/descrição + dado secundário) **e** um bloco de
>    ações à direita (valor + 1 a 3 botões), o layout deixa de ser uma única linha
>    `flex items-center justify-between` sem `flex-wrap`/`min-w-0`. Passa a ser:
>    - bloco de identificação sempre com `min-w-0 flex-1` + nome/descrição em
>      `truncate` (com `title=` nativo para o texto completo, já que "tooltip"
>      customizado não é um componente deste design system) — nunca deixa o texto
>      empurrar os botões para fora da viewport;
>    - bloco de ações permite `flex-wrap` no mobile (`< sm`, 640px) — 3 botões
>      (ex.: "Reajustar valor" / "Encerrar" / "Excluir" em `S-REC-01`, ou
>      "+ Subcategoria" / "Editar" / "Excluir" em `S-CAT-01`) podem ocupar 2 linhas
>      no mobile em vez de forçar 1 linha que ultrapassa a largura da tela;
>    - a partir de `sm` (≥ 640px), o item pode voltar a uma linha única porque há
>      espaço suficiente — não é preciso manter o wrap em telas maiores.
>    Esta regra vale para todo item de lista do Padrão A (Contas, Formas de
>    Pagamento, Categorias, Cartões, Compras Parceladas, Recorrências, Contas
>    Fixas, Orçamento, Lançamentos) e para a linha de lançamento dentro de
>    `InvoiceTimeline` (S-CARD-03).
> 2. **Formulário com mais de 4 campos**: deixa de ser sempre 1 coluna. Passa a
>    seguir grid responsivo — **1 coluna no mobile (`< md`, 768px)**, **2 colunas a
>    partir de `md`** — com toda célula de grid recebendo `min-w-0` (obrigatório
>    para qualquer `Select`/`CategoryPicker` com texto longo dentro de uma célula
>    de grid, ver Seção 3.1.1). Campos de largura naturalmente maior (Descrição em
>    texto livre, o par Categoria/Subcategoria do `CategoryPicker`) podem ocupar as
>    2 colunas (`col-span-2` a partir de `md`) mesmo dentro desse grid. Esta regra
>    se aplica a todo formulário do Padrão A com 5+ campos — na prática:
>    `S-INST-01` (8 campos), `S-FIX-02` (8 campos), `S-REC-02` (8 campos),
>    `S-CARD-02` (4 campos, no limite — decisão do `frontend` se aplica o grid ou
>    mantém 1 coluna), `S-TXN-02` (7 campos). Formulários com até 4 campos
>    (`S-ACC-02`, `S-CAT-02`, `S-PAY-02`, `S-BUD-02`, `S-GOAL-02`) permanecem em 1
>    coluna — não há problema de corte a resolver neles, e forçar 2 colunas nesses
>    casos criaria um formulário desequilibrado sem ganho real de espaço.

**Padrão B — Confirmação de Ação Destrutiva/Sensível** (inativação de conta,
exclusão de lançamento, encerramento de recorrência, confirmação de reajuste):
modal centralizado (desktop) / bottom sheet (mobile) com título direto, explicação de
consequência em uma frase, e dois botões de mesmo peso visual (nunca um botão
destrutivo pré-focado por padrão) — nunca uma única ação "confirmar" implícita.

> **Padrão C — Grade de Cards de Resumo [NOVO, 2026-09-04, Pacote de Refinamento
> de Produção, RF-REF-05/RF-REF-06]**: usado por Categorias (`S-CAT-01`) e
> Orçamento (`S-BUD-01`), substituindo a lista expansível desses dois domínios.
> Um único padrão de grade compartilhado entre os dois — não dois desenhos de
> card divergentes — para satisfazer `design-system-consistency-check`:
>
> ```
> [Topo] Título da seção + botão "+ Novo" (mesma posição do Padrão A)
> [Corpo] Grade de cards, 1 card por item de topo-nível:
>         - cabeçalho do card: nome + ícone/cor, se cadastrados
>         - dado(s) de resumo já calculado(s) por RF-MVP-06/07 (sem novo cálculo
>           de backend — reaproveita RPC já existente, `SDD.md` Adendo A.2.4)
>         - indicador de card inteiro clicável para a ação primária (ver
>           "Card clicável" abaixo)
> [Rodapé] Estado vazio com CTA quando a grade está vazia (ver Seção 4)
> ```
>
> **Breakpoints da grade** (reaproveita a mesma convenção de colunas responsivas
> já usada em toda a Seção 6, não um valor novo por tela): `grid-cols-1` (base,
> < 640px) → `sm:grid-cols-2` (≥ 640px) → `lg:grid-cols-3` (≥ 1024px) →
> `xl:grid-cols-4` (≥ 1280px). Card individual sempre com `min-w-0` (mesma regra
> anti-corte da Seção 3.1.1, já que o nome da categoria pode ser longo).
>
> **Card clicável — regra de acessibilidade obrigatória (não é detalhe
> opcional)**: o card **não** é, ele mesmo, um único elemento `<button>`/`<a>`
> envolvendo todo o conteúdo, porque cada card também expõe ação(ões) de edição
> secundárias (ex.: ícone "Editar" no `CategoryCard`) — aninhar um elemento
> interativo dentro de outro elemento interativo (`<button>` dentro de
> `<button>`) é HTML inválido e quebra leitor de tela/navegação por teclado.
> Estrutura correta: o card é um contêiner não-interativo (`<article>`/`<div>`);
> a área de maior destaque (nome + ícone) é o elemento clicável primário
> (`<button>` ou `<a>`, com `aria-label` descritivo, ex. "Ver subcategorias de
> Alimentação"), cobrindo visualmente a maior parte do card via padding; a(s)
> ação(ões) secundária(s) (ex. ícone de editar) é um `<button>` **irmão**, fora
> do elemento clicável primário, não aninhado dentro dele. Ver Seção 5 para o
> detalhamento completo desta regra.

### 2.2 Telas por domínio

#### Autenticação e sessão (MVP)

| Tela | Layout |
|---|---|
| **S-AUTH-01** Login | Campo e-mail, campo senha (ou botão "Enviar link mágico"), botão "Entrar", link "Esqueci minha senha". Sem navegação lateral — tela isolada, pré-sessão. |
| **S-AUTH-02** Verificação por e-mail (2º fator) **[NOVA — formalizada nesta atualização, ver Nota de reabertura Seção 1.1]** | Tela cheia, sem navegação, mesma família visual de S-AUTH-01/04 (card centralizado, isolado). Disparada automaticamente pelo `AuthGate` assim que a sessão de e-mail/senha é emitida (JWT AAL1, sem o claim `app_email_mfa_verified` — `ADR-013`), antes de qualquer tela de PIN/dashboard. Ao entrar na tela, um código de 6 dígitos é enviado automaticamente ao e-mail da conta, sem exigir ação extra do usuário para o 1º envio. Título "Confirme seu e-mail" + texto explicativo citando o e-mail da conta; campo único de código (`Input`, `inputMode="numeric"`, `maxLength=6`, `autoComplete="one-time-code"`); botão primário "Verificar" (habilitado só com os 6 dígitos preenchidos); link "Reenviar código" com cooldown de 60s (rate limit real do contrato, Seção 7.1); link secundário "Voltar ao login" (encerra a sessão parcial, retorna a S-AUTH-01). **Reaparece a cada novo login que emita uma sessão nova** (JWT reemitido) — não se repete a cada abertura/retomada do app dentro da mesma sessão já verificada; esse segundo caso é coberto só por S-AUTH-03 (desbloqueio local, 100% offline, sem 2º fator). Nenhum componente novo de design system é introduzido — reaproveita integralmente `Input`/`Button`/`Alert` já especificados (Seção 3.2), no mesmo espírito visual de link-texto já usado em "Esqueci minha senha" (S-AUTH-01) e "Usar PIN em vez disso" (S-AUTH-03). |
| **S-AUTH-04** Setup de PIN (1ª vez) | Explicação curta ("Configure um PIN para desbloquear o app rapidamente"), teclado numérico grande (ver componente `PinPad`, Seção 3), confirmação do PIN digitado 2x, oferta de "Usar biometria" (WebAuthn) se disponível na plataforma, com opção "Pular por agora" **não disponível** — RF-MVP-08 AC1 exige autenticação antes de exibir dado financeiro, então este passo é obrigatório no primeiro acesso. |
| **S-AUTH-03** Desbloqueio (toda abertura/retomada do app) | Tela cheia, sem navegação, logo do app + prompt biométrico nativo do SO disparado automaticamente ao abrir + fallback visível "Usar PIN" sempre presente como link, mesmo com biometria disponível. Desbloqueio 100% local/offline, sem estado adicional de "sem conexão" — confirmado pelo Software Architect via ADR-010 (Conflito 1, Seção 7.2, Resolvido). |
| **S-AUTH-05** Bloqueio temporário | Mesma tela do S-AUTH-03, PIN pad desabilitado, mensagem "Muitas tentativas. Tente novamente em 04:32" com contagem regressiva ao vivo (baseline SDD: 5 tentativas / 5 min). |

```
S-AUTH-03 (wireframe)
┌─────────────────────────────┐
│         [Logo MyMoney]       │
│                               │
│     🔒 Desbloqueie o app     │
│                               │
│   [ Prompt biométrico nativo]│
│                               │
│      Usar PIN em vez disso   │  <- link, sempre visível
└─────────────────────────────┘
```

```
S-AUTH-02 (wireframe)
┌─────────────────────────────┐
│  Confirme seu e-mail         │
│  Enviamos um código de 6     │
│  dígitos para voce@email.com │
│                               │
│  [ Alert info/erro, conforme │
│    estado — ver Seção 4.2 ]  │
│                               │
│  Código de 6 dígitos          │
│  [ _ _ _ _ _ _ ]              │
│                               │
│      [ Verificar ]            │
│                               │
│   Reenviar código em 47s      │  <- ou "Reenviar código" (link ativo)
│      Voltar ao login          │  <- link, sempre visível
└─────────────────────────────┘
```

#### Onboarding (MVP)

| Tela | Layout |
|---|---|
| **S-ONB-01** | Passo 1/2: "Vamos cadastrar sua primeira conta" — formulário reduzido (nome, tipo, saldo inicial), sem opção de pular (sem conta, o app não tem o que mostrar — RF-MVP-01 é pré-requisito estrutural). |
| **S-ONB-02** | Passo 2/2: lista da taxonomia padrão de categorias/subcategorias pré-cadastrada (RN-09), com aviso "100% editável depois" e botão "Concluir" — não bloqueia edição posterior. |

#### Contas, Formas de Pagamento, Categorias (MVP) — seguem Padrão A

| Tela | Campos do formulário | Nota de layout específica |
|---|---|---|
| S-ACC-01/02 | Nome, tipo (corrente/poupança/carteira/investimento — select), saldo inicial (CurrencyInput) | Card de conta mostra saldo atual em destaque, cor neutra (não verde/vermelho — saldo de conta não é entrada/saída) |
| S-ACC-04 | — (confirmação, Padrão B) | Texto explícito: "Esta conta tem lançamentos vinculados. Ela será inativada, não excluída — o histórico permanece intacto." (RN-08) |
| S-PAY-01/02 | Nome, ícone (opcional) | As 5 formas padrão vêm com badge "Padrão", não editáveis/excluíveis; customizadas têm ação de editar/excluir |
| S-CAT-01/02 | Nome, categoria pai (select "Nenhuma" = categoria raiz) | **Revisado 2026-09-04 (RF-REF-05) — ver bloco abaixo.** Formulário de novo/editar (`S-CAT-02`) inalterado — a mudança é só no layout de listagem (`S-CAT-01`). |
| S-CAT-03 | — (bloqueio, não é formulário) | Modal: "Esta categoria tem N lançamentos vinculados. Reclassifique-os antes de excluir." + botão "Ver lançamentos desta categoria" |

> **`S-CAT-01` revisado (2026-09-04, RF-REF-05) — Categorias em grade de cards,
> substitui a lista em árvore recolhível descrita acima.** Segue o Padrão C
> (Seção 2.1). Um `CategoryCard` por categoria de topo-nível — subcategorias não
> aparecem mais indentadas na tela principal, ficam atrás do clique do card.
>
> ```
> S-CAT-01 (grade de cards, exemplo em `lg`/3 colunas)
> ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
> │ 🍔 Alimentação    │ │ 🚌 Transporte     │ │ 🏠 Moradia        │
> │ R$ 980,00 este mês│ │ R$ 420,00 este mês│ │ R$ 800,00 este mês│
> │ 4 subcategorias   │ │ 3 subcategorias   │ │ 2 subcategorias   │
> │              [✎]  │ │              [✎]  │ │              [✎]  │
> └─────────────────┘ └─────────────────┘ └─────────────────┘
> [+ Nova categoria]
> ```
>
> - Dado exibido sem clique adicional (RF-REF-05 AC2, AMB-15): nome, ícone/cor
>   (se cadastrados), total gasto no mês corrente (saídas da categoria + suas
>   subcategorias, mesmo cálculo já usado por RF-MVP-06), número de
>   subcategorias cadastradas.
> - **Clique no corpo do card** (elemento clicável primário, ver Padrão C):
>   abre `S-CAT-01a` — reaproveita `Modal` (desktop)/`BottomSheet` (mobile), já
>   existentes no design system, **não é um componente novo** — título
>   "{Categoria} — subcategorias", corpo com a lista de subcategorias (mesmo
>   item de lista do Padrão A, com ações "Editar"/"Excluir" por subcategoria,
>   já seguindo a regra de `flex-wrap` da Seção 2.1), rodapé com botão
>   "+ Nova subcategoria" (abre `S-CAT-02` com a categoria pai pré-selecionada)
>   e, no cabeçalho do modal, um ícone "Editar categoria" (edita nome/ícone/cor
>   da própria categoria de topo-nível, reabre `S-CAT-02`).
> - **Ícone "Editar" no canto do card** (`[✎]` no wireframe acima): ação
>   secundária, `<button>` irmão do clicável primário (nunca aninhado — regra
>   de acessibilidade do Padrão C), atalho direto para editar a categoria de
>   topo-nível sem passar pelo modal de subcategorias.
> - Grade colapsa conforme Padrão C (1 → 2 → 3 → 4 colunas).
> - `S-CAT-02` (formulário novo/editar) e `S-CAT-03` (bloqueio de exclusão)
>   permanecem exatamente como já especificados — reaproveitados sem alteração,
>   tanto a partir do card quanto de dentro de `S-CAT-01a`.

> **`S-CAT-01` — Redesign visual v2.0 (Lote 4, RF-RS-04) [REVISADO, 2026-09-04,
> Redesign Visual "MyMoney v2.0" — resolução final do Bloqueio 023]**: leitura
> direta de `Categorias.dc.html` (desktop) e `CategoriasMobile.dc.html`
> (mobile).
>
> **Achado registrado e resolvido (`BLOCKERS.md` Bloqueio 023, por
> `business-analyst`: mockup desatualizado/incompleto, não mudança de
> comportamento)**: os dois artboards mostram uma **lista-árvore expansível**
> — não a grade de `CategoryCard` (Padrão C) que RF-REF-05 já implantou em
> produção desde o Pacote de Refinamento:
> - **Desktop**: 2 colunas lado a lado dentro de 1 `Card` cada — "Despesas" à
>   esquerda, "Receitas" à direita. Dentro de "Despesas": cada categoria de
>   topo-nível é uma linha (`catRow`: ponto colorido + nome 14px semibold à
>   esquerda, valor em `<Num format="currency">` 13px `--text-2` + chevron `›`
>   à direita), seguida pelas subcategorias indentadas 28px (`childRow`: nome
>   13px `--text-2`, valor em `<Num>` 13px — mockup usa `--text-3`, **corrigido
>   para `--text-2`** por falha de contraste). Nenhum card por categoria,
>   nenhuma contagem de subcategorias exibida — é o layout de lista-árvore
>   anterior ao Pacote de Refinamento, com tokens v2.0.
> - **Mobile**: abas segmentadas "Despesas"/"Receitas" (`segTab`) substituem as
>   2 colunas — mesma lista-árvore abaixo, 1 aba por vez.
> - **Resolução final, não mais reversível (`PRD-TECNICO.md` emendado — RF-RS-04
>   AC1 reforçado, AMB-20 registrada)**: RF-REF-05 (grade de `CategoryCard`,
>   Padrão C) **prevalece como estava antes do redesign** — a divergência do
>   mockup foi julgada, pela BA, como material de referência
>   desatualizado/incompleto, não uma intenção deliberada de reverter o
>   Pacote de Refinamento. `S-CAT-01` **não** volta a ser lista-árvore. Dado
>   exibido no card, clique (expandir/navegar) e ações de edição/exclusão
>   permanecem intocados (RF-RS-04 AC2).
> - **O que isso exige do redesign, de forma explícita**: a composição visual
>   deste lote precisa **acomodar `CategoryCard` (grade de cards) dentro da
>   linguagem visual v2.0** (paleta verde/terracota/creme, tipografia
>   `Newsreader`+`Public Sans`, radius/elevação da Seção 3.1) — não copiar
>   literalmente o artboard "Categorias", que mostra um padrão diferente do
>   confirmado. Tratamento aplicado: `CategoryCard` já especificado (Padrão C,
>   Seção 2.1) recebe os tokens de cor/raio/elevação da Seção 3.1 e o valor
>   monetário do card passa a usar `<Num format="currency">` (migração deste
>   ponto de chamada ocorre neste mesmo lote/PR, conforme o plano de migração
>   incremental do `Num`, ADR-019).
> - **Critério de aceite (meta N3/N4)**: 0 regressões — Padrão C preservado,
>   nenhuma mudança de dado/cálculo.
> - **Reestimativa**: ver Log de Alterações Pós-Publicação — troca de token
>   (Seção 3.1) + migração do valor monetário do card para `<Num>` sobre o
>   `CategoryCard` já existente; nenhuma reestimativa de mudança estrutural
>   (grade→lista) é necessária — descartada em definitivo pela resolução do
>   Bloqueio 023.

#### Lançamentos (MVP — núcleo, reaproveitado pela Fase 3)

**S-TXN-01 — Lista de lançamentos** *(wireframe original abaixo, superado em
2026-09-04 pelo bloco "Revisado" logo após — mantido como registro histórico,
mesmo tratamento já dado a S-AUTH-02)*
```
[Topo] "Lançamentos" + FilterBar (conta, forma pagamento, categoria, período)
[Corpo] Lista agrupada por dia, cada linha:
        [ícone categoria] Descrição          -R$ 45,00
                           Categoria · Forma  [badge origem, se automatizado]
[Rodapé/flutuante] FAB "+" (expande para Manual/Voz/Foto na Fase 3)
```
Mês corrente por padrão (RF-MVP-04 AC5), com seletor de período.

> **`S-TXN-01` revisado (2026-09-04, RF-REF-02 + RF-REF-03) — hierarquia visual
> do item + barra de atalhos de lançamento rápido.**
>
> ```
> S-TXN-01 (revisado)
> ┌───────────────────────────────────────────┐
> │  Lançamentos                                 │
> │  [FilterBar: conta, forma pagamento*, categoria, período] │
> ├───────────────────────────────────────────┤
> │  Atalhos rápidos (ShortcutBar, até 10)       │
> │  ( 🍔 Alimentação )( 🚌 Transporte )( 🏠 Moradia )│  <- ShortcutChip
> │  ( 💊 Saúde )( 🎮 Lazer ) ...                  │     ver Seção 3.3
> ├───────────────────────────────────────────┤
> │  15 Ago                                       │
> │  [🍔] Alimentação                 -R$ 45,00   │  <- linha 1: subcategoria,
> │       Mercado São João · Débito Cta Corrente  │     maior destaque (RN-18)
> │                                    [badge origem]│  <- linha 2: descrição · forma
> │  [🚌] Transporte                  -R$ 12,00   │     de pagamento, texto
> │       Débito Cta Corrente                     │     secundário (sem descrição:
> │                                                 │     omite, não escreve
> │                                                 │     "(sem descrição)", RN-17)
> ├───────────────────────────────────────────┤
> [Rodapé/flutuante] FAB "+" (expande para Manual/Voz/Foto na Fase 3)
> ```
>
> **Hierarquia do item de lista (RF-REF-02)**:
> - Linha 1 (maior destaque, `font-semibold`, `text-base`): nome da
>   subcategoria (valor de `category_id` do lançamento — o nó folha, conforme
>   AMB-11), no lugar onde antes ficava a descrição.
> - Linha 2 (texto secundário, `text-sm`, `color.neutral-500`): descrição
>   (quando preenchida) + forma de pagamento, separadas por "·". **Se a
>   descrição estiver vazia, a linha 2 mostra só a forma de pagamento, sem
>   marcador "·" solto e sem texto de preenchimento** — nunca "(sem
>   descrição)" (RN-17, RF-REF-02 AC3).
> - Forma de pagamento, nesta linha 2, usa o rótulo desambiguado de RN-14
>   (`derivePaymentMethodLabel`, Seção 3.3) assim que o item 4 (RF-REF-04)
>   estiver implementado — acoplamento não-bloqueante já identificado pelo
>   Software Architect (`SDD.md` Adendo A.2.4): a lógica de RF-REF-02 em si não
>   muda, só o texto que a forma de pagamento exibe.
> - Valor, seta de entrada/saída, badge de origem automatizada e todo o
>   restante do comportamento do item permanecem exatamente como já
>   especificado (RF-REF-02 AC4) — só a hierarquia de texto muda.
> - Regras anti-corte da Seção 3.1.1 (`min-w-0 flex-1` + `truncate` no bloco de
>   identificação) continuam valendo, agora aplicadas às duas linhas de texto,
>   não só a uma.
>
> **`*` FilterBar — "conta" permanece como filtro** (não é removido pelo item
> 4): RF-REF-04 remove "Conta" apenas do *formulário de criação* de
> lançamento (RN-16, escopo confirmado em `ADR-016`, "Nota de escopo") — como
> filtro de consulta, "conta" continua um critério útil e não é tocado por
> este pacote. Só o *rótulo* do filtro "forma de pagamento" passa a usar RN-14
> (RNF-13).
>
> **`ShortcutBar`/`ShortcutChip` (RF-REF-03)** — ver componente novo detalhado
> na Seção 3.3, estados na Seção 4.2, acessibilidade na Seção 5, comportamento
> responsivo na Seção 6.3.

**S-TXN-02 — Novo/Editar lançamento manual** (formulário-base reaproveitado por
S-CAP-03/S-CAP-05) *(campos originais abaixo, superados em 2026-09-04 pelo bloco
"Revisado" logo após)*:
```
Data | Conta (select) | Forma de pagamento (select) | Categoria > Subcategoria
(picker em 2 níveis) | Valor (CurrencyInput) | Tipo (Entrada/Saída, toggle) |
Descrição (texto livre)
```
Campos obrigatórios marcados com `*`; validação inline por campo ao perder foco e
no submit (RF-MVP-04 AC2).

> **`S-TXN-02` revisado (2026-09-04, RF-REF-04) — campo "Conta" removido,
> rótulo de forma de pagamento desambiguado:**
> ```
> Data | Forma de pagamento (select, rótulo "{Forma} {Conta}" quando > 1 conta
> ativa — RN-14) | Categoria > Subcategoria (picker em 2 níveis) | Valor
> (CurrencyInput) | Tipo (Entrada/Saída, toggle) | Descrição (texto livre)
> ```
> 6 campos (era 7) — a regra de grid responsivo "2 colunas a partir de `md`"
> (Seção 2.1, regra 2) continua se aplicando, por ainda ter 5+ campos.
> Comportamento:
> - O usuário escolhe **apenas** a forma de pagamento; o backend resolve
>   `account_id` implicitamente via `payment_method.account_id` (ou, para
>   formas vinculadas a cartão de crédito, a conta ativa mais antiga do
>   usuário — comportamento preservado, não exposto ao usuário, `ADR-016`
>   Decisão 3) — RF-REF-04 AC1/AC2/RN-16.
> - O `<select>` de forma de pagamento usa o rótulo de RN-14 calculado por
>   `derivePaymentMethodLabel()` (função client-side, `ADR-016` Decisão 1):
>   `"{Forma de Pagamento} {Nome da Conta}"` quando o usuário tem mais de 1
>   conta ativa; `"{Forma de Pagamento}"` simples quando só há 1. Formas
>   vinculadas a cartão de crédito continuam exibindo o nome do cartão,
>   inalterado (RF-REF-04 AC5).
> - Aberto a partir de um `ShortcutChip` (RF-REF-03): subcategoria, forma de
>   pagamento, tipo e data já vêm preenchidos (RN-13); foco automático vai
>   para o campo Valor, **não** para o primeiro campo do formulário — desvio
>   intencional da regra geral de foco de `Modal`/`BottomSheet` (Seção 5), que
>   move o foco ao primeiro elemento interativo; aqui o primeiro elemento
>   relevante para completar a ação é o campo Valor, já que os demais campos
>   já estão preenchidos. Descrição permanece vazia (RN-13).
> - Aberto pelo botão "+ Novo"/FAB (fluxo completo, sem atalho): comportamento
>   de foco inalterado (primeiro campo do formulário, regra geral).
> - Campo "conta" **não existe mais** neste formulário, nem como select nem
>   oculto — é puramente resolvido no servidor; nenhuma tela de erro
>   "selecione uma conta" é possível aqui.
>
> **Restrição de sequenciamento aplicada, não um conflito de UX (ver Seção 7)**:
> este layout está pronto para estimativa do Tech Lead e pode ser implementado
> imediatamente — a única condição é de **deploy em produção**, não de
> desenho/código (`CTO-REVIEW.md` Gate 2 desta rodada, ressalva 1: Bloqueio 013
> deve estar `Resolvido` antes de o item 4 ir ao ar).

> **`S-TXN-01`/`S-TXN-02` — Redesign visual v2.0 (Lote 2, RF-RS-02) [REVISADO,
> 2026-09-04, Redesign Visual "MyMoney v2.0" — mapeamento real, acesso visual
> confirmado]**: leitura direta de `Lancamentos.dc.html` (desktop) e
> `LancamentosMobile.dc.html` (mobile).
>
> **Mapeamento linha a linha, desktop**:
> 1. Cabeçalho: `h1` "Lançamentos" (`Newsreader` 32px) + subtítulo "47
>    lançamentos em setembro de 2026" (`--text-2`) à esquerda; botão "+ Novo
>    lançamento" (mesmo padrão do botão de cabeçalho do Lote 1) à direita.
> 2. Filtros: 3 `chip`s pílula (`--r-*` full, borda `--border`) — "Setembro
>    2026", "Categoria: todas", "Conta: todas". **"Forma de pagamento" não
>    aparece como chip próprio** nesta versão do mockup (possivelmente
>    ilustrativo/incompleto, não necessariamente uma remoção deliberada) — mantido
>    como filtro existente (Seção 2.2, nota "`*` FilterBar") até indicação em
>    contrário; baixo risco por já ser comportamento preservado por padrão
>    (RF-REF-02 nota de FilterBar).
> 3. Card de resumo do período: "Entradas/Saídas/Saldo do período" lado a lado,
>    valores em `<Num format="currency">`.
> 4. Lista agrupada por dia (`p` de data 13px semibold `--text-2` como separador,
>    sem `Card` próprio por grupo — um único `Card` envolve a lista inteira,
>    separadores internos por `border-bottom`), cada item: ponto colorido por
>    categoria (9px) + texto + valor em `<Num format="currency">` à direita
>    (`--expense`/`--income`).
>
> **Achado resolvido (`BLOCKERS.md` Bloqueio 023, por `business-analyst`:
> mockup desatualizado/incompleto, não mudança de comportamento)**: o mockup
> real mostrava a descrição/estabelecimento como elemento de maior destaque
> (linha 1) e "categoria · forma de pagamento" como secundário (linha 2) — o
> oposto do que RN-18 já fixa. **Resolução final, não mais reversível**
> (`PRD-TECNICO.md` emendado — RF-RS-02 AC1/AC2 reforçados, AMB-18
> registrada): RN-18 **prevalece como estava antes do redesign** — subcategoria
> continua o elemento de maior destaque visual (linha 1), descrição e forma de
> pagamento continuam secundárias (linha 2), exatamente como já especificado
> nesta Seção 2.2 (bloco "`S-TXN-01` revisado", RF-REF-02). A composição do
> item de lista deste lote acomoda essa hierarquia **dentro** da linguagem
> visual v2.0: linha 1 (subcategoria) em `--text` semibold; linha 2
> (descrição · forma de pagamento) em `--text-2` (não `--text-3` — falha de
> contraste, Seção 5); valor à direita em `<Num format="currency">`
> (`Newsreader`, `--expense`/`--income`).
> - **`ShortcutBar`/`ShortcutChip` (RF-REF-03) — resolvido, obrigatório mesmo
>   ausente do mockup** (`BLOCKERS.md` Bloqueio 023; `PRD-TECNICO.md` emendado,
>   AMB-19 registrada): nenhum dos dois artboards mostra a barra de atalhos,
>   mas isso não a torna opcional — RF-REF-03 permanece requisito funcional
>   ativo do Lote 2. Composição: `ShortcutBar` renderizada no topo de
>   `S-TXN-01`, entre o cabeçalho e os filtros (mesma posição já especificada),
>   com `ShortcutChip` em pílula (`--r-*` full, mesmo raio do `.chip` do
>   mockup) e paleta v2.0 (`--accent`/`--accent-soft` para o estado
>   selecionável/ativo) — visualmente integrada à nova linguagem, mesmo sem
>   equivalente literal no artboard.
> - **Formulário `S-TXN-02` unificado sem campo "Conta" (RF-REF-04)**: não
>   retratado por nenhum artboard — comportamento já fixado permanece sem
>   alteração, tokens v2.0 (incluindo `<Num>` no campo de valor/`CurrencyInput`)
>   aplicados quando implementado.
> - **Mobile (`LancamentosMobile.dc.html`)**: mesma hierarquia confirmada (RN-18
>   preservada), filtros em chips com `overflow-x:auto`, `ShortcutBar` com
>   rolagem horizontal (Seção 6.3), tokens v2.0.
> - **Migração do primitivo `Num` neste lote (ADR-019)**: os pontos de chamada
>   de `formatCentsToBRL()` em `TransactionsPage.tsx` (valor de cada item) e no
>   card de resumo do período são migrados para `<Num format="currency">` no
>   mesmo PR deste lote — não uma migração atômica separada.
> - **Critério de acessibilidade (meta N3, RNF-17)**: correção de contraste da
>   Seção 5 (linha 2 usa `--text-2`, não `--text-3`) aplicada; `aria-label` de
>   `ShortcutChip` e foco automático no campo Valor (RF-REF-03 AC4) preservados.
> - **Reestimativa**: ver Log de Alterações Pós-Publicação — troca de token
>   sobre a hierarquia/`ShortcutBar` já existentes (RN-18/RF-REF-03
>   confirmados, sem reordenamento), mais o esforço de migração de `<Num>`
>   neste lote específico.

#### Dashboard (MVP — atenção especial do stakeholder: gráficos, não só números)

**S-DASH-01**
```
┌───────────────────────────────────────────┐
│  Saldo consolidado                          │
│  R$ 8.420,15                    [●sincronizado agora] │
├───────────────────────────────────────────┤
│  Entradas do mês   Saídas do mês   Lançamentos │
│  ↑ R$ 6.200,00     ↓ R$ 3.150,00   42 este mês │
├───────────────────────────────────────────┤
│  Para onde o dinheiro foi (este mês)         │
│                                               │
│        ╭───╮       ● Alimentação  R$980 (31%)│
│       │ ◔  │        ● Moradia     R$800 (25%)│
│        ╰───╯       ● Transporte   R$420 (13%)│
│   (donut chart)     ● Outros       ...        │
│                                               │
│   [tocar em uma fatia navega para a lista     │
│    de lançamentos filtrada por categoria]     │
├───────────────────────────────────────────┤
│  Orçamentos do mês (resumo, MVP)             │
│  Alimentação  ▓▓▓▓▓▓▓░░░ 82% ⚠              │
│  Transporte   ▓▓▓░░░░░░░ 34%                 │
├───────────────────────────────────────────┤
│  Últimos lançamentos            [ver todos]  │
│  ...                                         │
└───────────────────────────────────────────┘
                                          [+] FAB
```
Requisito explícito do stakeholder ("gráficos, não só números", `PRD.md` Seção 1)
atendido pelo gráfico de distribuição por categoria (donut) como elemento
central da tela, não como anexo secundário — é o segundo bloco visível, logo após
os números-resumo, nunca abaixo de conteúdo secundário. Em Fase 2, um card adicional
enlaça para S-REP-01 (comparativo entradas x saídas, gráfico de barras); em Fase 3,
um card enlaça para S-REP-02 (evolução patrimonial, série temporal).

**O wireframe acima é o layout mobile/base — permanece exatamente como está,
sem nenhuma alteração (RNF-10)**; é o que se aplica abaixo do breakpoint
desktop (< `lg`, 1024px).

> **`S-DASH-01` revisado para desktop (2026-09-04, RF-REF-01) — grid
> multi-coluna a partir de `lg` (≥ 1024px).**
>
> ```
> S-DASH-01 (desktop, ≥ 1024px "lg")
> ┌─────────────────────────────────┬─────────────────────────┐
> │ Saldo consolidado                  │ Para onde o dinheiro     │
> │ R$ 8.420,15    [●sincronizado agora]│ foi (este mês)           │
> │                                     │        ╭───╮             │
> │ Entradas    Saídas    Lançamentos  │       │ ◔  │ ● Alimentação 31%│
> │ ↑ R$6.200,00 ↓R$3.150,00   42      │        ╰───╯ ● Moradia 25%│
> │                                     │  [toque na fatia → lista]│
> ├─────────────────────────────────────┴─────────────────────────┤
> │ Orçamentos do mês (resumo)          │ Últimos lançamentos       │
> │ Alimentação ▓▓▓▓▓▓▓░░ 82% ⚠         │  ...            [ver todos]│
> │ Transporte  ▓▓▓░░░░░░ 34%          │  ...                       │
> └───────────────────────────────────────────────────────────────┘
> ```
>
> - **Coluna esquerda** (saldo + KPIs de entradas/saídas/lançamentos, mesmo
>   conteúdo do bloco 1-2 mobile, agora empilhados dentro da coluna): ~58% da
>   largura (`grid-cols-[3fr_2fr]` ou equivalente Tailwind `lg:grid-cols-5`
>   com `lg:col-span-3`/`lg:col-span-2` — proporção exata é decisão de
>   implementação do `frontend`, não pixel-fixada aqui).
>   **Coluna direita**: `DonutChart` + legenda, lado a lado em vez de
>   empilhado (reaproveita a adaptação já prevista na Seção 6.3, "Gráfico ao
>   lado da legenda" — não é uma regra nova, só passa a se aplicar também ao
>   card do dashboard, não só a relatórios).
>   É a materialização direta do pedido do stakeholder: "cards de KPI +
>   gráfico lado a lado em vez de empilhados".
> - **Linha 2** (abaixo das duas colunas, ocupando a largura toda dividida em
>   2): "Orçamentos do mês (resumo)" e "Últimos lançamentos" passam a ficar
>   lado a lado em vez de empilhados — este é o segundo ganho de altura de
>   rolagem, além do KPI+gráfico do topo, necessário para atingir a meta de
>   redução de 40% (RF-REF-01 AC3).
> - A partir de `xl` (≥ 1280px), refinamento de proporção (não de estrutura):
>   coluna direita (gráfico) ganha mais espaço relativo, já que a coluna
>   esquerda não precisa de mais largura para caber 3 números lado a lado.
>   Nenhum card muda de posição entre `lg` e `xl` — só o `gap`/proporção de
>   colunas se ajusta, decisão de detalhe do `frontend`.
> - **Correção a conteúdo já publicado**: a Seção 6.1 (tabela de breakpoints)
>   reservava `xl` (≥ 1280px) como o gatilho do "Dashboard em grade
>   multi-coluna" — essa linha era ilustrativa, escrita durante a repaginada
>   visual de 2026-09-04 antes deste detalhamento existir, sem ainda
>   confirmar o breakpoint exato. Esta atualização **corrige** o gatilho para
>   `lg` (≥ 1024px) — o mesmo breakpoint "desktop" já usado por toda a
>   navegação (Seção 6.2, "Desktop (≥ 1024px): barra lateral fixa...") — para
>   não introduzir um 2º limiar "desktop" divergente só para esta tela. `xl`
>   passa a ser só refinamento de proporção dentro do mesmo grid, não o
>   gatilho de ativação. A tabela da Seção 6.1 é atualizada de acordo (ver
>   nota lá). Como o `S-DASH-01` já havia sido estimado pelo Tech Lead antes
>   desta correção, isso entra no Log de Alterações Pós-Publicação como
>   reestimativa, não como ajuste silencioso.
> - **Dependência de execução em aberto, não uma decisão de UX pendente
>   (RF-REF-01 AC4)**: a meta de "reduzir em pelo menos 40% a altura de
>   rolagem vertical no viewport de referência 1440×900" só é verificável
>   contra um baseline medido **antes** do deploy. Este UX/UI não tem, nesta
>   rodada, acesso a uma sessão com o app rodando para medir esse baseline
>   real (nenhuma ferramenta de navegador/execução disponível neste passo do
>   pipeline) — **não é inventado um número aqui**, mesmo princípio já usado
>   pelo BA para volume de lançamentos (AMB-01) e para o mesmo motivo: um
>   baseline fabricado não seria verificável nem confiável para medir a meta
>   depois. Metodologia fixada para quando a medição for executada (por
>   UX/UI, antes do início da implementação deste item, conforme a própria
>   AC4 exige): carregar `S-DASH-01` em viewport 1440×900, com uma conta e
>   volume de lançamentos representativo do baseline de referência de RNF-09
>   (60–120/mês), e medir `scrollHeight` do contêiner principal da página
>   antes de qualquer mudança de layout deste item. **Fica registrado como
>   ação pendente explícita, não como pendência escondida** — ver Seção 7.

> **`S-DASH-01` — Redesign visual v2.0 (Lote 1, RF-RS-01) [REVISADO, 2026-09-04,
> Redesign Visual "MyMoney v2.0" — mapeamento real, acesso visual confirmado]**:
> leitura direta de `Main.dc.html` (desktop, 1440px) e `DashboardMobile.dc.html`
> (mobile, 390px). Confirma RF-RS-01 AC4/RN-20 — dado, cálculo e navegação (toque
> na fatia do donut → lista filtrada) permanecem intocados; muda a composição
> visual.
>
> **Desktop (`Main.dc.html`) — mapeamento linha a linha `S-DASH-01` atual → v2.0**:
> 1. **Navegação lateral fixa (`<aside>`, 264px)** substitui a atual — passa a
>    ter 4 grupos rotulados (`navlabel`, 11px uppercase; mockup usa `--text-3`,
>    mas este documento recomenda `--text-2` aqui também — falha de contraste,
>    ver Seção 5, linha "`navlabel`"):
>    "Visão geral" (Dashboard) · "Lançamentos" (Lançamentos, Contas, Formas de
>    pagamento, Categorias) · "Planejamento" (Orçamento, Recorrências, Contas
>    fixas, Metas) · "Cartões" (Cartões, Parcelamentos); grupo final sem rótulo,
>    separado por borda superior (Relatórios, Configurações). Logo "MyMoney" em
>    `Newsreader` itálico 22px no topo da sidebar. Item ativo:
>    `background:--accent-soft; color:--accent; font-weight:600`. **Isto
>    substitui e detalha** a navegação lateral já descrita em Seção 6.2
>    ("agrupados por fase/seção", antes vago) — atualização direta da Seção 6.2
>    abaixo.
> 2. **Cabeçalho da página**: `h1` "Dashboard" em `Newsreader` 32px peso 500 +
>    subtítulo "Setembro 2026" (`--text-2`, 14px) à esquerda; à direita, ícone de
>    notificação (círculo outline 40px) + botão primário "+ Novo lançamento"
>    (`--accent` bg, `--r-sm` 8px, 40px altura) — **substitui o FAB "+"
>    flutuante** por um botão fixo no cabeçalho (ver nota de navegação abaixo).
> 3. **Card de saldo consolidado**: `--shadow-md`/`--r-lg` (20px), rótulo
>    uppercase 13px + valor em `<Num format="currency">` 48px peso 500 + badge
>    "sincronizado agora" (`--accent-soft` bg, `--accent` texto, 5,33:1 — passa)
>    à direita — mesma posição/papel hero já especificado, tokens v2.0
>    aplicados. **Migração `Num` (ADR-019) neste lote**: ponto de chamada de
>    `formatCentsToBRL()` do saldo consolidado em `DashboardPage.tsx` migrado
>    para `<Num>` neste mesmo PR.
> 4. **3 KPIs lado a lado** (`grid-cols-3`): "Entradas do mês"/"Saídas do
>    mês"/"Lançamentos", ícone (seta up/down) + valor em `<Num format="currency">`
>    (KPIs monetários) / `<Num format="count">` ("Lançamentos") 26px — estrutura
>    idêntica à já fixada por RF-REF-01/AC1, cores `--income`/`--expense`.
>    **Migração `Num` neste lote**: os 2 pontos de `formatCentsToBRL()` das
>    linhas 109/113 de `DashboardPage.tsx` (concatenados hoje com a seta
>    `↑`/`↓` no mesmo nó de texto, `adr/019...md` achado B) são separados em
>    nós distintos — seta como elemento próprio, valor como `<Num>` isolado.
> 5. **Linha 2 colunas (`1.3fr 1fr`)**: "Para onde o dinheiro foi" (donut +
>    legenda com valor em `<Num format="currency">` por categoria, migrando o
>    ponto de chamada de `DonutChart.tsx:93` — hoje concatenado com o
>    percentual no mesmo nó, `adr/019...md` achado B; percentual passa a
>    `<Num format="percent">` separado) à esquerda; "Orçamentos do mês" (barras
>    finas 8px, `--accent` normal / `--warn` alerta) à direita — **mesma
>    disposição lado a lado já fixada por RF-REF-01 AC1/AMB-16**, confirmando o
>    grid 2 colunas a partir de `lg`.
> 6. **"Últimos lançamentos"** (largura total, abaixo da linha 2 colunas): **não
>    lado a lado com outro bloco** — ocupa a linha inteira, diferente do que a
>    versão anterior desta Seção descrevia ("orçamentos \| últimos lançamentos
>    lado a lado"). Cada item mostra descrição (linha 1, 14px) + valor em
>    `<Num format="currency">` (mesma linha, alinhado à direita) — **sem**
>    linha 2 de categoria/forma de pagamento neste widget específico do
>    dashboard (mais enxuto que o item de `S-TXN-01`, resolvido em RN-18 para
>    o Lote 2 — ver abaixo). **Correção à Seção 2.2 anterior**: o wireframe
>    "desktop ≥1024px lg" publicado antes desta revisão mostrava "Orçamentos \|
>    Últimos lançamentos" como 2ª linha de 2 colunas — o mockup real mostra
>    "Últimos lançamentos" como bloco de largura total, abaixo de "Orçamentos"
>    (que fica dentro da coluna direita da linha 1, junto do donut). Ver item 5
>    acima — isso muda a proporção mas não invalida a estrutura de 2
>    blocos-alvo já fixada por AMB-16 (proporção de coluna é decisão de
>    implementação).
>
> **Item de "Últimos lançamentos" mostra descrição como linha primária, sem
> categoria/forma de pagamento** — nota separada, não uma contradição de RN-18
> em si: RN-18 rege a **listagem de lançamentos** propriamente dita
> (`S-TXN-01`); este widget do dashboard é um resumo compacto de 1 linha por
> item, sem segunda linha nenhuma, então não há "hierarquia" a inverter aqui.
> A tensão equivalente em `S-TXN-01` (Lote 2, onde o mockup **tem** 2 linhas e
> a ordem divergia de RN-18) já foi resolvida — ver `BLOCKERS.md` Bloqueio 023
> (`Resolvido`) e o bloco "`S-TXN-01`/`S-TXN-02`" abaixo: RN-18 prevalece.
>
> **Mobile (`DashboardMobile.dc.html`, 390px)**: mesma sequência de blocos
> empilhados (saldo → 3 KPIs em grid compacto → donut → orçamentos → últimos
> lançamentos), confirmando RNF-10 (single-column preservado). **Navegação
> inferior muda de 5 para 4 destinos, sem FAB central** — ver nota de navegação
> abaixo, Seção 6.2/6.5.
>
> **Nota de navegação (decisão de UX/UI, não uma regra de negócio — dentro da
> minha autoridade de "definir a experiência de navegação", sem necessidade de
> escalar)**: o mockup substitui o padrão FAB central + 5 destinos (já vigente,
> Seção 6.2) por: **desktop** — botão "+ Novo lançamento" fixo no cabeçalho de
> cada tela (não mais um FAB flutuante); **mobile** — barra inferior de **4**
> destinos (Dashboard, Lançamentos, Orçamento, Mais) + botão "+" circular no
> cabeçalho (não na barra inferior), confirmado de forma consistente nos 4
> artboards mobile (Dashboard/Lançamentos/ContasCartões/Categorias — "Contas e
> Cartões" e "Categorias" ficam sob a aba "Mais", ativa nesses dois artboards).
> Isto **atualiza** a Seção 6.2 (revisão abaixo) — é mudança de camada de
> apresentação/navegação (competência deste `ux-ui`, `PRD-TECNICO.md` Adendo B
> não define nada sobre quantidade de destinos de nav), não uma regra de
> negócio (RN-01 a RN-20) — não exige escalonamento a BA/SA.
>
> - **Critério de acessibilidade (meta N3, RNF-17)**: nenhuma regressão de
>   navegação por teclado/foco visível; ver Seção 5 para os 2 achados reais de
>   contraste (`--text-3`, `--warn` como texto) e a correção de uso aplicada.
> - **Reestimativa**: ver Log de Alterações Pós-Publicação — mapeamento real
>   substitui a estimativa preliminar registrada na entrada anterior (comparação
>   N2 agora executada; reestimativa deixa de ser "preliminar").

#### Orçamento (MVP)

**S-BUD-01** segue Padrão A; cada item de categoria mostra barra de progresso
(`ProgressBar`) com 3 estados visuais: normal (< 80%, cor neutra/primária), alerta
de aproximação (≥ 80%, cor âmbar + ícone de atenção, RF-MVP-07 AC3), estouro (> 100%,
cor vermelha + ícone de erro, severidade maior que o alerta de aproximação — texto e
ícone diferentes, não só tom de cor mais forte, para não depender só de cor —
ver Seção 5). **S-BUD-02** formulário simples: categoria (pré-selecionada se veio da
lista), teto (CurrencyInput), limiar de alerta (select, padrão 80%, RN-04).

> **`S-BUD-01` revisado (2026-09-04, RF-REF-06) — Orçamento em grade de cards,
> substitui a lista do Padrão A descrita acima.** Segue o Padrão C (Seção
> 2.1), mesma grade compartilhada com `S-CAT-01`.
>
> ```
> S-BUD-01 (grade de cards)
> ┌─────────────────────┐ ┌─────────────────────┐
> │ Alimentação            │ │ Transporte            │
> │ R$ 820,00 / R$ 1.000,00│ │ R$ 340,00 / R$ 1.000,00│
> │ ▓▓▓▓▓▓▓▓░░ 82% ⚠      │ │ ▓▓▓░░░░░░░ 34%        │
> └─────────────────────┘ └─────────────────────┘
> [+ Definir orçamento]
> ```
>
> - Dado exibido sem clique adicional (RF-REF-06 AC2, AMB-15): categoria,
>   gasto no mês vs. teto, percentual consumido, `ProgressBar` com o mesmo
>   indicador de severidade já existente (normal/alerta 80%/estouro >100%,
>   RN-04) — mesmo componente `ProgressBar`, só realocado para dentro do card.
> - Card com alerta/estouro recebe destaque visual adicional no próprio card
>   (não só na barra interna) — borda ou fundo sutil na cor de severidade
>   (`color.warning-soft`/nenhum token `-danger-soft` definido ainda: usar
>   `color.danger` a 10% de opacidade equivalente, decisão de detalhe do
>   `frontend`), para que o alerta seja perceptível ao passar o olho pela
>   grade inteira, não só ao focar num card específico (RF-REF-06 AC3).
> - Categoria sem orçamento definido no mês **não gera card vazio** — grade
>   contém só categorias com orçamento efetivamente definido (RF-REF-06 AC4,
>   comportamento idêntico ao já existente, só reformatado).
> - Clique no corpo do card (elemento clicável primário, Padrão C) abre
>   `S-BUD-02` para editar o teto — mesma tela já especificada, sem alteração.
> - Grade colapsa conforme Padrão C (1 → 2 → 3 → 4 colunas).

#### Cartão & Fatura (Fase 2)

**S-CARD-01/02** seguem Padrão A (limite, dia de fechamento, dia de vencimento).

**S-CARD-03 — Fatura projetada**
```
[Topo] Limite disponível: R$ 2.340,00 de R$ 5.000,00   (sempre visível, RN-06)
[Abas] [ Fatura Atual ]  Próxima  |  + 2
[Corpo, por aba] Total da fatura + badge (Aberta/Fechada, RF-F2-05 AC3)
                  Lista de lançamentos que compõem aquela competência
```
Horizonte padrão: competência atual + 2 futuras (SDD Seção 2.5), sem necessidade de
paginação adicional no MVP dessa tela.

> **`S-ACC-01/02/04` + `S-CARD-01/02/03` — Redesign visual v2.0 (Lote 3,
> RF-RS-03) [REVISADO, 2026-09-04, Redesign Visual "MyMoney v2.0" — mapeamento
> real, acesso visual confirmado]**: leitura direta de `ContasCartoes.dc.html`
> (desktop) e `ContasCartoesMobile.dc.html` (mobile).
>
> **Mapeamento linha a linha, desktop**:
> 1. Cabeçalho: `h1` "Contas e Cartões" + subtítulo "4 contas · 2 cartões de
>    crédito" (`--text-2`); botão "+ Nova conta" à direita.
> 2. **Seção "Contas"** (título 16px semibold): grade `grid-cols-4` de cards —
>    cada card: `iconChip` (36px, `--accent-soft` bg, `--accent` ícone, `--r-md`
>    equivalente 10px) + rótulo do banco (`--text-3` 12px — **falha contraste,
>    corrigido para `--text-2`**, ver Seção 5) + nome da conta (14px semibold) +
>    saldo em `<Num format="currency">` 22px. **Confirma AMB-17**: é grade de
>    cards de resumo, não lista — mais próximo do Padrão C (Seção 2.1) que do
>    Padrão A original de `S-ACC-01`. Recomendo ao Tech Lead considerar
>    `S-ACC-01` como candidato a migrar de Padrão A para Padrão C nesta rodada
>    (mudança de padrão de layout, não de dado/comportamento — dentro do
>    escopo de RF-RS-03, não exige escalonamento). **Migração `Num` (ADR-019)
>    neste lote**: ponto de chamada de saldo em `AccountsPage.tsx` migrado
>    para `<Num>`.
> 3. **Seção "Cartões de crédito"**: grade `grid-cols-2`, cada card: nome do
>    cartão + "vence DD/MM"; "Fatura atual" + valor em `<Num format="currency">`
>    26px em destaque; barra de "Limite usado" (8px, `--accent` fill) + texto
>    "X% de R$ Y" (dois números, `<Num format="percent">` + `<Num
>    format="currency">`, separados — hoje concatenados em `CreditCardsPage.tsx`,
>    `adr/019...md` achado B) — **é a visão-resumo confirmada, sem abas/timeline
>    de múltiplas competências**. **Migração `Num` neste lote**: pontos de
>    chamada de fatura atual e limite usado em `CreditCardsPage.tsx` migrados.
> - **Confirma AMB-17 definitivamente**: o artboard "ContasCartoes" cobre
>   exclusivamente a visão-lista/resumo (cards de conta + card-resumo de
>   cartão com só a fatura atual) — nenhuma aba, nenhuma navegação entre
>   competências, nenhum detalhamento de lançamentos da fatura. O detalhamento
>   fino de `InvoiceTimeline` (múltiplas abas, lista de lançamentos por
>   competência) permanece integralmente com o Lote 8 (Grupo B), como a leitura
>   conservadora do BA já previa — **confirmado, não uma suposição**.
> - **`InvoiceTimeline` em si — não tocado por este lote**: como o artboard não
>   o retrata, `S-CARD-03` (fatura projetada com abas) permanece com o
>   wireframe/tokens já especificados nesta Seção 2.2 (Padrão A original),
>   recebendo só os tokens v2.0 (Seção 3.1) quando implementado — nenhuma
>   mudança de cálculo de limite (RN-06), fechamento (RN-01) ou horizonte de
>   faturas.
> - **Mobile (`ContasCartoesMobile.dc.html`)**: mesma estrutura, cards
>   empilhados em coluna única (não grade) — Contas em lista vertical de cards
>   horizontais (ícone + nome + saldo), Cartões em lista vertical de cards
>   completos (mesmo conteúdo do desktop, empilhado). Acessado pela aba "Mais"
>   (Seção 6.2).
> - **Critério de aceite (meta N3/N4, com atenção redobrada a N4)**: 0
>   regressões funcionais — nenhuma mudança de cálculo/regra confirmada nesta
>   leitura real, RN-01/RN-06 preservadas.
> - **Reestimativa**: ver Log de Alterações Pós-Publicação — inclui agora a
>   recomendação de migração de Padrão A→C para `S-ACC-01` (item 2 acima),
>   além da troca de token já prevista.

#### Recorrência, Parcelamento, Contas Fixas, Metas (Fase 2) — seguem Padrão A

| Tela | Nota de layout específica |
|---|---|
| S-REC-03 (Padrão B) | "A partir de qual competência o novo valor passa a valer?" — seletor de mês, texto explícito "Lançamentos já gerados em meses anteriores não mudam" (RN-02) |
| S-INST-02 | `InstallmentProgress`: "Parcela 4 de 12" + barra de progresso, não é ProgressBar genérico (semântica de contagem, não percentual de meta) |
| S-FIX-01 | Badge de status por item: Pendente (neutro) / Paga (verde) / Vencida (vermelho + ícone) |
| S-GOAL-04 | ProgressBar + valor atual/valor alvo + prazo (se houver), lista de aportes recentes |

#### Notificações (Fase 2)

**S-NOT-01 — Central de notificações**: lista cronológica, não lida com indicador
visual (ponto), lida sem indicador; toque leva à entidade relacionada (orçamento
estourado → S-BUD-01; conta a vencer → S-FIX-01). Sempre acessível pelo sino no topo,
independente de push ter sido entregue ou não (RF-F2-09 AC2, aplicado como restrição
técnica — ver Seção 7).

#### Relatórios e Exportação (Fase 2/3)

| Tela | Layout |
|---|---|
| S-REP-01 | Gráfico de barras agrupadas (entrada x saída) por mês, últimos 6 meses; se houver menos de 6 meses de dado, eixo mostra só os meses disponíveis com nota "Dados disponíveis a partir de [mês]" — nunca preenche com zero (RF-F2-10 AC2) |
| S-REP-02 | Gráfico de linha (série temporal do saldo consolidado), filtro por conta (select, incluindo "Todas as contas") |
| S-REP-03 | Seleção de período + formato (CSV/PDF, radio) + botão "Exportar" → indicador de geração → download |

#### Captura Automatizada (Fase 3) — foco especial do RNF-01

**S-CAP-01 — Ponto de entrada da captura**: o FAB "+" da lista/dashboard se expande
(mobile: leque de ações; desktop: menu) em três opções sempre visíveis: "Lançamento
manual", "Falar", "Fotografar". Se o navegador não suportar Web Speech API nem houver
fallback de STT em nuvem configurado, a opção "Falar" aparece desabilitada com texto
"Não disponível neste navegador" em vez de simplesmente sumir — o usuário entende por
que a opção não está lá, e usa foto ou manual sem ficar perdido.

**S-CAP-02 — Captura por voz (gravando)**
```
┌─────────────────────────────┐
│  [X cancelar]                │
│                               │
│         ((●))  <- mic pulsante│
│                               │
│  "gastei 45 reais no          │
│   mercado hoje"    <- transcrição ao vivo (interim results)
│                               │
│      [ Concluir gravação ]    │
└─────────────────────────────┘
```
Após "Concluir": estado de processamento ("Interpretando...") antes de ir ao rascunho.

**S-CAP-03 / S-CAP-05 — Rascunho de confirmação (voz e foto)** — tela mais crítica
deste documento, é onde a barreira arquitetural RNF-01 vira experiência visível:

```
┌───────────────────────────────────────────┐
│ ✨ RASCUNHO — revise antes de salvar         │  <- banner fixo, não descartável
├───────────────────────────────────────────┤
│ [S-CAP-05 apenas: miniatura da foto do      │
│  recibo, expansível/comparável lado a lado  │
│  em telas largas — ver Seção 6]             │
├───────────────────────────────────────────┤
│ Data          15/08/2026        ✨sugerido   │
│ Conta         Conta Corrente    ✨sugerido   │
│ Forma pgto    Pix               ✨sugerido   │
│ Categoria     Alimentação        ✨sugerido   │
│ Valor         R$ 45,00          ✨sugerido   │
│ Tipo          Saída             ✨sugerido   │
│ Descrição     [ em branco ]     ⚠ preencha  │  <- campo não extraído
├───────────────────────────────────────────┤
│         Nada é salvo até você confirmar.     │
│  [ Cancelar ]         [ Confirmar lançamento]│
└───────────────────────────────────────────┘
```
Regras de comportamento (mapeadas 1:1 para AC de RF-F3-01/02 e RNF-01/08):
- Toda tag "✨ sugerido" desaparece assim que o usuário edita aquele campo — o campo
  editado passa a ser tratado como valor definitivo do usuário (RF-F3-01 AC3), sem
  distinção visual residual do que a máquina sugeriu originalmente.
- Campo não extraído nunca bloqueia os demais — aparece em branco com indicador de
  atenção (não erro), preenchimento manual local, sem sair da tela (RF-F3-02 AC3).
- Botão "Confirmar lançamento" só habilita quando todos os campos obrigatórios estão
  preenchidos (extraídos ou manuais) — mesma validação do formulário manual (S-TXN-02).
- Botão "Cancelar" descarta o rascunho por completo, sem confirmação adicional (a
  ação em si já é não-destrutiva de dado real, pois nada foi persistido — RF-F3-01 AC4).
- Nenhum temporizador, nenhum auto-confirmar, nenhuma navegação automática para fora
  desta tela sem ação explícita do usuário — ver também Seção 5 (WCAG 2.2.1).

**S-CAP-04 — Captura por foto**: viewfinder de câmera com moldura-guia
("posicione o recibo dentro da moldura"), botão de captura, alternativa "Enviar da
galeria/arquivo" sempre visível ao lado (relevante em desktop, onde câmera pode não
existir). Após captura: tela de pré-visualização com "Usar esta foto" / "Tirar
novamente" antes de gastar o processamento de OCR.

**S-CAP-06/07 — Importação e lista de candidatos**
```
S-CAP-07
┌───────────────────────────────────────────┐
│  15 transações encontradas · 3 selecionadas │
│  [Selecionar todas]  [Limpar seleção]        │
├───────────────────────────────────────────┤
│ ☑ 12/08  Supermercado ABC     -R$120,00      │
│ ☐ 13/08  Transferência recebida +R$500,00    │
│ ⚠ ☐ 14/08  Restaurante XYZ    -R$45,00        │
│     Possível duplicata de lançamento existente│
│     [ver lançamento existente]                │
├───────────────────────────────────────────┤
│ [ Cancelar importação ]  [ Confirmar 3 lançamentos ] │
└───────────────────────────────────────────┘
```
Mesmo princípio de RNF-01 (extensão AMB-06b): nada é persistido antes da confirmação
explícita da seleção. Itens sinalizados como possível duplicata (RF-F3-03 AC2) vêm
**desmarcados por padrão** — decisão de UX deliberada para não facilitar duplicidade
acidental; o usuário precisa marcá-los conscientemente se quiser mesmo assim importar.

**S-CAP-08/09 — Open Finance**: fluxo de consentimento redireciona ao provedor
(Pluggy) para autenticação bancária (fora da superfície de UI deste produto, tela de
retorno mostra status da conexão); lista de conexões (S-CAP-09) com status
(ativa/expirada/erro) e botão "Sincronizar agora". Transações sincronizadas entram no
mesmo componente `CandidateList` de S-CAP-07 (RF-F3-04 AC1, reaproveita FL-05). **Nota
de dependência não resolvida por este documento**: `CTO-REVIEW.md` Gate 2 condiciona a
habilitação de RF-F3-04 em produção à confirmação de que o Pluggy aceita pessoa
física sem CNPJ no tier assumido — a tela está especificada, mas sua liberação real
depende dessa confirmação (item já rastreado no Gate 2, fora do escopo deste UX/UI
resolver).

#### Configurações (MVP/Fase 2)

**S-SET-01**: perfil (e-mail da conta Supabase Auth), botão "Sair" (logout explícito,
RF-MVP-08 AC3), "Alterar PIN". **S-SET-02** (F2): toggles de notificação por tipo.
**S-SET-03** (F2): limiar de alerta de orçamento padrão (RN-04) e dias de aviso de
conta fixa padrão (RN-05) — aplicam como padrão para novos cadastros, cada
orçamento/conta fixa individual pode sobrescrever (já coberto nos formulários
S-BUD-02/S-FIX-02).

### 2.3 Grupo B — Diretrizes de Aplicação do Design System (Lotes 5-13, sem
mockup direto) **[NOVO, 2026-09-04, Redesign Visual "MyMoney v2.0"]**

Segue à risca a resolução do CTO ao `BLOCKERS.md` Bloqueio 021 (item 2), replicada
em `PRD-TECNICO.md` Adendo B, Seção B.1.2: **nenhum RF/RN/AC tela a tela é
produzido aqui para o Grupo B**. Esta subseção define só como aplicar a fundação
do Lote 0 (Seção 3.0) a cada domínio já inventariado pelo BA — o aprofundamento
técnico completo de cada um ocorre lote a lote, junto do `ux-ui`/Tech Lead, pouco
antes de cada lote iniciar execução, fora do escopo desta rodada. Nenhum destes 9
domínios tem artboard próprio no canvas — a diretriz abaixo é herança de padrão
(Padrão A/B/C, tokens da Seção 3.1), não extração visual.

| Lote | Domínio | Telas | Padrão de layout já aplicável (herda do Grupo A/já vigente) | Restrições que a diretriz não pode contrariar | Diretriz de aplicação do Lote 0 |
|---|---|---|---|---|---|
| 5 | Autenticação/Sessão + Onboarding | S-AUTH-01/03/04/05, S-ONB-01/02 | Nenhum ainda — é o próprio candidato de consolidação em `AuthCard`/`AuthLayout` (Seção 3.2) | RF-MVP-08 (login seguro) e a remoção definitiva do 2º fator por e-mail (`ADR-014`) não podem ser tocados; onboarding preserva RF-MVP-01/RF-MVP-03/RN-09 | Consolidar as 3 páginas duplicadas em `AuthCard`/`AuthLayout` (especificação mínima já publicada, Seção 3.2), aplicando os tokens de cor/raio/elevação da Seção 3.1 (mesmo card, `radius.lg`/`elevation.sm`); nenhuma mudança de fluxo/estado, só consolidação de componente + skin |
| 6 | Orçamento | S-BUD-01/02 | Padrão C (grade de cards) já validado desde o Lote 4 (Categorias) e desde o Pacote de Refinamento (`BudgetCard`) | RN-04 (limiares 80%/100%+) e o cálculo de RF-MVP-07 não podem mudar | Extensão incremental direta do Padrão C — menor esforço de extrapolação esperado; nenhum token/componente novo previsto |
| 7 | Formas de Pagamento | S-PAY-01/02 | Padrão A (lista + formulário) | RN-14/RN-15/RN-16 preservadas; RF-REF-04 segue bloqueado pelas 3 pré-condições do risco A3 (Adendo A), independentemente deste redesign | Aplicar tokens/regras anti-corte da Seção 3.1.1 ao Padrão A já existente; forte sobreposição visual esperada com o Lote 3 — decisão final de agrupamento (mesclar `S-PAY-01` na tela de Contas ou manter separado) delegada ao `ux-ui`/Tech Lead quando este lote for detalhado, não decidida aqui |
| 8 | Cartão & Fatura detalhado | S-CARD-01/02/03, parte não coberta pelo Lote 3 | Abas por competência (`Tabs`), `InvoiceTimeline` | `InvoiceTimeline` é lógica de negócio sensível — RN-01, RN-06, FL-02 não podem ser alterados pelo redesign | Depende de o Lote 3 já ter validado, em produção, o padrão de "tela com lógica de negócio sensível" antes de avançar; escopo real deste lote só é confirmado depois que o acesso visual ao artboard "ContasCartoes" (pendente, Seção 7.2) definir o que o Lote 3 já cobriu (AMB-17) |
| 9 | Recorrência, Parcelamento, Contas Fixas, Metas | S-REC-01..04, S-INST-01/02, S-FIX-01..03, S-GOAL-01..04 | Padrão A + Padrão B (confirmação de reajuste, `S-REC-03`) | RN-02 (reajuste prospectivo com confirmação obrigatória) e RN-07 (preservação de histórico ao cancelar) não podem mudar | Aplicar tokens/regras anti-corte da Seção 3.1.1 (grid 2 colunas a partir de `md` para os formulários de 8 campos já identificados: `S-INST-01`, `S-FIX-02`, `S-REC-02`); Tech Lead pode subdividir o lote em sub-domínios menores sem reabrir o `PRD.md` |
| 10 | Notificações | S-NOT-01 | Sino no topo + painel/lista suspensa | RF-F2-09 AC2 (histórico sempre acessível independentemente de push) preservado | Componente relativamente simples — aplicar tokens da Seção 3.1 ao `NotificationBell`/`NotificationCenter` já existentes; baixo esforço de extrapolação esperado |
| 11 | Relatórios e Exportação | S-REP-01/02/03 | `BarChart`/`DonutChart` reaproveitados; `S-REP-02`/`S-REP-03` ainda não implementados em produção (Fase 3) | RF-F2-10 AC2 (não preencher com zero quando há menos de 6 meses de dado disponível) | Gráficos herdam diretamente o tratamento visual do Dashboard (Lote 1) uma vez redesenhado — nenhuma diretriz visual nova além de "seguir o mesmo tratamento de `DonutChart`/`BarChart` já aplicado ao Lote 1" |
| 12 | Captura Automatizada (Fase 3) | S-CAP-01 a 09 | Nenhum — tela ainda não existe em produção | RNF-01 (confirmação humana obrigatória) é barreira arquitetural, não apenas visual — redesign não pode alterá-la; WCAG 2.2.1 (sem limite de tempo em confirmação) também não pode regredir, quando a tela existir | Deliberadamente por último — padrão de redesign deve estar maduro antes de tocar a superfície mais sensível do produto; os 4 componentes **[NOVO]** já documentados (Seção 3.3: `VoiceRecorderUI`, `ReceiptCameraCapture`, `DraftReviewBanner`, `AutoFillTag`) já cumprem o papel de abstração exigido por RF-RS-00 AC2 — nenhuma diretriz visual adicional é necessária até este lote ser efetivamente detalhado |
| 13 | Configurações | S-SET-01/02/03 | Padrão A simplificado | Nenhuma regra de negócio sensível identificada nesta rodada | Aplicar tokens da Seção 3.1 ao Padrão A já existente; baixo esforço de extrapolação esperado |

**Nota de arquitetura confirmada (`SDD.md` Adendo B, B.2.5)**: nenhum domínio do
Grupo B precisa de estrutura técnica diferente da já usada pelo Grupo A — todo
componente já listado nas Seções 3.2/3.3 vive na mesma estrutura de ADR-017
(`components/base/*`/`components/domain/*`, bloco `@theme` único). A única lacuna
estrutural real é a do Lote 5 (`AuthCard`/`AuthLayout`), já registrada acima e na
Seção 3.2.

**Ordem de execução do Grupo B** (herdada do `PRD.md` Adendo B, classificação
Now/Next/Later, já confirmada pelo CTO sem reordenação): não decidida nem revisada
por este documento — carregada adiante exatamente como fixada pelo PM/CTO.

---

## 3. Design System e Componentes

### 3.0 Fundação do Design System v2.0 (Lote 0, RF-RS-00) **[REVISADO,
2026-09-04, Redesign Visual "MyMoney v2.0" — correção sobre acesso visual real]**

Pré-requisito estrutural de todos os 13 lotes seguintes (Grupo A e Grupo B),
conforme `PRD-TECNICO.md` Adendo B e `SDD.md` Adendo B (ADR-017/ADR-018). Esta
subseção é o entregável do Lote 0 em si — não descreve uma tela de usuário final.

> **Correção sobre a versão anterior desta seção**: a primeira versão desta
> subseção (mesma data, antes desta revisão) registrava "tokens ESTENDIDOS" por
> falta de acesso visual ao canvas ("Conflito 2", `Seção 7.2`). O orquestrador
> do pipeline forneceu, na sequência, os 8 arquivos `.dc.html` estáticos reais
> (HTML+CSS puro, não o runtime interativo do canvas) — lidos diretamente nesta
> revisão. **Achado crítico que substitui a decisão anterior**: o bloco `:root`
> é **idêntico nos 8 artboards** (confirma design system real e consistente,
> não mockups desalinhados entre si) — mas é uma **paleta e tipografia
> inteiramente diferentes** do conjunto já vigente em produção, não uma
> extensão dele. A decisão de AC1 abaixo é reescrita de acordo; a versão
> anterior ("estendido") fica preservada só como registro histórico no Log de
> Alterações Pós-Publicação, mesmo tratamento já dado a outras correções deste
> documento (ex. S-AUTH-02, breakpoint do grid do dashboard).

**Decisão explícita exigida por RF-RS-00 AC1 (nunca deixada implícita): os
tokens publicados na Seção 3.1 abaixo SUBSTITUEM integralmente o conjunto já
vigente desde a repaginada de 2026-09-04 — não são uma extensão dele.** Esta é
uma leitura fiel do que os 8 artboards mostram (extração direta dos arquivos
reais, não mais uma decisão tomada sob limitação de ferramenta), comparada
lado a lado com `frontend/src/index.css`:

| Token | Produção atual | Mockup "v2.0" (idêntico nos 8 artboards) | Decisão final (esta rodada) |
|---|---|---|---|
| accent/primary | `#4f46e5` (índigo) | `#2F6B4F` (verde escuro) | `#2F6B4F`, sem alteração |
| income | `#16a34a` (token próprio) | `#2F6B4F` — fundido com accent | **Confirmado como fusão deliberada** (`adr/019...md`, Parte 1: "escolha de valor, não de estrutura" — os dois seguem tokens de nomes distintos, só coincidem numericamente; não exige revisão de arquitetura) |
| expense | `#dc2626` (vermelho vivo) | `#B4483A` (terracota) | `#B4483A`, sem alteração |
| danger (estouro, distinto de expense) | `#b91c1c` | Ausente do mockup (nenhum artboard mostra orçamento >100%) | **Finalizado nesta rodada**: `--danger:#752F26` — mesma família terracota de `--expense`, escurecida ~35% (mesma relação de intensidade já usada em produção entre `expense`/`danger`). Contraste calculado sobre `--bg`: **9,03:1** (folga ampla, AAA). Ausência de exemplo visual não significa ausência de necessidade do token (`adr/019...md`, Parte 1: "RN de estouro de orçamento >100% continua existindo no produto") — declarado mesmo sem uso literal em nenhum dos 8 artboards |
| warn | `#d97706` | `#B9862F` | `#B9862F`, sem alteração (ver correção de uso na Seção 5) |
| background | `#f8fafc` (frio) | `#FAF8F3` (creme quente) | `#FAF8F3`, sem alteração |
| surface | `#ffffff` | `#FFFFFF` (igual) | `#FFFFFF`, sem alteração |
| border | implícito em `neutral-200` | `#EDE8DD` | `#EDE8DD`, sem alteração |
| texto | escala neutra `slate` (`neutral-900`→`neutral-500`) | `--text:#1F2420` / `--text-2:#6B6F68` / `--text-3:#9A9C93` (3 níveis) | 3 níveis confirmados, com restrição de uso de `--text-3` (Seção 5) |
| tipografia | Inter (única família, sans) | `Newsreader` (serif, itálico no logo, títulos `h1`/saldo em peso 500) **+** `Public Sans` (corpo/UI) | **Resolvido via `adr/019-tipografia-numerica-seletiva-primitivo-num-migracao-incremental.md`** — não é classe `.num` solta; é o primitivo `Num` (`components/base/Num.tsx`), ver Seção 3.2. Fontes self-hosted via `@fontsource/public-sans`/`@fontsource/newsreader` (não Google Fonts CDN), preservando offline-first (ADR-003/RNF-04) |
| radius | `sm 4 / md 8 / lg 16 / xl 20` (4 níveis) | `--r-sm:8; --r-md:12; --r-lg:20` no desktop (3 níveis); mobile só declara `--r-md:12` na maioria dos artboards, e `--r-lg:18` (não 20) especificamente no card de saldo de `DashboardMobile.dc.html` | 3 níveis confirmados, sem alteração |
| elevação | `sm / md / lg` (`rgb(17 24 39 / ...)`) | `--shadow-sm:0 1px 2px rgba(31,36,32,.05); --shadow-md:0 6px 20px rgba(31,36,32,.06)` (desktop; mobile usa blur 18 em vez de 20 no `shadow-md`) | Confirmado, sem alteração |

**Resolução do Bloqueio 022 (`BLOCKERS.md`, resolvido por `software-architect`
via `adr/019-tipografia-numerica-seletiva-primitivo-num-migracao-incremental.md`,
Status: Accepted)** — substitui a "consequência arquitetural sinalizada, não
decidida" da versão anterior desta seção:

O ADR-019 confirma a suspeita registrada no Bloqueio 022: a tipografia
numérica seletiva **não cabe** na premissa "zero mudança de componente" do
ADR-017 — não por causa da paleta (que segue exatamente o precedente: mesmos
nomes de variável, novos valores, zero toque em `className`/JSX), mas por dois
motivos concretos, confirmados por inspeção real do código pelo Software
Architect: (1) **não existe hoje nenhuma infraestrutura real de web font** no
projeto (`Inter` está declarada em `index.css` mas nunca foi de fato carregada
— sem `<link>`/`@font-face`/pacote de fonte); (2) `formatCentsToBRL()` é
consumida por **interpolação direta em 17 arquivos, 25+ pontos de chamada**,
vários com o número concatenado no mesmo nó de texto que texto não-numérico
(ex. `BudgetCard.tsx`: `` `${formatCentsToBRL(spentCents)} de ${formatCentsToBRL(limitCents)}` ``
como `string` de uma prop `detailText`) — aplicar uma classe `.num`
seletivamente exigiria, nesses casos, mudar o contrato do componente, não só
adicionar `className`.

**Decisão (ADR-019, Opção 3 escolhida)**: introduzir um **primitivo `Num`**
(`components/base/Num.tsx`) no Lote 0 — mesmo diretório e disciplina de teste
dos outros 14 componentes-base — com **migração incremental lote a lote**
(mesmo desacoplamento token global vs. composição já validado pelo ADR-018),
não uma migração atômica de todos os 17 arquivos no Lote 0. Fonte via pacote
self-hosted (`@fontsource/public-sans`, `@fontsource/newsreader`), não Google
Fonts CDN — preserva o cache do service worker do PWA (ADR-003) e a
confiabilidade offline (RNF-04) sem depender de rede de terceiro. Ver Seção
3.2 para a especificação do componente `Num`, e os blocos "Redesign visual
v2.0" da Seção 2.2 para o plano de migração por lote. Dívida técnica explícita
registrada por este ADR (não escondida): durante a janela de migração, números
já migrados (`Newsreader`, via `<Num>`) convivem com números ainda não
migrados (fonte única atual) — mesma classe de risco já aceita pelo ADR-018
para composição de tela (`SDD.md` Adendo B, Seção B.6.2).

**AC2 — quatro superfícies não mostradas literalmente pelos 4 artboards
principais (escopo mínimo de abstração exigido do Lote 0)**: confirmado, após
leitura real dos 8 arquivos, que nenhum deles retrata Autenticação/Onboarding,
fatura detalhada, captura por voz/foto, ou o padrão de card de resumo que
RF-REF-05/06 já usam em produção. Situação por superfície:

| Superfície exigida (RF-RS-00 AC2) | Componente(s) que cobre(m) | Status |
|---|---|---|
| Formulário isolado pré-sessão (Auth) | `AuthCard`/`AuthLayout` **[NOVO — componente-base recomendado, especificação mínima nesta rodada]** | **Lacuna real, confirmada** — nenhum dos 8 artboards mostra tela de Auth; hoje duplicado ad hoc em `LoginPage.tsx`/`UnlockPage.tsx`/`PinSetupPage.tsx` (mesmo achado do `SDD.md` Adendo B, B.2.1). Consolidação formal ocorre no Lote 5 (Grupo B); especificação mínima publicada já nesta rodada (Seção 3.2), agora também com os tokens reais (fonte serif no título, cores v2.0) |
| Tabela/timeline de fatura | `InvoiceTimeline` (Seção 3.3, já existente) | Confirmado — `ContasCartoes.dc.html` mostra só a visão-lista/resumo de cartão (card com fatura atual + barra de limite usado), sem abas/timeline detalhada (AMB-17 confirmado, ver Seção 2.2 Lote 3) — `InvoiceTimeline` em si permanece coberto só conceitualmente, detalhamento visual fica com o Lote 8 |
| Elemento de captura por voz/foto | `VoiceRecorderUI`, `ReceiptCameraCapture`, `DraftReviewBanner`, `AutoFillTag` (Seção 3.3, já documentados **[NOVO]** desde a publicação original) | Confirmado — nenhum dos 8 artboards mostra captura automatizada; abstração textual já documentada permanece a única cobertura, nenhuma implementação de funcionalidade nesta rodada |
| Grade de card de resumo | `CategoryCard`/`BudgetCard` (Padrão C, Seção 2.1, já existente desde o Pacote de Refinamento) | **Confirmado como alvo final, resolvido (`BLOCKERS.md` Bloqueio 023, por `business-analyst`)**: `Categorias.dc.html`/`CategoriasMobile.dc.html` mostram lista-árvore expansível, não grade de cards — mas essa divergência foi julgada mockup desatualizado/incompleto, não mudança de comportamento. RF-REF-05 (Padrão C, `CategoryCard`) **prevalece como já estava antes do redesign**; `PRD-TECNICO.md` emendado (RF-RS-04 AC1 reforçado, AMB-20 registrada). Padrão C não é retratado literalmente por nenhum dos 8 artboards, mas é o alvo definitivo — a composição visual do Lote 4 precisa acomodar `CategoryCard` dentro da linguagem visual v2.0 (tokens/tipografia dos mockups), não reverter ao formato de lista-árvore mostrado |

**AC3 — contraste ≥4,5:1 (texto normal) / ≥3:1 (texto grande, ícones de estado)
sobre `color.surface`**: **validação real, calculada, não estimada** (fórmula
WCAG de luminância relativa, `frontend/src/index.css`/mockup convertidos
sRGB→linear). Dois achados de não-conformidade confirmados, não hipotéticos —
ver Seção 5 para o detalhamento completo e a correção aplicada:

| Par | Contraste calculado | Limiar exigido | Resultado |
|---|---|---|---|
| `--text-3` (`#9A9C93`) sobre `--bg` (`#FAF8F3`) | **2,62:1** | 4,5:1 (texto normal) / 3:1 (texto grande) | **Falha nos dois limiares** — usado em texto normal (11–13px) para "Categoria · Forma de pagamento" (todo item de lançamento), rótulos de banco em Contas, valor de subcategoria em Categorias |
| `--text-3` sobre `--surface` (`#FFFFFF`) | **2,78:1** | idem | **Falha nos dois limiares** |
| `--warn` (`#B9862F`) sobre `--bg`/`--surface`, como cor de **texto** (ex. "87%") | 3,04:1 / 3,22:1 | 4,5:1 (texto normal) | **Falha** — passa só o limiar de 3:1 aplicável a elemento gráfico não-textual (a própria barra de progresso preenchida, que atende 1.4.11) |
| `--text-2` (`#6B6F68`) sobre `--bg`/`--surface` | 4,83:1 / 5,12:1 | 4,5:1 | Passa (margem modesta) |
| `--accent`/`--income` (`#2F6B4F`) sobre `--bg` | 5,93:1 | 4,5:1 | Passa |
| `--expense` (`#B4483A`) sobre `--bg`/`--surface` | 5,03:1 / 5,34:1 | 4,5:1 | Passa |
| `--accent` sobre `--accent-soft` (nav ativo) | 5,33:1 | 4,5:1 | Passa |
| `--bg` (texto) sobre `--accent` (botão primário) | 5,93:1 | 4,5:1 | Passa |

**Correção aplicada por este `ux-ui` (dentro da minha autoridade de decisão de
token/detalhe visual, RF-RS-00 nota "não decidido aqui" — não uma restrição de
arquitetura do `SDD.md`, não escalado)**: dois ajustes de **uso**, não de
arquitetura, preservando a paleta v2.0 tal como extraída:
1. `--text-3` é restrito, neste documento, a conteúdo decorativo/não-essencial
   (ex. cor de traço de ícone `stroke="var(--text-3)"`) — todo uso onde o
   mockup aplicava `--text-3` a texto com informação real (linha secundária de
   item de lançamento, rótulo de banco, valor de subcategoria) passa a usar
   `--text-2` (já validado, 4,83:1+) em vez do valor literal do mockup. Ver
   Seção 3.1 nota de token.
2. `--warn` como **cor de preenchimento** (barra de progresso, ícone/badge de
   alerta) é preservado — atende 3:1 como elemento não-textual (SC 1.4.11).
   Como **cor de texto** (percentual "87%" e equivalentes), o texto passa a
   usar `--text`/`--text-2` (sempre passa) acompanhado do preenchimento/ícone
   `--warn` ao lado — mesmo princípio "não depender só de cor" já obrigatório
   neste documento desde a publicação original (Seção 5), agora aplicado
   também para resolver um problema de contraste, não só de semântica.

Nenhum destes dois ajustes muda a paleta em si (hex de `--text-3`/`--warn`
permanecem os do mockup) — muda só onde cada token pode ser aplicado como cor
de **texto**. Registrado explicitamente para o Tech Lead/`frontend` não
reintroduzirem o uso literal do mockup nesses dois pontos.

**AC4 — baseline de `design-system-consistency-check` antes do Lote 0
iniciar**: mantido como na versão anterior desta seção — a auditoria mais
recente registrada neste documento é o "Achado de consistência 2026-09-04"
(Seção 3.3, `CurrencyInput`/`S-CARD-02`), usada como baseline de N1. Nenhuma
auditoria completa nova foi reexecutada nesta rodada (sem acesso a uma sessão
executável do app) — ação pendente explícita, mesma classe do baseline M4, sem
impedir a estimativa do Tech Lead.

> **Atualização 2026-09-04 (UX-03) — AC4 satisfeito, pendência fechada.** A
> auditoria completa de `design-system-consistency-check` sobre o estado ATUAL
> de `frontend/src/` (análise estática de código-fonte, não uma sessão
> executável do app — limitação de ambiente já registrada nesta rodada, ver a
> nota de execução no topo da Seção 1.1) foi reexecutada e o baseline de N1
> está publicado na **Seção 3.0.1**, logo abaixo. O parágrafo AC4 acima é
> preservado como registro histórico do estado da pendência antes desta
> atualização (mesmo tratamento dado a S-AUTH-02 e a outras correções deste
> documento) — não é mais o estado de fato. `TASK.md` Seção 6, item 13, recebe
> o registro de status correspondente.

**AC5 — nenhum lote de tela inicia implementação antes desta publicação**: esta
Seção 3.0, nesta versão final, constitui a publicação exigida por RF-RS-00 AC5
— libera o Tech Lead para **estimar e planejar a implementação** dos Lotes 1-4
(Seção 2.2, mapeamento real linha a linha, sem pendência aberta) e o
levantamento incremental dos Lotes 5-13 (Seção 2.3). As duas escalações
abertas nesta rodada estão **ambas resolvidas**: `BLOCKERS.md` Bloqueio 022
(`software-architect`, via `adr/019-...md` — primitivo `Num`, migração
incremental) e Bloqueio 023 (`business-analyst` — RN-18/RF-REF-03/RF-REF-05
confirmados como alvo final, mockup julgado desatualizado/incompleto). Ver
Seção 7.2 para o registro formal de ambas como `Resolvido`.

### 3.0.1 Baseline N1 pré-Lote 0 — UX-03 (auditoria `design-system-consistency-check` completa) **[NOVO, 2026-09-04]**

**Dono/skill**: `ux-ui`, `design-system-consistency-check`. **Gatilho**: `TASK.md`
Seção 6, item 13 (`UX-03`), exigido por `PRD-TECNICO.md` RF-RS-00 AC4/Adendo B B6.5
antes de qualquer tarefa do Lote 0 começar. **Métrica que este baseline alimenta**:
N1 (`PRD.md` Adendo B, Seção B.3) — "% das superfícies redesenhadas usando
exclusivamente tokens/componentes de `UX-SPEC.md` Seção 3, sem estilo inline/ad-hoc
divergente", medida lote a lote a partir de agora.

**Método e limitação declarada** (mesma classe de limitação já registrada nesta
rodada para o acesso ao canvas — ver nota de execução no topo da Seção 1.1):
auditoria por **leitura/busca estática do código-fonte** de `frontend/src/`
(`Grep`/`Read` sobre todo `.tsx` de `components/base`, `components/domain` e
`pages/**`, e sobre `frontend/src/index.css`), não uma sessão executável do app no
navegador — não captura estado visual em runtime (hover/foco reais, media queries
avaliadas). Suficiente para o que N1 mede (uso de token/componente no código-fonte,
não renderização pixel a pixel), mas registrado como restrição de método, não
escondido.

**Achado 1 (o mais propagado — toca praticamente toda tela do produto): tokens
`-soft` já existem, mas 4 componentes-base ignoram-nos e usam a paleta padrão do
Tailwind em seu lugar.** `frontend/src/index.css` já declara `--color-primary-soft`,
`--color-income-soft`, `--color-expense-soft`, `--color-warning-soft` e
`--color-danger-soft` — exatamente para uso em fundo suave de estado (a mesma
convenção que `BudgetCard.tsx` já usa corretamente via `var(--color-warning-soft)`/
`var(--color-danger-soft)`, achado de qualidade de 2026-09-04). Quatro componentes,
porém, não usam esses tokens e escrevem a rampa de cor padrão do Tailwind
diretamente (`red-*`/`green-*`/`amber-*`/`blue-*`), que **não é redefinida** pelo
bloco `@theme` de `index.css` e portanto **não muda** quando o Lote 0 substituir a
paleta:
- `components/base/Alert.tsx:13-16` — `bg-blue-50` (info), `bg-amber-50` (warning),
  `bg-red-50` (danger), `bg-green-50` (success): 4 ocorrências.
- `components/base/Badge.tsx:17-22` — `bg-green-100` (income), `bg-red-100`
  (expense), `bg-amber-100` (warning), `bg-red-100` (danger), `bg-blue-100`
  (primary): 5 ocorrências.
- `components/domain/OfflineSyncBadge.tsx:45` — `bg-amber-100` +
  `hover:bg-amber-200`: 2 ocorrências.
- `components/base/Button.tsx:23` — variante `destructive`, `hover:bg-red-800`: 1
  ocorrência.

Total: **12 ocorrências** de cor não-token nesses 4 componentes-base. O impacto real
não é "4 componentes" — é a **propagação**: `Alert variant="danger"` (estado de
Erro, um dos 4 estados obrigatórios do Padrão A/B, Seção 4) é consumido por **todas
as ~18 telas de CRUD do produto** (`AccountsPage`, `BudgetPage`, `DashboardPage`,
`PinSetupPage`, `LoginPage`, `InstallmentsPage`, `CategoriesPage`, `RecurringPage`,
`GoalsPage`, `TaxonomyReviewPage`, `TransactionsPage`/`TransactionFormModal`,
`FirstAccountPage`, `FixedBillsPage`, `CreditCardsPage`, `PaymentMethodsPage`,
`SettingsPage`, `IncomeExpenseReportPage`), confirmado por varredura de todos os
pontos de chamada de `<Alert`/`<Badge`/`<OfflineSyncBadge`/`variant="destructive"`.
Sem correção, o estado de Erro de praticamente toda tela do produto continuará
exibindo tons de vermelho/âmbar/verde/azul do Tailwind genérico, visualmente
incoerentes com a paleta verde/terracota/creme do v2.0 — não é um problema que a
troca de tokens do Lote 0 resolve sozinha, é ação explícita adicional. Não escalado
ao Software Architect (não é conflito de arquitetura, é correção de implementação
dentro do que o `SDD.md` já permite) — registrado aqui para o Tech Lead incluir o
ajuste desses 4 componentes-base no escopo do Lote 0/Lote 1, e para o `frontend`
não reintroduzir a rampa padrão do Tailwind ao tocar esses arquivos.

**Achado 2: paleta categórica do `DonutChart` é 100% hardcoded, sem token
correspondente.** `components/domain/DonutChart.tsx:16` declara
`const PALETTE = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#7C3AED", "#0891B2",
"#DB2777", "#4B5563"]` — 8 valores hex literais, nenhum lido de `index.css`. Usado
em `S-DASH-01` (RF-MVP-06). Causa raiz: o design system só define 5 matizes
semânticas (`primary`/`income`/`expense`/`warning`/`danger`), nenhuma família
"categórica" para gráficos com mais de 2 séries — `BarChart.tsx` (2 séries:
entradas/saídas) usa corretamente `bg-income`/`bg-expense`, então a lacuna é
isolada ao caso de N categorias do donut. É o único hardcode de cor literal
encontrado em código de produção (fora de `.test.tsx`). Mesmo tratamento do Achado
1: não é conflito de arquitetura, é lacuna de token + ponto de código a corrigir;
registrado para o Tech Lead prever, no Lote 0 ou no lote que tocar o Dashboard
(Lote 1), a definição de uma família `--color-chart-*` (N tons derivados da nova
paleta v2.0, mantendo contraste ≥3:1 exigido para elemento gráfico não-textual,
Seção 5) e a migração do `DonutChart` para consumi-la.

**Achado 3: 4 telas de Auth/Onboarding duplicam manualmente o mesmo wrapper de
card, e uma 5ª usa um padrão estrutural diferente — confirma e quantifica, por
inspeção direta de código, a lacuna já registrada em AC2 acima
(`AuthCard`/`AuthLayout`).** Nenhuma das 5 usa o `Card` já existente
(`components/base/Card.tsx`). Em vez disso:
- `pages/auth/LoginPage.tsx:59`, `pages/auth/PinSetupPage.tsx:83`,
  `pages/onboarding/FirstAccountPage.tsx:54` e
  `pages/onboarding/TaxonomyReviewPage.tsx:38` reescrevem, cada uma
  independentemente, a mesma classe `"w-full max-w-sm|md rounded-lg bg-surface p-6
  shadow-elevation-md"` (uma delas acrescenta `text-center`) — 4 cópias
  divergentes do mesmo wireframe "card centralizado, isolado" (Seção 2.2,
  S-AUTH-01/02/04, S-ONB-01/02), nenhuma delas o componente-base `Card`.
- `pages/auth/UnlockPage.tsx` (S-AUTH-03/05) usa um **padrão estrutural
  diferente**: sem card algum, layout borderless de tela cheia centralizada
  (`flex min-h-screen ... bg-surface-alt`) — correto quanto a tokens de cor, mas é
  um 2º padrão de "container de tela pré-sessão" coexistindo com o 1º (card
  caixado), para o mesmo propósito conceitual.
Resultado: **2 padrões de container divergentes para a mesma família de tela**
(pré-sessão/onboarding), nenhum dos dois sendo o `AuthCard`/`AuthLayout` que a AC2
já recomenda formalizar. Consolidação continua planejada para o Lote 5 (Grupo B,
conforme já registrado); este achado só adiciona a contagem exata de pontos de
código a migrar quando esse lote acontecer.

**Achado 4 (controle positivo — não é uma pendência, é o contraponto que confirma
que os Achados 1-3 são a exceção, não a regra).** Fora do cluster Auth/Onboarding
(Achado 3) e dos 4 componentes do Achado 1, o restante do design system mostra
**um único padrão canônico por propósito**, sem reinvenção divergente:
- **Card genérico**: usado sem alteração por `CategoryCard`, `BudgetCard`,
  `LoginPage`(não — ver Achado 3)/demais páginas de CRUD, `Modal`, `Toast` — 0
  reimplementações alternativas de "card" fora do Achado 3.
- **Botão primário**: `Button variant="primary"` é o único ponto de estilo de
  botão de ação primária em todo o código auditado — nenhuma tela reimplementa um
  `<button>` cru com a aparência de botão primário por fora do componente.
- **Campos de formulário**: `Input`/`Select`/`DatePicker`/`CurrencyInput`/
  `CategoryPicker` compartilham `FieldLabel`/`FieldMessage`
  (`components/base/FieldChrome.tsx`) — rótulo, obrigatoriedade e mensagem de
  erro/apoio têm markup e comportamento idênticos entre os 5 campos.
- **Botão de ícone isolado** (ação secundária tipo "editar"/"expandir tabela"):
  não existe componente-base próprio ainda, mas as 33 ocorrências encontradas em
  24 arquivos repetem **a mesma classe literal**
  (`min-h-11 min-w-11 ... focus-visible:outline-2 focus-visible:outline-primary`)
  — duplicada, porém consistente (não divergente); candidato a virar um
  `IconButton` de design system no Lote 0/5, sinalizado aqui para não ser
  reinventado de forma diferente por lote a lote durante o redesign.

**Métrica quantitativa de N1 (nível ocorrência, complementar à métrica "% de
superfícies" oficial de `PRD.md` Adendo B B.3)**: contagem de classes utilitárias
de cor que resolvem para um token de `index.css` (`bg|text|border|ring-` +
`primary|income|expense|warning|danger|neutral|surface`) vs. cor não-token
(hex literal ou classe da rampa padrão do Tailwind não redefinida por `@theme`):

| | Ocorrências | Fonte |
|---|---|---|
| Cor via token (`index.css`/`@theme`) | 251 | 55 arquivos `.tsx` de produção |
| Cor não-token (hex literal ou rampa padrão Tailwind) | 20 | 8 (`DonutChart` PALETTE) + 12 (Achado 1) |
| **N1 aproximado (nível ocorrência)** | **251 / 271 ≈ 92,6%** | — |

**Tabela de superfícies (nível "% de superfícies", a métrica oficial de N1)** —
veredito por domínio, considerando o critério estrito de N1 ("sem estilo
inline/ad-hoc divergente", 0 exceções para ser 100%):

| Domínio / superfícies | Veredito | Motivo |
|---|---|---|
| Auth (S-AUTH-01/02/04) | Parcial | Achado 3 (card duplicado) |
| Auth (S-AUTH-03/05) | Parcial | Achado 3 (padrão estrutural divergente, sem card) |
| Onboarding (S-ONB-01/02) | Parcial | Achado 3 (card duplicado) |
| Dashboard (S-DASH-01) | Parcial | Achado 2 (`DonutChart`) + Achado 1 (`Alert` erro) |
| Todas as telas de CRUD com estado de Erro (Contas, Formas de Pagamento, Categorias, Orçamento, Cartões, Parcelas, Recorrências, Metas, Contas Fixas, Lançamentos, Relatórios, Configurações) | Parcial | Achado 1 (`Alert variant="danger"`, presente em todas) |
| Navegação (`AppLayout`, `OfflineSyncBadge`) | Parcial | Achado 1 (`OfflineSyncBadge`) |
| Relatórios (`BarChart`, 2 séries) | Compliant | Usa `bg-income`/`bg-expense`, sem exceção |
| Formulários (campos `Input`/`Select`/`DatePicker`/`CurrencyInput`/`CategoryPicker`, isoladamente) | Compliant | `FieldChrome` compartilhado, sem hardcode |

**Leitura honesta do resultado**: pelo critério estrito de N1 ("0 divergência para
ser 100%"), a **grande maioria das superfícies do produto herda pelo menos 1
ocorrência do Achado 1** (o estado de Erro do Padrão A/B está presente em quase
toda tela) — o baseline real de N1, na métrica oficial de "% de superfícies 100%
aderentes", é **baixo** (poucas superfícies passam no critério de zero exceções),
mesmo com adesão de ~92,6% no nível de ocorrência individual de cor. As duas
leituras não se contradizem: um pequeno número de componentes-base amplamente
reutilizados (Achado 1) é suficiente para derrubar a métrica "por superfície"
mesmo quando a adesão agregada por ocorrência é alta — é exatamente por isso que
`PRD.md` Adendo B B.3 mede N1 por superfície, não por ocorrência agregada, e é
esse número (superfície) que deve ser cobrado lote a lote daqui em diante. Este
baseline não é uma condição de bloqueio do Lote 0 — é a fotografia "antes" contra a
qual `PRD.md` Adendo B B.3 exige comparação "ao final de cada lote".

**Nenhum destes 4 achados é escalado ao Software Architect** — são correções de
implementação dentro do que o `SDD.md` já permite (mesma natureza da correção de
`--text-3`/`--warn` já aplicada nesta Seção, AC3), não uma restrição de
arquitetura. Registrados para o Tech Lead avaliar reestimativa dos componentes
afetados (`Alert`, `Badge`, `Button`, `OfflineSyncBadge`, `DonutChart` — todos já
dentro do escopo de tela tocado pelos Lotes 0-4) e para o `frontend` não
reintroduzir os mesmos padrões ao implementar.

### 3.1 Tokens visuais

> **Correção 2026-09-04 (Redesign Visual "MyMoney v2.0", Lote 0) — substitui a
> nota anterior desta seção.** Com acesso real aos 8 arquivos `.dc.html`, a
> tabela abaixo **substitui integralmente** os valores da repaginada de
> 2026-09-04 (histórico preservado só na cópia versionada do Git, mesmo
> tratamento já usado pela própria repaginada em relação à publicação original
> de 2026-09-02) — não é uma extensão. Fonte: bloco `:root` idêntico nos 8
> artboards (`Main.dc.html`, `Lancamentos.dc.html`, `ContasCartoes.dc.html`,
> `Categorias.dc.html`, e as 4 variantes `*Mobile.dc.html`). Decisão de
> substituir (não estender) é minha, dentro da autoridade que RF-RS-00 deixa
> explicitamente ao `ux-ui` ("não decidido aqui"). **Ressalva de arquitetura
> resolvida** (`BLOCKERS.md` Bloqueio 022, `Resolvido` por `software-architect`
> via `adr/019-tipografia-numerica-seletiva-primitivo-num-migracao-incremental.md`):
> a tipografia numérica seletiva não cabe no precedente "zero mudança de
> componente" do ADR-017 — vira o primitivo `Num` (Seção 3.2), não uma classe
> `.num` solta. Ver Seção 3.0 para o racional completo.

| Token | Valor/Definição (real, extraído dos 8 artboards) | Uso |
|---|---|---|
| `--accent` (primary) | Verde escuro `#2F6B4F`, hover `#244F3B` (usado em `a:hover`), fundo suave `--accent-soft` `#E7EEE8` | Ações primárias, links, estado ativo de navegação, ícone/fundo de "sincronizado agora" |
| `--income` | `#2F6B4F` — **mesmo valor de `--accent`**, fusão confirmada como escolha de valor (`adr/019...md` Parte 1) | Entradas, saldo positivo |
| `--expense` | Terracota `#B4483A`, fundo suave `--expense-soft` `#F5E7E1` | Saídas |
| `--warn` | Âmbar-dourado `#B9862F`, fundo suave `--warn-soft` `#F5EBDA` | Alerta de aproximação de orçamento (80%) — **ver Seção 5**: como cor de preenchimento/ícone, ok; como cor de texto direto, falha contraste (3,04–3,22:1), corrigido nesta rodada |
| `--danger` (estouro, distinto de expense) **[NOVO/FINALIZADO, ausente do mockup]** | `#752F26` — mesma família terracota de `--expense`, escurecida ~35% (mesma relação de intensidade que a produção atual já usa entre `expense`/`danger`). Contraste calculado sobre `--bg`: **9,03:1** (folga ampla). Declarado mesmo sem exemplo visual no mockup (`adr/019...md` Parte 1: "RN de estouro de orçamento >100% continua existindo no produto") | Estouro de orçamento (>100%), sempre acompanhado de ícone + texto distintos do alerta (RN-04) — nunca só tom de vermelho mais forte |
| `--bg` | Creme quente `#FAF8F3` | Fundo de página |
| `--surface` | `#FFFFFF` | Fundo de card |
| `--border` | `#EDE8DD` | Bordas de card, separadores de lista |
| `--text` | `#1F2420` (quase preto, esverdeado) | Texto primário — contraste 14,8:1 sobre `--bg`, folga ampla |
| `--text-2` | `#6B6F68` | Texto secundário com informação real (rótulos, "vence 10/09", categoria·forma de pagamento — **realocado para cá nesta rodada**, ver Seção 5) — 4,83:1 sobre `--bg` |
| `--text-3` | `#9A9C93` | **Restrito nesta rodada a uso decorativo/não-textual** (traço de ícone) — falha contraste como texto (2,62–2,78:1), ver Seção 5 |
| `typography` | **Duas famílias**: `Newsreader` (serif; itálico peso 500 só no logo "MyMoney"; peso 500 roman em `h1`/título de página e no valor do saldo consolidado) + `Public Sans` (400/500/600/700, corpo/UI, aplicada ao `body` inteiro por padrão) | **Resolvido via `adr/019-...md`**: aplicada através do primitivo `Num` (`components/base/Num.tsx`, Seção 3.2) — não uma classe `.num` aplicada diretamente em JSX já existente. Fontes carregadas via pacote self-hosted (`@fontsource/public-sans`, `@fontsource/newsreader`), não `<link>` para Google Fonts CDN — preserva cache do service worker/offline-first (ADR-003, RNF-04). Migração dos 17 arquivos/25+ pontos de chamada já existentes de `formatCentsToBRL()` é incremental, lote a lote (ver blocos "Redesign visual v2.0", Seção 2.2), não atômica no Lote 0 |
| `font-size` (observados) | `h1` 32px desktop / 24px mobile (Newsreader 500); logo 22px itálico; saldo consolidado 48px desktop / 34px mobile (`<Num>`); KPI 26px desktop / 16px mobile (`<Num>`); corpo/item de lista 14px / 13px mobile; secundário 12–13px / 11–12px mobile; nav label 11px uppercase `letter-spacing:0.06em` | Escala observada empiricamente nos 8 artboards, não uma escala nomeada (`xs/sm/base…`) explícita no `:root` — Tech Lead/`frontend` podem mapear para a escala Tailwind mais próxima já em uso |
| `spacing` | Não redefinido explicitamente por token próprio nos artboards — paddings observados usam múltiplos de 4px (12/14/16/18/20/22/24/28/32/36/40/48), compatível com a escala 4/8/12/16/24/32/48 já em produção | Nenhuma mudança de escala de espaçamento confirmada — apenas os múltiplos usados em cada componente específico (ver Seção 2.2) |
| `radius` | Desktop: `--r-sm:8px; --r-md:12px; --r-lg:20px` (3 níveis, contra 4 níveis `sm4/md8/lg16/xl20` da produção); mobile: só `--r-md:12px` declarado na maioria dos artboards, e `DashboardMobile.dc.html` declara `--r-lg:18px` (não 20px) especificamente para o card de saldo | `--r-sm` (8px) = botões/chips; `--r-md` (12px) = `Card` padrão; `--r-lg` (20px desktop / 18px mobile) = card de saldo consolidado (hero), mesmo papel conceitual do antigo `radius.xl`, mas sem um 4º nível distinto — este documento consolida em 3 níveis nomeados (`r-sm`/`r-md`/`r-lg`), substituindo `sm/md/lg/xl` |
| `elevation` | `--shadow-sm:0 1px 2px rgba(31,36,32,.05)` (card padrão); `--shadow-md:0 6px 20px rgba(31,36,32,.06)` desktop / `0 6px 18px rgba(31,36,32,.06)` mobile (card de saldo) | Mesma disciplina de no máximo 2 níveis simultâneos por tela já vigente — `shadow-md` só no card de saldo, resto em `shadow-sm` |
| `motion` | Não observável nos arquivos estáticos (`.dc.html` não tem transição/JS) — mantido o já vigente: transições ≤200ms hover/foco, ≤300ms modal/sheet, respeitando `prefers-reduced-motion` | Sem evidência de mudança nos mockups; preservado até indicação em contrário |
| Ícones | Line-style, `stroke-width:1.6–1.8`, grade 24px (desktop) / 21px (mobile, nav) / 17–18px (chips/botões pequenos) — SVG inline com `stroke="currentColor"`, consistente com o token de ícone já vigente (linha, não preenchido) | Confirma a correção já pendente de "trocar emoji por ícone line-style na navegação inferior mobile" (achado de 2026-09-04) — o mockup usa exclusivamente ícone SVG line-style, nunca emoji, em toda navegação |
| Moeda/formato | BRL, `R$ 0.000,00` — confirmado nos mockups (todo valor com símbolo, exceto quando o rótulo ao lado já deixa a moeda implícita em mobile, ex. "8.200,00" sem "R$" repetido em card de KPI compacto — decisão de compactação visual, não de formato) | `RNF-07` preservado |

### 3.1.1 Tokens/regras de layout para prevenir corte de conteúdo **[NOVO]**

Adicionado nesta atualização junto da repaginada — a auditoria de código mostrou
que o corte de campo relatado pelo stakeholder tem causa técnica concreta e
recorrente nos componentes-base, não é só percepção de "aparência apertada".
Estas regras são tokens de layout no mesmo espírito dos tokens visuais acima:
todo componente/tela novo os segue por padrão.

| Regra | Detalhe | Onde se aplica |
|---|---|---|
| Campo de formulário sempre `w-full` | `Input`, `Select`, `DatePicker`, `CurrencyInput` não declaram largura própria hoje — funcionam por acidente porque todo uso atual está dentro de um contêiner `flex flex-col` (que estica o item de coluna por padrão). Isso quebra assim que qualquer campo entra numa célula de grid/linha `flex-row` (exatamente o que a Seção 2.1 passa a pedir para formulários de 5+ campos). Correção: os 4 componentes passam a declarar `w-full` explicitamente no próprio elemento `<input>`/`<select>`, em vez de depender do comportamento do contêiner pai. | `frontend/src/components/base/Input.tsx`, `Select.tsx`, `DatePicker.tsx`, `frontend/src/components/domain/CurrencyInput.tsx` |
| Item de flex-row com texto variável sempre `min-w-0` | Flex item com `flex-1`/`flex-1 basis-0` sem `min-w-0` não encolhe abaixo do tamanho intrínseco do conteúdo — é a causa técnica exata do `CategoryPicker` (2 selects lado a lado a partir de `sm`) poder ultrapassar a largura do contêiner com nome de categoria/subcategoria longo. Todo par de campos lado a lado (grid de 2 colunas da Seção 2.1, `CategoryPicker`) recebe `min-w-0` em cada célula. | `frontend/src/components/domain/CategoryPicker.tsx`; toda célula do grid de formulário (regra 2, Seção 2.1) |
| Bloco de texto de item de lista sempre `min-w-0 flex-1` + `truncate` | Ver Seção 2.1 "Linha de item de lista com ação" — nome/descrição nunca empurra o bloco de ações para fora da tela. | Todo item de lista do Padrão A, mais `InvoiceTimeline` |
| Grid fixo (`grid-cols-N`) nunca sem colapso em mobile | `grid-cols-3` só é seguro em telas onde 3 colunas cabem confortavelmente com o conteúdo mais longo esperado (valor em R$, que pode chegar a 6+ dígitos). Onde isso não é garantido, o grid colapsa: `grid-cols-1 gap-3 text-left sm:grid-cols-3 sm:text-center` em vez de `grid-cols-3` fixo. | `frontend/src/pages/dashboard/DashboardPage.tsx` linha 106 (resumo Entradas/Saídas/Lançamentos) |
| Modal/BottomSheet já correto — preservar, não é um achado novo | `Modal.tsx` já implementa `max-h-[90vh]` + `overflow-y-auto` no corpo — o corte relatado pelo stakeholder **não** vem de formulário maior que a viewport sem scroll (isso já funciona); vem dos dois pontos acima (campo sem `w-full` dentro de grid, linha de lista sem `min-w-0`/wrap). Registrado aqui para o `frontend` não "consertar" algo que já está certo. | `frontend/src/components/base/Modal.tsx` |

### 3.2 Componentes — Base (primitivos genéricos, baixo risco/esforço de estimativa)

| Componente | Descrição |
|---|---|
| `Button` | Variantes: primária, secundária, ghost, destrutiva; estados hover/foco/disabled/loading |
| `Input` (texto/número/data) | Label + helper text + estado de erro inline |
| `Select` | Dropdown simples de opção única |
| `Card` | Contêiner de conteúdo com `elevation.sm` |
| `Badge` | Pílula de status (cor + texto, nunca só cor — ver Seção 5) |
| `Toast/Snackbar` | Feedback temporário não-bloqueante (ex. "Salvo com sucesso") |
| `Modal` (desktop) / `BottomSheet` (mobile) | Mesmo componente lógico, apresentação responsiva (Seção 6) |
| `Skeleton` | Placeholder de carregamento |
| `EmptyState` | Ilustração + texto + CTA |
| `Alert/Banner` | Mensagem persistente inline (erro de carregamento, aviso de orçamento) |
| `Tabs` | Navegação por abas (usado em S-CARD-03) |
| `FilterBar` | Conjunto de filtros (conta, forma de pagamento, categoria, período) |
| `ConfirmationDialog` | Instância do Padrão B (Seção 2.1) |
| `DatePicker` | Seleção de data única |
| `Num` **[NOVO, 2026-09-04, Redesign Visual "MyMoney v2.0", Lote 0 — `adr/019-tipografia-numerica-seletiva-primitivo-num-migracao-incremental.md`]** | Primitivo de renderização de número em `Newsreader` (`font-variant-numeric: tabular-nums`), introduzido no Lote 0, migração incremental lote a lote nos 17 arquivos/25+ pontos de chamada já existentes de `formatCentsToBRL()` — nunca uma migração atômica. **Contrato mínimo** (nome/API final é decisão do `frontend`, não fixada em pixel aqui, mesma disciplina já usada para `AuthCard`): `<Num value={number} format="currency" \| "percent" \| "count" />` — `format="currency"` aplica `formatCentsToBRL()` internamente (recebe centavos) e renderiza com símbolo BRL; `format="percent"` recebe percentual já calculado e adiciona `%`; `format="count"` renderiza um inteiro sem formatação monetária (ex. "47 este mês"). Renderiza sempre um `<span>` (ou elemento equivalente inline) isolado — nunca concatenado a texto não-numérico no mesmo nó; onde hoje um número está concatenado a texto no mesmo nó/`string` (ex. `BudgetCard` — `"${formatCentsToBRL(spentCents)} de ${formatCentsToBRL(limitCents)}"` numa prop `detailText: string`), o componente consumidor precisa ser ajustado para aceitar `ReactNode`/props numéricas separadas em vez de uma única `string` pré-formatada — mudança de contrato de componente, não só de estilo, tratada como parte do esforço do lote que tocar aquele componente (ver blocos "Redesign visual v2.0", Seção 2.2). Até a migração de um ponto de chamada específico, ele permanece renderizando o número na fonte única atual — dívida técnica explícita (`SDD.md` Adendo B, Seção B.6.2), nunca escondida. |
| `AuthCard`/`AuthLayout` **[NOVO, recomendado, 2026-09-04, Redesign Visual "MyMoney v2.0", Lote 0/Lote 5]** | Consolida o padrão hoje duplicado ad hoc (card centralizado, sem navegação lateral, título + corpo + rodapé de ação/link secundário) usado por `S-AUTH-01/02/03/04/05` e `S-ONB-01/02` num único componente-base reutilizável — materializa a 4ª superfície exigida por RF-RS-00 AC2 (formulário isolado pré-sessão). Especificação mínima: `AuthLayout` = contêiner de página inteira (sem `AppLayout`/navegação), centraliza `AuthCard` vertical e horizontalmente, largura fixa menor que a viewport em desktop (`lg`+), largura confortável total em mobile (mesmo padrão já descrito na Seção 6.3 para S-AUTH-02); `AuthCard` = `Card` (Seção 3.2, `--shadow-sm`, `--r-md`) com título em `Newsreader` (mesma família do `h1`/logo, Seção 3.1) e slots para corpo (formulário/conteúdo específico da tela, em `Public Sans`) e rodapé (link(s) secundário(s), ex. "Esqueci minha senha"/"Usar PIN em vez disso"). Decisão final de nome de API/props é do `frontend`, não decidida aqui (mesma disciplina de "não decidido aqui" já usada pelo Software Architect); consolidação de fato — migrar `LoginPage.tsx`/`UnlockPage.tsx`/`PinSetupPage.tsx` para usá-lo — ocorre no Lote 5 (Grupo B, Seção 2.3), esta linha só publica a especificação mínima para permitir estimativa antecipada pelo Tech Lead. |

**Nota (S-AUTH-02, adicionada em 2026-09-03)**: a tela de verificação por e-mail
(Seção 2.2) não introduz nenhum componente novo — reaproveita integralmente
`Input`, `Button` e `Alert`/`Banner` já listados acima. O único elemento de
interação sem precedente explícito no documento original é o **padrão
"link de reenvio com cooldown"** (link de texto que fica desabilitado por N
segundos após acionado, com contagem regressiva visível e anúncio de
acessibilidade só no início/fim do cooldown — Seção 5): é documentado aqui como
um **padrão de interação reutilizável** construído sobre o link-texto já usado em
"Esqueci minha senha" (S-AUTH-01) e "Usar PIN em vez disso" (S-AUTH-03), não como
componente novo de design system — não exige criação de biblioteca separada, mas
qualquer tela futura com a mesma necessidade (ex. reenvio de link mágico) deve
seguir esta mesma referência em vez de reinventar o comportamento.

### 3.3 Componentes — Específicos de domínio financeiro (atenção extra de estimativa)

Estes componentes carregam lógica de negócio ou interação não-trivial — o Tech Lead
deve estimá-los com mais cautela que os componentes-base acima, especialmente os
ligados à captura automatizada (RNF-01 é barreira arquitetural, não apenas visual).

| Componente | Descrição | Onde é usado |
|---|---|---|
| `CurrencyInput` | Input numérico formatado em BRL em tempo real, com máscara e validação de valor positivo | S-TXN-02, S-BUD-02, S-ACC-02, S-CARD-02, S-INST-01, S-GOAL-02, S-CAP-03/05 |
| `CategoryPicker` | Seleção em 2 níveis (categoria > subcategoria), reflete mudanças de taxonomia em tempo real (RF-MVP-03 AC2) | S-TXN-02, S-BUD-02, S-CAP-03/05 |
| `DonutChart` (distribuição por categoria) | Gráfico + legenda tocável, navega para lista filtrada | S-DASH-01 |
| `BarChart` (entradas x saídas) | Agrupado por mês, trata "menos de 6 meses de dado" sem preencher com zero (RF-F2-10 AC2) | S-REP-01 |
| `LineChart` (evolução patrimonial) | Série temporal, filtrável por conta | S-REP-02 |
| `ProgressBar` (orçamento/meta) | 3 estados visuais (normal/alerta/estouro), texto + ícone, não só cor | S-BUD-01, S-GOAL-04 |
| `InstallmentProgress` | Contagem "parcela X de N", distinto de ProgressBar percentual | S-INST-02 |
| `InvoiceTimeline` (abas de fatura) | 3 competências, total + badge aberta/fechada por aba | S-CARD-03 |
| `NotificationBell` + `NotificationCenter` | Contador não-lidas + lista persistente independente de push (RF-F2-09 AC2) | topo de toda tela autenticada (MVP+F2), S-NOT-01 |
| `OfflineSyncBadge` | Indicador de lançamentos na fila offline (IndexedDB) ainda não sincronizados, com detalhe ao tocar | topo de toda tela autenticada, RNF-04 |
| `PinPad` | Teclado numérico de desbloqueio, com feedback de tentativas restantes | S-AUTH-03, S-AUTH-04, S-AUTH-05 |
| `VoiceRecorderUI` **[NOVO]** | Mic pulsante + transcrição ao vivo (interim results) + cancelar/concluir | S-CAP-02 |
| `ReceiptCameraCapture` **[NOVO]** | Viewfinder com moldura-guia + captura/upload alternativo + pré-visualização | S-CAP-04 |
| `DraftReviewBanner` **[NOVO]** | Banner fixo "Rascunho — revise antes de salvar", não-descartável até ação explícita — é a materialização visual de RNF-01 | S-CAP-03, S-CAP-05 |
| `AutoFillTag` **[NOVO]** | Selo "✨ sugerido" por campo, desaparece ao editar (RF-F3-01 AC3) | S-CAP-03, S-CAP-05 |
| `CandidateList` **[NOVO]** | Lista selecionável com sinalização de possível duplicata (desmarcada por padrão) + confirmação em lote | S-CAP-07 |
| `ReconciliationHint` **[NOVO]** | Link "ver lançamento existente" ao lado de um candidato sinalizado como duplicata | S-CAP-07 |
| `ShortcutBar` **[NOVO, 2026-09-04, Pacote de Refinamento]** | Contêiner que renderiza até 10 `ShortcutChip`, consumindo `get_transaction_shortcuts()` (`SDD.md` Adendo A, ADR-015) a cada carregamento de tela; some por completo (não renderiza vazio) quando a RPC retorna 0 linhas (RF-REF-03 AC2) | S-TXN-01 |
| `ShortcutChip` **[NOVO, 2026-09-04, Pacote de Refinamento]** | Pílula clicável (`radius.full`) com ícone + nome da subcategoria; ao clicar, abre `S-TXN-02` pré-preenchido (RN-13) com foco automático no campo Valor (RF-REF-03 AC3/AC4) | `ShortcutBar` (S-TXN-01) |
| `CategoryCard` **[NOVO, 2026-09-04, Pacote de Refinamento]** | Card do Padrão C (Seção 2.1): nome + ícone/cor, total gasto no mês, contagem de subcategorias; clique abre `S-CAT-01a` (subcategorias, reaproveita `Modal`/`BottomSheet`) | S-CAT-01 |
| `BudgetCard` **[NOVO, 2026-09-04, Pacote de Refinamento]** | Card do Padrão C (Seção 2.1): categoria, gasto vs. teto, `ProgressBar` reaproveitado, destaque visual de severidade no próprio card; clique abre `S-BUD-02` | S-BUD-01 |

**Regra de exibição compartilhada, não um componente visual (2026-09-04, RF-REF-04,
`ADR-016` Decisão 1)**: `derivePaymentMethodLabel(paymentMethod, accounts)` é uma
função utilitária 100% client-side (não um componente de UI) que calcula o rótulo
`"{Forma de Pagamento} {Nome da Conta}"`/`"{Forma de Pagamento}"` conforme RN-14.
Toda superfície que exibe forma de pagamento — `<select>` de `S-TXN-02`, linha 2 do
item de lista de `S-TXN-01` (RF-REF-02), `FilterBar`, `ShortcutChip` (quando exibir
o nome da forma de pagamento pré-preenchida) — **deve** consumir esta mesma função,
nunca formatar o rótulo de forma própria (RNF-13). Sinalizado aqui, na Seção 3, para
que o `frontend` não trate isso como detalhe implícito de cada tela isoladamente.

**Achado de consistência 2026-09-04 (`design-system-consistency-check`)**: o
formulário de `S-CARD-02` (`frontend/src/pages/creditCards/CreditCardsPage.tsx`)
usa um `Input` genérico `type="number"` para o campo "Limite (R$)" em vez do
`CurrencyInput` que esta própria seção já designa para `S-CARD-02` desde a
publicação original (linha "`CurrencyInput` ... Onde é usado: ... S-CARD-02").
Não é um componente novo fora do design system — é o componente certo definido
aqui deixando de ser usado na implementação. Sinalizado para o `frontend`
corrigir (trocar o `Input` number pelo `CurrencyInput`), registrado no Log de
Alterações Pós-Publicação.

**Nenhum componente desta seção é assumido como já disponível em alguma biblioteca de
terceiros** — mesmo que o Tech Lead opte por implementar `DonutChart`/`BarChart`/
`LineChart` sobre uma lib de gráficos existente, os 4 componentes marcados **[NOVO]**
acima (`VoiceRecorderUI`, `ReceiptCameraCapture`, `DraftReviewBanner`, `AutoFillTag`,
`CandidateList`) não têm equivalente pronto genérico — carregam regra de produto
específica (RNF-01/RNF-08) e devem ser tratados como desenvolvimento sob medida na
estimativa.

**Nota sobre os componentes novos do Pacote de Refinamento (2026-09-04)**:
`ShortcutChip` é essencialmente um `Button`/`Badge` clicável em formato pílula —
esforço baixo, reaproveita variante visual já existente do design system, não
desenvolvimento do zero. `ShortcutBar` é um contêiner simples de layout (flex/grid +
scroll horizontal condicional, Seção 6.3) sobre uma chamada de API nova — esforço
concentrado na integração com `get_transaction_shortcuts()` (`ADR-015`), não na UI em
si. `CategoryCard`/`BudgetCard` reaproveitam dado/cálculo já existente (RF-MVP-06/07)
dentro de um card genérico do Padrão C — próximos, em esforço, de um `Card` +
`ProgressBar` já existentes combinados, não um componente com lógica nova de
domínio. Nenhum dos 4 exige a mesma cautela de estimativa que os componentes de
captura automatizada listados acima.

---

## 4. Estados de Tela (vazio, carregando, erro, sucesso)

Para telas de CRUD estrutural (S-ACC, S-PAY, S-CAT, S-CARD-01/02, S-REC, S-FIX,
S-GOAL) os 4 estados seguem o **Padrão A/B** abaixo; telas com comportamento
divergente têm nota própria na tabela da Seção 4.2.

### 4.1 Padrões gerais de estado

| Padrão | Vazio | Carregando | Erro | Sucesso |
|---|---|---|---|---|
| **A — Lista CRUD** | `EmptyState` com ilustração + "Nenhum [item] cadastrado ainda" + CTA "Cadastrar" | `Skeleton` (3–5 linhas) | `Banner` "Não foi possível carregar. Tentar novamente", lista anterior em cache permanece visível esmaecida se existir | Lista populada, alteração refletida imediatamente (otimista) + `Toast` de confirmação |
| **B — Formulário (novo/editar)** | **Não aplicável** — um formulário não tem "conteúdo vazio" distinto do seu estado inicial em branco; a ausência de dado é coberta por validação obrigatória, não por um estado de tela separado | Botão de submit com spinner, campos desabilitados durante o envio | Erro inline por campo (obrigatório ausente, RF-MVP-04 AC2/RF-MVP-01 AC2) + `Banner` geral se a falha for de rede/persistência (não de validação) | `Toast` "Salvo com sucesso" + retorno à lista/detalhe, saldo/total recalculado imediatamente |
| **C — Confirmação destrutiva (Padrão B de layout)** | **Não aplicável** — é sempre acionada com um alvo específico já definido | **Não aplicável** — ação síncrona e rápida, sem etapa de carregamento perceptível ao usuário | `Banner` inline no próprio modal se a exclusão/edição falhar no servidor | Modal fecha + `Toast` de confirmação + item removido/alterado na lista de origem |

### 4.2 Estados por tela com comportamento divergente do padrão geral

| Tela | Vazio | Carregando | Erro | Sucesso |
|---|---|---|---|---|
| **S-DASH-01** | Nenhuma conta cadastrada → CTA para S-ACC-02; contas existem mas sem lançamento no mês → gráfico substituído por `EmptyState` "Nenhum lançamento este mês ainda" mantendo números-resumo em zero visível (não escondidos) | `Skeleton` nos 3 blocos (saldo, resumo, gráfico) — a partir de `lg`, os mesmos blocos em `Skeleton` só se reorganizam na grade de 2 colunas (RF-REF-01), sem novo estado | `Banner` "Não foi possível atualizar os dados" + últimos valores conhecidos permanecem visíveis com timestamp "atualizado há 4 min" | Dados atualizados, indicador "sincronizado agora"; atualização por ação própria é imediata (não espera Realtime, SDD Seção 2.5). RF-REF-01 (grid desktop) é reorganização pura de layout — não introduz nem altera nenhum dos 4 estados desta tela |
| **S-TXN-01** | `EmptyState` "Nenhum lançamento neste período" + CTA "+ Novo lançamento" | `Skeleton` de linhas agrupadas por dia | `Banner` + filtros permanecem aplicados para retry | Lista atualizada, novo/editado lançamento aparece imediatamente na posição cronológica correta (hierarquia visual RF-REF-02 não altera nenhum dos 4 estados, só o conteúdo interno de cada linha — ver Seção 2.2) |
| **`ShortcutBar`/`ShortcutChip`** **[NOVO, 2026-09-04]** (topo de S-TXN-01, RF-REF-03) | **Omitida por completo** (não é um `EmptyState` visível — é a ausência da barra inteira) quando o usuário não tem nenhum lançamento em todo o histórico (RF-REF-03 AC2); distinto do `EmptyState` de `S-TXN-01` acima, que é sobre o período filtrado, não o histórico total | `Skeleton` de 4-6 pílulas (largura variável, imitando texto de subcategoria) enquanto `get_transaction_shortcuts()` responde — evita layout shift entre "sem barra" e "barra com N chips" | Falha ao carregar a RPC → barra inteira omitida silenciosamente (mesmo comportamento do estado vazio) + o restante da tela (`FilterBar`, lista) carrega normalmente; **não** bloqueia nem exibe `Banner` — atalho é um acelerador opcional, sua ausência temporária nunca impede o usuário de lançar pelo formulário completo | Até 10 `ShortcutChip` renderizados, recalculados a cada carregamento da tela (RF-REF-03 AC8, sem cache) |
| **S-BUD-01** | `EmptyState` "Nenhum orçamento definido este mês" + CTA | `Skeleton` de **cards** (grade de retângulos no formato do `BudgetCard`, não mais linhas — Padrão C de layout, Seção 2.1) | `Banner` de recarregamento | Grade de `BudgetCard` com 3 sub-estados de severidade (normal/alerta 80%/estouro >100%) — ver Seção 2.2 |
| **S-CAT-01** | `EmptyState` "Nenhuma categoria cadastrada ainda" + CTA "+ Nova categoria" (RN-09 torna este caso raro — só ocorre se o usuário excluir todas as categorias padrão — mas ainda coberto) | `Skeleton` de **cards** (grade, formato `CategoryCard` — Padrão C de layout, Seção 2.1) | `Banner` de recarregamento, grade anterior em cache permanece visível esmaecida se existir | Grade de `CategoryCard` populada; `S-CAT-01a` (modal/bottom sheet de subcategorias) segue os mesmos 4 estados já cobertos pelo Padrão A de formulário/lista, sem estado próprio adicional |
| **S-AUTH-02** (verificação por e-mail) | Não aplicável — a tela sempre tem conteúdo (código já solicitado ou prestes a ser, nunca uma tela "sem nada") | Dois momentos distintos, não intercambiáveis: **(1) envio automático ao entrar na tela** — enquanto o código ainda não foi confirmadamente enviado, o texto exibido é "Enviando código..." (nunca "Enviamos...", que é tempo passado e só correto após sucesso), com `Input`/botões desabilitados; **(2) verificação do código digitado** — botão "Verificar" com `loading`/spinner, campos desabilitados durante o request | Cinco casos distintos, cada um com mensagem própria (não um erro genérico único): **(a)** falha ao enviar e-mail (502) → `Banner` "Não foi possível enviar o código. Tente novamente." + link "Reenviar código" liberado imediatamente, sem cooldown (o envio anterior falhou, não deve punir o usuário); **(b)** código incorreto (400) → erro inline no campo "Código incorreto. Tente novamente."; **(c)** código expirado (400, TTL 10min) → mensagem própria "Este código expirou. Solicite um novo." + campo limpo automaticamente; **(d)** rate limit de envio (429 em `request`) → `Banner` "Muitos pedidos de código. Aguarde antes de tentar de novo." mantendo o cooldown visível; **(e)** tentativas de verificação esgotadas (429 em `verify`) → mensagem própria "Você esgotou as tentativas para este código. Solicite um novo para continuar." + campo de código e botão "Verificar" desabilitados até um novo código ser solicitado com sucesso (evita o usuário insistir contra um 429 já sabido) | Código verificado → navega automaticamente para S-AUTH-04 (1ª vez, sem PIN configurado) ou direto ao Dashboard/S-AUTH-03 (PIN já configurado), sem tela de confirmação intermediária — mesmo padrão de S-AUTH-03 |
| **S-AUTH-03** (desbloqueio) | Não aplicável | Spinner curto durante verificação da sessão JWT | PIN incorreto → mensagem + contador de tentativas restantes; biometria falha → fallback automático para PIN, sem travar o usuário | Navega direto ao Dashboard, sem tela intermediária |
| **S-AUTH-05** (bloqueio) | Não aplicável | Não aplicável | Estado permanente até o cronômetro zerar — é o próprio "erro" da tela | Ao zerar o cronômetro, retorna automaticamente a S-AUTH-03 pronta para nova tentativa |
| **S-CAP-02** (gravando voz) | Não aplicável | "Ouvindo..." com transcrição interina ao vivo | Sem áudio detectado / permissão de microfone negada → mensagem clara + botões "Tentar novamente" e "Usar foto/manual em vez disso" (nunca um beco sem saída) | Transcrição concluída → processa e navega a S-CAP-03 |
| **S-CAP-04** (foto) | Não aplicável | "Lendo o recibo..." | Permissão de câmera negada → oferece upload de arquivo; OCR falha totalmente → rascunho abre com **todos** os campos em branco para preenchimento manual (nunca bloqueia o usuário de lançar) | Extração concluída (total ou parcial) → navega a S-CAP-05 |
| **S-CAP-03 / S-CAP-05** (rascunho) | Não aplicável — sempre tem ao menos os campos extraídos ou em branco, nunca "sem conteúdo" | Não aplicável — chega já processado; se o processamento em si falhar, ver estados de S-CAP-02/04 acima | Falha ao persistir a confirmação (rede) → `Banner` inline no próprio rascunho, dado do formulário preservado, usuário tenta "Confirmar" novamente sem perder o que já revisou | Lançamento persistido com flag de origem + `confirmed_at` (RNF-08) + `Toast` |
| **S-CAP-07** (candidatos) | Arquivo/sincronização não retornou nenhuma transação → `EmptyState` "Nenhuma transação encontrada" | "Interpretando arquivo..." / "Sincronizando com o banco..." | Arquivo corrompido/formato inválido → `Banner` "Não foi possível ler o arquivo. Verifique o formato (OFX/CSV) e tente novamente" | N lançamentos confirmados → `Toast` + retorno a S-TXN-01 |
| **S-NOT-01** | `EmptyState` "Nenhuma notificação ainda" | `Skeleton` de lista | `Banner` de recarregamento | Lista com não-lidas destacadas |

> **Nota (2026-09-04, Redesign Visual "MyMoney v2.0")**: os 4 estados de
> `S-DASH-01`, `S-TXN-01`, `ShortcutBar`/`ShortcutChip`, `S-BUD-01` e `S-CAT-01`
> (Lotes 1, 2 e 4 do Grupo A, acima) **permanecem exatamente como já
> especificados nesta seção** — o redesign v2.0 troca só a camada visual
> (tokens/composição de tela), nunca a lógica de vazio/carregando/erro/sucesso em
> si (RN-19/RN-20). `S-ACC`/`S-CARD` (Lote 3) seguem o Padrão A/B geral (Seção
> 4.1), também sem alteração de estado. Nenhum dos 4 lotes do Grupo A exige nova
> linha nesta seção — é o mesmo caso já registrado para RF-REF-01/02/05/06 na
> extensão anterior ("RF-REF-01... não introduz nem altera nenhum dos 4 estados
> desta tela", linha `S-DASH-01` acima). O Grupo B (Lotes 5-13) não recebe
> detalhamento de estado nesta rodada, consistente com a ausência de RF/AC tela a
> tela na Seção 2.3 — cada lote reaproveita seus próprios estados já vigentes
> (Padrão A/B ou próprios, conforme a tabela da Seção 2.3) até ser detalhado.

---

## 5. Requisitos de Acessibilidade (WCAG)

Acessibilidade é critério não-negociável em toda tela deste documento — nenhuma
exceção "se sobrar tempo". Nível-alvo: **WCAG 2.1 AA** em toda a superfície do
produto.

| Requisito | Aplicação |
|---|---|
| **Contraste de cor** | Todo par texto/fundo atende ≥ 4.5:1 (texto normal) / ≥ 3:1 (texto grande, ícones de estado). Os tokens `color.warning`/`color.danger` foram escolhidos considerando esse mínimo sobre `color.surface`. |
| **Não depender só de cor** | `Badge`, `ProgressBar` (orçamento/meta) e status de fatura/conta fixa sempre combinam cor + ícone + texto (ex.: "⚠ 82% do teto", não só barra âmbar). Entradas/saídas usam seta (↑/↓) além de verde/vermelho. |
| **Navegação por teclado** | Toda ação alcançável via Tab/Enter/Espaço em desktop, incluindo abertura/fechamento de `Modal`/`BottomSheet`, seleção em `CandidateList`, e o `PinPad` (aceita também entrada via teclado numérico físico, não só toque). |
| **Foco visível e gerenciamento de foco** | Indicador de foco visível em todo elemento interativo; ao abrir `Modal`/`BottomSheet`, foco move para o primeiro elemento interativo e fica preso dentro dele (focus trap) até fechar; ao fechar, foco retorna ao elemento que o abriu. |
| **Rótulos e associação de formulário** | Todo `Input`/`Select`/`CurrencyInput`/`CategoryPicker` tem `label` associado programaticamente; erros de validação usam `aria-describedby` + `aria-invalid`, anunciados via região `aria-live="polite"`. |
| **Alvos de toque (mobile)** | Mínimo 44×44px para todo elemento tocável, incluindo dígitos do `PinPad`, itens de `CandidateList` e ícones de ação em listas. |
| **Alternativa a gráficos** | `DonutChart`, `BarChart` e `LineChart` sempre acompanhados de um resumo textual equivalente (ex. `aria-label`/tabela oculta acessível via toggle "Ver como tabela") — usuário de leitor de tela não depende de interpretar o SVG do gráfico. |
| **Componentes de captura automatizada** | `VoiceRecorderUI`: estado "Ouvindo..." e a transcrição interina são anunciados via `aria-live`, não apenas exibidos visualmente; botão de mic tem `aria-label` explícito ("Iniciar gravação de lançamento por voz"). `ReceiptCameraCapture`: instruções da moldura-guia disponíveis como texto, não só como sobreposição visual. Ambos os fluxos sempre oferecem alternativa não-verbal/não-visual (lançamento manual) — captura automatizada nunca é o único caminho para registrar um lançamento. |
| **Verificação por e-mail (S-AUTH-02)** | Erros de código (incorreto/expirado/tentativas esgotadas) usam `aria-live="polite"` + `aria-describedby`/`aria-invalid` no campo, mesma convenção de "Rótulos e associação de formulário" acima — nunca `aria-live="assertive"`, para não interromper agressivamente o usuário. O cooldown de reenvio (60s) **não** anuncia a cada segundo (evita spam de leitor de tela a cada tick visual do contador): a região `aria-live` associada é atualizada só duas vezes por ciclo — uma vez ao entrar em cooldown ("Reenvio disponível em 60 segundos") e uma vez quando termina ("Você já pode reenviar o código") — o texto visível do link pode seguir atualizando a cada segundo para o usuário vidente, mas isso é puramente visual, desacoplado da região anunciada. |
| **Sem limite de tempo em confirmação (WCAG 2.2.1)** | `DraftReviewBanner` (S-CAP-03/05) e `CandidateList` (S-CAP-07) nunca expiram, nunca auto-confirmam e nunca navegam sozinhos para fora da tela — isso não é só uma escolha de acessibilidade, é a mesma garantia que RNF-01 exige por requisito de produto; as duas exigências reforçam uma à outra. Exceção distinta e deliberada em **S-AUTH-02**: o código de verificação expira em 10 minutos (TTL de segurança do próprio contrato de API, não uma escolha de UX) — enquadra-se na exceção "Essencial" do WCAG 2.2.1 (limite de tempo exigido por um evento de segurança do mundo real, não uma UI arbitrária), mitigado por "Reenviar código" estar sempre disponível a cada 60s, então o usuário nunca fica preso sem saída caso perca a janela de 10 minutos. |
| **Movimento reduzido** | Toda animação (mic pulsante, transições de `Modal`/`Toast`) respeita `prefers-reduced-motion: reduce`, substituída por transição instantânea ou estática equivalente. |
| **Gesto único não é a única via** | Nenhuma ação crítica depende exclusivamente de gesto (ex.: swipe-to-delete em lista sempre tem um botão de ação equivalente acessível via toque simples/teclado). |
| **Texto alternativo de imagem** | Miniatura de recibo (S-CAP-05) tem `alt` descritivo genérico ("Foto do recibo enviada para leitura") — o conteúdo relevante está nos campos extraídos, não na leitura da imagem em si. |
| **`ShortcutChip` (RF-REF-03) [NOVO, 2026-09-04]** | Elemento `<button>` nativo (não `<div onClick>`), nunca só um `<span>`/pílula visual sem semântica interativa; `aria-label` explícito combinando ação + subcategoria (ex. `aria-label="Lançar em Alimentação"`) — o texto visível ("Alimentação" + ícone) sozinho não descreve a ação para leitor de tela. Alvo de toque ≥ 44×44px mesmo em formato pílula compacto. Alcançável via Tab, ativável via Enter/Espaço. Contêiner de rolagem horizontal (mobile, Seção 6.3) é navegável por teclado via comportamento nativo de scroll do navegador ao focar um chip fora da área visível — nenhum JS customizado de scroll é necessário. |
| **`ShortcutChip` — foco automático no campo Valor (RF-REF-03 AC4) [NOVO, 2026-09-04]** | Desvio documentado, não uma violação da regra geral de foco de `Modal`/`BottomSheet` (linha "Foco visível e gerenciamento de foco" acima): quando `S-TXN-02` é aberto a partir de um atalho, o foco vai direto ao campo Valor (não ao primeiro campo do formulário) — é uma decisão deliberada de UX (RF-REF-03 AC4), não um bug de gerenciamento de foco. Continua a valer, sem exceção, o restante da regra: foco preso dentro do modal (focus trap) e retorno ao elemento que abriu, ao fechar. |
| **Card clicável (`CategoryCard`/`BudgetCard`, Padrão C — RF-REF-05/06) [NOVO, 2026-09-04]** | Ver estrutura completa na Seção 2.1, Padrão C: elemento clicável primário e ação(ões) secundária(s) são elementos interativos **irmãos**, nunca aninhados (`<button>` dentro de `<button>` é inválido e quebra leitor de tela). `aria-label` do elemento clicável primário descreve a ação, não só repete o nome (ex. "Ver subcategorias de Alimentação", não só "Alimentação"). Ordem de tabulação: elemento clicável primário antes da(s) ação(ões) secundária(s) dentro do mesmo card. |
| **Rótulo desambiguado de forma de pagamento (RN-14/RNF-13) [NOVO, 2026-09-04]** | Nenhum requisito de acessibilidade novo além dos já cobertos por "Rótulos e associação de formulário" acima — o `<select>` de forma de pagamento em `S-TXN-02` continua com `label` associado normalmente; o texto da `<option>` (ex. "Débito Conta Corrente") já é lido integralmente por leitor de tela sem necessidade de `aria-label` adicional por item. Sinalizado aqui só para deixar explícito que a mudança de RF-REF-04 não introduz pendência de acessibilidade própria. |
| **Não-regressão de acessibilidade — Redesign Visual "MyMoney v2.0" (RNF-17, meta N3) [NOVO, 2026-09-04]** | Toda tela redesenhada em qualquer lote (Grupo A: `S-DASH-01`, `S-TXN-01`/`02`, `ShortcutBar`/`ShortcutChip`, `S-ACC`/`S-CARD`, `S-CAT-01`; Grupo B, quando chegar sua vez) deve preservar **integralmente** todas as linhas desta Seção 5 já aplicáveis a ela — nenhum item (contraste, não depender só de cor, navegação por teclado, foco visível, alvos de toque, alternativa a gráficos, WCAG 2.2.1 sem limite de tempo) é revisado ou relaxado pelo redesign. Este é o critério de aceite explícito de cada lote (`FL-09` do BA), não uma checagem única de uma vez só. |
| **Ícones de estado do redesign v2.0 (severidade de `ProgressBar`/`BudgetCard`/badge de fatura)** | Mantém, sem exceção, a regra já vigente "Não depender só de cor" (linha acima desta tabela) — a barra de progresso de alerta usa `--warn` como preenchimento (elemento gráfico, atende 3:1 por SC 1.4.11) sempre acompanhada de texto/ícone em `--text`/`--text-2` (nunca `--warn` como cor do próprio texto, ver linha de contraste abaixo). |
| **[REVISADO, 2026-09-04, achado real de contraste, cálculo WCAG completo — substitui a pendência anterior]** `--text-3` (`#9A9C93`) da paleta v2.0 falha contraste como texto | **Calculado, não estimado**: `--text-3` sobre `--bg` (`#FAF8F3`) = **2,62:1**; sobre `--surface` (`#FFFFFF`) = **2,78:1** — falha tanto o limiar de 4,5:1 (texto normal) quanto o de 3:1 (texto grande/UI não-textual). Usado no mockup real para "categoria · forma de pagamento" (item de lançamento, `S-TXN-01`), rótulo de banco (`S-ACC`), valor de subcategoria (`S-CAT-01`) — todos textos com informação real, nunca decorativos. **Correção aplicada nesta rodada, obrigatória em todo lote do Grupo A**: onde o mockup usa `--text-3` para texto com informação (não para traço de ícone/`navlabel` uppercase decorativo), a implementação usa `--text-2` (`#6B6F68`, 4,83:1/5,12:1 — passa) no lugar. Aplicado explicitamente nos blocos "Redesign visual v2.0" de `S-TXN-01`, `S-ACC`, `S-CAT-01` (Seção 2.2). |
| **[NOVO, 2026-09-04, achado real de contraste]** `--warn` (`#B9862F`) da paleta v2.0 falha contraste como cor de texto | **Calculado**: `--warn` sobre `--bg` = **3,04:1**; sobre `--surface` = **3,22:1** — falha 4,5:1 (texto normal, ex. rótulo percentual "87%" a 13px), passa só o limiar de 3:1 de elemento não-textual. **Correção aplicada**: `--warn` continua válido como cor de **preenchimento** de barra/ícone/badge (não-texto, SC 1.4.11, passa); todo texto que hoje seria colorido em `--warn` (percentuais, rótulos de alerta) passa a ser renderizado em `--text`/`--text-2` (sempre passa), com o indicador de severidade carregado pelo ícone/preenchimento ao lado — mesmo princípio "não depender só de cor" já vigente nesta seção, aplicado aqui para resolver contraste, não só semântica. |
| **[NOVO, 2026-09-04]** `navlabel` (rótulo de grupo da navegação lateral, Seção 6.2) usa `--text-3` | Exceção deliberada à correção acima: é `font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em` — texto curto, maiúsculo, de agrupamento (não informação transacional), mesmo assim **recomendo ao `frontend` também usar `--text-2` aqui por precaução**, já que 11px uppercase ainda conta como "texto normal" para fins de WCAG 2.1 (a exceção de "texto grande" exige 18px+/14px+bold, que este rótulo não atinge) — não há benefício de manter `--text-3` que justifique o risco de falha, dado que o próprio `--text-2` já está sendo adotado em todo o resto da tela. |

> **Nota ao Tech Lead — ambiguidade de custo já registrada pelo CTO no Gate 2
> desta iniciativa (`CTO-REVIEW.md`, veredito "Aprovado com ressalvas", ressalva
> 1)**: "0 regressões... de acessibilidade" (RNF-17, `ADR-018`) não especifica, em
> nenhum dos dois ADRs nem no `SDD.md` Adendo B, se a verificação de WCAG por lote
> é **automatizada** (ex. `jest-axe` ou equivalente já embutido nos testes
> `*.test.tsx`, mesmo padrão da suíte automatizada que `TEST-PLAN.md` já confirma
> para a verificação funcional) ou depende de **checagem manual adicional** a cada
> lote. Este `UX-SPEC.md` especifica **o quê** verificar (esta Seção 5, item a
> item, por tela) — não decide **como** a verificação é executada
> mecanicamente, porque essa é uma decisão de ferramenta/processo de QA, fora do
> escopo deste agente. Ao decompor `TASK.md`, o Tech Lead deve confirmar
> explicitamente qual dos dois caminhos se aplica a cada item desta seção — se
> manual, esse custo deve entrar na calibração real de velocidade exigida pela
> condição vinculante do CTO ao Bloqueio 021 (Lote 0 + 1 lote do Grupo A antes de
> qualquer estimativa agregada dos Lotes 5-13), não ser tratado como custo zero
> por analogia à suíte automatizada existente. Este documento não resolve essa
> ambiguidade por conta própria — só a repassa de forma explícita, como o CTO já
> havia pedido.

---

## 6. Comportamento Responsivo

Mobile-first, conforme pedido explícito do stakeholder ("uso confortável também no
celular", `PRD.md` Seção 2) e decisão arquitetural de PWA web responsiva (ADR-003).
Toda tela deste documento é responsiva — não há fluxo API-only ou fora da superfície
visual que justifique "não aplicável".

### 6.1 Breakpoints

| Breakpoint | Largura | Padrão de layout |
|---|---|---|
| Base (mobile) | < 640px | Coluna única, navegação inferior, formulários em tela cheia/`BottomSheet` |
| `sm` (mobile grande/tablet retrato) | ≥ 640px | Mesma navegação, mais respiro horizontal em listas |
| `md` (tablet paisagem) | ≥ 768px | Início de layout em 2 colunas em telas de detalhe (ex. S-CAP-05 foto+formulário lado a lado) |
| `lg` (desktop) | ≥ 1024px | Navegação lateral fixa substitui navegação inferior, `Modal` centralizado substitui `BottomSheet`; **[corrigido 2026-09-04, RF-REF-01]** também o gatilho do grid multi-coluna do dashboard (saldo+KPIs \| gráfico lado a lado, orçamentos \| últimos lançamentos lado a lado — ver Seção 2.2) e das grades de cards de Categorias/Orçamento (Padrão C, Seção 2.1, 3 colunas a partir daqui) |
| `xl` (desktop grande) | ≥ 1280px | Refinamento de proporção do grid do dashboard já ativo desde `lg` (não um gatilho novo — **corrige** a versão anterior desta linha, que reservava a `xl` a ativação do grid; ver nota na Seção 2.2, subseção Dashboard); grade de cards de Categorias/Orçamento passa a 4 colunas |

### 6.2 Padrão de navegação

> **Revisado 2026-09-04 (Redesign Visual "MyMoney v2.0", Lote 1/RF-RS-01) —
> substitui a versão anterior, com base no mapeamento real dos 8 artboards**
> (decisão de UX/UI dentro da minha autoridade de "definir a experiência de
> navegação" — não uma regra de negócio, não escalada). Padrão anterior (FAB
> central mobile, agrupamento "por fase/seção" sem detalhe) fica só no Log de
> Alterações Pós-Publicação.

- **Mobile (< 1024px)**: barra de navegação inferior fixa com **4** destinos —
  Dashboard, Lançamentos, Orçamento, Mais (confirmado de forma idêntica nos 4
  artboards mobile: `DashboardMobile`, `LancamentosMobile`,
  `ContasCartoesMobile`, `CategoriasMobile`) — respeitando `safe-area-inset` em
  dispositivos com notch/home indicator. **Sem FAB central na barra** — o botão
  "+" circular (`--accent` bg, ícone "+") fica no cabeçalho de cada tela, ao
  lado do título, não mais flutuante sobre o conteúdo. "Contas e Cartões" e
  "Categorias" (e todo domínio sem aba própria) são acessados a partir da aba
  "Mais", confirmado pelos dois artboards mobile onde essa aba aparece ativa.
- **Desktop (≥ 1024px)**: barra lateral fixa (`<aside>`, 264px), com logo
  "MyMoney" (`Newsreader` itálico) no topo e 4 grupos rotulados + 1 grupo final
  sem rótulo, confirmados de forma idêntica nos 4 artboards desktop:
  - **Visão geral**: Dashboard
  - **Lançamentos**: Lançamentos, Contas, Formas de pagamento, Categorias
  - **Planejamento**: Orçamento, Recorrências, Contas fixas, Metas
  - **Cartões**: Cartões, Parcelamentos
  - *(sem rótulo, separado por borda superior, empurrado ao final via
    `margin-top:auto`)*: Relatórios, Configurações

  Substitui a descrição anterior "agrupados por fase/seção" (vaga) por esta
  estrutura concreta de 4+1 grupos. Item ativo: fundo `--accent-soft`, texto
  `--accent` semibold (contraste 5,33:1, ver Seção 5). Sem `NotificationBell`/
  `OfflineSyncBadge`/ação "+ Novo lançamento" na barra lateral em si — o botão
  "+ Novo [item]" contextual (varia por tela: "Novo lançamento", "Nova conta",
  "Nova categoria") e o ícone de notificação ficam no cabeçalho de cada página
  (ver blocos "Redesign visual v2.0" de cada tela, Seção 2.2), não na sidebar.
  `NotificationBell`/`OfflineSyncBadge` não aparecem em nenhum dos 4 artboards
  desktop — mantidos como já especificado (topo de toda tela autenticada) até
  confirmação em contrário, por não terem sido mostrados nem contradizerem
  nenhuma regra já fixada (RF-F2-09 AC2, RNF-04).

### 6.3 Adaptação por tipo de componente

| Componente/tela | Mobile | Desktop |
|---|---|---|
| Formulário (novo/editar) | `BottomSheet`/tela cheia, campos empilhados | `Modal` centralizado, campos podem ocupar 2 colunas |
| Lista de lançamentos | Cartões empilhados por dia | Tabela com colunas ordenáveis, mesma informação |
| `DonutChart`/`BarChart`/`LineChart` | Gráfico em largura total, legenda abaixo, toque para detalhe | Gráfico ao lado da legenda, tooltip ao passar o mouse além do toque |
| S-CAP-05 (rascunho de foto) | Miniatura do recibo como faixa recolhível acima do formulário | Duas colunas lado a lado: foto à esquerda, formulário à direita, para comparação direta |
| S-CARD-03 (fatura) | Abas roláveis horizontalmente | Abas fixas, todas visíveis sem rolagem |
| `PinPad` | Ocupa a largura confortável de toque do polegar | Mesmo teclado, mas aceita digitação via teclado físico como via primária |
| S-AUTH-02 (verificação por e-mail) | Card centralizado ocupa a largura confortável da tela, sem navegação inferior (tela pré-sessão verificada, mesmo tratamento de S-AUTH-01/03/04); campo de código com `inputMode="numeric"` aciona o teclado numérico nativo do SO | Mesmo card centralizado, largura fixa menor que a viewport (não ocupa a largura toda), consistente com S-AUTH-01/04 |
| Captura de foto/voz | Câmera/microfone nativos do dispositivo via API do navegador | Mesma API do navegador; câmera pode não existir — upload de arquivo é a via primária nesse caso, não um "extra" |
| **[NOVO, 2026-09-04]** Item de lista com ações (Padrão A) | Bloco de identificação `min-w-0 flex-1` + `truncate`; bloco de ações permite `flex-wrap` (até 2 linhas) | A partir de `sm` (≥640px), volta a caber numa linha única — mesma regra, Seção 2.1 |
| **[NOVO, 2026-09-04]** Formulário de 5+ campos (Padrão A) | 1 coluna | 2 colunas a partir de `md` (≥768px), campos largos (texto livre, `CategoryPicker`) em `col-span-2`; toda célula com `min-w-0` — ver Seção 2.1 e 3.1.1 |
| **[NOVO, 2026-09-04, Pacote de Refinamento]** `ShortcutBar` (RF-REF-03, S-TXN-01) | Linha única com rolagem horizontal (`overflow-x-auto`, `scroll-snap-type: x mandatory`), chips não quebram em múltiplas linhas — prioriza não empurrar a lista de lançamentos para baixo em tela pequena, mesmo padrão já usado pelas abas de `S-CARD-03` (Seção 6.3, linha "S-CARD-03") | A partir de `sm` (≥640px), os chips passam a quebrar em múltiplas linhas (`flex-wrap`) em vez de rolar — espaço horizontal maior permite mostrar todos os até 10 atalhos sem esconder nenhum atrás de rolagem, priorizando descoberta sobre economia de espaço vertical |
| **[NOVO, 2026-09-04, Pacote de Refinamento]** Grade de Cards de Resumo (Padrão C — Categorias `S-CAT-01`, Orçamento `S-BUD-01`) | `grid-cols-1` (< 640px) | `sm:grid-cols-2` (≥640px) → `lg:grid-cols-3` (≥1024px) → `xl:grid-cols-4` (≥1280px) — ver Padrão C, Seção 2.1 |
| **[NOVO, 2026-09-04, Pacote de Refinamento]** Dashboard grid multi-coluna (RF-REF-01, S-DASH-01) | Coluna única, exatamente como já especificado (RNF-10, sem alteração) | A partir de `lg` (≥1024px): 2 colunas (saldo+KPIs \| gráfico) + linha adicional 2 colunas (orçamentos \| últimos lançamentos); `xl` (≥1280px) refina proporção, sem mudar a estrutura — ver Seção 2.2, subseção Dashboard |

### 6.4 Instalação como PWA

- Android/Chrome/Edge: prompt de instalação nativo do navegador ("Adicionar à tela
  inicial"), app abre em modo standalone.
- iOS/Safari: instalação manual via "Compartilhar → Adicionar à Tela de Início" — o
  app deve exibir uma dica discreta (banner dispensável, não modal bloqueante) na
  primeira visita explicando o passo a passo, já que o iOS não oferece prompt
  automático (limitação de plataforma, coerente com ADR-003).

### 6.5 Redesign Visual "MyMoney v2.0" — confirmação de responsividade (RNF-20)
**[NOVO, 2026-09-04]**

Confirmado diretamente pelo stakeholder e formalizado em `PRD-TECNICO.md` Adendo B
(RNF-20): "mobile", em todo este redesign (Grupo A e Grupo B), continua
significando exclusivamente o breakpoint responsivo desta mesma PWA (ADR-003) —
nunca uma frente de app nativo separada. Nenhum breakpoint novo é introduzido
pelos Lotes 0-4: a tabela da Seção 6.1 (com o breakpoint `lg`/1024px já corrigido
como gatilho do grid do dashboard, revisão de 2026-09-04) permanece a referência
única. O redesign v2.0 aplica tokens/composição de tela **dentro** dos breakpoints
já fixados, não redefine onde cada breakpoint dispara.

---

## 7. Restrições Técnicas Aplicadas e Conflitos Sinalizados ao Software Architect

### 7.1 Restrições técnicas do `SDD.md` aplicadas neste documento (`technical-constraint-check`)

| Restrição (SDD.md) | Como foi aplicada na experiência |
|---|---|
| RNF-01 é barreira arquitetural, não só de UX (SDD Seção 1, princípio 2) | `DraftReviewBanner` fixo e não-descartável, `AutoFillTag` que desaparece só ao editar, nenhum timer/auto-confirmação em S-CAP-03/05/07 (Seção 2.2, 5) |
| Horizonte de fatura projetada = competência atual + 2 futuras (SDD Seção 2.5) | S-CARD-03 tem exatamente 3 abas, sem paginação adicional |
| Atualização de dashboard não depende do Realtime para a própria ação do usuário (SDD Seção 2.5) | S-DASH-01/S-TXN-01 atualizam imediatamente após escrita bem-sucedida local; indicador "sincronizado agora" é só cosmético, não bloqueia a percepção de sucesso |
| Push limitado em iOS Safari, aceito como risco conhecido (ADR-003) | `NotificationCenter` (S-NOT-01) é o canal primário e sempre disponível; push é reforço, nunca a única via de aviso (RF-F2-09 AC2 já exige isso) |
| Bloqueio de PIN: 5 tentativas / 5 minutos (SDD Seção 7) | S-AUTH-05 implementa exatamente esse baseline, com contagem regressiva visível |
| Fila offline (IndexedDB) para lançamento manual (SDD Seção 2.1, RNF-04) | `OfflineSyncBadge` visível em toda tela autenticada, com detalhe de itens pendentes e confirmação de sincronização ao reconectar |
| Conflito de sincronização offline resolvido por last-write-wins simples, aceito como dívida técnica (SDD Seção 6.2) | Nenhuma UI de resolução de conflito foi projetada (não há decisão a apresentar ao usuário); mitigação de UX aplicada é o indicador "sincronizado agora" com timestamp, para que o usuário perceba quando uma tela pode não refletir a edição mais recente feita em outro dispositivo |
| RF-F3-04 (Open Finance) depende de confirmação de aceite de pessoa física pelo Pluggy antes de ir a produção (CTO-REVIEW Gate 2) | S-CAP-08/09 especificadas, mas marcadas como "provisoriamente especificadas, liberação real pendente" na Seção 2.2 — não é um conflito de UX, é uma dependência externa já rastreada pelo CTO |
| Retenção/descarte de dado ainda não definido na arquitetura (achado do CTO-REVIEW Gate 2, item de risco/compliance) | Nenhuma tela de "excluir todos os meus dados"/retenção foi desenhada neste documento, porque não há requisito funcional correspondente no `PRD-TECNICO.md` nem decisão de arquitetura para basear a tela; fica registrado aqui como pendência a considerar quando o Software Architect/DevSecOps formalizar a política, antes da Fase 3 entrar em desenvolvimento (conforme já recomendado pelo CTO ao Tech Lead) |
| Segundo fator por e-mail (`/auth-email-mfa`, `BE-M-09`/`ADR-013`) reaproveitado de implementação anterior, contrato publicado em `API-CONTRACT.yaml` v0.6.0 — sem tela correspondente na publicação original deste documento (`BLOCKERS.md` Bloqueio 008) | S-AUTH-02 formalizada nesta atualização (Seção 2.2), preenchendo a lacuna de numeração (S-AUTH-01 → S-AUTH-02 → S-AUTH-03/04) |
| Rate limit de envio de código: máx. 5 envios/30min, cooldown de 60s entre envios (`API-CONTRACT.yaml` `/auth-email-mfa`) | Link "Reenviar código" de S-AUTH-02 desabilitado durante o cooldown de 60s, com contagem regressiva visual; erro 429 de rate limit de envio tratado com mensagem própria, distinta de erro de rede (Seção 4.2) |
| Máx. 5 tentativas de verificação por código, TTL do código 10min (`API-CONTRACT.yaml` `/auth-email-mfa`) | S-AUTH-02 trata o 429 de tentativas esgotadas com mensagem e desabilitação específicas, forçando um novo pedido de código antes de nova tentativa (Seção 4.2); código expirado (400) tratado com mensagem própria, distinta de "código incorreto" |
| **[NOVO, 2026-09-04, Pacote de Refinamento]** RF-REF-01 AC4 — implementação não pode iniciar antes do baseline de rolagem (M4) ser medido pelo UX/UI (`PRD-TECNICO.md` Adendo A, risco A4/A.5.1) | Metodologia de medição fixada em Seção 2.2 (subseção Dashboard); baseline em si **não medido nesta rodada** por falta de acesso a uma sessão executável do app neste passo do pipeline — registrado como ação pendente explícita, não decidida por invenção de número (mesmo princípio de AMB-01 do BA); bloqueia o início da implementação deste item específico, não a estimativa do Tech Lead nem o restante do pacote |
| RF-REF-04 (item 4) codificação pode prosseguir com Bloqueio 013 aberto; deploy em produção condicionado ao Bloqueio 013 `Resolvido` (`CTO-REVIEW.md` Gate 2 desta rodada, ressalva 1; `ADR-016` Decisão 5) | Layout/formulário de `S-TXN-02` (campo "Conta" removido) está pronto para estimativa e implementação imediatas (Seção 2.2); nenhuma tela/estado de UI depende do Bloqueio 013 em si — é uma condição de sequenciamento de deploy, não uma restrição de experiência, sinalizada aqui só para o Tech Lead não tratar como bloqueio de design |
| `RecurringTemplate`/`InstallmentPurchase`/`FixedBill` (Fase 2) explicitamente fora do escopo de RF-REF-04 — continuam com seleção independente de conta + forma de pagamento (`ADR-016`, "Nota de escopo"/"Fora de Escopo") | `S-CARD-02`/`S-INST-01`/`S-REC-02`/`S-FIX-02` **não são alterados** por este pacote — nenhum campo "Conta" é removido desses 4 formulários; só `S-TXN-02` (RF-MVP-04) muda |
| RPC de atalhos (item 3) sem índice composto dedicado, dívida técnica de baixa severidade aceita conscientemente (`SDD.md` Adendo A.6.2, `ADR-015`) | `ShortcutBar` tem estado de carregamento (`Skeleton` de pílulas, Seção 4.2) para absorver qualquer latência perceptível da RPC sem bloquear o restante da tela — mitigação de UX para uma dívida técnica já aceita pela arquitetura, não uma correção da dívida em si |
| **[NOVO, 2026-09-04, Redesign Visual "MyMoney v2.0"]** ADR-017 — tokens em bloco `@theme` único (`frontend/src/index.css`) + `components/base/*`/`components/domain/*`, sem pacote/monorepo/Storybook | Seção 3.0/3.1 estende (não substitui) exatamente essa estrutura já vigente; `AuthCard`/`AuthLayout` (Seção 3.2) é publicado como componente-base recomendado dentro da mesma estrutura, não uma exceção a ela |
| **[NOVO, 2026-09-04]** ADR-018 — camada de tokens/componentes global (Lote 0) vs. camada de composição de tela (migrada lote a lote); corte direto por lote, sem feature flag/rota paralela | Cada bloco "Redesign visual v2.0" desta Seção 2 (Lotes 1-4) documenta explicitamente que a estrutura funcional/dado não muda, só a composição de tela daquele lote — consistente com o desacoplamento do ADR-018; nenhuma tela deste documento assume alternância em produção entre versão antiga/nova |
| **[NOVO, 2026-09-04]** RNF-18 — suíte de testes existente reexecutada **sem escopo reduzido ao lote** (requisito de arquitetura decorrente do ADR-018, "blast radius" de componente-base global) | Nenhuma implicação de UX própria — registrado aqui só para o Tech Lead não interpretar as reestimativas do Log de Alterações desta rodada como "reteste só das 4 telas do Grupo A" |
| **[NOVO, 2026-09-04]** RNF-19 — estratégia de corte em produção (não decidida pelo `PRD-TECNICO.md`, decidida pelo Software Architect via ADR-018: corte direto, sem fallback de tela antiga) | Nenhuma tela "versão antiga" é mantida em paralelo neste documento; qualquer necessidade futura de comparação lado a lado seria um requisito novo (RNF-19 revisitada), não uma tela já especificada aqui |
| **[RESOLVIDO, 2026-09-04]** Indisponibilidade inicial da ferramenta de leitura de artifact — **superada nesta mesma rodada**: o orquestrador forneceu os 8 arquivos `.dc.html` estáticos reais, lidos diretamente | Ver Seção 7.2 abaixo, "Conflito 2" (marcado `Resolvido`) — os achados da leitura real geraram 2 escalações formais em `BLOCKERS.md` (Bloqueio 022, ao Software Architect; Bloqueio 023, à BA/PM), ambas também `Resolvido` |
| **[RESOLVIDO, 2026-09-04]** `adr/019-tipografia-numerica-seletiva-primitivo-num-migracao-incremental.md` — primitivo `Num` (Lote 0), migração incremental lote a lote, fontes self-hosted (`@fontsource/*`) | Seção 3.0/3.1/3.2 especificam o componente `Num` (contrato/props) e o plano de migração por lote — nenhuma classe `.num` solta é usada nesta spec (`BLOCKERS.md` Bloqueio 022) |

### 7.2 Conflitos sinalizados ao Software Architect

Nenhum conflito novo entre experiência desejada e restrição técnica do `SDD.md`
Adendo A foi identificado nesta rodada — os 6 itens já foram confirmados
tecnicamente viáveis pelo Software Architect (`SDD.md` Adendo A.1: "Nenhum requisito
... foi considerado tecnicamente inviável") e aprovados com ressalvas pelo CTO no
Gate 2 desta rodada, sem nenhuma ressalva endereçada ao UX/UI para resolver. As duas
entradas novas da tabela acima (baseline de M4; sequenciamento do Bloqueio 013) são
**restrições de execução carregadas adiante**, não conflitos de experiência —
mesma distinção já usada para as entradas do documento original (ex. Pluggy/Open
Finance, retenção de dado).

**Nesta rodada (Redesign Visual "MyMoney v2.0", `PRD-TECNICO.md`/`SDD.md` Adendo B,
ADR-017/ADR-018)**: o **Conflito 2** (indisponibilidade de acesso visual ao
canvas) foi **resolvido dentro da própria rodada** — o orquestrador forneceu os
8 arquivos `.dc.html` reais, lidos diretamente. Essa leitura, por sua vez,
revelou uma pergunta real de arquitetura (introdução de segunda família
tipográfica pode não sustentar o precedente "zero mudança de componente" do
ADR-017) e três pontos onde o mockup diverge de regra de negócio já fixada
(RN-18, RF-REF-03, RF-REF-05) — registradas como duas entradas formais em
`BLOCKERS.md` (Bloqueio 022 ao `software-architect`; Bloqueio 023 à
`business-analyst`/PM), **ambas já `Resolvido`** (Bloqueio 022 via
`adr/019-...md` — primitivo `Num`; Bloqueio 023 — RN-18/RF-REF-03/RF-REF-05
confirmados como alvo final). Nenhuma das duas era, em si, um
`technical-constraint-check` contra o `SDD.md` (Bloqueio 022 era pergunta sobre
alcance de um ADR já aceito, não apontava violação; Bloqueio 023 era
divergência de conteúdo de mockup vs. regra de negócio, não de arquitetura) —
mas seguiram o mesmo princípio de nunca decidir sozinho o que pertence a outro
papel. As 3 ressalvas do Gate 2 desta iniciativa continuam endereçadas ao Tech
Lead (ver nota na Seção 5).

#### Conflito 1 — Desbloqueio por PIN/WebAuthn offline vs. exigência de revalidação server-side

- **Status**: Resolvido — 2026-09-02, por `software-architect`, via
  `adr/010-escopo-revalidacao-servidor-desbloqueio-local.md`. Registro completo
  também em `BLOCKERS.md`, Bloqueio 001.
- **Origem da restrição**: `SDD.md` Seção 7 declara que o desbloqueio via WebAuthn/PIN
  é obrigatório antes de exibir qualquer dado financeiro; `ADR-005` ("Negative
  Consequences") registra que "PIN local exige atenção redobrada do DevSecOps para
  não ser trivialmente contornável (nunca confiar só na checagem client-side sem
  revalidação de sessão do lado do servidor)".
- **Experiência desejada**: o app promete não perder lançamento e continuar
  funcionando com a fila offline (IndexedDB, RNF-04) mesmo sem conexão — mas essa
  promessa só tem valor prático se o usuário também **conseguir desbloquear o app**
  offline para registrar o lançamento na fila. Este documento desenhou S-AUTH-03
  assumindo que o gesto de desbloqueio (PIN local ou WebAuthn, ambos mecanismos
  nativamente locais ao dispositivo) funciona sem rede, e que "revalidação
  server-side" citada na ADR-005 se refere à validação da sessão/JWT nas chamadas de
  API subsequentes, não ao próprio gesto de desbloqueio.
- **Onde o texto do SDD.md era ambíguo o suficiente para gerar essa dúvida**: a
  ADR-005 não distinguia explicitamente "gesto de desbloqueio local" de "sessão válida
  para escrever no Postgres" — se a intenção arquitetural fosse exigir uma chamada de
  rede bem-sucedida como parte do próprio desbloqueio (não só das chamadas de API
  depois dele), a experiência offline prometida ao usuário (RNF-04) se quebraria
  completamente em qualquer momento sem conexão, incluindo o caso de uso mais citado
  pelo próprio stakeholder no Gate 1 ("não posso perder lançamento").
- **Resolução confirmada pelo Software Architect (ADR-010)**: interpretação (b)
  confirmada — o gesto de desbloqueio (WebAuthn ou checagem local do hash de PIN) é
  100% local ao dispositivo e funciona offline. "Revalidação de sessão do lado do
  servidor" na ADR-005 se refere exclusivamente à validação do JWT de sessão que o
  Supabase já aplica nativamente a toda chamada subsequente ao PostgREST/Edge
  Functions (protegidas por RLS) — comportamento já existente da stack, não um
  mecanismo novo. Sem conexão, essas chamadas falham/enfileiram normalmente na fila
  offline (RNF-04), sem impedir o desbloqueio em si.
- **Impacto**: nenhum estado adicional "sem conexão, desbloqueio indisponível" é
  necessário em S-AUTH-03/04/05 — a assunção com que este documento já havia
  desenhado essas telas está confirmada, sem mudança de layout, estado ou componente.
  A tela é liberada para estimativa do Tech Lead sem ressalva.
- **Escalado para**: `software-architect`.

#### Conflito 2 — Indisponibilidade de acesso visual ao canvas de mockups (Lote 0)

- **Status**: **Resolvido — 2026-09-04, pelo orquestrador do pipeline**, que
  forneceu os 8 arquivos `.dc.html` estáticos reais (HTML+CSS puro), lidos
  diretamente por este agente nesta mesma rodada. A extração de tokens/
  componentes (RF-RS-00 AC1/AC2) e a comparação "linha a linha" contra cada
  artboard (meta N2, RF-RS-01 a 04 AC2) foram executadas de fato — ver Seções
  3.0/3.1 e os blocos "Redesign visual v2.0" revisados na Seção 2.2.
- **Desdobramento, ambos resolvidos**: a leitura real revelou duas classes de
  achado que este `ux-ui` não decidiu sozinho — registradas como entradas
  formais em `BLOCKERS.md`, ambas agora `Resolvido`:
  - **Bloqueio 022 — `Resolvido` em 2026-09-04 por `software-architect`, via
    `adr/019-tipografia-numerica-seletiva-primitivo-num-migracao-incremental.md`
    (Status: Accepted)**: confirmado que a tipografia numérica seletiva não
    cabe no precedente "zero mudança de componente" do ADR-017 — não pela
    paleta (que segue o precedente normalmente), mas pela ausência de
    infraestrutura real de web font no projeto e pelos 17 arquivos/25+ pontos
    de chamada de `formatCentsToBRL()` já existentes, vários concatenando
    número e texto no mesmo nó. Decisão: primitivo `Num`
    (`components/base/Num.tsx`), introduzido no Lote 0, migração incremental
    lote a lote (não atômica), fontes self-hosted via `@fontsource/*` (não
    Google Fonts CDN, preserva offline-first ADR-003/RNF-04). Incorporado
    nesta rodada — ver Seção 3.0 ("Resolução do Bloqueio 022"), Seção 3.1
    (linha `typography`) e Seção 3.2 (componente `Num`).
  - **Bloqueio 023 — `Resolvido` em 2026-09-04 por `business-analyst`**:
    julgado mockup desatualizado/incompleto, não mudança de comportamento —
    hierarquia de item de lançamento (RN-18), `ShortcutBar`/`ShortcutChip`
    (RF-REF-03, obrigatório mesmo ausente do mockup) e grade de cards
    `CategoryCard` (RF-REF-05, Padrão C) **prevalecem exatamente como estavam
    antes do redesign**. `PRD-TECNICO.md` emendado (RF-RS-02 AC1/AC2 e RF-RS-04
    AC1 reforçados; AMB-18/19/20 registradas). Incorporado nesta rodada como
    alvo final confirmado, não mais posição-padrão reversível — ver blocos
    "`S-TXN-01`/`S-TXN-02`" (Lote 2) e "`S-CAT-01`" (Lote 4), Seção 2.2: a
    composição visual de ambos os lotes acomoda esses componentes/
    comportamentos já fixados dentro da linguagem visual v2.0 (paleta/
    tipografia dos mockups), mesmo sem equivalente literal no artboard.
- **Achado real de contraste, resultado direto do acesso ao mockup** (não um
  novo Conflito, tratado dentro de AC3/Seção 5): `--text-3` e `--warn` (como
  cor de texto) falham WCAG AA por cálculo real — corrigido nesta rodada via
  reatribuição de uso (`--text-2` no lugar de `--text-3` para texto com
  informação; `--text`/`--text-2` no lugar de `--warn` como cor de texto,
  preenchimento/ícone mantido em `--warn`). Ver Seção 3.0 AC3 e Seção 5.
- **Escalado para**: `software-architect` (Bloqueio 022, `Resolvido`) e
  `business-analyst` (Bloqueio 023, `Resolvido`) — nenhuma pendência aberta
  remanescente deste Conflito 2 nem de seus dois desdobramentos.

Nenhum outro conflito real entre experiência desejada e restrição técnica do
`SDD.md` foi identificado nesta rodada — os demais pontos de atenção da Seção
7.1 são restrições já resolvidas e aplicadas, não divergências em aberto.
Bloqueio 022 e Bloqueio 023 não eram, tecnicamente, `technical-constraint-check`
(o primeiro era pergunta sobre alcance de um ADR já aceito; o segundo era
divergência de conteúdo de mockup vs. regra de negócio já fixada) — registrados
aqui apenas para rastreabilidade cruzada com `BLOCKERS.md`, que é o registro
formal e vinculante dos dois, ambos fechados.

---

## Checklist de Pronto (auto-verificação do UX/UI)

- [x] Todo fluxo do `PRD-TECNICO.md` (FL-01 a FL-05) tem tela(s) correspondente(s)
      mapeada(s) — Seção 1.1, mais 14 fluxos de CRUD estrutural mapeados pelo UX/UI
      (Seção 1.2)
- [x] Todo fluxo de tela tem os 4 estados especificados, ou está marcado "não
      aplicável" com o porquê — Seção 4
- [x] Todo componente novo está sinalizado como tal — Seção 3.3, 4 componentes
      marcados **[NOVO]** sem equivalente genérico de mercado
- [x] Toda tela passou por checagem de acessibilidade sem pendência crítica aberta —
      Seção 5, nenhum item genérico ("garantir acessibilidade" sem detalhe)
- [x] Comportamento responsivo definido para todo fluxo relevante — Seção 6, sem
      exceção "não aplicável" neste projeto (não é produto API-only)
- [x] Toda restrição técnica do SDD.md foi checada e todo conflito está sinalizado
      ao Software Architect, não resolvido por conta própria — Seção 7.1 completa;
      **Seção 7.2 Conflito 1 (desbloqueio offline) `Resolvido`** em 2026-09-02 pelo
      Software Architect via `adr/010-escopo-revalidacao-servidor-desbloqueio-local.md`,
      registrado em `BLOCKERS.md` (Bloqueio 001); **Conflito 2 (indisponibilidade
      de acesso visual ao canvas) `Resolvido`** em 2026-09-04 pelo orquestrador
      do pipeline (8 arquivos `.dc.html` reais fornecidos e lidos nesta mesma
      rodada), com seus dois desdobramentos também **`Resolvido`**:
      **Bloqueio 022** (`software-architect`, via
      `adr/019-tipografia-numerica-seletiva-primitivo-num-migracao-incremental.md`
      — primitivo `Num`, migração incremental, fontes self-hosted) e
      **Bloqueio 023** (`business-analyst` — RN-18/RF-REF-03/RF-REF-05
      confirmados como alvo final do redesign, mockup julgado
      desatualizado/incompleto; `PRD-TECNICO.md` emendado, AMB-18/19/20). **Nenhuma
      pendência aberta remanescente nesta seção.**
- [x] Nenhuma das 7 seções está vazia ou com placeholder

**Este `UX-SPEC.md` está 100% pronto pela definição binária do próprio agente
UX/UI**: todos os itens do checklist estão marcados, sem pendência aberta. O Conflito
1 (Seção 7.2), único item que mantinha o documento incompleto, foi resolvido pelo
Software Architect confirmando a interpretação (b) já assumida no desenho de
S-AUTH-03/04/05 — nenhuma mudança de layout, estado ou componente foi necessária, só
a remoção da marcação de pendência. Seções 1–6 e Seção 7 completas e liberadas para
estimativa do Tech Lead sem ressalva em nenhuma tela.

**Reabertura pontual (2026-09-03, `BLOCKERS.md` Bloqueio 008)**: adição de
"S-AUTH-02 — Verificação por e-mail" (Seções 1.1, 2.2, 4.2, 5, 6.3, 7.1), tela
que faltava desde a publicação original por causa de um gap de numeração não
percebido até `API-CONTRACT.yaml` v0.6.0 confirmar o contrato real de
`/auth-email-mfa`. O checklist acima permanece válido item a item — nenhuma das
7 seções ficou vazia em nenhum momento, e a nova tela chega já com os 4 estados,
acessibilidade e comportamento responsivo especificados (não é uma exceção ao
checklist, é uma tela nova que o entra cumprindo os mesmos critérios desde já).
Ver "Log de Alterações Pós-Publicação" abaixo.

**Extensão pontual (2026-09-04, Pacote de Refinamento de Produção — Adendo A ao
`PRD-TECNICO.md`/`SDD.md`, `CTO-REVIEW.md` Gate 2 desta rodada "Aprovado com
ressalvas")**: cobertura dos 6 itens do pacote — grid multi-coluna do dashboard
(RF-REF-01), hierarquia visual do item de lista de lançamentos (RF-REF-02), barra de
atalhos de lançamento rápido (RF-REF-03), remoção do campo "Conta" do formulário de
lançamento com rótulo de forma de pagamento desambiguado (RF-REF-04), Categorias e
Orçamento em grade de cards (RF-REF-05/06). Afeta Seções 1.1 (2 fluxos novos,
`UX-FL-21`/`UX-FL-22`), 1.2 (nota sobre `UX-FL-08`/`UX-FL-09`), 2.1 (novo Padrão C —
Grade de Cards de Resumo), 2.2 (revisão de `S-DASH-01`, `S-TXN-01`, `S-TXN-02`,
`S-CAT-01`, `S-BUD-01`), 3.3 (5 componentes novos), 4.2 (3 linhas novas de estado),
5 (4 linhas novas de acessibilidade), 6.1/6.3 (breakpoints corrigidos/novos), 7.1/7.2
(2 restrições de execução novas, nenhum conflito). O checklist acima permanece válido
item a item para o escopo original (2026-09-02/03) — nenhuma das 7 seções ficou vazia
em nenhum momento desta extensão, e cada tela/componente novo ou revisado chega já
com os 4 estados, acessibilidade e comportamento responsivo especificados. Uma
dependência de execução fica explicitamente em aberto e registrada, não escondida:
o baseline de rolagem (RF-REF-01 AC4) ainda não foi medido nesta rodada por falta de
acesso a uma sessão executável do app neste passo do pipeline — metodologia fixada
na Seção 2.2, ação pendente sinalizada na Seção 7.1, sem impedir a estimativa do
Tech Lead nem a liberação do restante do pacote. Ver "Log de Alterações
Pós-Publicação" abaixo para o detalhamento completo tela a tela.

**Extensão pontual (2026-09-04, Redesign Visual "MyMoney v2.0" — Adendo B ao
`PRD-TECNICO.md`/`SDD.md`, ADR-017/ADR-018, `CTO-REVIEW.md` Gate 2 desta
iniciativa "Aprovado com ressalvas")**: cobertura do Lote 0 (fundação do design
system, RF-RS-00) e do Grupo A completo (RF-RS-01 a 04 — Dashboard, Lançamentos,
Contas & Cartões, Categorias), mais diretrizes leves do Grupo B (Lotes 5-13, sem
mockup direto, conforme resolução do CTO ao `BLOCKERS.md` Bloqueio 021). Afeta
Seções 1.1 (nota de extensão), 2.2 (4 blocos "Redesign visual v2.0", um por lote
do Grupo A, com mapeamento real linha a linha), 2.3 **[NOVA subseção]**
(diretrizes por domínio do Grupo B), 3.0 **[NOVA subseção]** (fundação do Lote
0), 3.1 (tabela de tokens **substituída** pelos valores reais), 3.2
(`AuthCard`/`AuthLayout` **[NOVO]**), 4 (nota de preservação de estado), 5 (5
linhas novas — 2 achados reais de contraste com correção aplicada, 1 nota de
`navlabel`, 1 nota de não-regressão, 1 nota ao Tech Lead sobre a ressalva 1 do
Gate 2 desta iniciativa), 6.2 (padrão de navegação **revisado** com a estrutura
real de sidebar/nav inferior), 6.5 **[NOVA subseção]** (confirmação RNF-20), 7.1
(7 linhas novas), 7.2 (Conflito 2 **`Resolvido`**), mais 2 escalações formais
novas em `BLOCKERS.md` (Bloqueio 022, Bloqueio 023).
>
> **Histórico de correções desta mesma rodada, ambas incorporadas nesta versão
> final (ver Seção 7.2, Conflito 2, `Resolvido`)**: a primeira passada desta
> extensão registrou o canvas Claude Design "MyMoney v2.0 — Mockups" como
> inacessível. O orquestrador do pipeline forneceu, na sequência, os 8
> arquivos `.dc.html` estáticos reais — lidos diretamente. Isso mudou a
> natureza dos achados: em vez de "extensão do baseline por falta de acesso"
> (primeira versão da Seção 3.0), passou a documentar uma **substituição
> completa e real** de paleta e tipografia, com 2 achados de contraste
> calculados (não estimados) e corrigidos, e 2 escalações formais em
> `BLOCKERS.md` — **ambas agora `Resolvido`**, incorporadas nesta versão final:
> - **Bloqueio 022 — `Resolvido` por `software-architect`, via
>   `adr/019-tipografia-numerica-seletiva-primitivo-num-migracao-incremental.md`**:
>   a segunda família tipográfica não cabia no precedente "zero mudança de
>   componente" do ADR-017 — decisão final é o primitivo `Num`
>   (`components/base/Num.tsx`, Seção 3.2), introduzido no Lote 0, migrado
>   lote a lote (não atomicamente), com fontes self-hosted via `@fontsource/*`
>   (não Google Fonts CDN, preserva offline-first ADR-003/RNF-04). Nenhuma
>   menção a "classe `.num` solta" permanece como decisão ativa nesta spec —
>   substituída pelo componente em toda a Seção 2.2/3.0/3.1/3.2.
> - **Bloqueio 023 — `Resolvido` por `business-analyst`**: julgado mockup
>   desatualizado/incompleto, não mudança de comportamento — RN-18
>   (hierarquia da lista), RF-REF-03 (`ShortcutBar`/`ShortcutChip`, obrigatório
>   mesmo ausente do mockup) e RF-REF-05 (grade `CategoryCard`, Padrão C)
>   **prevalecem como estavam antes do redesign**. `PRD-TECNICO.md` emendado
>   (RF-RS-02 AC1/AC2 e RF-RS-04 AC1 reforçados; AMB-18/19/20 registradas).
>   Nenhuma marcação de "posição-padrão reversível" permanece nos blocos de
>   Lote 2/4 (Seção 2.2) — os três pontos são tratados como alvo final
>   confirmado, com a composição visual de cada lote explicitamente
>   acomodando esses componentes/comportamentos dentro da linguagem visual
>   v2.0 (paleta/tipografia dos mockups), mesmo sem equivalente literal no
>   artboard.
>
> **Nenhuma pendência aberta remanescente desta extensão** — a estrutura
> publicada (Seção 3.0/3.1/3.2, blocos "Redesign visual v2.0" da Seção 2.2)
> está pronta para estimativa e planejamento de implementação do Tech Lead,
> sem ressalva de arquitetura ou de regra de negócio em aberto.
>
> O checklist geral abaixo está fechado item a item para todo o escopo coberto
> por este documento (nenhuma das 7 seções vazia; toda tela/componente novo ou
> revisado com os 4 estados, acessibilidade e comportamento responsivo
> especificados, ou herdando os já existentes sem alteração explícita). Ver
> "Log de Alterações Pós-Publicação" abaixo para o detalhamento completo lote a
> lote, incluindo o registro histórico das duas versões anteriores desta
> extensão (tokens "estendidos"; depois "substituídos com 2 escalações
> abertas"), ambas superadas por esta correção final.

---

## Log de Alterações Pós-Publicação

Registro de qualquer mudança a um componente/tela depois que o Tech Lead já tiver
estimado esforço em cima dele (ver nota de publicação no topo do documento). Vazio
nesta primeira publicação — nenhuma estimativa foi feita ainda sobre este documento.

| Data | Seção/Componente alterado | O que mudou | Motivo | Tech Lead precisa reestimar? |
|---|---|---|---|---|
| 2026-09-03 | Seções 1.1 (UX-FL-10), 2.2 (nova tela **S-AUTH-02**), 3 (nota de padrão de interação, sem componente novo), 4.2, 5, 6.3, 7.1 | Tela "S-AUTH-02 — Verificação por e-mail (2º fator)" formalizada, com fluxo (envio automático, campo de código, reenvio com cooldown de 60s, 5 casos de erro distintos), 4 estados, acessibilidade (incl. exceção WCAG 2.2.1 documentada) e comportamento responsivo | `BLOCKERS.md` Bloqueio 008 (Frontend) — `API-CONTRACT.yaml` v0.6.0 confirmou `/auth-email-mfa` como parte real de RF-MVP-08, sem tela correspondente na publicação original (gap de numeração S-AUTH-01→S-AUTH-03) | **Sim, como estimativa nova** (não reestimativa — esta tela nunca havia sido estimada, o gap de numeração significa que o Tech Lead nunca a viu). Não invalida nenhuma estimativa já feita para S-AUTH-01/03/04/05, que permanecem como estavam. |
| 2026-09-04 | Seções 2.1 (novo adendo de responsividade no Padrão A), 3.1 (tokens visuais **substituídos** — cor primária, escala neutra, radius, elevação), 3.1.1 (**nova subseção** — tokens de layout anti-corte), 3.2/3.3 (achados de consistência: emoji fora do token de ícone, `CurrencyInput` não usado em S-CARD-02), 6.3 (2 novas linhas de adaptação responsiva) | Revisão geral de layout + "skin" visual, motivada por reporte do dono do produto ("muitos campos estão cortando em tela") + pedido de repaginada visual moderna. Tratados como uma única mudança (não dois problemas separados): tokens visuais atualizados (paleta índigo, escala neutra "slate", radius `xl` novo, elevação `lg` novo, tipografia de título refinada) **e** regras de layout responsivo novas para os padrões já existentes (grid de formulário 1→2 colunas a partir de `md`, item de lista com `min-w-0`/`flex-wrap`). Auditoria de código (`frontend/src/pages/**`, `frontend/src/components/{base,domain}/**`) confirmou a causa técnica do corte — lista objetiva abaixo, arquivo → problema → correção esperada, para o agente `frontend` seguir sem reinterpretar. | Reporte direto do dono do produto (via orquestração do pipeline, não um `BLOCKERS.md` — não havia bloqueio aberto, é uma revisão solicitada) | **Sim, para todo componente/tela listado na tabela abaixo** — a mudança de token visual (cor/radius/elevação) sozinha já implica reestimativa de qualquer item de UI já estimado, mesmo sem mudança de estrutura; itens com mudança estrutural (grid de formulário, layout de item de lista) têm impacto de esforço maior que uma troca de cor e devem ser tratados como reestimativa não-trivial, não como ajuste cosmético. |
| 2026-09-04 (Pacote de Refinamento, Adendo A) | Seções 1.1 (`UX-FL-21`/`UX-FL-22` novos), 1.2 (nota sobre `UX-FL-08`/`UX-FL-09`), 2.1 (**novo** Padrão C — Grade de Cards de Resumo), 2.2 (`S-DASH-01`, `S-TXN-01`, `S-TXN-02`, `S-CAT-01`, `S-BUD-01` revisados), 3.3 (5 componentes novos: `ShortcutBar`, `ShortcutChip`, `CategoryCard`, `BudgetCard`, regra `derivePaymentMethodLabel`), 4.2 (3 linhas novas), 5 (4 linhas novas), 6.1 (breakpoint do grid do dashboard **corrigido** de `xl` para `lg`), 6.3 (3 linhas novas), 7.1/7.2 (2 restrições de execução novas) | Pacote de Refinamento de Produção (Fase 2.1): (1) grid multi-coluna do dashboard no desktop; (2) subcategoria como elemento de maior destaque no item de lista de lançamentos, descrição/forma de pagamento secundários, "(sem descrição)" removido; (3) barra de até 10 atalhos de subcategoria no topo de Lançamentos, pré-preenchendo o formulário e focando o campo Valor; (4) campo "Conta" removido do formulário de lançamento, forma de pagamento resolve a conta no servidor e exibe rótulo `"{Forma} {Conta}"` quando há mais de 1 conta ativa; (5)/(6) Categorias e Orçamento como grade de cards em vez de lista expansível | `PRD-TECNICO.md` Adendo A (RF-REF-01 a 06, RNF-10 a 14, RN-12 a 18, FL-06/07) + `SDD.md` Adendo A (ADR-015, ADR-016) + `CTO-REVIEW.md` "Gate 2 — Pós-SDD (Pacote de Refinamento, Adendo A) — 2026-09-04" (veredito Aprovado com ressalvas) | **Sim, para os componentes/telas já estimados anteriormente** (`S-DASH-01`, item de lista e formulário de `S-TXN-01`/`S-TXN-02`, `S-CAT-01`, `S-BUD-01` — ver detalhamento tela a tela abaixo); **estimativa nova** (não reestimativa) para `ShortcutBar`/`ShortcutChip`, `CategoryCard`/`BudgetCard` e o Padrão C, que nunca haviam sido especificados antes desta rodada. |

#### Detalhamento da entrada 2026-09-04 (Pacote de Refinamento, Adendo A) — tela/componente → requisito → já estimado antes? → o que muda → reestimar?

| Tela/Componente | Requisito | Já estimado antes desta rodada? | O que muda | Tech Lead precisa reestimar? |
|---|---|---|---|---|
| `S-DASH-01` | RF-REF-01 | Sim (publicação original + repaginada 2026-09-04) | Grid multi-coluna a partir de `lg` (≥1024px): saldo+KPIs \| gráfico lado a lado; orçamentos \| últimos lançamentos lado a lado. Mobile (< `lg`) inalterado (RNF-10). Corrige o breakpoint que a repaginada anterior havia reservado a `xl` | **Sim** — mudança estrutural de layout (CSS grid condicionado a breakpoint), não cosmética; **implementação** (não a estimativa) fica adicionalmente condicionada à medição do baseline de M4 (RF-REF-01 AC4, Seção 7.1), ação pendente do UX/UI |
| `S-TXN-01` (item de lista) | RF-REF-02 | Sim (publicação original + wrap-fix 2026-09-04) | Subcategoria vira linha 1 (maior destaque); descrição+forma de pagamento viram linha 2 (secundário); descrição vazia é omitida, sem texto "(sem descrição)" | **Sim** — reordenação de conteúdo dentro de um componente já estimado, com nova regra de omissão condicional |
| `S-TXN-01` (topo da tela) | RF-REF-03 | Não — `ShortcutBar`/`ShortcutChip` são componentes novos, nunca antes especificados | Barra de até 10 atalhos de subcategoria, consumindo `get_transaction_shortcuts()` (`ADR-015`), abrindo `S-TXN-02` pré-preenchido com foco no campo Valor | **Estimativa nova**, não reestimativa |
| `S-TXN-02` (formulário) | RF-REF-04 | Sim (publicação original + grid 1→2 colunas 2026-09-04) | Campo "Conta" removido (7 → 6 campos); `<select>` de forma de pagamento passa a exibir rótulo desambiguado (RN-14) | **Sim** — remoção de campo é mudança estrutural, não cosmética; **deploy em produção** (não a codificação) fica condicionado ao Bloqueio 013 `Resolvido` (Seção 7.1) |
| `S-CAT-01` | RF-REF-05 | Sim (publicação original, lista em árvore) | Lista expansível substituída por grade de `CategoryCard` (Padrão C); expansão de subcategorias move-se para `S-CAT-01a` (Modal/BottomSheet reaproveitado, não é tela nova) | **Sim** — troca de padrão de layout inteiro (lista → grade), maior impacto de esforço que um ajuste cosmético |
| `S-BUD-01` | RF-REF-06 | Sim (publicação original, lista com `ProgressBar`) | Lista substituída por grade de `BudgetCard` (Padrão C); mesmo `ProgressBar`/indicadores de severidade, agora dentro do card | **Sim** — mesma natureza de mudança de `S-CAT-01` |
| `S-ACC-02`/`S-PAY-01` | RF-REF-04 (RN-15, via FL-07) | Sim (publicação original) | Nenhuma mudança de layout — efeito é só de dado (novas formas de pagamento aparecem automaticamente na lista já existente de `S-PAY-01` ao cadastrar 2ª+ conta) | **Não** — nenhuma mudança de UI, só de dado exibido por uma tela já estimada sem alteração de estrutura |

| 2026-09-04 (Redesign Visual "MyMoney v2.0", Adendo B) | Seções 1.1 (nota de extensão + nota de execução), 2.2 (4 blocos "Redesign visual v2.0" — Lotes 1-4), 2.3 **[NOVA]** (diretrizes Grupo B), 3.0 **[NOVA]** (fundação Lote 0), 3.1 (nota de "estendido"), 3.2 (`AuthCard`/`AuthLayout` **[NOVO]**), 4 (nota de preservação de estado), 5 (2 linhas + nota de ambiguidade automatizada/manual), 6.5 **[NOVA]** (RNF-20), 7.1 (6 linhas novas), 7.2 (Conflito 2 **[NOVO, Aberto]**) | Fundação do design system v2.0 (Lote 0, tokens/componentes ESTENDIDOS a partir da base já vigente, não substituídos — decisão explícita registrada, RF-RS-00 AC1) + redesign visual dos 4 lotes do Grupo A (Dashboard, Lançamentos, Contas & Cartões, Categorias — RF-RS-01 a 04, mesma estrutura funcional já fixada por RF-REF-01/02/03/04/05/06, só a "pele" muda) + diretrizes leves de aplicação do design system aos 9 domínios do Grupo B (Lotes 5-13, sem RF/AC tela a tela, conforme resolução do CTO ao Bloqueio 021) + componente novo recomendado `AuthCard`/`AuthLayout` (Lote 5) | `PRD-TECNICO.md` Adendo B (RF-RS-00 a 04, RNF-15 a 20, RN-19/20) + `SDD.md` Adendo B (ADR-017, ADR-018) + `CTO-REVIEW.md` "Gate 2 (Nova Iniciativa — Redesign Visual 'MyMoney v2.0') — 2026-09-04" (veredito Aprovado com ressalvas) + `BLOCKERS.md` Bloqueio 021 (Resolvido) | **Sim, para `S-DASH-01`, `S-TXN-01`/`02`, `S-ACC-01/02/04`, `S-CARD-01/02/03`, `S-CAT-01`** (ver detalhamento tela a tela abaixo) — troca de token visual (mesmo que "estendida", não uma paleta nova) já implica reestimativa, mesmo padrão da repaginada de 2026-09-04; **estimativa nova** (não reestimativa) para `AuthCard`/`AuthLayout`, que nunca havia sido especificado antes desta rodada. **Ressalva de execução**: a reestimativa de cada tela do Grupo A é feita sobre a estrutura publicada nesta rodada, com a comparação "linha a linha" contra o mockup real (meta N2) ainda pendente (Seção 7.2, Conflito 2) — o Tech Lead deve tratar essa reestimativa como preliminar, sujeita a ajuste quando o acesso visual for providenciado, não como estimativa final imutável. |

#### Detalhamento da entrada 2026-09-04 (Redesign Visual "MyMoney v2.0", Adendo B)
— tela/componente → requisito → já estimado antes? → o que muda → reestimar?

| Tela/Componente | Requisito | Já estimado antes desta rodada? | O que muda | Tech Lead precisa reestimar? |
|---|---|---|---|---|
| `S-DASH-01` | RF-RS-01 (Lote 1) | Sim (publicação original + repaginada 2026-09-04 + RF-REF-01) | Camada visual redesenhada seguindo o artboard "Main"/"MainMobile" — estrutura de grid (2 colunas a partir de `lg`) e dado/cálculo exibido **preservados** (RF-RS-01 AC4/RN-20); comparação linha a linha contra o artboard **pendente** (Conflito 2) | **Sim, preliminar** — reestimativa de tratamento visual (tokens já estendidos, Seção 3.0), sujeita a ajuste quando a comparação N2 for possível; **implementação** segue também condicionada ao baseline M4 (RF-REF-01 AC4, já registrado) |
| `S-TXN-01`/`S-TXN-02` | RF-RS-02 (Lote 2) | Sim (publicação original + wrap-fix + Pacote de Refinamento) | Camada visual redesenhada seguindo "Lancamentos"/"LancamentosMobile" — hierarquia do item (RN-18), `ShortcutBar`/`ShortcutChip` (RF-REF-03) e formulário unificado (RF-REF-04) **preservados** (RF-RS-02 AC3/RN-20); comparação linha a linha **pendente** | **Sim, preliminar** — mesma ressalva do item acima |
| `S-ACC-01/02/04` + `S-CARD-01/02/03` | RF-RS-03 (Lote 3) | Sim (publicação original) | Camada visual redesenhada seguindo "ContasCartoes"/"ContasCartoesMobile", na parte que o artboard cobrir (AMB-17); `InvoiceTimeline` tratado com atenção redobrada como lógica de negócio sensível, cálculo/regra **preservados** (RF-RS-03 AC2/RN-20); comparação linha a linha **pendente**, inclusive a própria fronteira Lote 3/Lote 8 (AMB-17) | **Sim, preliminar** — maior atenção a N4 (regressão funcional), mesma ressalva de reestimativa preliminar |
| `S-CAT-01` | RF-RS-04 (Lote 4) | Sim (publicação original + RF-REF-05) | Camada visual redesenhada seguindo "Categorias"/"CategoriasMobile" — grade de `CategoryCard` (Padrão C), dado exibido e comportamento de clique **preservados** (RF-RS-04 AC2/RN-20); comparação linha a linha **pendente** | **Sim, preliminar** — mesma ressalva |
| `AuthCard`/`AuthLayout` | RF-RS-00 AC2 (Lote 0, consolidação real no Lote 5) | Não — componente novo, nunca antes especificado | Especificação mínima publicada nesta rodada (Seção 3.2); consolidação de `LoginPage.tsx`/`UnlockPage.tsx`/`PinSetupPage.tsx` em cima dele ocorre no Lote 5 (Grupo B), fora do escopo desta rodada | **Estimativa nova**, não reestimativa — mas só aplicável quando o Lote 5 for efetivamente detalhado (Seção 2.3) |
| Grupo B (Lotes 5-13) | Seção 2.3 | Não se aplica — nenhuma tela redesenhada nesta rodada, só diretriz | Diretrizes de aplicação do design system por domínio, sem RF/AC tela a tela | **Não** — nada a reestimar ainda; aprofundamento técnico completo ocorre lote a lote, mais perto de cada execução (`PRD-TECNICO.md` Adendo B, Seção B.1.2) |

| 2026-09-04 (correção — acesso visual real confirmado, mesma rodada) | Seções 3.0 (reescrita — substituição, não extensão), 3.1 (tabela de tokens **substituída** pelos valores reais), 2.2 (4 blocos "Redesign visual v2.0" **reescritos** com mapeamento real linha a linha), 5 (2 achados reais de contraste + correção de uso), 6.2 (padrão de navegação revisado), 7.2 (Conflito 2 → `Resolvido`) | **Superam a entrada imediatamente acima**, publicada sob a premissa de canvas inacessível. O orquestrador forneceu os 8 arquivos `.dc.html` reais nesta mesma rodada, lidos diretamente. Achados que mudam a entrada anterior: (1) paleta/tipografia são **substituição completa**, não extensão — `--accent`/`--income` fundidos em `#2F6B4F`, `--expense` `#B4483A`, sem `--danger` distinto, 2 famílias tipográficas (`Newsreader`+`Public Sans`); (2) 2 falhas reais de contraste calculadas (`--text-3` 2,62–2,78:1; `--warn` como texto 3,04–3,22:1), corrigidas via reatribuição de uso; (3) navegação real é sidebar de 4+1 grupos (desktop) e nav inferior de 4 destinos sem FAB (mobile); (4) 3 pontos do mockup divergem de RN-18/RF-REF-03/RF-REF-05 (hierarquia de item, `ShortcutBar` ausente, Categorias em lista-árvore) — escalados via `BLOCKERS.md` Bloqueio 023, posição-padrão de preservar o já fixado aplicada enquanto aguarda resposta; (5) segunda família tipográfica pode não sustentar o precedente do ADR-017 — escalado via Bloqueio 022 | Mensagem do orquestrador do pipeline fornecendo os 8 arquivos `.dc.html` reais, em resposta à limitação registrada na entrada anterior | **Sim, substitui a reestimativa "preliminar" da entrada anterior por reestimativa definitiva** para `S-DASH-01` (navegação/grid confirmados), `S-TXN-01`/`02` (hierarquia mantida sob posição-padrão, `--text-2` no lugar de `--text-3`), `S-ACC`/`S-CARD` (confirma AMB-17, recomenda migração Padrão A→C para `S-ACC-01`), `S-CAT-01` (mantido sob posição-padrão, reestimativa maior só se Bloqueio 023 confirmar reversão a lista-árvore). Ver detalhamento abaixo. |

#### Detalhamento da correção 2026-09-04 (acesso visual real) — status final por tela/achado

| Tela/Achado | Status na entrada anterior | Status real, confirmado | Ação para o Tech Lead |
|---|---|---|---|
| `S-DASH-01` (Lote 1) | Comparação N2 pendente; tokens "estendidos" | N2 executada — grid 2 colunas confirmado (proporção real: KPIs+gráfico na linha 1, "Últimos lançamentos" em largura total na linha 2, não 2 colunas como estimado antes); navegação lateral com 4+1 grupos; botão "+" de cabeçalho substitui FAB | Reestimar considerando a navegação lateral nova (Seção 6.2) como parte do esforço deste lote ou de um esforço transversal único (decisão do Tech Lead — a sidebar aparece em todas as 4 telas do Grupo A, pode valer a pena tratá-la como componente único estimado uma vez) |
| `S-TXN-01`/`02` (Lote 2) | Comparação N2 pendente | N2 executada — acesso confirmou hierarquia invertida (Bloqueio 023) e ausência de `ShortcutBar` no mockup; posição-padrão preserva RN-18/RF-REF-03 | Estimar como troca de token sobre a hierarquia/`ShortcutBar` já existentes (não reordenamento); revisar se Bloqueio 023 for respondido com "seguir o mockup literalmente" |
| `S-ACC`/`S-CARD` (Lote 3) | Comparação N2 pendente; limite Lote 3/Lote 8 (AMB-17) não confirmado | N2 executada — **AMB-17 confirmado**: artboard cobre só visão-resumo, `InvoiceTimeline` detalhado fica 100% com o Lote 8; nova recomendação de migrar `S-ACC-01` de Padrão A para Padrão C (grade de cards) | Incluir a migração de padrão de `S-ACC-01` na estimativa do Lote 3 (esforço adicional não previsto na entrada anterior) |
| `S-CAT-01` (Lote 4) | Comparação N2 pendente | N2 executada — achado de reversão a lista-árvore (Bloqueio 023); posição-padrão preserva RF-REF-05 (Padrão C) | Estimar como troca de token sobre o card já existente; revisar se Bloqueio 023 for respondido com "seguir o mockup literalmente" (reestimativa maior, mudança estrutural) |
| Contraste (`--text-3`, `--warn`) | Não avaliado (tokens "estendidos" eram os já validados) | 2 falhas reais calculadas e corrigidas via reatribuição de uso (Seção 5) | Nenhuma ação adicional — correção já incorporada aos blocos de tela desta Seção 2.2; `frontend` deve aplicar `--text-2` onde esta Seção indicar, não o `--text-3` literal do mockup |
| Segunda família tipográfica (ADR-017) | Não identificado | Identificado — Bloqueio 022, aguardando resposta do Software Architect | Não estimar a aplicação de `.num` como custo zero até resposta do Bloqueio 022; se o ADR-017 precisar reabrir, a estimativa de Lote 0 muda |

| 2026-09-04 (fechamento — Bloqueio 022 e Bloqueio 023 resolvidos, mesma rodada) | Seções 3.0 (resolução do Bloqueio 022 incorporada — primitivo `Num`; AC2 "grade de card" atualizado), 3.1 (linha `typography` reescrita — componente `Num`, não classe; `--danger` finalizado `#752F26`), 3.2 (`Num` **[NOVO]** especificado), 2.2 (blocos "Redesign visual v2.0" dos Lotes 1-4 — `<Num>` substitui toda menção a `.num`; Lotes 2 e 4 perdem a marcação de "posição-padrão reversível", RN-18/RF-REF-03/RF-REF-05 tratados como alvo final), 7.1/7.2 (Bloqueio 022/023 → `Resolvido`), Checklist de Pronto (fechado sem pendência) | **Superam as duas entradas imediatamente acima**, publicadas com Bloqueio 022/023 ainda `Aberto`. Resoluções recebidas: (1) `adr/019-tipografia-numerica-seletiva-primitivo-num-migracao-incremental.md` (Software Architect) — tipografia numérica seletiva não cabe como classe `.num` solta; decide primitivo `Num` (`components/base/Num.tsx`), introduzido no Lote 0, migração incremental lote a lote (não atômica), fontes self-hosted via `@fontsource/*` (não Google Fonts CDN); (2) `business-analyst` — Bloqueio 023 resolvido como "mockup desatualizado/incompleto", não mudança de comportamento: RN-18, RF-REF-03 e RF-REF-05 prevalecem como estavam antes do redesign, `PRD-TECNICO.md` emendado (AC1/AC2 de RF-RS-02 e AC1 de RF-RS-04 reforçados, AMB-18/19/20 registradas) | Mensagem do orquestrador do pipeline relatando as duas resoluções (`software-architect` via ADR-019; `business-analyst` via emenda ao `PRD-TECNICO.md`) | **Sim, ajuste sobre a reestimativa da entrada anterior**: `S-DASH-01`/`S-TXN-01`/`02`/`S-ACC`/`S-CARD`/`S-CAT-01` passam de "reestimativa preliminar/sujeita a confirmação" para **reestimativa definitiva**, incluindo agora o esforço específico de migração do primitivo `Num` por lote (ver linhas "Migração `Num` neste lote" em cada bloco da Seção 2.2) — nenhuma tela do Grupo A fica mais sujeita a mudança estrutural por resposta pendente de BA/PM. Ver detalhamento abaixo. |

#### Detalhamento do fechamento 2026-09-04 (Bloqueio 022/023 resolvidos) — status final por achado

| Achado | Status anterior (Aberto) | Resolução final | Ação para o Tech Lead |
|---|---|---|---|
| Tipografia numérica seletiva (Bloqueio 022) | Pergunta de arquitetura em aberto — não estimar `.num` como custo zero | **`adr/019-...md` (Accepted)**: primitivo `Num` (`components/base/Num.tsx`), introduzido no Lote 0, migração incremental lote a lote dos 17 arquivos/25+ pontos de chamada de `formatCentsToBRL()` já existentes; fontes self-hosted (`@fontsource/public-sans`, `@fontsource/newsreader`) | Estimar o Lote 0 incluindo a criação do componente `Num` + fontes self-hosted + `Num.test.tsx`; estimar cada lote do Grupo A (1-4) incluindo a migração dos pontos de chamada específicos daquele lote (ver Seção 2.2, linhas "Migração `Num` neste lote"); `BudgetCard.tsx` (mudança de contrato de prop `detailText: string` → `ReactNode`/props separadas) é esforço real de componente, não estilo — considerar ao estimar o lote que tocar `BudgetCard` |
| Hierarquia de item de lançamento (RN-18, Bloqueio 023) | Posição-padrão reversível — revisar se BA/PM confirmar seguir o mockup literalmente | **Confirmado como alvo final**: RN-18 prevalece, subcategoria continua linha 1 (maior destaque) | Nenhuma reestimativa adicional além da já registrada (troca de token sobre a hierarquia já existente); descartar definitivamente a hipótese de reordenamento de conteúdo |
| `ShortcutBar`/`ShortcutChip` (RF-REF-03, Bloqueio 023) | Preservada por padrão, revisável | **Confirmado obrigatório**, mesmo ausente do mockup literal | Estimar a composição de `ShortcutBar` dentro da paleta/tipografia v2.0 como parte do Lote 2 — não é opcional nem candidato a remoção |
| `S-CAT-01` em grade de cards (RF-REF-05, Bloqueio 023) | Posição-padrão reversível — revisar se BA/PM confirmar reversão a lista-árvore | **Confirmado como alvo final**: Padrão C (`CategoryCard`) prevalece, lista-árvore do mockup descartada | Descartar definitivamente a hipótese de reestimativa de mudança estrutural (grade→lista) registrada na entrada anterior — o esforço do Lote 4 é só troca de token + migração de `<Num>` sobre o card já existente |
| `--danger` (ausente do mockup) | Recomendação não confirmada de reaproveitar `--expense` | **Finalizado nesta rodada**: `--danger:#752F26` (token próprio, contraste calculado 9,03:1) | Nenhuma ação adicional — token já declarado na Seção 3.1, pronto para uso em qualquer estado de estouro de orçamento |

#### Detalhamento da entrada 2026-09-04 — lista arquivo → problema → correção esperada

**A. Tokens de design system (aplicam-se a todo componente-base, escopo transversal)**

| Arquivo | Problema | Correção esperada |
|---|---|---|
| `frontend/src/index.css` (bloco `@theme`) | Paleta antiga (`--color-primary: #2563eb`, escala neutra cinza-puro, sem `radius-xl`/`shadow-elevation-lg`) | Atualizar para os valores da Seção 3.1 desta revisão: `--color-primary: #4f46e5` (hover `#4338ca`) + `--color-primary-soft: #eef2ff`; escala `--color-neutral-50..900` para os valores slate listados; adicionar `--radius-xl: 20px`; adicionar `--shadow-elevation-lg`; adicionar tokens `-soft` de income/expense/warning se o `frontend` optar por usá-los em fundos de badge/alerta (`#dcfce7`/`#fee2e2`/`#fef3c7`) |
| `frontend/src/layout/AppLayout.tsx` linha 33 | Estado ativo de navegação usa `bg-blue-50` hardcoded em vez do token `color.primary-soft` | Trocar por `bg-primary-soft` (ou classe Tailwind equivalente ao novo token) |
| `frontend/src/layout/AppLayout.tsx` linhas 7-12 (`MOBILE_DESTINATIONS`, campo `icon`) | Ícones de navegação mobile são emoji (🏠📄🎯⋯), não o conjunto line-style 24px definido no token `Ícones` (Seção 3.1) desde a publicação original | Trocar por ícones da biblioteca escolhida pelo Tech Lead/Frontend (Lucide/Heroicons), mantendo a mesma semântica por destino |

**B. Corte de campo em formulário (causa raiz: componente-base sem `w-full`/`min-w-0`)**

| Arquivo | Problema | Correção esperada |
|---|---|---|
| `frontend/src/components/base/Input.tsx`, `Select.tsx`, `DatePicker.tsx`, `frontend/src/components/domain/CurrencyInput.tsx` | Elemento `<input>`/`<select>` não declara largura própria — hoje só preenche o contêiner por acidente (herda de um pai `flex flex-col`); quebra assim que o campo entra numa célula de grid/linha (exigido pela regra "2 colunas a partir de `md`" desta revisão, Seção 2.1) | Adicionar `w-full` na classe do próprio `<input>`/`<select>` de cada componente |
| `frontend/src/components/domain/CategoryPicker.tsx` linhas 76 e 102 (`<div className="flex flex-1 flex-col gap-1">`) | Colunas de Categoria/Subcategoria lado a lado (`sm:flex-row`) sem `min-w-0` — nome de categoria/subcategoria longo pode ultrapassar a largura do contêiner quando a tela renderiza como `BottomSheet` de largura total (`sm`–`lg`, 640–1023px) | Adicionar `min-w-0` às duas divs `flex-1` |
| Todo formulário de 5+ campos: `frontend/src/pages/transactions/TransactionFormModal.tsx`, `frontend/src/pages/installments/InstallmentsPage.tsx` (modal "Nova compra parcelada"), `frontend/src/pages/fixedBills/FixedBillsPage.tsx` (modal "Nova conta fixa"), `frontend/src/pages/recurring/RecurringPage.tsx` (modal "Nova recorrência") | Todos os campos empilhados em 1 coluna dentro do `<div className="flex flex-col gap-4">` do corpo do modal — formulário de 7-8 campos fica muito alto, exige rolagem longa dentro de um modal de 512px de largura (`max-w-lg`); é a origem concreta da percepção "muitos campos" do stakeholder, mesmo o `Modal` já rolando corretamente | Envolver os campos num grid `grid-cols-1 gap-4 md:grid-cols-2` (regra nova, Seção 2.1); campo "Descrição"/`CategoryPicker` em `md:col-span-2`; manter `Cancelar`/`Salvar` fora do grid, alinhados à direita como já estão |
| `frontend/src/pages/creditCards/CreditCardsPage.tsx` linhas 194-203 (campo "Limite (R$)") | Usa `Input` genérico `type="number"` em vez do `CurrencyInput` que a Seção 3.3 já designava para `S-CARD-02` desde a publicação original — inconsistência de design system, não gera corte, mas é campo monetário sem máscara/símbolo BRL (`RNF-07`) | Trocar pelo componente `CurrencyInput`, mesmo padrão dos demais campos monetários do app |

**C. Corte de conteúdo em item de lista (causa raiz: linha `flex` sem `min-w-0`/`flex-wrap`)**

| Arquivo | Problema | Correção esperada |
|---|---|---|
| `frontend/src/pages/accounts/AccountsPage.tsx` linhas 143-162 | Linha `flex items-center justify-between gap-4`: bloco de nome/tipo à esquerda sem `min-w-0`, bloco de saldo + botões "Editar"/"Excluir" à direita sem `flex-wrap` — em mobile (~343px úteis dentro do `Card`), nome longo + saldo + 2 botões não cabem numa linha só | Aplicar o padrão "Item de lista com ações" (Seção 2.1): bloco esquerdo `min-w-0 flex-1` + `truncate` no nome; bloco direito `flex-wrap` liberado abaixo de `sm` |
| `frontend/src/pages/categories/CategoriesPage.tsx` linhas 149-177 (linha de categoria) e 181-191 (linha de subcategoria) | Mesmo padrão, agravado: até **3 botões** ("+ Subcategoria", "Editar", "Excluir") mais badges ("Padrão"/kind) e chevron de expandir na mesma linha sem `flex-wrap` — maior risco de corte de todo o documento | Mesmo padrão do item acima; nas telas mais estreitas, considerar reduzir "+ Subcategoria" para ícone com `aria-label` em vez de texto, se mesmo com `flex-wrap` o resultado ainda ficar visualmente desequilibrado (decisão de detalhe do `frontend`, não uma mudança de requisito) |
| `frontend/src/pages/paymentMethods/PaymentMethodsPage.tsx` linhas 116-129 | Mesmo padrão (nome + badge "Padrão" à esquerda, botão "Excluir" à direita) | Mesmo padrão |
| `frontend/src/pages/creditCards/CreditCardsPage.tsx` linhas 168-183 | Mesmo padrão (nome + dias de fechamento/vencimento + limite disponível à esquerda, botão "Editar" à direita) | Mesmo padrão |
| `frontend/src/pages/fixedBills/FixedBillsPage.tsx` linhas 152-169 | Mesmo padrão, com botão de texto longo ("Marcar como paga") competindo por espaço com badge de status na mesma linha à direita | Mesmo padrão; botão "Marcar como paga" pode ficar em linha própria abaixo do badge quando `flex-wrap` ativa no mobile |
| `frontend/src/pages/recurring/RecurringPage.tsx` linhas 231-243 | Linha de ações com 3 botões ("Reajustar valor", "Encerrar", "Excluir") em `flex justify-end gap-2` sem `flex-wrap` | Adicionar `flex-wrap` a essa linha de ações no mobile |
| `frontend/src/pages/transactions/TransactionsPage.tsx` linhas 152-173 | Mesmo padrão (descrição/categoria à esquerda sem `min-w-0`, valor + "Editar"/"Excluir" à direita) | Mesmo padrão |
| `frontend/src/components/domain/InvoiceTimeline.tsx` linhas 54-63 (linha de lançamento dentro da fatura) | Mesmo padrão em menor escala (descrição à esquerda sem `min-w-0`, valor à direita) — risco menor por não ter botões, mas descrição longa ainda pode empurrar o valor para fora | Bloco de descrição com `min-w-0 flex-1` + `truncate` |

**D. Grid fixo que não colapsa em mobile**

| Arquivo | Problema | Correção esperada |
|---|---|---|
| `frontend/src/pages/dashboard/DashboardPage.tsx` linha 106 | `grid grid-cols-3 gap-4 text-center` para "Entradas do mês"/"Saídas do mês"/"Lançamentos" — 3 colunas fixas mesmo em telas de 320-375px, onde um valor como "↓ R$ 3.150,00" em `font-semibold` pode cramped/overflow a coluna | Trocar para `grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4`, com alinhamento `text-left` no mobile (1 coluna) e `text-center` a partir de `sm` (3 colunas) |

Nenhum item desta lista exige decisão do Software Architect — são todos ajustes
de implementação dentro do que o `SDD.md`/stack (React 19 + Tailwind v4) já
suporta, sem restrição técnica em conflito (`technical-constraint-check`
aplicado, nenhum conflito encontrado). Fica sob responsabilidade do `frontend`
implementar; qualquer dúvida de leitura desta lista deve ser tratada como
reabertura para `ux-ui` via `BLOCKERS.md`, não resolvida por interpretação
própria do `frontend` (mesmo guardrail de sempre — silêncio sobre mudança de
componente já estimado não é aceitável, mesmo numa correção considerada óbvia).
