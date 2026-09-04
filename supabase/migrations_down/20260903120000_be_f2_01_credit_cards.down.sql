-- Rollback manual de 20260903120000_be_f2_01_credit_cards.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: reverte o vínculo de "crédito" como forma de pagamento (RF-F2-01 AC1) e a
-- correção de ownership de credit_card_id em payment_methods (mesma classe de risco
-- de BE-M-13/Bloqueio 010 — reintroduz o gap se credit_card_id voltar a ser usado sem
-- esta migration). Só aplicar com ciência explícita do risco (mesmo padrão dos demais
-- rollbacks deste projeto, G-02).

drop trigger if exists credit_cards_after_insert_seed_payment_method on public.credit_cards;
drop function if exists public.credit_cards_seed_payment_method();

-- Restaura payment_methods_insert_own/_update_own ao estado pré-BE-F2-01 (sem
-- checagem de ownership de credit_card_id).

drop policy if exists payment_methods_insert_own on public.payment_methods;
create policy payment_methods_insert_own on public.payment_methods
  for insert to authenticated
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

drop policy if exists payment_methods_update_own on public.payment_methods;
create policy payment_methods_update_own on public.payment_methods
  for update to authenticated
  using (auth.uid() = user_id and is_system_default = false and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (auth.uid() = user_id and is_system_default = false and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

alter table public.payment_methods
  drop constraint if exists payment_methods_credit_card_id_fkey;

drop table if exists public.credit_cards;
