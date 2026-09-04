-- Rollback manual de 20260904160000_be_ref_05_payment_methods_backfill.sql
-- ATENÇÃO (G-02, GUARDRAILS.md): este rollback executa DELETE sobre
-- payment_methods, dado REAL — só aplicar com ciência explícita do risco e
-- revisão do CTO, nunca automaticamente.
--
-- Limitação estrutural, documentada para transparência: payment_methods não
-- tem coluna própria de "origem" (nem esta migration, nem BE-REF-03, alteram o
-- schema para adicionar uma) — não há como distinguir, com certeza absoluta,
-- uma linha inserida por ESTE backfill de uma linha inserida pelo trigger de
-- BE-REF-03 (accounts_seed_default_payment_methods) para uma conta 2ª/3ª...
-- criada depois desta migration. O critério abaixo (is_system_default=true,
-- tipo padrão, conta não é a mais antiga do usuário, sem transaction
-- vinculada) reverte AMBOS os efeitos indistintamente — se BE-REF-03 também
-- precisar ser revertida, aplique o down pair dela ANTES deste. Nunca remove
-- uma linha já referenciada por alguma transactions.payment_method_id
-- (ficaria órfã/quebraria a FK).
--
-- Assimetria intencional (fix-loop, achado 5-1): a migration UP deixou de
-- excluir a conta mais antiga do usuário do backfill (agora cobre todas as
-- contas ativas, gated só por NOT EXISTS por type). Este DOWN, propositalmente,
-- CONTINUA excluindo a conta mais antiga do escopo do DELETE — erra a favor da
-- segurança: a conta mais antiga quase certamente tem suas 4 formas seedadas
-- pelo trigger original de BE-M-02 (não por este backfill), e nenhum caso real
-- de conta mais antiga sem as 4 existe hoje (ver nota da migration UP) — não
-- vale o risco de um DELETE acidentalmente remover seed legítimo de BE-M-02
-- num rollback futuro só para cobrir um cenário hipotético sem instância real.

delete from public.payment_methods pm
where pm.is_system_default = true
  and pm.type in ('pix', 'debit_card', 'boleto', 'cash')
  and pm.account_id is distinct from (
    select a2.id from public.accounts a2
    where a2.user_id = pm.user_id and a2.is_active = true
    order by a2.created_at asc
    limit 1
  )
  and not exists (
    select 1 from public.transactions t where t.payment_method_id = pm.id
  );
