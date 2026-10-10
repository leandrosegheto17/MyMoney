begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

-- Função nova em api continua fora do alcance do anon (privilégio padrão).
-- A lista completa do que anon executa é verificada em catalogo.sql.
set local role postgres;
create function api.f_teste() returns integer language sql as $$ select 1 $$;
reset role;

select ok(
  not has_function_privilege('anon', 'api.f_teste()', 'execute'),
  'função nova em api nasce sem execute para anon'
);

select * from finish();
rollback;
