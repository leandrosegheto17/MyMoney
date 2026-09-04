-- BE-REF-01 — Corrige BLOCKERS.md Bloqueio 013 (IDOR em payment_methods.account_id):
-- payment_methods_insert_own/_update_own já validam ownership de credit_card_id
-- (BE-F2-01), mas nunca validaram ownership de account_id — um usuário autenticado
-- podia criar/editar uma payment_methods própria (user_id continua sendo o dele)
-- apontando account_id para uma conta de OUTRO usuário. Mesma classe de achado do
-- Bloqueio 010/SEC-DEBT-002/GUARDRAILS.md G-19, já corrigida em BE-M-13 para
-- budget/transactions mas não replicada aqui na época (BE-M-02/BE-F2-01 tocaram
-- esta policy depois de BE-M-13 já ter fechado o padrão, sem replicar a mesma
-- correção — divergência de convenção dentro do próprio lote "Contas & Formas de
-- Pagamento", não achado isolado — ver BLOCKERS.md Bloqueio 013).
--
-- Correção: acrescenta `account_id is null or exists (select 1 from public.accounts
-- a where a.id = account_id and a.user_id = auth.uid())` às duas policies, mesmo
-- padrão condicional já usado nelas para credit_card_id (account_id é nullable —
-- obrigatório só quando type <> 'credit_card', CHECK
-- payment_methods_account_or_card_check).
--
-- ADR-016 Decisão 5 / DIR-39: esta correção é pré-condição de EXPOSIÇÃO em produção
-- do formulário unificado (item 4, feature flag payment_method_unification_enabled,
-- BE-REF-06) — não de código, já que o trigger de resolução de account_id
-- (BE-REF-04) já tem checagem própria de ownership, independente desta. Aplicar
-- esta migration antes/junto de BE-REF-03/04/05 é seguro e recomendado (Seção 4.4
-- do TASK.md), sem esperar BE-REF-06.
--
-- 100% aditivo em termos de dado (DROP+CREATE de policy, nenhum INSERT/UPDATE/DELETE
-- de linha real) — mesmo precedente de BE-M-02/BE-M-13/BE-F2-01 (DIR-38).
-- Rollback: supabase/migrations_down/20260904130000_be_ref_01_payment_methods_account_ownership.down.sql

drop policy if exists payment_methods_insert_own on public.payment_methods;
create policy payment_methods_insert_own on public.payment_methods
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and (credit_card_id is null or exists (
      select 1 from public.credit_cards cc
      where cc.id = credit_card_id and cc.user_id = auth.uid()
    ))
    and (account_id is null or exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = auth.uid()
    ))
  );

drop policy if exists payment_methods_update_own on public.payment_methods;
create policy payment_methods_update_own on public.payment_methods
  for update to authenticated
  using (auth.uid() = user_id and is_system_default = false and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (
    auth.uid() = user_id
    and is_system_default = false
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and (credit_card_id is null or exists (
      select 1 from public.credit_cards cc
      where cc.id = credit_card_id and cc.user_id = auth.uid()
    ))
    and (account_id is null or exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = auth.uid()
    ))
  );

comment on policy payment_methods_insert_own on public.payment_methods is
  'BE-REF-01/BLOCKERS.md Bloqueio 013 — valida ownership de account_id (além de '
  'credit_card_id, já validado por BE-F2-01), mesmo padrão de BE-M-13/G-19.';

comment on policy payment_methods_update_own on public.payment_methods is
  'BE-REF-01/BLOCKERS.md Bloqueio 013 — valida ownership de account_id (além de '
  'credit_card_id, já validado por BE-F2-01), mesmo padrão de BE-M-13/G-19.';
