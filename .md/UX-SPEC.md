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

### 1.2 Fluxos de CRUD estrutural (mapeados pelo UX/UI, sem diagrama próprio no BA por serem simples, mas com tela obrigatória)

| Fluxo UX | Descrição | Telas | Requisitos | Fase |
|---|---|---|---|---|
| UX-FL-06 | Cadastro/gestão de contas | S-ACC-01 → S-ACC-02 (novo/editar) → S-ACC-04 (inativação, se houver vínculo) | RF-MVP-01, RN-08 | MVP |
| UX-FL-07 | Cadastro/gestão de formas de pagamento | S-PAY-01 → S-PAY-02 (customizada) | RF-MVP-02 | MVP |
| UX-FL-08 | Cadastro/gestão de categorias/subcategorias | S-CAT-01 → S-CAT-02 (novo/editar) → S-CAT-03 (bloqueio de exclusão com sugestão de reclassificação) | RF-MVP-03, RN-09 | MVP |
| UX-FL-09 | Definição de orçamento por categoria | S-BUD-01 → S-BUD-02 (definir teto) → alerta inline (80%/100%+) | RF-MVP-07, RN-04 | MVP |
| UX-FL-10 | Login e desbloqueio seguro | S-AUTH-01 (login) → S-AUTH-04 (setup PIN, 1ª vez) → S-AUTH-03 (desbloqueio, toda sessão) → S-AUTH-05 (bloqueio temporário) → S-SET-01 (logout explícito) | RF-MVP-08 | MVP |
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

**Padrão B — Confirmação de Ação Destrutiva/Sensível** (inativação de conta,
exclusão de lançamento, encerramento de recorrência, confirmação de reajuste):
modal centralizado (desktop) / bottom sheet (mobile) com título direto, explicação de
consequência em uma frase, e dois botões de mesmo peso visual (nunca um botão
destrutivo pré-focado por padrão) — nunca uma única ação "confirmar" implícita.

### 2.2 Telas por domínio

#### Autenticação e sessão (MVP)

| Tela | Layout |
|---|---|
| **S-AUTH-01** Login | Campo e-mail, campo senha (ou botão "Enviar link mágico"), botão "Entrar", link "Esqueci minha senha". Sem navegação lateral — tela isolada, pré-sessão. |
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
| S-CAT-01/02 | Nome, categoria pai (select "Nenhuma" = categoria raiz) | Lista em árvore (categoria com subcategorias recolhíveis, indentação visual) |
| S-CAT-03 | — (bloqueio, não é formulário) | Modal: "Esta categoria tem N lançamentos vinculados. Reclassifique-os antes de excluir." + botão "Ver lançamentos desta categoria" |

#### Lançamentos (MVP — núcleo, reaproveitado pela Fase 3)

**S-TXN-01 — Lista de lançamentos**
```
[Topo] "Lançamentos" + FilterBar (conta, forma pagamento, categoria, período)
[Corpo] Lista agrupada por dia, cada linha:
        [ícone categoria] Descrição          -R$ 45,00
                           Categoria · Forma  [badge origem, se automatizado]
[Rodapé/flutuante] FAB "+" (expande para Manual/Voz/Foto na Fase 3)
```
Mês corrente por padrão (RF-MVP-04 AC5), com seletor de período.

**S-TXN-02 — Novo/Editar lançamento manual** (formulário-base reaproveitado por
S-CAP-03/S-CAP-05):
```
Data | Conta (select) | Forma de pagamento (select) | Categoria > Subcategoria
(picker em 2 níveis) | Valor (CurrencyInput) | Tipo (Entrada/Saída, toggle) |
Descrição (texto livre)
```
Campos obrigatórios marcados com `*`; validação inline por campo ao perder foco e
no submit (RF-MVP-04 AC2).

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

#### Orçamento (MVP)

**S-BUD-01** segue Padrão A; cada item de categoria mostra barra de progresso
(`ProgressBar`) com 3 estados visuais: normal (< 80%, cor neutra/primária), alerta
de aproximação (≥ 80%, cor âmbar + ícone de atenção, RF-MVP-07 AC3), estouro (> 100%,
cor vermelha + ícone de erro, severidade maior que o alerta de aproximação — texto e
ícone diferentes, não só tom de cor mais forte, para não depender só de cor —
ver Seção 5). **S-BUD-02** formulário simples: categoria (pré-selecionada se veio da
lista), teto (CurrencyInput), limiar de alerta (select, padrão 80%, RN-04).

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

