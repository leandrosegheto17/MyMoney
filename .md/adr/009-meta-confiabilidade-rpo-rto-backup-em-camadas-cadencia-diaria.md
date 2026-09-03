# ADR-009: Corrigir cadência da exportação lógica de backup para diária, tornando RPO ≤ 24h verdadeiro independentemente do tier do Supabase legado

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: software-architect
- **Tags**: architecture, reliability, backup, availability
- **Supersedes**: ADR-004 (`004-meta-confiabilidade-rpo-rto-backup-em-camadas.md`)

## Context and Problem Statement

O CTO revisou o ADR-004 no Gate 2 (`architecture-decision-review` + `risk-and-compliance-check`) e reprovou pontualmente a meta declarada de **RPO ≤ 24h**, por inconsistência interna: a própria seção "Premissa a Validar" do ADR-004 instrui tratar como garantidas apenas as camadas (ii) exportação lógica **semanal** e (iii) fila offline do cliente enquanto o tier do Supabase legado não for confirmado. A camada (i) — backup diário gerenciado — é condicional ("quando o plano suportar").

Isso significa que, na prática e enquanto a premissa seguir em aberto, a exportação lógica semanal entrega, na pior hipótese, um RPO real de até **7 dias** para o estado do banco, não 24h. A fila offline (iii) protege um cenário diferente — lançamento **digitado e ainda não sincronizado** — não a perda de dado **já persistido** em caso de desastre do Postgres; o ADR-004 somava os dois efeitos para sustentar "24h" quando a única camada que de fato entregaria 24h era um fato ainda não verificado. Esta é exatamente a armadilha que a Opção A do próprio ADR-004 já havia sido descartada por cometer ("RPO real desconhecido até confirmar o plano do legado") — o mesmo argumento se aplicava, sem que o ADR-004 tivesse percebido, à opção que ele próprio escolheu.

Esta correção é pontual, conforme reprovação registrada em `CTO-REVIEW.md` (Gate 2, subseção "ADR-004"): não reabre o `SDD.md` nem os demais 7 ADRs aprovados. RTO ≤ 24h e a ausência de SLA formal permanecem consistentes e não fazem parte desta correção.

## Decision Drivers

- Meta de confiabilidade precisa ser **honesta e verdadeira desde já**, não condicional a uma premissa ainda não confirmada (tier do Supabase legado)
- Exigência nº 1 declarada literalmente pelo stakeholder no Gate 1 ("não posso perder lançamento") — não é um detalhe a relativizar
- Custo operacional adicional deve permanecer marginal, coerente com projeto pessoal sem orçamento formal (RNF-09)
- Mecânica de exportação já desenhada no ADR-004 (Edge Function agendada via `pg_cron`) não precisa ser reprojetada — só a cadência do agendamento muda

## Considered Options

- Opção A (recomendada pelo CTO, escolhida aqui): mudar a cadência da camada de exportação lógica independente de semanal para **diária** — mesma mecânica (Edge Function/`pg_cron` agendado, `pg_dump`/export, armazenamento criptografado fora do Supabase), só muda o cron. Torna RPO ≤ 24h verdadeiro **independentemente** da confirmação do tier do legado.
- Opção B: manter cadência semanal, mas declarar honestamente **RPO ≤ 7 dias** como meta vigente até a confirmação do tier do legado, com RPO ≤ 24h como meta condicional pós-confirmação.

## Decision Outcome

**Opção A escolhida** — cadência da exportação lógica independente passa de **semanal para diária**. Meta de confiabilidade revisada:

