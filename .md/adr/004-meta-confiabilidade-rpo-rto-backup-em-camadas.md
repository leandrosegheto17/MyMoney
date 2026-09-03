# ADR-004: Definir meta de confiabilidade (RPO/RTO) e estratégia de backup em camadas

- **Data**: 2026-09-02
- **Status**: Superseded by ADR-009 (Gate 2 do CTO reprovou pontualmente a meta RPO ≤ 24h por inconsistência com a cadência semanal da camada (ii) enquanto a Premissa a Validar segue em aberto — ver `CTO-REVIEW.md`, Gate 2, subseção "ADR-004", e `009-meta-confiabilidade-rpo-rto-backup-em-camadas-cadencia-diaria.md`)
- **Deciders**: software-architect
- **Tags**: architecture, reliability, backup, availability

## Context and Problem Statement

RNF-04 delega explicitamente a formalização desta meta ao Software Architect. O stakeholder declarou qualitativamente: "não posso perder lançamento nem ter o app fora do ar". O projeto é pessoal, sem orçamento formal, usuário único (RNF-09), e o banco de dados é o Supabase de um projeto legado reaproveitado (ADR-001) cujo tier/plano de backup não foi confirmado nesta rodada.

## Decision Drivers

- Exigência qualitativa não-negociável do stakeholder (Gate 1)
- Ausência de orçamento para arquitetura de alta disponibilidade multi-região
- Incerteza sobre o plano do Supabase legado (free vs. pro, PITR disponível ou não)
- Necessidade de uma meta mensurável para orientar QA/DevOps mais adiante, sem superdimensionar a solução para um único usuário

## Considered Options

- Opção A: Confiar apenas nos backups automáticos padrão da plataforma gerenciada (Supabase), sem camada extra
- Opção B: Backup em camadas — (i) backup automático gerenciado da plataforma, quando disponível no plano contratado; (ii) exportação lógica periódica independente (`pg_dump`/export agendado), armazenada fora do Supabase; (iii) fila local no cliente (offline queue) para não perder lançamento digitado sem conexão
- Opção C: Réplica síncrona multi-região com failover automático

## Decision Outcome

Opção B escolhida, com as seguintes metas concretas:

- **RPO ≤ 24h** para o banco — via backup diário gerenciado do Supabase **quando o plano do projeto legado suportar** (ver premissa abaixo), complementado por **exportação lógica semanal independente** (`pg_dump`/export agendado via Edge Function ou pipeline externo), armazenada criptografada em um storage separado do Supabase, para não depender do mesmo fornecedor tanto para o dado quanto para a cópia de segurança.
- **RTO ≤ 24h** — tempo aceitável para restauração manual, dado que é um projeto pessoal sem obrigação contratual de uptime.
- **Disponibilidade: sem SLA numérico formal contratado** — não seria honesto prometer um percentual (ex.: 99,9%) sem orçamento para arquitetura redundante. A meta declarada é "melhor esforço apoiado na disponibilidade nativa das plataformas gerenciadas" (Supabase para backend, CDN para frontend), sem contrato de SLA pago neste projeto.
- **Fila de lançamentos offline no cliente** (IndexedDB, ver ADR-003) garante que a exigência mais citada pelo stakeholder — "não perder lançamento digitado" — não dependa só da disponibilidade do backend no exato momento da digitação.

### Positive Consequences

- Meta mensurável (RPO ≤ 24h, RTO ≤ 24h) substitui a ambiguidade qualitativa original
- Backup independente do fornecedor principal reduz risco de perda total
- Fila offline resolve o cenário mais citado pelo stakeholder mesmo sem qualquer SLA formal de backend

### Negative Consequences

- RPO de 24h ainda permite perda de até um dia de dados em cenário de desastre total do banco — aceito conscientemente, não é RPO zero
- RTO de 24h implica que o app pode ficar indisponível por até um dia em caso de incidente grave — não é "always on" real
- Exportação lógica semanal adiciona uma tarefa operacional recorrente que precisa de monitoramento (quem avisa se o job falhar? — registrado como risco na Seção 6 do `SDD.md`)

## Pros and Cons of the Options

### Opção B: Backup em camadas ✅ Chosen

- ✅ Meta mensurável e honesta
- ✅ Reduz lock-in de backup (não depende só do Supabase)
- ✅ Resolve o cenário mais citado pelo stakeholder via fila offline
- ❌ RPO/RTO não-zero
- ❌ Operação recorrente extra a monitorar

### Opção A: Só backup nativo da plataforma

- ✅ Mais simples/barato
- ❌ 100% dependente de um único fornecedor para dado e backup
- ❌ RPO real desconhecido até confirmar o plano do legado

### Opção C: Réplica multi-região síncrona

- ✅ RPO/RTO praticamente zero
- ❌ Custo e complexidade totalmente desproporcionais a um usuário único sem orçamento — rejeitada

## Premissa a Validar

Confirmar o plano/tier contratado do projeto Supabase legado (free vs. pro) determina se PITR/backup diário automático realmente está disponível "de fábrica" ou se a exportação lógica independente (item ii) precisa ser a única camada real de backup no curto prazo. Enquanto não confirmado, tratar como se **apenas** as camadas (ii) e (iii) estivessem garantidas.

## Links

- Relacionado: ADR-001 (Supabase legado, tier desconhecido), ADR-003 (PWA/offline queue)
- Revisão pendente: CTO, Gate 2 (`architecture-decision-review` + `risk-and-compliance-check`)
