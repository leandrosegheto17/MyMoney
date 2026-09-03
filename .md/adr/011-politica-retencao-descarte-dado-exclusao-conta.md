# ADR-011: Definir política de retenção e descarte de dado (ledger, recibos, exports, backups) e processo de exclusão de conta

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, security, compliance, lgpd, storage, data-lifecycle
- **Relacionado**: não supersede nenhum ADR existente — preenche uma lacuna estrutural
  não coberta por nenhuma decisão anterior.

## Context and Problem Statement

O CTO, no Gate 2 (`risk-and-compliance-check`, `CTO-REVIEW.md`), identificou que
nenhuma seção do `SDD.md` define por quanto tempo lançamentos, exportações (CSV/PDF),
fotos de recibo e backups ficam retidos, nem qual é o processo de exclusão de conta/
dado a pedido do usuário — severidade **Média**, não bloqueante do Gate 2, mas
registrada como recomendação explícita: "Retenção/descarte de dado ... precisa virar
requisito explícito antes de a Fase 3 entrar em desenvolvimento" (`CTO-REVIEW.md`,
Gate 2, "Recomendação", item 4).

O Tech Lead confirmou essa mesma ausência durante a decomposição do `TASK.md` (Seção
3.3) e registrou o **Bloqueio 002** em `BLOCKERS.md`, escalado ao Software Architect:
sem essa decisão, 18 tarefas de Fase 3 (~31 dias de esforço estimado) permanecem
bloqueadas por guardrail (`G-13`), e a tarefa `BE-F3-08` (implementação técnica da
política) não pode ser estimada com confiança.

Esta é uma decisão estrutural — não uma lacuna de detalhe de implementação que o Tech
Lead pudesse decidir sozinho — porque envolve trade-off real entre minimização de dado
(já um princípio adotado em `SDD.md` Seção 5) e valor de produto (poder conferir a
foto original de um recibo depois do lançamento confirmado), além de uma tensão comum
de LGPD entre "direito de exclusão a pedido do titular" e "backup de recuperação de
desastre" (ADR-009) — que precisa de resposta honesta, no mesmo espírito da correção
de RPO feita no ADR-009 (meta verdadeira, não vaga).

## Decision Drivers

