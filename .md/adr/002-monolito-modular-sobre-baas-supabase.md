# ADR-002: Adotar monólito modular sobre BaaS (Supabase) em vez de backend customizado ou microsserviços

- **Data**: 2026-09-02
- **Status**: Accepted (decisão do Software Architect — revisão pendente no Gate 2 do CTO: `architecture-decision-review`)
- **Deciders**: software-architect
- **Tags**: architecture, backend, scalability

## Context and Problem Statement

O `PRD-TECNICO.md` define funcionalidades amplas faseadas (MVP/Fase 2/Fase 3), mas o volume real é de usuário único e baixo (RNF-09; faixa de referência não-oficial de 60–120 lançamentos/mês). O `CTO-REVIEW.md` Gate 1 já orientou "evitar arquitetura distribuída desnecessária para carga de usuário único". A ADR-001 já decidiu reaproveitar o Supabase legado como banco. Falta decidir que padrão arquitetural geral construir em cima dessa persistência para implementar regras de negócio não triviais (RN-01 a RN-11: fechamento de fatura, recorrência, parcelamento, etc.) sem virar CRUD simplista nem microsserviço desnecessário.

## Decision Drivers

- Usuário único, sem orçamento formal, equipe de uma pessoa
- Necessidade de baixo custo operacional e baixa complexidade de manutenção solo
- Lógica de negócio não trivial que exige alguma execução server-side além de CRUD
- Alinhamento com ADR-001 (Supabase já escolhido como persistência)

## Considered Options

- Opção A: Backend customizado dedicado (ex.: Node/NestJS), hospedado separadamente, usando o Postgres do Supabase só como banco
- Opção B: Monólito modular "sem servidor de aplicação próprio" — cliente fala com Postgres via PostgREST/Supabase client (protegido por RLS), lógica de negócio complexa isolada em Supabase Edge Functions + `pg_cron`, organizada internamente em bounded contexts
- Opção C: Arquitetura de microsserviços, um serviço por bounded context

## Decision Outcome

Opção B escolhida. Elimina a necessidade de operar/hospedar um servidor de aplicação dedicado, reduzindo custo e carga operacional de manutenção solo. Aproveita RLS do Postgres para autorização (ver Seção 7 do `SDD.md`) e usa Edge Functions apenas onde é indispensável: regras RN-01/RN-02/RN-06/RN-07, geração de recorrência/parcelas, integrações externas de Fase 3. Organização interna em bounded contexts (Contas, Categorização, Ledger, Orçamento, Cartão/Fatura, Recorrência/Parcelamento, Contas Fixas, Metas, Notificações, Captura Automatizada, Relatórios) é mantida logicamente (nomeação de tabelas/funções/RPCs), não como bancos físicos separados — consistente com `modular-design-principles` sem pagar o custo de microsserviços.

### Positive Consequences

- Menor custo operacional/infraestrutura
- Menos partes móveis para uma única pessoa manter
- RLS nativo evita reescrever autorização em uma camada de aplicação própria
- Edge Functions escalam automaticamente sem servidor dedicado

### Negative Consequences

- Lock-in mais profundo em Supabase (Edge Functions, RLS e Realtime são específicos da plataforma)
- Lógica de negócio fica fragmentada entre client, RLS policies e Edge Functions — exige disciplina de documentação (Tech Lead) para não virar "lógica escondida em trigger"
- Testes de integração precisam simular o ambiente Supabase, ligeiramente mais complexo que testar um backend Node isolado

## Pros and Cons of the Options

### Opção B: Monólito modular sobre BaaS ✅ Chosen

- ✅ Custo mínimo
- ✅ Menos infraestrutura para manter sozinho
- ✅ RLS nativo
- ❌ Lock-in mais profundo
- ❌ Lógica fragmentada exige documentação disciplinada

### Opção A: Backend customizado dedicado

- ✅ Portável entre provedores de banco
- ✅ Lógica de negócio centralizada em um único codebase
- ❌ Custo/operação de um servidor adicional 24/7
- ❌ Redundante com o que o Supabase já oferece

### Opção C: Microsserviços

- ✅ Escalabilidade teórica altíssima
- ❌ Complexidade totalmente desproporcional a usuário único
- ❌ Custo/tempo de operação inviável para projeto pessoal sem equipe — rejeitada sem ressalvas

## Links

- Relacionado: ADR-001 (Supabase legado como persistência)
- Revisão pendente: CTO, Gate 2 (`architecture-decision-review`)
