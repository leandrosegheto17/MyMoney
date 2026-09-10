# ADR-020: Foto de recibo nunca é persistida — linhas de retenção de foto do ADR-011 ficam sem objeto

- **Data**: 2026-09-09
- **Status**: Accepted
- **Deciders**: coordenador (chapéu software-architect), decisão de produto do
  stakeholder (fora da cadeia de agentes)
- **Tags**: architecture, data-lifecycle, storage, ocr, retention, product-decision
- **Relacionado**: não supersede `ADR-011` — `ADR-011` permanece `Accepted`, imutável,
  como registro histórico do racional original (que incluía retenção de foto de
  recibo como opção deliberada, ver "Opção C" rejeitada no próprio `ADR-011`). Esta
  ADR torna **sem objeto** duas linhas específicas da tabela-resumo de `ADR-011`
  (foto de recibo confirmada / descartada), sem reescrevê-las nem invalidar o
  restante da política (ledger, `CandidateTransaction`, exports, backup, exclusão de
  conta continuam exatamente como definidos em `ADR-011`).

## Context and Problem Statement

`BE-F3-01` (`receipt-ocr`) foi implementada deliberadamente **stateless**: recebe a
imagem em base64, extrai os campos via OCR, e "não persiste nada em nenhum caminho"
— nota de status da própria tarefa, decisão já tomada antes desta ADR, não uma
lacuna a fechar agora.

`ADR-011` (2026-09-02), ao definir a política de retenção e descarte de dado,
presumiu que a foto de recibo *seria* persistida em algum bucket de Storage durante
a Fase 3, e por isso incluiu na sua tabela-resumo duas linhas de retenção para essa
foto: 90 dias (vinculada a lançamento confirmado) e 30 dias (vinculada a candidato
descartado/abandonado).

O `Bloqueio 024` (`BLOCKERS.md`, reportado pelo Executor/chapéu Backend durante
`BE-F3-08`) confirmou, por auditoria direta do código real, que essa premissa nunca
se materializou em nenhuma tarefa do `TASK.md`:

