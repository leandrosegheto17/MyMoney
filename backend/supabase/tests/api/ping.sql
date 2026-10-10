begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select is(api.ping(), 1, 'api.ping devolve 1');
select function_returns('api', 'ping', array[]::name[], 'integer', 'api.ping retorna integer');
select isnt_definer('api', 'ping', array[]::name[], 'api.ping é security invoker');
select ok(
  (select proconfig from pg_proc where oid = 'api.ping()'::regprocedure)
    @> array['search_path=""'],
  'api.ping fixa search_path vazio'
);
select volatility_is('api', 'ping', array[]::name[], 'stable', 'api.ping é stable');

select function_privs_are('api', 'ping', array[]::name[], 'anon', array['EXECUTE'],
  'anon só tem execute em api.ping');
select function_privs_are('api', 'ping', array[]::name[], 'authenticated', array['EXECUTE'],
  'authenticated só tem execute em api.ping');
select schema_privs_are('api', 'anon', array['USAGE'], 'anon tem só usage no schema api');

select * from finish();
rollback;
