begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(10);

select ok(
  (select reloptions && array['security_invoker=true', 'security_invoker=on'] from pg_class where oid = 'api.metas'::regclass),
  'api.metas tem security_invoker');
select table_privs_are('api', 'metas', 'authenticated', array['SELECT'],
  'authenticated só lê api.metas');
select table_privs_are('api', 'metas', 'anon', array[]::text[],
  'anon não tem privilégio em api.metas');
select columns_are('api', 'metas', array[
  'id', 'nome', 'escopo', 'alvo_centavos', 'guardado_centavos', 'falta_centavos', 'percentual',
  'prazo', 'mensal_necessario_centavos', 'atingida', 'por_local'],
  'colunas de api.metas = meta-detalhe.json (sem lar, dono nem atingida_em)');

-- Como A
select testes.como_a();

select is((select prazo from api.metas where id = '00000000-0000-4000-8000-000000000902'),
  '2027-07', 'prazo no formato AAAA-MM');
select is((select prazo from api.metas where id = '00000000-0000-4000-8000-000000000901'),
  null, 'meta sem prazo devolve prazo nulo');
select is((select count(*)::int from api.metas where prazo is not null and prazo !~ '^\d{4}-\d{2}$'),
  0, 'todo prazo preenchido tem o formato AAAA-MM');
select results_eq(
  $$select guardado_centavos, falta_centavos, percentual, atingida
      from api.metas where id = '00000000-0000-4000-8000-000000000902'$$,
  $$values (620000::bigint, 580000::bigint, 52, false)$$,
  'valores vêm de app.progresso_meta');

-- Como B
select testes.como_b();

select is((select count(*)::int from api.metas
            where id in ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000905')),
  0, 'B não vê as individuais de A');
select throws_ok(
  $$update api.metas set nome = 'x' where id = '00000000-0000-4000-8000-000000000902'$$,
  '42501', null, 'a view não aceita escrita');

select testes.como_postgres();

select * from finish();
rollback;