- Nenhuma tabela `Attachment` foi criada (`SDD.md` Seção 5.2 já marcava a entidade
  como "achado adicional da auditoria", com FK "a adicionar quando a tabela
  existir" — a tabela nunca existiu).
- Nenhum bucket de Storage para foto de recibo foi criado (diferente do bucket
  `exports`, criado por `BE-F3-07`).
- `candidate_transaction` (`BE-F3-00`) não tem nenhuma coluna de path/URL de
  Storage.
- Nem backend nem frontend (`receiptImage.ts`/`ReceiptCameraCapture.tsx`) fazem
  upload de imagem a qualquer bucket — a imagem só viaja em memória/base64 até o
  OCR e é descartada pelo cliente depois.

O stakeholder, diretamente e fora da cadeia de agentes (mesmo padrão já registrado
em Bloqueios anteriores, ex. 003/016), confirmou que isso é o comportamento
**definitivo** do produto: foto de recibo nunca será persistida, em nenhuma fase
futura. Não é uma lacuna a preencher depois — é uma decisão de produto fechada.

## Decision Drivers

- Decisão direta do stakeholder, definitiva, sobre comportamento de produto — fora
  da autoridade do Coordenador decidir, mas dentro da sua autoridade formalizar.
- Coerência com o princípio de minimização de dado já adotado (`SDD.md` Seção 5) —
  não persistir a foto é, na prática, a forma mais forte possível de minimização
  para esse artefato específico.
- Evitar que `ADR-011` continue presumindo, por tempo indefinido, uma persistência
  que nunca foi desenhada e agora nunca será — o que deixaria `BE-F3-08` e qualquer
  tarefa futura permanentemente ancoradas numa premissa falsa.
- Preservar a imutabilidade de `ADR-011` (registro histórico do racional original)
  em vez de editá-lo — mesma regra já aplicada a ADR-001→ADR-012, ADR-005, ADR-010.

## Considered Options

- **Opção A (escolhida)**: registrar nova ADR que declara sem objeto as 2 linhas de
  retenção de foto de `ADR-011`, sem editá-lo, e atualizar `SDD.md` (Seção 5.2 e
  Seção 7) para refletir a decisão definitiva de não persistência.
- **Opção B**: editar `ADR-011` diretamente, removendo as 2 linhas. Rejeitada —
  viola a regra de imutabilidade de ADR já aplicada consistentemente no projeto;
  perderia o registro histórico de que a retenção de foto foi, em algum momento,
  uma decisão real e deliberada (incluindo a rejeição explícita da Opção C de
  descarte imediato).
- **Opção C**: desenhar agora a persistência de foto (nova tabela `Attachment` +
  bucket + reabertura de `BE-F3-01`/`02`/`03`/Frontend), conforme a primeira
  alternativa que o próprio `Bloqueio 024` já havia levantado. Rejeitada —
  contraria diretamente a decisão de produto do stakeholder, que fechou a questão
  no sentido oposto.

## Decision Outcome

**Opção A escolhida.** As duas linhas da tabela-resumo de `ADR-011` referentes a:

- "Foto de recibo (Storage) vinculada a lançamento confirmado" (90 dias)
- "Foto de recibo (Storage) vinculada a candidato descartado/abandonado" (30 dias)

ficam **sem objeto**: não há foto persistida para reter nem para descartar, porque
nenhuma foto chega a ser gravada em Storage em nenhum caminho do sistema. `ADR-011`
não é editado — permanece `Accepted`, íntegro, como registro histórico do racional
original (que incluía a possibilidade de retenção de foto como opção deliberada,
com a Opção C de descarte imediato pós-extração explicitamente rejeitada por cortar
valor de produto).

**Isto não reabre a Opção C de `ADR-011`, nem contraria sua rejeição original.** São
cenários diferentes:

- Opção C de `ADR-011` era sobre **descarte imediato de um arquivo que chegaria a
  ser gravado** no servidor (upload para Storage seguido de remoção no instante da
  extração) — cortando a possibilidade de reabertura futura da imagem.
- O cenário desta ADR é que **o arquivo nunca chega a ser gravado no servidor em
  nenhum momento** — não há upload, não há objeto de Storage, não há instante de
  descarte, porque não há o que descartar. A "conferência manual pós-lançamento"
  que motivou a rejeição da Opção C nunca existiu como capacidade real do sistema
  implementado — ela era uma premissa de design de `ADR-011` que não se
  materializou em nenhuma tarefa do `TASK.md`.

### Consequência prática para `BE-F3-08` (delegado ao Backend, fora do escopo desta ADR)

- O 3º sub-job (`confirmed_receipt_photo_purge`, hoje registrado como
  `status: skipped_not_implemented` em `data_retention_purge_log`, ver
  `supabase/functions/data-retention-purge/index.ts`) deve ser **removido do
  código** — não mais "pulado todo dia", simplesmente deixa de existir, por não ter
  mais objeto (design, não lacuna).
- O sub-job de expurgo de `CandidateTransaction` mantém sua lógica de remoção da
  linha (30 dias, inalterada); a menção a "e a foto associada" nesse mesmo sub-job
  (`ADR-011`, critério de aceite de `BE-F3-08`) também fica sem objeto, pelo mesmo
  motivo — não há foto associada a remover.
- Esta ADR **não altera** `TASK.md` — o ajuste do critério de aceite/código de
  `BE-F3-08` é responsabilidade do Backend, fora do escopo do Coordenador aqui.

### Positive Consequences

- Resolve o `Bloqueio 024` definitivamente, pela alternativa (b) que o próprio
  bloqueio já havia colocado como opção.
- Remove uma premissa falsa que `ADR-011` carregava desde 2026-09-02, sem violar a
  imutabilidade de ADR.
- Simplifica `BE-F3-08` — um sub-job inteiro deixa de precisar de "estado
  `skipped_not_implemented`" monitorado indefinidamente; passa a não existir.
- Reforça, na prática, o princípio de minimização de dado já adotado em `SDD.md`
  Seção 5, no seu grau mais forte possível para este artefato: dado que nunca é
  coletado no servidor não precisa de política de retenção.

### Negative Consequences

- Nenhuma foto de recibo pode ser reaberta para conferência manual após o
  lançamento confirmado, inclusive em caso de erro de OCR percebido depois — mesma
  consequência que `ADR-011` já havia identificado ao rejeitar a Opção C
  (descarte imediato), agora consolidada como comportamento definitivo do produto,
  por decisão direta do stakeholder, não por omissão técnica.
- `SDD.md` Seção 5.2 precisa deixar de tratar `Attachment` como "pendência a
  resolver quando a tabela existir" e passar a tratá-la como "não será criada" —
  ajuste de documentação, sem impacto de código.

## Links

- Relacionado: `ADR-011` (não editado, permanece `Accepted`), `SDD.md` Seção 5.2
  (`Attachment`), `SDD.md` Seção 7 (Retenção e Descarte de Dado)
- Origem: `BLOCKERS.md`, Bloqueio 024 (reportado por `executor`/Backend, `BE-F3-08`,
  2026-09-09), decisão direta do stakeholder fora da cadeia de agentes
- Resolve: `BLOCKERS.md`, Bloqueio 024 — pela alternativa (b) já prevista no próprio
  bloqueio
- Consequência delegada (fora do escopo desta ADR): `TASK.md`/`BE-F3-08` (remoção do
  3º sub-job `confirmed_receipt_photo_purge` e do trecho "e a foto associada" no
  critério de aceite) — responsabilidade do Backend
