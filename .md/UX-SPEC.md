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

---

## 3. Design System e Componentes

### 3.1 Tokens visuais

> **Atualização 2026-09-04 — repaginada visual + correção de corte de campo.**
> O dono do produto reportou dois problemas juntos: (1) campos/formulários
> cortando em tela em várias telas do app, achado confirmado em auditoria de
> código (ver `Log de Alterações Pós-Publicação` no final do documento para a
> lista completa arquivo → problema → correção); (2) pedido de uma "skin mais
> moderna". Os dois são tratados como uma única revisão, não dois problemas
> separados — a tabela abaixo **substitui** os valores originais (publicados em
> 2026-09-02); os valores antigos ficam preservados só na cópia versionada do
> Git, não duplicados aqui. É uma repaginada de tokens (cor/tipografia/raio/
> sombra), não uma reabertura de decisão de arquitetura — nenhum item aqui
> conflita com o `SDD.md`, então não há `technical-constraint-check` a abrir.

| Token | Valor/Definição | Uso |
|---|---|---|
| `color.primary` | Índigo (`#4F46E5`), hover `#4338CA`, fundo suave `color.primary-soft` (`#EEF2FF`) para estado ativo/selecionado sem depender de preencher a área toda de cor sólida | Ações primárias, links, elementos de marca, estado ativo de navegação (substitui o `bg-blue-50` ad-hoc hoje hardcoded em `AppLayout.tsx`) |
| `color.income` | Verde (`#16A34A`), fundo suave `#DCFCE7` | Entradas, saldo positivo, meta atingida |
| `color.expense` | Vermelho (`#DC2626`), fundo suave `#FEE2E2` | Saídas |
| `color.warning` | Âmbar (`#D97706`), fundo suave `#FEF3C7` | Alerta de aproximação de orçamento (80%), aviso de conta fixa a vencer |
| `color.danger` | Vermelho forte (`#B91C1C`) | Estouro de orçamento (>100%), conta vencida/em atraso, ações destrutivas |
| `color.neutral-50…900` | Escala neutra levemente azulada (slate), não cinza puro — `50 #f8fafc / 100 #f1f5f9 / 200 #e2e8f0 / 300 #cbd5e1 / 400 #94a3b8 / 500 #64748b / 600 #475569 / 700 #334155 / 800 #1e293b / 900 #0f172a` | Texto, bordas, superfícies — troca deliberada em relação à escala cinza-puro original, é o principal responsável pela sensação de "skin mais moderna" sem mudar nenhuma semântica de cor de estado |
| `color.surface` / `color.surface-alt` | Fundo de card/página (`#ffffff` / `neutral-50`) | Hierarquia visual de bloco |
| `typography` | Fonte de sistema (system-ui/Inter), escala `xs 12 / sm 14 / base 16 / lg 18 / xl 20 / 2xl 24 / 3xl 30`; títulos de página (`h1` de cada tela, ex. "Lançamentos", "Contas") passam a `font-semibold` com `tracking-tight` — refinamento tipográfico, sem mudar a escala numérica já validada pelo Tech Lead | `3xl` continua reservado ao saldo consolidado do dashboard |
| `spacing` | Escala 4/8/12/16/24/32/48 (px), inalterada | Consistente com utilitário Tailwind já definido no `SDD.md` Seção 3 |
| `radius` | `sm 4 / md 8 / lg 16 / xl 20` **[novo nível]** `/ full` (pill) | `lg` (16) permanece o padrão de `Card`/`Modal`; `xl` (20) fica reservado ao card de saldo consolidado do dashboard (`S-DASH-01`), único elemento que recebe destaque extra de raio, para reforçar hierarquia visual sem introduzir um 3º nível de elevação; `full` reservado a badges de status e ao FAB |
| `elevation` | `sm` (card em lista), `md` (modal/sheet), `lg` **[novo nível]** (card de saldo consolidado, `S-DASH-01`, único uso) | Regra inalterada: nunca mais de 2 níveis de elevação simultâneos **na mesma tela** — `lg` só aparece isolado no card de saldo; o resto da tela permanece em `sm`, nunca os 3 juntos |
| `motion` | Transições ≤ 200ms para hover/foco, ≤ 300ms para abertura de modal/sheet; toda animação respeita `prefers-reduced-motion` (Seção 5) | Inalterado |
| Ícones | Conjunto line-style, grade 24px, semântica consistente; biblioteca concreta fica a critério do Tech Lead/Frontend (ex. Lucide/Heroicons) | **Achado de auditoria**: `AppLayout.tsx` (navegação inferior mobile) hoje usa emoji (🏠📄🎯⋯) em vez de ícone line-style — inconsistente com este token desde a publicação original, não é uma mudança nova de direção, é a aplicação de um token que já existia e não tinha sido seguido; sinalizado aqui para o `frontend` corrigir junto da repaginada, não como conflito técnico |
| Moeda/formato | BRL, formato `R$ 0.000,00`, `RNF-07` — nenhuma tela exibe valor sem símbolo de moeda | Inalterado |

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

- **Mobile (< 1024px)**: barra de navegação inferior fixa com 5 destinos (Dashboard,
  Lançamentos, FAB central "+", Orçamento/Cartão, Mais), respeitando `safe-area-inset`
  em dispositivos com notch/home indicator.
- **Desktop (≥ 1024px)**: barra lateral fixa com todos os domínios (Contas, Formas de
  Pagamento, Categorias, Lançamentos, Orçamento, Cartão, Recorrência, Contas Fixas,
  Metas, Relatórios, Configurações — agrupados por fase/seção), barra superior com
  `NotificationBell`, `OfflineSyncBadge` e ação "+ Novo lançamento".

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

Nenhum outro conflito real entre experiência desejada e restrição técnica do
`SDD.md` foi identificado nesta rodada — os demais pontos de atenção da Seção 7.1 são
restrições já resolvidas e aplicadas, não divergências em aberto.

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
      registrado em `BLOCKERS.md` (Bloqueio 001)
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