- Princípio de minimização já adotado (`SDD.md` Seção 5: "campos coletados são os
  estritamente necessários ... nenhuma coleta 'por via das dúvidas'") — deve se
  estender de "o que é coletado" para "por quanto tempo é retido depois de cumprir seu
  propósito"
- Proporcionalidade a projeto pessoal de usuário único, sem orçamento formal (RNF-09,
  princípio 3 da Seção 1 do `SDD.md`: "custo operacional mínimo") — política não pode
  exigir infraestrutura nova; deve reaproveitar mecanismos já desenhados (`pg_cron`,
  Storage privado, Edge Functions)
- Ledger é o propósito central do produto (Seção 2.2, bounded context "Ledger") — não
  faz sentido descartar lançamento confirmado por tempo
- Direito de exclusão do titular (mesmo sendo o próprio usuário único, titular e
  controlador de fato) precisa de resposta honesta sobre onde o dado pode continuar
  existindo depois do pedido (ex.: em backups já emitidos), não uma promessa vaga de
  "apagamos tudo"
- Reaproveitar exatamente o mesmo padrão de agendamento já usado por outras rotinas do
  sistema (`pg_cron` + Edge Function, ADR-002/004/009) — nenhum mecanismo novo a
  operar

## Considered Options

- **Opção A (proposta do Tech Lead, ajustada aqui)**: política diferenciada por
  categoria de dado — ledger retido indefinidamente enquanto a conta está ativa;
  artefatos transitórios (fotos de recibo, exports, candidatos de importação
  descartados) com prazo definido e descarte automático; backups com rotação finita;
  exclusão de conta remove todo dado do schema `mymoney` associado ao `owner_id` mais
  arquivos correspondentes no Storage e o usuário no Supabase Auth.
- **Opção B**: retenção indefinida de tudo (fotos, exports, candidatos descartados,
  backups sem rotação) — mais simples de implementar (nenhum job de limpeza), mas
  contraria o princípio de minimização já adotado na Seção 5 e o princípio de custo
  operacional mínimo (Storage cresce sem limite, inclusive com artefatos sem nenhum
  propósito residual, como foto de um candidato de importação que o próprio usuário
  rejeitou).
- **Opção C**: descarte imediato de todo artefato transitório assim que o dado
  estruturado é extraído/confirmado (ex.: foto de recibo apagada no instante em que o
  OCR extrai os campos, exports apagados no instante do download) — reduz custo/
  superfície de exposição ao mínimo absoluto, mas remove a possibilidade de o usuário
  reabrir a foto original para conferência manual caso perceba um erro de OCR depois
  do lançamento confirmado; rejeitada por cortar valor de produto sem necessidade real,
  dado o custo marginal de Storage para o volume de referência (RNF-09).

## Decision Outcome

**Opção A escolhida (com números concretos definidos abaixo)** — política
diferenciada por categoria de dado, reaproveitando exclusivamente mecanismos já
desenhados no `SDD.md` (`pg_cron` agendado + Edge Function, Storage privado com
signed URL, mesmo padrão de ADR-002/ADR-004/ADR-009):

| Categoria de dado | Retenção | Gatilho de descarte | Mecanismo |
|---|---|---|---|
| **Ledger** (Transaction e demais entidades de planejamento: Account, Category, Budget, CreditCard, Invoice, RecurringTemplate, InstallmentPurchase, FixedBill, Goal, Contribution, Notification, OpenFinanceConnection) | Indefinida, enquanto a conta estiver ativa | Só por exclusão de conta a pedido do usuário (ver abaixo) | Nenhum job de expiração — é o próprio propósito do produto (Seção 2.2) |
| **CandidateTransaction confirmado** (`status = confirmado`) | Segue a retenção do `Transaction` gerado (indefinida) | — | O registro de candidato vira histórico de proveniência (`origem`), não é descartado separadamente |
| **CandidateTransaction descartado ou abandonado** (`status = descartado`, ou `status = pendente` sem ação do usuário por tempo prolongado) | **30 dias** a partir de `status = descartado`, ou 30 dias a partir da criação do `ImportBatch` se permanecer `pendente` sem confirmação nem descarte explícito | Job diário agendado (`pg_cron` + Edge Function) | `DELETE` físico da linha; nenhum propósito legítimo em reter candidato rejeitado ou esquecido além de uma janela razoável de retomada pelo usuário |
| **Foto de recibo (Storage) vinculada a lançamento confirmado** | **90 dias** a partir de `Transaction.confirmed_at` | Job diário agendado (`pg_cron` + Edge Function) | Remove o objeto do bucket privado; o dado estruturado já extraído permanece no `Transaction`, que é o registro de propósito duradouro — a foto é apenas evidência de conferência de curto/médio prazo |
| **Foto de recibo (Storage) vinculada a candidato descartado/abandonado** | Mesmo prazo do candidato associado (**30 dias**), nunca os 90 dias do caso confirmado | Mesmo job acima, executado em conjunto com a limpeza de `CandidateTransaction` | Sem lançamento confirmado, não há propósito residual em reter a imagem além da janela de retomada |
| **Exports gerados sob demanda (CSV/PDF)** | Até **24h** após a geração, suficiente para o download (signed URL de curta duração já prevista em Seção 7) | Job diário agendado (`pg_cron` + Edge Function) | Remove o arquivo do bucket privado de exports; não há propósito em manter uma cópia gerada sob demanda além da janela de download |
| **Backup / exportação lógica de disaster recovery** (ADR-009, cadência diária) | Rotação de **últimos 30 snapshots diários** (~1 mês corrido) | Job de rotação (mesma Edge Function/`pg_cron` do ADR-009, passo adicional de expurgo do snapshot mais antigo a cada execução) | Evita crescimento indefinido de custo de storage externo e define um horizonte finito e conhecido — não indefinido — até quando um dado já apagado pelo usuário ainda pode existir em algum snapshot de backup |
| **Exclusão de conta a pedido do usuário** | Imediata para o dado ativo; até 30 dias de cauda residual em backups já emitidos (ver Negative Consequences) | Ação explícita do usuário (fluxo de confirmação dedicado, fora do escopo de UI trivial — a detalhar pelo UX/UI) | Edge Function privilegiada e dedicada (role de serviço, nunca exposta como operação direta do cliente) que: (i) remove todas as linhas do schema `mymoney` associadas ao `owner_id` do usuário (ordem de exclusão respeitando dependências de FK, ou `ON DELETE CASCADE` a partir de `Account`/`owner_id`, a detalhar pelo Backend); (ii) remove todos os objetos do Storage associados ao mesmo `owner_id` (fotos de recibo, exports pendentes); (iii) remove o usuário em Supabase Auth |

### Nota sobre a tensão exclusão vs. backup

Backups já emitidos antes de um pedido de exclusão **não são purgados
retroativamente de forma imediata** — reprocessar/reescrever snapshots já gerados
para remover um único usuário é desproporcional ao contexto de projeto pessoal sem
orçamento formal (mesmo raciocínio de proporcionalidade do Gate 1/ADR-002). Em vez de
prometer "exclusão total imediata em todo lugar" (promessa que não se sustentaria na
prática, o mesmo tipo de inconsistência que o CTO já havia identificado e corrigido no
ADR-009 para RPO), esta ADR declara honestamente: **dado excluído pode persistir por
até 30 dias em algum snapshot de backup, até a rotação natural expirar aquele
snapshot.** Isso é consequência direta e documentada da rotação de 30 dias definida
acima — não uma omissão.

### Positive Consequences

- Fecha a lacuna apontada pelo CTO no Gate 2 (severidade Média) e pelo Tech Lead no
  Bloqueio 002, desbloqueando as 18 tarefas de Fase 3 e permitindo estimar `BE-F3-08`
  com confiança
- Estende o princípio de minimização já presente na Seção 5 para a dimensão de tempo,
  sem introduzir nenhum mecanismo de infraestrutura novo (reaproveita `pg_cron` +
  Edge Function, já usados por ADR-002/004/009)
- Resposta honesta e verificável sobre exclusão de conta, em vez de uma promessa vaga
  de "apagamos tudo imediatamente e em todo lugar" que não resistiria a uma auditoria
  simples (mesma disciplina aplicada à correção de RPO no ADR-009)
- Fotos de recibo de candidatos rejeitados/abandonados não se acumulam indefinidamente
  no Storage sem propósito, reduzindo custo e superfície de exposição de dado sensível

### Negative Consequences

- Introduz mais um job agendado a monitorar (expurgo de candidatos/fotos/exports/
  snapshot mais antigo) — mesma categoria de risco operacional já registrada em
  `SDD.md` Seção 6 ("quem avisa se o job falhar?"); não é um mecanismo novo de
  categoria, é mais uma responsabilidade no mesmo padrão já existente
- Dado excluído a pedido do usuário pode persistir por até 30 dias em backup já
  emitido antes do pedido — aceito conscientemente e documentado (ver nota acima),
  não uma lacuna oculta
- Prazo de 90 dias para foto de recibo confirmado é uma escolha de produto sem
  validação direta do stakeholder nesta rodada — registrado como premissa a validar
  (ver "Condição de revisão" abaixo), não como fato definitivo imutável de UX

## Pros and Cons of the Options

### Opção A: Política diferenciada por categoria ✅ Chosen

- ✅ Proporcional — ledger (propósito do produto) tratado diferente de artefato
  transitório (evidência de conferência)
- ✅ Reaproveita 100% de mecanismos já desenhados, sem infraestrutura nova
- ✅ Resposta honesta sobre a tensão exclusão vs. backup
- ❌ Mais um job agendado a monitorar (aceito, mesma categoria de risco já registrada)

### Opção B: Retenção indefinida de tudo

- ✅ Nenhum job de limpeza a implementar/monitorar
- ❌ Contraria o princípio de minimização já adotado na Seção 5
- ❌ Storage cresce sem limite, inclusive com artefatos sem propósito residual (foto
  de candidato rejeitado)
- ❌ Exclusão de conta ficaria incompleta ou mal definida sem uma política de dado a
  remover previamente definida

### Opção C: Descarte imediato de todo artefato transitório

- ✅ Superfície de exposição mínima absoluta
- ❌ Remove a possibilidade de o usuário reabrir a foto original para conferência
  manual após o lançamento confirmado, sem necessidade real dado o custo marginal de
  Storage para o volume de referência (RNF-09)
- ❌ Não resolve a tensão exclusão vs. backup nem a retenção de candidatos descartados

## Condição de revisão

- Prazos concretos (90 dias para recibo confirmado, 30 dias para candidato descartado/
  abandonado e sua foto, 30 snapshots de rotação de backup, 24h para expurgo de
  export) são a primeira definição formal desta política — não foram validados
  diretamente com o stakeholder nesta rodada. Revisitar se o uso real (RN-11) revelar
  necessidade de prazo diferente (ex.: usuário quer reabrir foto de recibo depois de
  90 dias por motivo de conferência fiscal/pessoal) ou se o volume de dado tornar a
  rotação de 30 snapshots insuficiente para o RTO/RPO definidos em ADR-009.
- Fluxo de UI/UX do pedido de exclusão de conta (confirmação, aviso sobre a cauda de
  30 dias em backup) fica a cargo do UX/UI e não é definido por esta ADR — apenas o
  requisito de arquitetura (o que a Edge Function de exclusão precisa remover).

## Links

- Relacionado: `SDD.md` Seção 5 (princípio de minimização), Seção 7 (Criptografia,
  Storage privado/signed URL), Seção 6 (risco "quem avisa se o job falhar?"),
  ADR-002 (Edge Functions/`pg_cron`), ADR-004/ADR-009 (mesmo padrão de agendamento e
  mesma disciplina de meta honesta vs. condicional)
- Origem: `CTO-REVIEW.md`, Gate 2, "Risco e Compliance" (linha "Retenção e descarte",
  severidade Média) e "Recomendação" item 4; `BLOCKERS.md`, Bloqueio 002 (reportado
  por `tech-lead`, 2026-09-02)
- Desbloqueia: `TASK.md` Seção 3.3 (18 tarefas de Fase 3, ~31 dias), especificamente
  `BE-F3-08` (implementação técnica desta política)
