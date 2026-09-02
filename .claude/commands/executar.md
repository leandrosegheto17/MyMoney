---
description: Orquestra a fase de execução (Backend/Frontend/Mobile em paralelo → QA contínuo → DevSecOps → DevOps) a partir do TASK.md aprovado no Gate 3, até o deploy em produção e o fechamento do Gate 4 pelo CTO. Pausa em reprovação do QA, achado crítico do DevSecOps e sempre antes de deploy em produção.
argument-hint: [opcional: tarefa(s) específica(s) do TASK.md para retomar; vazio processa todas as pendentes]
---

# Orquestrador da Fase de Execução

Você está entrando no **modo Orquestrador de Execução**, que persiste pelo resto desta
conversa até o fluxo terminar (ou você decidir interrompê-lo). A lógica deste fluxo
está definida em `.claude/EXECUTION-FLOW.md` — leia esse arquivo agora, antes de fazer
qualquer outra coisa, se ainda não o tiver em contexto.

Escopo recebido (pode estar vazio, processa todas as tarefas pendentes): $ARGUMENTS

## 0. Pré-requisitos e ponto de retomada

Antes de disparar qualquer agente:

1. Confirme que o projeto é um repositório git (`git status`) — pré-requisito
   bloqueante do `EXECUTION-FLOW.md`, a camada de revisão pós-implementação depende
   de `git diff`. Se não for, pare e informe o usuário.
2. Leia `.md/CTO-REVIEW.md` e confirme que o Gate 3 (`TASK.md` + `GUARDRAILS.md`) está
   Aprovado ou Aprovado com ressalvas. Se não estiver, pare — este comando não inicia
   sem planejamento fechado (ver `/planejar`).
3. Leia `.md/TASK.md` (coluna Status) para levantar o estado real de cada tarefa:
   `Pendente` / `Em andamento` / `Concluída`. Nunca presuma que está começando do
   zero.
4. Leia `.md/BLOCKERS.md` (se existir) e liste qualquer entrada `Aberto` — nenhuma
   tarefa afetada por um bloqueio aberto pode receber trabalho novo.
5. Leia `.md/QA-REPORT.md`, `.md/SECURITY-REVIEW.md` e `.md/DEPLOY.md` (se existirem)
   para saber até onde o pipeline já avançou (build validado? deploy em staging já
   feito? produção pendente?).
6. A partir disso, determine exatamente o que falta e retome dali — nunca reinicie
   tarefa já `Concluída` nem repita deploy já registrado em `DEPLOY.md`.

## 1. Disparo inicial — o que começa em paralelo, sem pausa

No instante zero da execução (ou ao retomar), dispare em paralelo, cada um via `Agent`
com `run_in_background: true` (são independentes entre si):

- `backend` / `frontend` / `mobile` — um dispatch por trilha que tiver tarefas
  `Pendente`/`Em andamento` atribuídas a ela na Seção 3 do `TASK.md`. Dentro de cada
  trilha as tarefas rodam em sequência (respeitando a Seção 4 de dependências); só o
  paralelismo *entre* trilhas é real.
- `devops` — `infrastructure-as-code-provisioning` + `cicd-pipeline-configuration`,
  já que o `SDD.md` está aprovado desde o Gate 2.
- `devsecops` — `static-security-analysis` contínuo, sem esperar nada pronto.

Não dispare `qa` aqui: `test-strategy-planning` já roda desde o Gate 3 (fora do
escopo deste comando); as skills de validação do QA disparam por tarefa concluída,
conforme a seção 3 abaixo.

## 2. Mecânica por tarefa, dentro de cada trilha

Ao receber a conclusão de um dispatch de trilha:

1. Dispare uma revisão de spec-compliance (contra o critério de aceite da própria
   tarefa) + qualidade de código.
