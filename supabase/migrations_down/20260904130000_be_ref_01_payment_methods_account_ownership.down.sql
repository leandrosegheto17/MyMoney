-- Rollback manual de 20260904130000_be_ref_01_payment_methods_account_ownership.sql
-- ATENÇÃO: reintroduz o gap do BLOCKERS.md Bloqueio 013 (IDOR em
-- payment_methods.account_id) — só aplicar com ciência explícita do risco (G-02).

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
  );