| Token | Valor/Definição | Uso |
|---|---|---|
| `color.primary` | Azul (ex.: `#2563EB`) | Ações primárias, links, elementos de marca |
| `color.income` | Verde (ex.: `#16A34A`) | Entradas, saldo positivo, meta atingida |
| `color.expense` | Vermelho (ex.: `#DC2626`) | Saídas |
| `color.warning` | Âmbar (ex.: `#D97706`) | Alerta de aproximação de orçamento (80%), aviso de conta fixa a vencer |
| `color.danger` | Vermelho forte (ex.: `#B91C1C`) | Estouro de orçamento (>100%), conta vencida/em atraso, ações destrutivas |
| `color.neutral-50…900` | Escala de cinza | Texto, bordas, superfícies |
| `color.surface` / `color.surface-alt` | Fundo de card/página | Hierarquia visual de bloco |
| `typography` | Fonte de sistema (system-ui/Inter), escala `xs 12 / sm 14 / base 16 / lg 18 / xl 20 / 2xl 24 / 3xl 30` | `3xl` reservado para o saldo consolidado do dashboard, nenhuma outra tela usa esse tamanho |
| `spacing` | Escala 4/8/12/16/24/32/48 (px) | Consistente com utilitário Tailwind já definido no `SDD.md` Seção 3 |
| `radius` | `sm 4 / md 8 / lg 16 / full` (pill) | `full` reservado a badges de status e ao FAB |
| `elevation` | `sm` (card em lista), `md` (modal/sheet) | Nunca mais de 2 níveis de elevação simultâneos na mesma tela |
| `motion` | Transições ≤ 200ms para hover/foco, ≤ 300ms para abertura de modal/sheet; toda animação respeita `prefers-reduced-motion` (Seção 5) | — |
| Ícones | Conjunto line-style, grade 24px, semântica consistente (mesmo ícone sempre significa a mesma ação/entidade); biblioteca concreta fica a critério do Tech Lead/Frontend na implementação (ex. Lucide/Heroicons), desde que preserve esta linguagem visual | — |
| Moeda/formato | BRL, formato `R$ 0.000,00`, `RNF-07` — nenhuma tela exibe valor sem símbolo de moeda | — |

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

**Nenhum componente desta seção é assumido como já disponível em alguma biblioteca de
terceiros** — mesmo que o Tech Lead opte por implementar `DonutChart`/`BarChart`/
`LineChart` sobre uma lib de gráficos existente, os 4 componentes marcados **[NOVO]**
acima (`VoiceRecorderUI`, `ReceiptCameraCapture`, `DraftReviewBanner`, `AutoFillTag`,
`CandidateList`) não têm equivalente pronto genérico — carregam regra de produto
específica (RNF-01/RNF-08) e devem ser tratados como desenvolvimento sob medida na
estimativa.

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
| **S-DASH-01** | Nenhuma conta cadastrada → CTA para S-ACC-02; contas existem mas sem lançamento no mês → gráfico substituído por `EmptyState` "Nenhum lançamento este mês ainda" mantendo números-resumo em zero visível (não escondidos) | `Skeleton` nos 3 blocos (saldo, resumo, gráfico) | `Banner` "Não foi possível atualizar os dados" + últimos valores conhecidos permanecem visíveis com timestamp "atualizado há 4 min" | Dados atualizados, indicador "sincronizado agora"; atualização por ação própria é imediata (não espera Realtime, SDD Seção 2.5) |
| **S-TXN-01** | `EmptyState` "Nenhum lançamento neste período" + CTA "+ Novo lançamento" | `Skeleton` de linhas agrupadas por dia | `Banner` + filtros permanecem aplicados para retry | Lista atualizada, novo/editado lançamento aparece imediatamente na posição cronológica correta |
| **S-BUD-01** | `EmptyState` "Nenhum orçamento definido este mês" + CTA | `Skeleton` de barras | `Banner` de recarregamento | Barras com 3 sub-estados (normal/alerta 80%/estouro >100%) — ver Seção 2.2 |
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
| **Sem limite de tempo em confirmação (WCAG 2.2.1)** | `DraftReviewBanner` (S-CAP-03/05) e `CandidateList` (S-CAP-07) nunca expiram, nunca auto-confirmam e nunca navegam sozinhos para fora da tela — isso não é só uma escolha de acessibilidade, é a mesma garantia que RNF-01 exige por requisito de produto; as duas exigências reforçam uma à outra. |
| **Movimento reduzido** | Toda animação (mic pulsante, transições de `Modal`/`Toast`) respeita `prefers-reduced-motion: reduce`, substituída por transição instantânea ou estática equivalente. |
| **Gesto único não é a única via** | Nenhuma ação crítica depende exclusivamente de gesto (ex.: swipe-to-delete em lista sempre tem um botão de ação equivalente acessível via toque simples/teclado). |
| **Texto alternativo de imagem** | Miniatura de recibo (S-CAP-05) tem `alt` descritivo genérico ("Foto do recibo enviada para leitura") — o conteúdo relevante está nos campos extraídos, não na leitura da imagem em si. |

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
| `lg` (desktop) | ≥ 1024px | Navegação lateral fixa substitui navegação inferior, `Modal` centralizado substitui `BottomSheet` |
| `xl` (desktop grande) | ≥ 1280px | Dashboard em grade multi-coluna (saldo + gráfico + orçamento lado a lado, em vez de empilhado) |

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
| Captura de foto/voz | Câmera/microfone nativos do dispositivo via API do navegador | Mesma API do navegador; câmera pode não existir — upload de arquivo é a via primária nesse caso, não um "extra" |

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

### 7.2 Conflitos sinalizados ao Software Architect

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

---

## Log de Alterações Pós-Publicação

Registro de qualquer mudança a um componente/tela depois que o Tech Lead já tiver
estimado esforço em cima dele (ver nota de publicação no topo do documento). Vazio
nesta primeira publicação — nenhuma estimativa foi feita ainda sobre este documento.

| Data | Seção/Componente alterado | O que mudou | Motivo | Tech Lead precisa reestimar? |
|---|---|---|---|---|
| — | — | — | — | — |