2. Achado da revisão: corrige e revisa de novo (fix-loop) — **sem pausar**.
3. Marque a tarefa `Concluída` no `TASK.md` (mecanismo já definido no agente da
   trilha) e dispare imediatamente a validação do QA (seção 3) para essa tarefa —
   nunca em lote, nunca esperando a trilha inteira fechar.
4. Se a tarefa depende de contrato de API ainda não publicado, deixe o próprio
   `frontend`/`mobile` resolver (mock ou aguardo, já definido nesses agentes) — só
   reporte como bloqueio silencioso (seção 6) se ficar parada por tempo.
5. Ao concluir a última tarefa pendente de uma trilha, informe objetivamente o que foi
   entregue nela e continue acompanhando as demais.

## 3. QA — contínuo, por tarefa

A cada tarefa marcada `Concluída` por qualquer trilha, dispare `qa` para as 5 skills
de validação:

- **Aprovado / Aprovado com ressalvas**: segue sem pausa.
- **Reprovado**: **pausa obrigatória**. Explique o motivo, devolva a tarefa para
  `Em andamento` na trilha responsável, e só retome quando o usuário validar a
  correção.

Quando o QA aprovar (Aprovado ou Aprovado com ressalvas) **todas** as tarefas do lote
em execução, dispare a auditoria completa do DevSecOps (as outras 5 skills, além da
`static-security-analysis` contínua).

## 4. DevSecOps — dois ritmos

- Achado de severidade alta/crítica **a qualquer momento** (inclusive durante a
  varredura contínua da seção 1): **pausa obrigatória**. Explique, escale para a
  trilha responsável (campo "Escala para" de `devsecops.md`) e retome a trilha
  original após a correção.
- Achado da auditoria completa que não bloqueia: registra como débito, segue sem
  pausa.

## 5. DevOps — prepara desde o início, deploya só no fim

- O deploy só dispara com a **dupla aprovação** do mesmo build: `QA-REPORT.md`
  (Aprovado/Aprovado com ressalvas) **e** `SECURITY-REVIEW.md` (Aprovado/Aprovado com
  débito registrado).
- Deploy em staging: sem pausa.
- **Deploy em produção: pausa obrigatória sempre**, mesmo com tudo limpo. Apresente o
  que vai subir e aguarde validação explícita do usuário antes de disparar.

## 6. Bloqueio silencioso e escalonamento

Depois de cada dispatch, verifique se o agente sinalizou um bloqueio (no próprio
relatório ou em novas entradas `Aberto` em `.md/BLOCKERS.md`). Se sim:

1. **Pare** e explique: quem reportou, o que está bloqueado, há quanto tempo (data já
   registrada na entrada) e para qual agente foi escalado.
2. Dispare o agente de destino com o conteúdo da entrada de `BLOCKERS.md` como
   contexto.
3. Apresente a resolução e aguarde validação do usuário.
4. Retome a trilha/etapa original (nunca do início do fluxo).

Nunca decida a resolução por conta própria — quem resolve é sempre o agente de
destino definido no próprio arquivo do agente que escalou.

## 7. Resumo: quando pausa e quando não pausa

**Pausa obrigatória**: reprovação do QA numa tarefa · achado alto/crítico do
DevSecOps, a qualquer momento · sempre antes do deploy em produção · tarefa bloqueada
por dependência não resolvida (reporta tempo parado).

**Progride sem pausa**: execução paralela normal das 3 trilhas · preparação de
infra/pipeline do DevOps · aprovações limpas do QA e DevSecOps · fix-loop interno de
revisão pós-implementação · deploy em staging.

## 8. Encerramento (Gate 4)

Após o deploy em produção aprovado pelo usuário: o `devops` registra o resultado em
`DEPLOY.md` (sucesso, rollback ou incidente); dispare `cto` para fechar o ciclo em
`CTO-REVIEW.md` (Gate 4, só registro, sem poder de veto aqui). Apresente então a lista
consolidada de tudo que foi implementado, testado, auditado e deployado nesta
execução, com o status final de cada peça.
