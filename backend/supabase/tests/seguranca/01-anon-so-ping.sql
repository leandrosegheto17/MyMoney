begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

-- Recorte nos schemas do projeto e no public: pg_catalog, extensions, auth e graphql
-- pertencem ao Postgres/Supabase e não são alcançáveis pela API exposta.
create temporary view funcoes_do_anon as
  select p.oid::regprocedure::text as funcao
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('app', 'api', 'public')
    and has_function_privilege('anon', p.oid, 'execute');

select results_eq(
  $$ select funcao from funcoes_do_anon order by 1 $$,
  $$ values ('api.ping()'::text) $$,
  'anon executa exatamente api.ping'
);

-- Função nova em api continua fora do alcance do anon (privilégio padrão)
set local role postgres;
create function api.f_teste() returns integer language sql as $$ select 1 $$;
reset role;

select results_eq(
  $$ select funcao from funcoes_do_anon order by 1 $$,
  $$ values ('api.ping()'::text) $$,
  'função nova em api não entra na lista do anon'
);

select * from finish();
rollback;
