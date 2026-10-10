begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Privilégios de schema
select schema_privs_are('app', 'anon', array[]::text[], 'anon não tem privilégio no schema app');
select schema_privs_are('app', 'authenticated', array['USAGE'], 'authenticated tem só usage no schema app');
select schema_privs_are('api', 'authenticated', array['USAGE'], 'authenticated tem só usage no schema api');
select ok(
  not exists (
    select 1
    from pg_namespace n,
         aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a
    where n.nspname = 'app'
      and a.grantee = 0
      and a.privilege_type = 'USAGE'
  ),
  'public não tem usage no schema app'
);

-- Privilégios padrão: funções novas criadas pelo papel das migrations
set local role postgres;
create function api.f_teste() returns integer language sql as $$ select 1 $$;
create function app.f_teste() returns integer language sql as $$ select 1 $$;
reset role;

select is(has_function_privilege('anon', 'api.f_teste()', 'execute'), false,
  'função nova em api nasce sem execute para anon');
select is(has_function_privilege('anon', 'app.f_teste()', 'execute'), false,
  'função nova em app nasce sem execute para anon');

-- proacl nulo equivale ao padrão do Postgres (execute para PUBLIC), por isso o coalesce
select ok(
  not exists (
    select 1
    from pg_proc p,
         aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid = 'api.f_teste()'::regprocedure
      and a.grantee = 0
      and a.privilege_type = 'EXECUTE'
  ),
  'função nova em api nasce sem execute para public'
);
select ok(
  not exists (
    select 1
    from pg_proc p,
         aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid = 'app.f_teste()'::regprocedure
      and a.grantee = 0
      and a.privilege_type = 'EXECUTE'
  ),
  'função nova em app nasce sem execute para public'
);

select is(has_function_privilege('authenticated', 'api.f_teste()', 'execute'), true,
  'função nova em api nasce com execute para authenticated');
select is(has_function_privilege('authenticated', 'app.f_teste()', 'execute'), true,
  'função nova em app nasce com execute para authenticated');

select * from finish();
rollback;
