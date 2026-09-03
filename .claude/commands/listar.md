---
description: Relatório somente-leitura do status de execução por lote — qual lote está em andamento (ou o próximo a começar), lotes já concluídos e lotes pendentes, com suas dependências. Não dispara agente, não avança tarefa/lote, não pausa esperando confirmação.
argument-hint: (sem argumentos)
---

# /listar — Status de Execução por Lote

Este comando é **puramente informativo**. Leia os artefatos abaixo, monte o relatório
e responda em uma única mensagem — nunca dispare `Agent`, nunca avance status de
tarefa/lote em nenhum artefato, nunca pause pedindo confirmação. Se este comando
estiver sendo executado dentro de uma sessão que já está no modo Orquestrador de
Execução (`/executar`), isso não interrompe nem substitui esse modo — é só uma
consulta pontual.

Use a mesma convenção de agrupamento em lote e a mesma leitura de estado que
`.claude/EXECUTION-FLOW.md` e `.claude/commands/executar.md` (Seção 0) já definem —
não invente critério novo aqui.

## 1. Ler os artefatos

1. `.md/TASK.md` — Seção 3 (Lista de Tarefas, com a coluna/agrupamento de lote de
   cada tarefa) e Seção 7 (Log de Lotes Fechados).
2. `.md/QA-REPORT.md`, `.md/SECURITY-REVIEW.md` (se existirem) — para o veredito de
   QA/DevSecOps sobre o lote em andamento (o lote já fechado já carrega isso resumido
   na linha da Seção 7, não precisa reabrir esses dois arquivos para lote concluído).
3. `.md/BLOCKERS.md` (se existir) — toda entrada com Status `Aberto`.
4. `.md/DEPLOY.md` (se existir) — status de deploy por lote, para a coluna
   informativa na tabela de lotes concluídos.

**Se `TASK.md` não tiver a convenção de agrupamento em lote** (projeto gerado antes
da revisão do `EXECUTION-FLOW.md`, ou Seção 3 sem indicação de lote por tarefa): não
infira agrupamento por conta própria. Pare a leitura de estado por lote e vá direto
para a Seção 4 (Avisos) deste relatório, explicando exatamente essa lacuna.

## 2. Determinar o status de cada lote

Para cada lote identificado na Seção 3 do `TASK.md`, na ordem em que aparecem
(ordem de execução prevista, respeitando a Seção 4 — dependências):

- **Concluído**: tem linha correspondente na Seção 7 do `TASK.md` (Log de Lotes
  Fechados) — QA, DevSecOps e Tech Lead já aprovaram.
- **Bloqueado**: não tem linha na Seção 7, e existe entrada `Aberto` em
  `BLOCKERS.md` afetando alguma tarefa do lote.
- **Em andamento**: não tem linha na Seção 7, não está bloqueado, e ao menos uma
  tarefa do lote está `Em andamento` ou `Concluída` (mas nem todas — senão já teria
  fechado).
- **Não iniciado**: todas as tarefas do lote estão `Não iniciada`.

Se mais de um lote aparecer com status `Em andamento` simultaneamente (não deveria
acontecer no fluxo normal do `/executar`, que processa um lote por vez), não escolha
um silenciosamente — registre isso na Seção 4 (Avisos) como uma anomalia a
investigar, e trate o lote mais adiantado (mais tarefas concluídas) como "lote
atual" só para fins de exibição.

Se a informação disponível não for suficiente para determinar o status de um lote
com confiança (ex.: tarefa com status ambíguo, `QA-REPORT.md` inconsistente com
`TASK.md`), não presuma — liste esse lote como "Status indeterminado" e explique o
motivo na Seção 4.

## 3. Montar o relatório

Estrutura fixa da resposta, nesta ordem:

```markdown
# Status de Execução — <nome do projeto>

Visão geral: X/N lotes concluídos · Y em andamento · Z não iniciados

## Lote atual — "<nome do lote>" (Em andamento | Próximo a começar)

| ID | Tarefa | Time | Status |
|---|---|---|---|
| ... | ... | ... | ... |

QA: <status ou "aguardando lote fechar"> · DevSecOps: <status ou "aguardando QA"> ·
Tech Lead: <status ou "aguardando QA + DevSecOps">
Bloqueios ativos: <lista de entradas Aberto de BLOCKERS.md afetando este lote, ou
"Nenhum">

## Lotes concluídos (N)

| Lote | Fechado em | QA | DevSecOps | Deploy |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Lotes pendentes (ordem de execução)

N+1. **<lote>** — depende de: <lote(s) do qual depende, ou "sem dependência de
     lote, liberado">
...

## Avisos

- <qualquer lacuna de informação encontrada, ou omitir a seção inteira se não houver
  nenhuma>
```

Regras de preenchimento:

- **"Lote atual"** é sempre exatamente um lote: o em andamento (rótulo "Em
  andamento") ou, se nenhum lote começou ainda, o primeiro da fila (rótulo "Próximo
  a começar", tabela de tarefas toda `Não iniciada`, sem linha de QA/DevSecOps/Tech
  Lead/Bloqueios). Se todos os lotes já estiverem concluídos, substitua esta seção
  por uma linha única: "Todos os lotes do escopo corrente estão concluídos."
- **"Lotes concluídos"** nunca reabre detalhe de tarefa/dispatch — só a linha
  compacta já registrada na Seção 7 do `TASK.md` (mesmo mecanismo de resumo-e-reset
  que o `/executar` usa). Se não houver nenhum lote concluído, omita esta seção.
- **"Lotes pendentes"** lista na ordem de execução prevista, com a dependência
  entre lotes explícita quando existir (não só a numeração) — deixe claro o que já
  está liberado para começar assim que o lote atual fechar, vs. o que ainda espera
  outro lote pendente. Se não houver nenhum lote pendente além do atual, omita esta
  seção.
- **"Avisos"** só aparece quando há algo a sinalizar (lacuna de agrupamento, status
  indeterminado, anomalia de múltiplos lotes em andamento) — nunca inventado só para
  preencher a seção.

## 4. O que este comando nunca faz

- Nunca dispara `Agent` para nenhum papel do pipeline.
- Nunca edita `TASK.md`, `BLOCKERS.md`, `QA-REPORT.md`, `SECURITY-REVIEW.md`,
  `DEPLOY.md` ou qualquer outro artefato — é leitura pura.
- Nunca pausa pedindo confirmação do usuário — é uma consulta, não uma etapa do
  fluxo de execução. Termina a resposta assim que o relatório estiver completo.
- Nunca presume ou infere status de lote que os artefatos não sustentam — reporta a
  lacuna em vez de adivinhar.
