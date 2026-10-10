begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- RLS ligada e forçada
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'app.lar'::regclass),
  'app.lar tem RLS enable e force'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'app.membro'::regclass),
  'app.membro tem RLS enable e force'
);

-- user_id único e ligado ao Auth
select col_is_unique('app', 'membro', array['user_id'], 'app.membro.user_id é único');
select col_not_null('app', 'membro', 'user_id', 'app.membro.user_id é obrigatório');
select fk_ok('app', 'membro', 'user_id', 'auth', 'users', 'id');
select fk_ok('app', 'membro', 'lar_id', 'app', 'lar', 'id');

-- Auxiliares de RLS conforme o ADR-012
select ok(
  (select prosecdef from pg_proc where oid = 'app.membro_atual()'::regprocedure),
  'app.membro_atual é security definer'
);
select ok(
  (select prosecdef from pg_proc where oid = 'app.lar_atual()'::regprocedure),
  'app.lar_atual é security definer'
);
select is(
  (select provolatile::text from pg_proc where oid = 'app.membro_atual()'::regprocedure),
  's', 'app.membro_atual é stable'
);
select is(
  (select provolatile::text from pg_proc where oid = 'app.lar_atual()'::regprocedure),
  's', 'app.lar_atual é stable'
);
select is(
  (select l.lanname::text from pg_proc p join pg_language l on l.oid = p.prolang
   where p.oid = 'app.membro_atual()'::regprocedure),
  'sql', 'app.membro_atual é language sql'
);
select is(
  (select l.lanname::text from pg_proc p join pg_language l on l.oid = p.prolang
   where p.oid = 'app.lar_atual()'::regprocedure),
  'sql', 'app.lar_atual é language sql'
);
select is(
  (select count(*)::int from pg_proc
   where pronamespace = 'app'::regnamespace and proname in ('membro_atual', 'lar_atual') and pronargs = 0),
  2, 'as duas auxiliares existem sem parâmetros'
);
select is(
  (select count(*)::int from pg_proc
   where pronamespace = 'app'::regnamespace and proname in ('membro_atual', 'lar_atual') and pronargs > 0),
  0, 'nenhuma sobrecarga das auxiliares com parâmetro'
);
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc where oid = 'app.membro_atual()'::regprocedure),
  'app.membro_atual fixa search_path vazio'
);
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc where oid = 'app.lar_atual()'::regprocedure),
  'app.lar_atual fixa search_path vazio'
);
select function_returns('app', 'membro_atual', array[]::text[], 'uuid');
select function_returns('app', 'lar_atual', array[]::text[], 'uuid');

-- execute só para authenticated
select ok(
  has_function_privilege('authenticated', 'app.membro_atual()', 'execute')
  and has_function_privilege('authenticated', 'app.lar_atual()', 'execute'),
  'authenticated executa as auxiliares'
);
select ok(
  not has_function_privilege('anon', 'app.membro_atual()', 'execute'),
  'anon não executa app.membro_atual'
);
select ok(
  not has_function_privilege('anon', 'app.lar_atual()', 'execute'),
  'anon não executa app.lar_atual'
);
select is_empty(
  $$ select p.oid::regprocedure::text
     from pg_proc p,
          aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
     where p.oid in ('app.membro_atual()'::regprocedure, 'app.lar_atual()'::regprocedure)
       and a.grantee = 0 and a.privilege_type = 'EXECUTE' $$,
  'public não tem execute nas auxiliares'
);

-- Sem escrita para authenticated
select ok(
  not (has_table_privilege('authenticated', 'app.lar', 'insert')
    or has_table_privilege('authenticated', 'app.lar', 'update')
    or has_table_privilege('authenticated', 'app.lar', 'delete')),
  'authenticated não escreve em app.lar'
);
select ok(
  not (has_table_privilege('authenticated', 'app.membro', 'insert')
    or has_table_privilege('authenticated', 'app.membro', 'update')
    or has_table_privilege('authenticated', 'app.membro', 'delete')),
  'authenticated não escreve em app.membro'
);

select * from finish();
rollback;
