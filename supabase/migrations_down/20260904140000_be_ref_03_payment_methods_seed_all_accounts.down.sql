-- Rollback manual de 20260904140000_be_ref_03_payment_methods_seed_all_accounts.sql
-- Restaura accounts_seed_default_payment_methods() ao comportamento pré-BE-REF-03
-- (só semeia na 1ª conta ativa do usuário).

create or replace function public.accounts_seed_default_payment_methods()
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
