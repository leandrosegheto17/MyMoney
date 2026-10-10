-- Regras de segurança do banco lidas do catálogo: cada consulta lista os infratores,
-- para valer sem mudança para os objetos que ainda vão nascer.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Sanidade: o teste não passa vazio
select isnt_empty(
  $$ select c.oid from pg_class c
     where c.relnamespace = 'app'::regnamespace and c.relkind in ('r', 'p') $$,
  'há tabelas no schema app'
);

-- G-01: toda tabela de app com RLS enable + force
select is_empty(
  $$ select c.oid::regclass::text
     from pg_class c
     where c.relnamespace = 'app'::regnamespace
       and c.relkind in ('r', 'p')
       and not (c.relrowsecurity and c.relforcerowsecurity)
     order by 1 $$,
  'toda tabela de app tem RLS enable e force'
);

-- G-01: nenhuma política permissiva genérica
select is_empty(
  $$ select schemaname || '.' || tablename || ' / ' || policyname
     from pg_policies
     where schemaname = 'app'
       and (lower(regexp_replace(coalesce(qual, ''), '[\s()]', '', 'g')) = 'true'
         or lower(regexp_replace(coalesce(with_check, ''), '[\s()]', '', 'g')) = 'true')
     order by 1 $$,
  'nenhuma política de app com using (true) ou with check (true)'
);

-- G-03: toda view de api com security_invoker
select is_empty(
  $$ select c.oid::regclass::text
     from pg_class c
     where c.relnamespace = 'api'::regnamespace
       and c.relkind in ('v', 'm')
       and not coalesce(c.reloptions && array['security_invoker=true', 'security_invoker=on'], false)
     order by 1 $$,
  'toda view de api tem security_invoker = true'
);

-- G-03: security definer só na lista fechada (SDD §7, ADR-003, ADR-012)
select is_empty(
  $$ select p.oid::regprocedure::text
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('app', 'api')
       and p.prosecdef
       and not (
         -- app.*: por assinatura (um overload com argumentos não passa)
         p.oid::regprocedure::text in ('app.membro_atual()', 'app.lar_atual()')
         -- api.editar_lancamento (ADR-003 §3): por assinatura
         or p.oid::regprocedure::text =
            'api.editar_lancamento(uuid,bigint,uuid,text,date,uuid,integer,boolean)'
       )
     order by 1 $$,
  'nenhuma função security definer fora da lista fechada'
);

select set_eq(
  $$ select p.oid::regprocedure::text
     from pg_proc p
     where p.prosecdef
       and p.oid in ('app.membro_atual()'::regprocedure, 'app.lar_atual()'::regprocedure) $$,
  array['app.membro_atual()', 'app.lar_atual()'],
  'as auxiliares de RLS existem e são security definer'
);

-- G-02: anon executa só api.ping
select is_empty(
  $$ select p.oid::regprocedure::text
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('app', 'api', 'public')
       and has_function_privilege('anon', p.oid, 'execute')
       and p.oid <> 'api.ping()'::regprocedure
     order by 1 $$,
  'anon não executa nenhuma função além de api.ping'
);

select ok(
  has_function_privilege('anon', 'api.ping()', 'execute'),
  'anon executa api.ping'
);

-- G-10: dinheiro em centavos inteiros
select is_empty(
  $$ select table_name || '.' || column_name || ' ' || data_type
     from information_schema.columns
     where table_schema = 'app'
       and data_type in ('real', 'double precision', 'numeric')
     order by 1 $$,
  'nenhuma coluna real, double precision ou numeric em app'
);

select is_empty(
  $$ select table_name || '.' || column_name || ' ' || data_type
     from information_schema.columns
     where table_schema = 'app'
       and column_name like '%\_centavos'
       and data_type <> 'bigint'
     order by 1 $$,
  'toda coluna *_centavos de app é bigint'
);

select * from finish();
rollback;
