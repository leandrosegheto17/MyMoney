# EXECUTION-FLOW.md

Sequência lógica da **fase de execução** — parte de onde o planejamento termina
(`TASK.md` aprovado no Gate 3 + `GUARDRAILS.md` aprovado, ver `PLANNING-FLOW.md`) e
vai até o deploy em produção, fechando o ciclo de volta ao CTO.

Este documento não redefine nenhum dos 12 agentes nem os critérios internos de cada
um (o que QA considera bug bloqueante, o que DevSecOps considera achado crítico, o
que autoriza o DevOps a fazer deploy) — só ordena o que cada agente já declara, com
pontos de paralelismo, pausa e escalonamento.

**Técnica de implementação**: cada trilha usa ciclo TDD (teste falha → implementação
mínima → teste passa → refatora) dentro da própria skill `automated-testing` do
agente — é técnica interna de cada dispatch, não um passo separado do orquestrador.
Uma camada de revisão (spec-compliance + qualidade de código) roda depois de cada
tarefa implementada, antes do QA entrar — mecanismo próprio deste fluxo, não do
Superpowers (ver histórico de decisão: Superpowers foi avaliado e descartado como
motor deste fluxo por ser dimensionado para feature isolada em manutenção, não para
um pipeline de 12 papéis com gate de CTO — revisitar quando a fase de manutenção
pós-v1 for desenhada).

**Pré-requisito bloqueante**: este projeto precisa ser um repositório git antes deste
fluxo rodar de verdade — a camada de revisão depende de diff (`git diff`) entre o
estado antes e depois de cada tarefa.

**Histórico de revisão**: este documento foi revisado para trocar a tarefa individual
pelo lote como unidade de ritmo de QA/DevSecOps/deploy — motivo: disparar a bateria
completa de QA (5 skills) e revisão isolada por tarefa individual gerava dispatch
demais e contexto que nunca era podado ao longo do projeto. O extremo oposto
(trilhas executando o projeto inteiro antes de qualquer QA) foi descartado por criar
efeito cascata de retrabalho quando um erro nasce cedo e só é detectado no fim. Lote
é o meio-termo: unidade grande o bastante para justificar o custo de uma bateria de
QA/DevSecOps completa, pequena o bastante para não deixar erro se propagar por meses
de trabalho sem detecção.

---

## Unidade de Trabalho: Lote

