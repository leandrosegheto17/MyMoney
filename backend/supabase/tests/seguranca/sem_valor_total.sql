begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

-- Totais somam parcelas, nunca o valor total do lançamento.
select is(
  (select array_agg(p.oid::regprocedure::text order by 1)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where ((n.nspname = 'app' and (p.proname like 'totais\_%' or p.proname = 'parcelas_mes'))
           or (n.nspname = 'api' and p.proname = 'resumo_mes'))
      and pg_get_functiondef(p.oid) ~ 'valor_total_centavos'),
  null::text[],
  'nenhuma função de totais, parcelas_mes ou resumo_mes lê valor_total_centavos');
select ok(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'app' and (p.proname like 'totais\_%' or p.proname = 'parcelas_mes'))
       or (n.nspname = 'api' and p.proname = 'resumo_mes')) >= 4,
  'as funções conferidas existem');

select * from finish();
rollback;
