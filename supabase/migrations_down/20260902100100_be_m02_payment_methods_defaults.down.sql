-- Rollback manual de 20260902100100_be_m02_payment_methods_defaults.sql

drop trigger if exists accounts_after_insert_seed_default_payment_methods on public.accounts;
drop function if exists public.accounts_seed_default_payment_methods();

drop policy if exists payment_methods_delete_own on public.payment_methods;
create policy payment_methods_delete_own on public.payment_methods
  for delete to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

drop policy if exists payment_methods_update_own on public.payment_methods;
create policy payment_methods_update_own on public.payment_methods
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

alter table public.payment_methods drop column if exists is_system_default;
