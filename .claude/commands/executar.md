---
description: Orquestra a fase de execução (Backend/Frontend/Mobile em paralelo → QA → DevSecOps → Tech Lead → deploy) por lote, a partir do TASK.md aprovado no Gate 3. Por padrão processa um único lote e para; --continuar encadeia lotes sem parar entre fechamentos limpos. Pausa em reprovação do QA, achado crítico do DevSecOps, teto de fix-loop excedido, e sempre antes de deploy em produção.
argument-hint: "[opcional: nome/id do lote para retomar/iniciar] [--continuar [N]] — vazio processa 1 lote e para; --continuar encadeia até acabar ou pausa obrigatória; --continuar N encadeia até N lotes"
---

# Orquestrador da Fase de Execução

Você está entrando no **modo Orquestrador de Execução**, que persiste pelo resto desta
conversa até este comando terminar (fim do orçamento de lotes desta invocação, falta
de lote pendente, ou pausa obrigatória) — ou você decidir interrompê-lo antes disso. A
lógica deste fluxo está definida em `.claude/EXECUTION-FLOW.md` — leia esse arquivo
agora, antes de fazer qualquer outra coisa, se ainda não o tiver em contexto. A
unidade de trabalho deste fluxo é o **lote** (conjunto coerente de tarefas do
TASK.md, ver `EXECUTION-FLOW.md` "Unidade de Trabalho: Lote"), não a tarefa
individual.

Argumentos recebidos: $ARGUMENTS

## Modo de execução

Interprete `$ARGUMENTS` assim:

- **Vazio**: processa **um único lote** (o em andamento, se houver um incompleto;
  senão o próximo pendente na ordem de execução) e **para ao final dele**, mesmo que
  tenha fechado limpo, sem erro nenhum. Este é o padrão.
- **`--continuar`** (em qualquer posição de `$ARGUMENTS`): processa lotes em
  sequência **sem parar** entre um lote fechado limpo e o próximo — só para numa
  pausa obrigatória (Seção 9) ou quando não houver mais lote pendente no escopo.
  Equivalente ao comportamento anterior deste comando, agora explícito em vez de
  padrão.
- **`--continuar N`** (`N` um inteiro positivo): mesmo encadeamento acima, mas para
  automaticamente depois de fechar **N lotes limpos** nesta invocação (ainda sujeito
  às mesmas pausas obrigatórias, que podem interromper antes de chegar a N).
- **Nome/id de um lote** (qualquer outro texto em `$ARGUMENTS`, ex. `"Cartão de
  Crédito e Fatura"`): usa esse lote como ponto de partida em vez do próximo
  pendente automático — combinável com `--continuar`/`--continuar N`
  (ex.: `/executar "Cartão de Crédito e Fatura" --continuar 2`).

Se o lote nomeado não existir no `TASK.md`, ou já estiver fechado (linha na Seção 7)
sem motivo explícito para reabrir, pare e informe o usuário — não escolha outro lote
por conta própria.

## 0. Pré-requisitos e ponto de retomada

Antes de disparar qualquer agente:

1. Confirme que o projeto é um repositório git (`git status`) — pré-requisito
   bloqueante do `EXECUTION-FLOW.md`, a camada de revisão pós-implementação depende
   de `git diff`. Se não for, pare e informe o usuário.
2. Leia `.md/CTO-REVIEW.md` e confirme que o Gate 3 (`TASK.md` + `GUARDRAILS.md`) está
   Aprovado ou Aprovado com ressalvas. Se não estiver, pare — este comando não inicia
   sem planejamento fechado (ver `/planejar`).
3. Leia `.md/TASK.md` Seção 3 (Lista de Tarefas, com a coluna de lote de cada tarefa)
   e Seção 7 (Log de Lotes Fechados) para levantar o **estado real por lote**:
   - Lotes com linha registrada na Seção 7 → fechados, nunca reabra sem motivo
     explícito (achado novo, pedido do usuário).
   - Lote com alguma tarefa `Em andamento`/`Concluída` mas sem linha na Seção 7 →
     em andamento, retome exatamente dele.
   - Lote com todas as tarefas `Não iniciada` → ainda não começou.
   - Se o `TASK.md` não tiver a convenção de lote, pare e informe o usuário — não
     infira agrupamento por conta própria (mesma regra já usada em `/listar`).
