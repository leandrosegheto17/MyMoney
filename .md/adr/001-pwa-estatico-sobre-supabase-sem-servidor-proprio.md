# ADR-001: O MyMoney é um PWA estático que fala direto com o Supabase, sem servidor de aplicação próprio

- **Status:** Aceito em 2026-10-09 (Loop B aprovado pelo stakeholder; antes: Proposto, Loop B, rodada 2)
- **Data:** 2026-10-09
- **Decisores:** Coordenador; aprovação do stakeholder no fechamento do Loop B

## Contexto

- São 2 usuários, um MVP de hobby de 2 a 2,5 meses (RNF-11) e uma meta de custo de R$ 0 a R$ 40 por ano (RNF-08).
- O stakeholder já definiu a stack: Supabase (Postgres, Auth e RLS), Vercel e GitHub (PLANO-COMERCIAL R7).
- A privacidade entre os membros tem que valer **no servidor e nos dados**, e a chamada direta à API não pode
  expor nada (RNF-04, RN-10).
- O lançamento tem que ser rápido (RNF-01, RNF-03) e não pode se perder sem rede (RNF-02).
- Cada servidor a mais é uma peça a manter, proteger e manter acordada no plano gratuito.

## Decisão

São 3 peças, sem servidor de aplicação no meio:

1. **Frontend:** SPA React compilada para arquivos estáticos e servida pela Vercel como PWA instalável.
2. **Backend:** Supabase. O Postgres guarda os dados e também as regras de negócio (ADR-003). O isolamento
   fica no RLS (ADR-002). O Auth cuida do login (ADR-008). O PostgREST serve a API, expondo só o schema `api`.
3. **Operação, fora do caminho do usuário:** um Cloudflare Worker agendado que mantém o banco acordado
   (ADR-009). O backup ficou fora do MVP por decisão do stakeholder (ADR-010, adiado). O servidor próprio
   não faz parte da arquitetura do MVP.

O navegador chama o PostgREST com o JWT do membro. Toda decisão de acesso acontece no Postgres.

## Consequências

**Positivas**
- Não existe runtime de servidor para manter, nem chave `service_role` em uso pela aplicação.
- O RLS vale para qualquer caminho de acesso: tela, `curl` com o token ou a biblioteca do Supabase. É o que o
  RNF-04 pede.
- Hospedagem estática na Vercel: deploy atômico, rollback instantâneo e custo zero.

**Negativas**
- As regras de negócio ficam em SQL/plpgsql. É uma linguagem menos familiar e com ferramentas de teste mais
  pobres que TypeScript. Mitigação: pgTAP e schemas declarativos, um arquivo por função (ADR-003).
- Lock-in moderado no Supabase (Auth, PostgREST, convenções de RLS com `auth.uid()`). O dado é Postgres
  comum e sai com `pg_dump`. Uma migração para Postgres no servidor próprio seria trabalhosa, mas viável. Sem
  rotina de backup (ADR-010), o dump teria que ser feito na hora.
- Se o Supabase estiver fora do ar, o app fica sem dados. Só o lançamento de despesa continua funcionando,
  pela fila local (ADR-007).

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que não |
|---|---|---|---|
| Next.js full-stack na Vercel (API routes com `service_role`) | Regras em TypeScript | A privacidade passa a depender do código das rotas, porque a `service_role` ignora o RLS. Mais uma camada para manter. Funções serverless têm cold start e logs na Vercel, com risco ao RNF-06 | Enfraquece o RNF-04 e aumenta a superfície |
| Backend Node/Fastify no servidor próprio + Postgres local | Controle total, sem pausa | Disponibilidade depende da casa (energia, internet). Exige HTTPS, atualização e exposição de porta. Contraria a restrição de stack R7 | Mais operação para um hobby. Fica como plano de saída se o Supabase deixar de ser gratuito |
| Supabase Edge Functions (Deno) para as regras | Regras em TypeScript, mais perto do banco | Terceiro runtime. As funções usariam `service_role` ou repassariam o JWT, e o isolamento continuaria dependendo do RLS | Ganho pequeno para o custo de mais um runtime |
