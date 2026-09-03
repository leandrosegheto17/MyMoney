-- BE-M-02 — Formas de pagamento padrão (RF-MVP-02), achado de auditoria
-- (AUDITORIA-BE-M-00.md Seção 3): `payment_methods` não tinha coluna "padrão"
-- (ao contrário de `categories.is_system_default`) e a check constraint
-- `payment_methods_account_or_card_check` exige `account_id` para todo tipo
-- diferente de `credit_card` — logo o seed só pode acontecer depois que a
-- primeira conta do usuário existir (não no cadastro/`handle_new_user()`).
-- "Crédito" fica de fora do seed do MVP (só existe a partir de `BE-F2-01`,
-- quando um `CreditCard` real é cadastrado — RF-F2-01 AC1) — ver racional
-- completo na auditoria.
--
-- 100% aditiva: ADD COLUMN com DEFAULT, DROP+CREATE de policy (0 linhas reais
-- em payment_methods hoje — AUDITORIA-BE-M-00.md Seção 1), CREATE FUNCTION/TRIGGER.
-- Rollback: supabase/migrations_down/20260902100100_be_m02_payment_methods_defaults.down.sql

alter table public.payment_methods
  add column is_system_default boolean not null default false;

comment on column public.payment_methods.is_system_default is
  'RF-MVP-02 AC1/AC3 — true para as formas pré-cadastradas (Pix/Débito/Boleto/'
  'Dinheiro), não editáveis nem excluíveis pelo usuário.';

-- Reforça RF-MVP-02 AC1 ("formas padrão não podem ser editadas/excluídas") no
-- nível de RLS, mesmo padrão já usado em categories_update_own/categories_delete_own.
drop policy if exists payment_methods_update_own on public.payment_methods;
create policy payment_methods_update_own on public.payment_methods
  for update to authenticated
  using (auth.uid() = user_id and is_system_default = false and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (auth.uid() = user_id and is_system_default = false and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

drop policy if exists payment_methods_delete_own on public.payment_methods;
create policy payment_methods_delete_own on public.payment_methods
  for delete to authenticated
  using (auth.uid() = user_id and is_system_default = false and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

-- Seed idempotente: dispara na primeira conta ativa de cada usuário (a única
-- forma de satisfazer o check constraint que exige account_id). Não interfere
-- em contas subsequentes.
create function public.accounts_seed_default_payment_methods()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.payment_methods
    where user_id = new.user_id and is_system_default = true
  ) then
    insert into public.payment_methods (user_id, account_id, type, name, is_system_default)
    values
      (new.user_id, new.id, 'pix',        'Pix',      true),
      (new.user_id, new.id, 'debit_card', 'Débito',   true),
      (new.user_id, new.id, 'boleto',     'Boleto',   true),
      (new.user_id, new.id, 'cash',       'Dinheiro', true);
  end if;
  return new;
end;
$$;

comment on function public.accounts_seed_default_payment_methods() is
  'RF-MVP-02 AC1 — semeia as 4 formas de pagamento padrão (não-cartão) na '
  'primeira conta ativa de cada usuário. "Crédito" fica fora (ver BE-F2-01).';

create trigger accounts_after_insert_seed_default_payment_methods
  after insert on public.accounts
  for each row
  when (new.is_active = true)
  execute function public.accounts_seed_default_payment_methods();