4. Determine o **lote a processar nesta invocação** (Seção "Modo de execução" acima)
   e o **orçamento de lotes** desta invocação: `1` (padrão), `N` (`--continuar N`) ou
   ilimitado (`--continuar` sem número, até acabar os pendentes ou bater pausa
   obrigatória).
5. Leia `.md/BLOCKERS.md` (se existir) e liste qualquer entrada `Aberto` — nenhum
   lote afetado por um bloqueio aberto pode receber trabalho novo.
6. Leia `.md/QA-REPORT.md`, `.md/SECURITY-REVIEW.md` e `.md/DEPLOY.md` (se existirem)
   para saber até onde o lote a retomar já avançou (QA aprovou? DevSecOps aprovou?
   deploy em staging/produção já feito?).
7. A partir disso, retome exatamente do passo certo dentro do lote determinado —
   nunca reinicie lote já fechado nem repita deploy já registrado em `DEPLOY.md`.

## 1. Disparo único no início do projeto

Só na primeira vez que este comando roda para o projeto (ou ao retomar um projeto
onde isso nunca rodou) — **não repete a cada lote, independe do modo/orçamento**:

- `devops` — `infrastructure-as-code-provisioning` + `cicd-pipeline-configuration`,
  via `Agent` com `run_in_background: true`, já que o `SDD.md` está aprovado desde o
  Gate 2. A infraestrutura é do projeto inteiro, não de um lote.
- `qa` — `test-strategy-planning` (produz/atualiza `TEST-PLAN.md`), também em
  paralelo, também sem esperar nenhum lote terminar.

Se ambos já rodaram numa sessão anterior (evidência: `DEPLOY.md`/`TEST-PLAN.md` já
existem), pule esta seção e vá direto ao lote determinado no passo 0.4.

## 2. Disparo por lote — trilhas

Para o lote determinado, dispare em paralelo, cada um via `Agent` com
`run_in_background: true` (são independentes entre si):

- `backend` / `frontend` / `mobile` — um dispatch por trilha que tiver tarefa
  `Não iniciada`/`Em andamento` atribuída a ela **dentro deste lote** (nunca tarefas
  de outro lote, mesmo que já liberadas por dependência). Dentro de cada trilha as
  tarefas do lote rodam em sequência (respeitando a Seção 4 do TASK.md); só o
  paralelismo *entre* trilhas é real. Uma trilha sem tarefa neste lote não é
  disparada.

Ao receber a conclusão de um dispatch de trilha, por tarefa:

1. Dispare uma revisão de spec-compliance (contra o critério de aceite da própria
   tarefa) + qualidade de código.
2. Achado da revisão: corrige e revisa de novo (fix-loop) — **sem pausar**, até **2
   tentativas de correção**. Se a revisão seguinte à 2ª correção ainda encontrar
   achado, **pare** — não tente uma 3ª vez. Registre `BLOCKERS.md` escalado a
   `tech-lead` e trate como bloqueio silencioso (Seção 8).
3. Marque a tarefa `Concluída` no `TASK.md` (mecanismo já definido no agente da
   trilha) — mas **não** dispare QA por tarefa individual; QA só entra quando o lote
   inteiro fechar (Seção 3).
4. Se a tarefa depende de contrato de API ainda não publicado, deixe o próprio
   `frontend`/`mobile` resolver (mock ou aguardo, já definido nesses agentes) — só
   reporte como bloqueio silencioso (Seção 8) se ficar parada por tempo.
5. Ao concluir a última tarefa pendente do lote numa trilha, informe objetivamente o
   que foi entregue e continue acompanhando as demais trilhas do mesmo lote.

Só avance para a Seção 3 quando **todas** as tarefas do lote, em todas as trilhas que
o tocam, estiverem `Concluída`.

## 3. QA — uma vez por lote

Quando todas as tarefas do lote estiverem `Concluída`, dispare `qa` uma única vez
para as 5 skills de validação, sobre o lote inteiro:

- **Aprovado / Aprovado com ressalvas (todas as tarefas do lote)**: segue sem pausa,
  avance para a Seção 4.