Um **lote** é um conjunto coerente de tarefas do `TASK.md` que forma uma
funcionalidade/módulo com sentido próprio (ex.: "cadastro de paciente", "cartão de
crédito e fatura") — nem uma tarefa isolada, nem o backlog inteiro.

A convenção de agrupamento vive no `TASK.md` (`tech-lead.md`, Seção 3 + nova Seção 7
"Log de Lotes Fechados") — o Tech Lead atribui cada tarefa a um lote durante a
decomposição, derivado dos bounded contexts que o Software Architect já particiona
no `SDD.md`. Este documento consome esse agrupamento, não o define.

Um lote nunca cruza fase (MVP/Fase 2/Fase 3, quando o projeto tiver faseamento) e
agrupa todas as trilhas que ele toca (Backend/Frontend/Mobile, conforme aplicável).

---

## As 3 trilhas paralelas — dentro de um lote

Cada trilha processa, em paralelo com as outras duas, as tarefas do lote corrente
atribuídas a ela (coluna "dono/time responsável", Seção 3 do `TASK.md`). **Dentro de
uma mesma trilha, as tarefas do lote rodam em sequência** (respeitando as
dependências mapeadas na Seção 4), só o paralelismo *entre* trilhas é real — mesma
lógica de sempre, agora só escopada ao lote em vez de ao TASK.md inteiro. Uma trilha
sem tarefa naquele lote simplesmente não é disparada para ele.

Por tarefa, dentro da trilha:

1. Dispara o agente da trilha (`backend`/`frontend`/`mobile`) para a tarefa
   específica — ele implementa em ciclo TDD via sua própria `automated-testing`.
2. Ao concluir, dispara uma revisão de spec-compliance (contra o critério de aceite
   da própria tarefa) + qualidade de código.
3. Achado da revisão: corrige e revisa de novo (fix-loop) — **sem pausar**, até um
   **teto de 2 tentativas de correção**. Se a revisão seguinte à 2ª correção ainda
   encontrar achado (novo ou remanescente), **não tenta uma 3ª vez**: pausa
   obrigatória, registra `BLOCKERS.md` escalado a `tech-lead` (mesmo padrão já
   definido no agente da trilha para "desvio grande de escopo/estimativa" — 2
   tentativas falhas de correção é evidência do mesmo tipo de problema, mesmo que a
   causa raiz só apareça depois: tarefa mal especificada, estimativa incompatível
   com a complexidade real, ou bug genuinamente difícil que merece replanejamento em
   vez de retry indefinido). Retoma quando o Tech Lead resolver.
4. Marca a tarefa `Concluída` no `TASK.md` (mecanismo já definido nos três agentes).

**Dependência de contrato de API (Frontend/Mobile ↔ Backend)**: não é orquestrada
aqui — `frontend.md`/`mobile.md` já resolvem sozinhos ("mock se o endpoint já está
em `API-CONTRACT.yaml`, aguarda se não está"). O orquestrador só precisa saber que
uma tarefa `Em andamento` com nota de mock ainda não está de fato pronta.

---

## QA — uma vez por lote

Muda em relação à versão anterior deste documento: as 5 skills de validação não
disparam mais por tarefa individual.

- `test-strategy-planning` continua rodando desde o Gate 3 (fim do planejamento),
  em paralelo ao projeto inteiro — sem mudança, não é escopado a lote.
- As 5 skills de validação (`acceptance-criteria-validation`,
  `cross-platform-integration-testing`, `bug-documentation`,
  `non-functional-validation`, mais a decisão de aprovação em si) disparam **uma
  vez, quando todas as tarefas do lote** (em todas as trilhas que o tocam) estiverem
  `Concluída` — não por tarefa, não esperando o projeto inteiro.
- Aprovação (Aprovado ou Aprovado com ressalvas) de todas as tarefas do lote: segue
  sem pausa, libera o gatilho de DevSecOps abaixo.
- **Reprovação de uma ou mais tarefas do lote: pausa obrigatória.** Explica o
  motivo, a(s) tarefa(s) reprovada(s) volta(m) para `Em andamento` na trilha
  responsável (conforme já definido em `qa.md`). O retrabalho acontece **dentro do
  próprio lote** — nenhuma outra tarefa do lote já aprovada é reaberta. Ao corrigir,
  QA reteta **só o que foi reprovado + o que depende diretamente disso**
  (`cross-platform-integration-testing` cobre esse alcance quando a tarefa
  reprovada tem dependência cruzada) — não reexecuta a bateria completa sobre o
  lote inteiro de novo.

---

## DevSecOps — dois ritmos, ambos por lote

- `static-security-analysis` (SAST, dependências, secrets) dispara **uma vez por
  lote, em paralelo ao QA** — não espera o veredito do QA, mesma lógica de "não
  esperar nada pronto" que já valia antes, só que agora o ponto de disparo é o lote
  fechando (todas as tarefas `Concluída`), não mais uma thread solta rodando o
  tempo todo sem relação com nenhum agrupamento. Motivo da mudança: essa skill não
  precisa de funcionalidade completa/aprovada para ser útil (ao contrário das outras
  5), então não faz sentido represá-la até o QA aprovar — mas também não precisa de
  um ritmo dissociado de qualquer unidade de trabalho, o que gerava dispatch sem
  relação clara com o progresso do projeto. Alinhar ao lote preserva a detecção
  precoce (não espera aprovação funcional) sem reintroduzir dispatch solto.
- **Achado de severidade alta/crítica, a qualquer momento** (inclusive durante essa
  varredura por lote, antes mesmo do QA terminar): **pausa obrigatória**, como já
  era.
- A auditoria completa (as outras 5 skills) dispara quando o QA tiver aprovado
  (Aprovado ou Aprovado com ressalvas) **todas as tarefas do lote** — mesmo gatilho
  "QA aprovou o build" que `devsecops.md` já define, com "build" mapeado a "lote".
- Achado que bloqueia: pausa, explica, escala para a trilha de implementação
  responsável (campo "Escala para" já definido em `devsecops.md`), retoma a trilha
  original após a correção — dentro do mesmo lote, sem reabrir lotes já fechados.
- Achado da auditoria completa que não bloqueia: registra como débito em
  `SECURITY-REVIEW.md`, segue sem pausa.

---

## Aprovação de lote pelo Tech Lead

Terceiro veredito, depois de QA e DevSecOps aprovarem o lote (Aprovado ou Aprovado
com ressalvas/débito, sem nada bloqueando) — critério objetivo completo definido em
`tech-lead.md` ("Critério de Aprovação de Lote"), resumido aqui:

- Toda tarefa do lote `Concluída`; QA e DevSecOps sem pendência bloqueante sobre
  nenhuma delas; nenhum `BLOCKERS.md` aberto afetando o lote; nenhuma diretriz de
  implementação violada sem exceção registrada.

Aprovado: o Tech Lead registra a linha do lote na Seção 7 do `TASK.md` (Log de Lotes
Fechados) — **é esse registro que libera o DevOps para o deploy daquele lote**, e é
esse resumo compacto que o orquestrador carrega para o próximo lote (ver "Reset de
contexto" abaixo). Reprovado: devolve o item pendente ao dono correspondente (QA,
DevSecOps ou a trilha) — o Tech Lead nunca resolve a pendência de outro agente
sozinho.

---

## DevOps — prepara desde o início do projeto, deploya por lote

- `infrastructure-as-code-provisioning` e `cicd-pipeline-configuration` disparam
  assim que o `SDD.md` está aprovado (Gate 2, já aconteceu no planejamento) — ou
  seja, começam **no instante zero do projeto**, em paralelo às trilhas, sem pausa.
  **Não é escopado a lote** — a infraestrutura é do projeto inteiro, não de um
  módulo.
- O deploy passa a acontecer **por lote** (entrega incremental), não só uma vez ao
  final de todo o escopo: assim que o Tech Lead registra um lote como aprovado (ver
  acima), esse lote está liberado para deploy — com a mesma **dupla aprovação** de
  sempre (`QA-REPORT.md` Aprovado/Aprovado com ressalvas + `SECURITY-REVIEW.md`
  Aprovado/Aprovado com débito, ambos sobre o mesmo lote).
- Deploy em staging: sem pausa, a cada lote aprovado.
- **Deploy em produção: pausa obrigatória sempre**, a cada lote — mesmo com tudo
  limpo, mesmo que o lote anterior já tenha passado por essa pausa sem problema.
  Apresenta o que vai subir (o lote, não o projeto inteiro) e aguarda validação
  explícita do usuário antes de disparar.
- `DEPLOY.md` registra um resultado por deploy (já é o formato definido em
  `devops.md`: "relatório de cada deploy") — com múltiplos lotes, isso significa
  múltiplas entradas ao longo do projeto, não uma única ao final.

---

## Reset de contexto entre lotes

Ao fechar um lote (QA aprovado + DevSecOps aprovado + Tech Lead aprovado, linha
registrada na Seção 7 do `TASK.md`), o orquestrador trata **essa linha** — não o
histórico completo de dispatches, revisões, fix-loops e achados daquele lote — como
o único contexto que carrega ao dispatchar o próximo lote.

Na prática: o prompt de dispatch de cada nova tarefa/trilha, a partir daqui, referencia
os artefatos formais de sempre (`SDD.md`, `GUARDRAILS.md`, `TASK.md`, `UX-SPEC.md`,
`API-CONTRACT.yaml`) mais a Seção 7 do `TASK.md` (o log compacto dos lotes já
fechados) — nunca a narrativa completa de como um bug de um lote anterior foi
encontrado e corrigido. Isso é a mesma disciplina que `PIPELINE-CONVENTIONS.md` §2 já
aplica na transição implementação → QA/DevSecOps/DevOps ("cada agente entra com
escopo limpo"), estendida agora para as transições *entre lotes*, dentro da própria
fase de execução — um ponto de poda que o `EXECUTION-FLOW.md` anterior não previa.

Débito registrado (QA-DEBT-*, SEC-DEBT-*) e bloqueio resolvido continuam
rastreáveis nos artefatos formais (`QA-REPORT.md`, `SECURITY-REVIEW.md`,
`BLOCKERS.md`) — o reset é do contexto que o orquestrador ativamente carrega
dispatch a dispatch, nunca do registro auditável em si.

---

## Bloqueio silencioso

Se uma tarefa ficar travada por dependência não resolvida (de outra tarefa, de um
endpoint que não existe, de um achado ainda não corrigido), o reporte inclui **há
quanto tempo está parada** — calculado a partir da data já registrada na entrada
correspondente de `BLOCKERS.md`, nunca deixado travado em silêncio. Sem mudança.

---

## Resumo: quando pausa e quando não pausa

**Pausa obrigatória**:
- Fix-loop de uma tarefa excede o teto de 2 tentativas de correção.
- Qualquer reprovação do QA numa tarefa do lote.
- Qualquer achado de severidade alta/crítica do DevSecOps, a qualquer momento
  (varredura por lote ou auditoria completa).
- Sempre antes do deploy em produção — a cada lote, não só uma vez.
- Tarefa bloqueada por dependência não resolvida (reporta com tempo parado).

**Progride sem pausa**:
- Execução paralela normal das trilhas, dentro do lote.
- Preparação de infraestrutura e pipeline do DevOps (projeto inteiro, não por lote).
- Fix-loop interno de revisão pós-implementação, até o teto de 2 tentativas.
- Aprovações limpas do QA e do DevSecOps sobre o lote inteiro.
- Aprovação de lote pelo Tech Lead.
- Deploy em staging, a cada lote.

---

## Onde o fluxo termina

**Gate 4**: continua sendo o fechamento do ciclo de governança inteiro (aberto no
Gate 1), não um checkpoint por lote — o DevOps já reporta cada deploy individual em
`DEPLOY.md` ao longo do projeto (ver acima); o CTO registra o encerramento em
`CTO-REVIEW.md` quando todos os lotes do escopo corrente (ex.: todo o MVP) estiverem
deployados — só registro, sem poder de veto aqui, mesmo mecanismo já definido em
`PLANNING-FLOW.md`/`cto.md`.

Ao final, apresentar a lista consolidada de tudo que foi implementado, testado,
auditado e deployado nesta execução, por lote, com status de cada peça.