- **RPO ≤ 24h** para o banco — agora sustentado por **duas camadas independentes**, cada uma suficiente isoladamente para cumprir a meta: (i) backup automático diário gerenciado do Supabase, **quando o plano do projeto legado suportar** (segue condicional, sem mudança); e (ii) **exportação lógica diária independente** (`pg_dump`/export via Edge Function agendada por `pg_cron`), armazenada criptografada em storage separado do Supabase. Como (ii) não depende mais da confirmação do tier, **RPO ≤ 24h passa a ser verdadeiro desde já**, e não apenas depois que a premissa do ADR-004 original for validada — a camada (i) deixa de ser a única via para a meta, tornando-se um reforço, não um pré-requisito.
- (iii) Fila de lançamentos offline no cliente (IndexedDB, ADR-003) mantida sem alteração — continua cobrindo o cenário complementar de lançamento digitado ainda não sincronizado, não substitui nem se soma à meta de RPO do banco.
- **RTO ≤ 24h** — inalterado, mantido do ADR-004.
- **Disponibilidade: sem SLA numérico formal** — inalterado, mantido do ADR-004.

A premissa a validar (tier/plano do Supabase legado) permanece registrada como pendência do spike do ADR-001, mas deixa de ser uma condição da qual a meta de RPO ≤ 24h depende — passa a ser relevante apenas para saber se a camada (i) soma proteção redundante, não se a meta é honesta.

### Positive Consequences

- RPO ≤ 24h passa a ser verdadeiro independentemente de qualquer confirmação pendente — elimina a inconsistência interna apontada pelo CTO
- Mecânica já desenhada no ADR-004 é reaproveitada integralmente — não há redesenho, só mudança de cron (`0 0 * * 0` semanal → `0 0 * * *` diário, ou equivalente)
- Duas camadas passam a ser cada uma isoladamente suficiente para RPO ≤ 24h (defesa em profundidade real, não nominal)

### Negative Consequences

- Aumenta a frequência de execução do job de exportação lógica de 1x/semana para 1x/dia (~7x mais execuções) — custo operacional adicional é marginal (job leve, volume de dado de um único usuário), mas segue sendo trabalho recorrente a monitorar (risco já registrado na Seção 6 do `SDD.md`: "quem avisa se o job falhar?")
- Mais pontos de execução aumentam levemente a superfície de possível falha do job agendado (mitigado pela mesma necessidade de monitoramento/alerta já prevista, sem mudança de escopo)
- RPO ≤ 24h continua permitindo perda de até um dia de dados em cenário de desastre total do banco — aceito conscientemente, não é RPO zero (herdado do ADR-004, não é uma piora)

## Pros and Cons of the Options

### Opção A: Cadência diária ✅ Chosen

- ✅ Torna a meta declarada (RPO ≤ 24h) verdadeira sem depender de premissa em aberto
- ✅ Reaproveita 100% da mecânica já desenhada — só muda o agendamento
- ✅ Custo operacional adicional marginal, proporcional a usuário único (RNF-09)
- ❌ ~7x mais execuções do job a monitorar (aceito, mitigação já prevista na Seção 6 do `SDD.md`)

### Opção B: Manter semanal, declarar RPO ≤ 7 dias

- ✅ Honesto com o estado atual da premissa
- ✅ Nenhuma mudança operacional
- ❌ RPO ≤ 7 dias é uma meta mais fraca do que o stakeholder esperaria para "não posso perder lançamento" — a Opção A entrega uma meta melhor pelo mesmo desenho, sem justificar abrir mão dela
- ❌ Mantém uma meta condicional (RPO ≤ 24h "quando o tier for confirmado") por tempo indeterminado, dependente de um spike (ADR-001) sem prazo formal

## Links

- Supersede: ADR-004 (`004-meta-confiabilidade-rpo-rto-backup-em-camadas.md`) — `Status: Superseded by ADR-009`
- Relacionado: ADR-001 (Supabase legado, tier a confirmar — spike segue relevante para saber se a camada (i) soma proteção redundante), ADR-003 (PWA/offline queue)
- Origem da correção: `CTO-REVIEW.md`, Gate 2, subseção "ADR-004" (Reprovado pontual, saída (a) recomendada)