- **Reprovado (uma ou mais tarefas)**: **pausa obrigatória**. Explique o motivo, a(s)
  tarefa(s) reprovada(s) volta(m) para `Em andamento` na trilha responsável. O
  retrabalho acontece dentro do próprio lote — não reabra tarefa do lote já aprovada.
  Depois da correção, dispare QA de novo, mas **só sobre o que foi reprovado + o que
  depende diretamente disso** — nunca a bateria completa sobre o lote inteiro de
  novo. Só avance para a Seção 4 quando não houver mais reprovação pendente no lote.

## 4. DevSecOps — dois ritmos, por lote

- `static-security-analysis` dispara **uma vez por lote, em paralelo ao QA** (Seção
  3) — não espera o veredito dele. Se encontrar achado de severidade alta/crítica **a
  qualquer momento**: **pausa obrigatória**. Explique, escale para a trilha
  responsável (campo "Escala para" de `devsecops.md`), retome a trilha original após
  a correção, dentro do mesmo lote.
- Quando o QA aprovar (Aprovado ou Aprovado com ressalvas) **todas** as tarefas do
  lote, dispare a auditoria completa do DevSecOps (as outras 5 skills).
- Achado da auditoria completa que bloqueia: mesma pausa obrigatória acima.
- Achado que não bloqueia: registra como débito em `SECURITY-REVIEW.md`, segue sem
  pausa.

## 5. Aprovação de lote pelo Tech Lead

Quando QA e DevSecOps tiverem aprovado o lote (Aprovado ou Aprovado com
ressalvas/débito, nada bloqueando), dispare `tech-lead` para aplicar o "Critério de
Aprovação de Lote" (definido em `tech-lead.md`):

- **Aprovado**: o Tech Lead registra a linha do lote na Seção 7 do `TASK.md` (Log de
  Lotes Fechados). Isso é o gatilho que libera a Seção 6 (deploy). Avance.
- **Reprovado** (algum critério do checklist não bate — ex.: `BLOCKERS.md` aberto que
  passou despercebido, diretriz de implementação violada): pausa obrigatória, o item
  pendente volta ao dono correspondente (QA, DevSecOps ou a trilha) — nunca decida
  você mesmo o que fazer, quem resolve é sempre o dono do artefato afetado.

## 6. DevOps — deploy por lote

Com a linha do lote registrada na Seção 7 do `TASK.md`:

- O deploy dispara com a **dupla aprovação** do mesmo lote: `QA-REPORT.md`
  (Aprovado/Aprovado com ressalvas) **e** `SECURITY-REVIEW.md` (Aprovado/Aprovado com
  débito registrado), ambos sobre as tarefas deste lote.
- Deploy em staging: sem pausa.
- **Deploy em produção: pausa obrigatória sempre**, a cada lote — mesmo com tudo
  limpo, mesmo em modo `--continuar`, mesmo que o lote anterior já tenha passado por
  essa pausa sem problema. Apresente o que vai subir (o lote, não o projeto inteiro)
  e aguarde validação explícita do usuário antes de disparar.
- `devops` registra o resultado em `DEPLOY.md` (uma entrada por deploy, não uma só ao
  final do projeto).

## 7. Reset de contexto ao fechar o lote — e decisão de parar ou continuar

Com o lote fechado (linha na Seção 7 do TASK.md + deploy em staging/produção
registrado em `DEPLOY.md`):

1. Resuma o lote para o usuário em poucas linhas — o que foi feito, aprovado, e
   qualquer débito registrado (QA-DEBT-*/SEC-DEBT-*) — e **pare de recapitular
   aí**. Não repita dispatches, achados intermediários, ou ciclos de fix-loop
   daquele lote em nenhuma mensagem seguinte.
2. Todo dispatch de agente para o **próximo** lote (se houver, ver passo 3) referencia
   só: os artefatos formais de sempre (`SDD.md`, `GUARDRAILS.md`, `TASK.md`,
   `UX-SPEC.md`, `API-CONTRACT.yaml`) mais a linha do lote anterior na Seção 7 do
   `TASK.md` — nunca a narrativa completa de como um bug foi encontrado/corrigido no
   lote fechado. Isso vale **igualmente nos dois modos** (padrão e `--continuar`) —
   o reset de contexto não depende de o comando estar parando ou seguindo.
   Se o usuário perguntar sobre um detalhe de um lote já fechado, busque a resposta
   no artefato correspondente (`QA-REPORT.md`/`SECURITY-REVIEW.md`/`BLOCKERS.md`/
   `TASK.md` Seção 7) — não tente reconstruir da memória da conversa algo que já foi
   deliberadamente podado.
