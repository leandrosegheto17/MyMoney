-- BE-REF-03 — Estende accounts_seed_default_payment_methods() (BE-M-02) para
-- semear as 4 formas de pagamento não-cartão (Pix, Débito, Boleto, Dinheiro) em
-- TODA conta ativa nova (2ª em diante), não só a 1ª — ADR-016 Decisão 2, RN-15.
--
-- Comportamento anterior (BE-M-02): o corpo da função só inseria as 4 linhas
-- quando NENHUMA linha is_system_default=true já existia para o usuário — ou
-- seja, só disparava efetivamente na 1ª conta ativa. A partir desta migration,
-- a mesma função insere as 4 linhas incondicionalmente a cada disparo do
-- trigger (accounts_after_insert_seed_default_payment_methods, AFTER INSERT ON
-- accounts FOR EACH ROW WHEN (new.is_active = true), inalterado — já dispara 1x
-- por conta nova por construção, então remover o guard "not exists" é suficiente
-- para satisfazer RN-15 sem tocar no trigger em si). "Crédito" continua fora do
-- seed automático (RF-F2-01, inalterado).
--
-- CREATE OR REPLACE FUNCTION (mesmo nome, mesma assinatura) — 100% aditivo em
-- termos de dado: nenhuma linha de payment_methods já existente é lida, alterada
-- ou apagada; só o comportamento de INSERTs futuros muda (DIR-38, ADR-016
-- Decisão 4 — G-02 não se aplica).
-- Rollback: supabase/migrations_down/20260904140000_be_ref_03_payment_methods_seed_all_accounts.down.sql

create or replace function public.accounts_seed_default_payment_methods()
returns trigger
language plpgsql
as $$
begin
  insert into public.payment_methods (user_id, account_id, type, name, is_system_default)
  values
    (new.user_id, new.id, 'pix',        'Pix',      true),
    (new.user_id, new.id, 'debit_card', 'Débito',   true),
    (new.user_id, new.id, 'boleto',     'Boleto',   true),
    (new.user_id, new.id, 'cash',       'Dinheiro', true);
  return new;
end;
$$;

comment on function public.accounts_seed_default_payment_methods() is
  'RF-MVP-02 AC1 / RN-15 / ADR-016 Decisão 2 (BE-REF-03) — semeia as 4 formas de '
  'pagamento padrão (não-cartão) em TODA conta ativa nova do usuário (1ª, 2ª, '
  '3ª...), vinculadas a essa conta específica, is_system_default = true. '
  '"Crédito" fica fora (ver BE-F2-01). Antes de BE-REF-03, só disparava na 1ª '
  'conta (guard "not exists" removido — trigger já garante 1 disparo por conta '
  'nova por construção).';
