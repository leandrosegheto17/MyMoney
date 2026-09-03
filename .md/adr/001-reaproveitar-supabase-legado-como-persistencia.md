# ADR-001: Reaproveitar o Supabase do projeto legado como camada de persistência, em vez de provisionar banco novo

- **Data**: 2026-09-02
- **Status**: Accepted (decisão do Software Architect — revisão pendente no Gate 2 do CTO: `architecture-decision-review` + `risk-and-compliance-check`, dado o vendor lock-in e o reaproveitamento de infraestrutura compartilhada)
- **Deciders**: software-architect
- **Tags**: architecture, database, vendor, compliance, migration

## Context and Problem Statement

O `PRD-TECNICO.md` não menciona banco de dados específico — a decisão de persistência cabia inteiramente ao Software Architect. Durante esta rodada, o stakeholder impôs uma restrição técnica adicional, fora do `PRD.md`/`PRD-TECNICO.md`: o projeto deve reaproveitar um projeto Supabase legado já existente (`https://supabase.com/dashboard/project/xrcxbzrglndetrrhavhc`) em vez de provisionar um banco novo do zero. O schema atual desse projeto não foi inspecionado nesta rodada (sem acesso direto disponível) — a decisão precisa acomodar essa incerteza sem inventar detalhes do schema real. Contexto herdado: projeto pessoal sem orçamento/prazo formal, usuário único, prioridade para stack de baixo/nenhum custo (`CTO-REVIEW.md` Gate 1).

## Decision Drivers

- Restrição explícita do stakeholder (reaproveitar o Supabase legado)
- Dados já existentes no projeto legado não podem ser perdidos no processo
- Ausência de orçamento formal — evitar o custo de um segundo projeto de banco gerenciado
- Usuário único, baixo volume (RNF-09) — não justifica arquitetura distribuída
- Necessidade de auditabilidade e criptografia em repouso/trânsito (RNF-02, RNF-03)

## Considered Options

- Opção A: Provisionar um novo projeto Supabase dedicado a este produto (greenfield)
- Opção B: Reaproveitar o projeto Supabase legado, isolando as tabelas deste produto em um schema Postgres dedicado (`mymoney`), com migrations incrementais e aditivas por padrão
- Opção C: Reaproveitar o projeto legado usando o schema `public` compartilhado com as tabelas já existentes

## Decision Outcome

Opção B escolhida: reaproveitar o Supabase legado, isolando **todas** as tabelas novas deste produto em um schema Postgres dedicado (`mymoney`), com controle de acesso via RLS própria, e estratégia de migração incremental — nunca greenfield, nunca reescrita do schema legado. Toda migration é **aditiva por padrão** (`CREATE`, nunca `ALTER`/`DROP` em tabela pré-existente fora do escopo deste produto) até que o schema real seja inspecionado e uma migration específica seja avaliada caso a caso. Nenhum dado existente é tocado por este `SDD.md` — a arquitetura evita, por design, qualquer necessidade de alterar tabela legada para este produto funcionar.

Isso resolve a restrição do stakeholder sem violar a exigência de não perder dados (isolamento por schema reduz drasticamente a superfície de risco de colisão/corrupção) e evita o custo de um segundo projeto Supabase.

### Positive Consequences

- Custo zero adicional de provisionamento de banco
- Isolamento por schema reduz risco de colisão de nomes/constraints com tabelas legadas
- Migrations aditivas tornam o processo reversível e auditável (down migration por arquivo)
- Não é necessário operar um segundo ambiente de banco

### Negative Consequences

- Vendor lock-in em Supabase se aprofunda, agora compartilhado com outro projeto — reverter exigiria migrar dois produtos, não um
- Risco desconhecido: o schema real do legado não foi inspecionado nesta rodada; podem existir extensões, triggers ou roles globais que colidam com o schema novo mesmo isolado por namespace (ex.: trigger global em `auth.users`, quota de storage compartilhada entre os dois produtos)
- Plano/tier do projeto legado (free vs. pago) não é conhecido; recursos como Point-in-Time Recovery podem não estar disponíveis, afetando diretamente a estratégia de backup (ver ADR-004)
- Falha ou throttling do projeto legado, causado pelo outro produto que o compartilha, pode impactar a disponibilidade deste produto — acoplamento de disponibilidade entre dois produtos não relacionados

## Pros and Cons of the Options

### Opção B: Reaproveitar com schema dedicado ✅ Chosen

- ✅ Atende a restrição explícita do stakeholder
- ✅ Custo zero adicional
- ✅ Isolamento por schema reduz risco de colisão
- ❌ Aprofunda vendor lock-in compartilhado com outro produto
- ❌ Risco de schema real desconhecido (mitigado pela premissa de inspeção obrigatória abaixo)

### Opção A: Novo projeto Supabase greenfield

- ✅ Isolamento total, zero risco de colisão com dado legado
- ✅ Nunca lida com schema desconhecido
- ❌ Contradiz restrição explícita do stakeholder
- ❌ Possível custo adicional (segundo projeto pode exceder free tier combinado)

### Opção C: Reaproveitar usando schema `public` compartilhado

- ✅ Caminho de configuração mais simples
- ❌ Risco alto de colisão de nomes de tabela/coluna com o legado
- ❌ Dificulta RLS/least-privilege por produto
- ❌ Rejeitada por risco desnecessário quando isolamento por schema custa pouco a mais

## Premissa a Validar (obrigatória antes da implementação)

O schema real do projeto Supabase legado (tabelas, roles, triggers, extensões, tier/plano contratado) precisa ser inspecionado pelo Tech Lead/Backend Developer **antes** de qualquer migration ser escrita. Este `SDD.md` não assume nenhum detalhe desse schema — é tratado como incerteza explícita, não como fato. Recomenda-se que a primeira tarefa em `TASK.md` seja um "spike de inspeção de schema" com esse único objetivo, incluindo confirmação do plano/tier contratado (ver ADR-004).

## Links

- Relacionado: ADR-002 (monólito modular sobre BaaS), ADR-004 (backup/RPO/RTO)
- Revisão pendente: CTO, Gate 2 (`architecture-decision-review` + `risk-and-compliance-check`)