3. **Decida parar ou continuar, conforme o orçamento desta invocação (passo 0.4)**:
   - **Orçamento esgotado** (modo padrão, já processou 1 lote; ou `--continuar N`,
     já processou N lotes): **pare aqui**. Apresente o resumo do lote (passo 1
     acima) e, se houver lote pendente no `TASK.md`, uma linha objetiva do tipo
     "restam <contagem> lotes pendentes — rode `/listar` para o detalhe ou
     `/executar --continuar` para seguir automaticamente". Não enumere os lotes
     pendentes aqui — isso é papel do `/listar`. Termine a resposta.
   - **`--continuar` (com ou sem N) e ainda há orçamento e lote pendente**: sem
     perguntar nada ao usuário, volte à Seção 2 para o próximo lote pendente na
     ordem de execução.
   - **Não há mais lote pendente no escopo corrente**, independente do modo: pule
     direto para a Seção 10 (Encerramento) — não é uma parada por orçamento, é o
     fim real do trabalho disponível.

## 8. Bloqueio silencioso e escalonamento

Depois de cada dispatch, verifique se o agente sinalizou um bloqueio (no próprio
relatório ou em novas entradas `Aberto` em `.md/BLOCKERS.md`). Se sim:

1. **Pare** e explique: quem reportou, o que está bloqueado, há quanto tempo (data já
   registrada na entrada) e para qual agente foi escalado.
2. Dispare o agente de destino com o conteúdo da entrada de `BLOCKERS.md` como
   contexto.
3. Apresente a resolução e aguarde validação do usuário.
4. Retome a trilha/etapa original, dentro do mesmo lote (nunca do início do fluxo).

Nunca decida a resolução por conta própria — quem resolve é sempre o agente de
destino definido no próprio arquivo do agente que escalou. Uma pausa por bloqueio
interrompe o encadeamento de `--continuar` da mesma forma que qualquer outra pausa
obrigatória (Seção 9) — retomar depois exige rodar `/executar` de novo.

## 9. Resumo: quando pausa e quando não pausa

**Pausa obrigatória** (interrompe inclusive o modo `--continuar`, exige nova
invocação do comando para retomar):
- Fix-loop de uma tarefa excede o teto de 2 tentativas de correção.
- Reprovação do QA numa tarefa do lote.
- Achado alto/crítico do DevSecOps, a qualquer momento.
- Reprovação do Tech Lead na aprovação de lote.
- Sempre antes do deploy em produção, a cada lote.
- Tarefa bloqueada por dependência não resolvida (reporta tempo parado).

**Fim de invocação sem pausa** (diferente de pausa obrigatória — não é erro, não
precisa de validação para "destravar", só marca o fim do orçamento desta chamada do
comando):
- Orçamento de lotes desta invocação esgotado (1, no padrão, ou N em
  `--continuar N`), com o lote fechando limpo.

**Progride sem parar** (dentro do processamento de um lote, ou entre lotes em modo
`--continuar` com orçamento disponível):
- Execução paralela normal das trilhas dentro do lote.
- Preparação de infra/pipeline do DevOps (uma vez, início do projeto).
- Fix-loop interno de revisão pós-implementação, até o teto.
- Aprovações limpas do QA e DevSecOps sobre o lote inteiro.
- Aprovação de lote pelo Tech Lead.
- Deploy em staging, a cada lote.
- Início do próximo lote, só em modo `--continuar` com orçamento sobrando.

## 10. Encerramento (Gate 4)

Quando não houver mais lote pendente no escopo corrente (ex.: todo o MVP fechado e
deployado) — independente de ter chegado aqui em modo padrão ou `--continuar`:
dispare `cto` para fechar o ciclo em `CTO-REVIEW.md` (Gate 4, só registro, sem poder
de veto aqui).

Monte a lista consolidada final **lendo a Seção 7 do TASK.md (Log de Lotes
Fechados)** e os artefatos formais (`DEPLOY.md`, `SECURITY-REVIEW.md`,
`QA-REPORT.md`) — não a memória da conversa, que já foi podada lote a lote conforme a
Seção 7 acima. Apresente, por lote: o que foi implementado, testado, auditado e
deployado, com status final de cada peça.
