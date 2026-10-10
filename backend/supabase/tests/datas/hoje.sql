begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Virada de ano: 23h30 de 31/12 em São Paulo já é 01/01 em UTC
select is(app.hoje('2026-12-31 23:30-03'::timestamptz), '2026-12-31'::date,
  '23h30 de 31/12 em São Paulo ainda é 31/12');
select is(app.hoje('2027-01-01 02:59Z'::timestamptz), '2026-12-31'::date,
  '02h59 UTC de 01/01 ainda é 31/12 em São Paulo');
select is(app.hoje('2027-01-01 03:00Z'::timestamptz), '2027-01-01'::date,
  '03h00 UTC de 01/01 já é 01/01 em São Paulo');

-- Sem argumento: não depende do fuso da sessão
set local timezone = 'UTC';
select is(app.hoje(), (now() at time zone 'America/Sao_Paulo')::date,
  'app.hoje() usa São Paulo com a sessão em UTC');
set local timezone = 'Asia/Tokyo';
select is(app.hoje(), (now() at time zone 'America/Sao_Paulo')::date,
  'app.hoje() usa São Paulo com a sessão em Asia/Tokyo');

-- Propriedades da função
select isnt_definer('app', 'hoje', array['timestamp with time zone'],
  'app.hoje é security invoker');
select ok(
  (select proconfig from pg_proc where oid = 'app.hoje(timestamptz)'::regprocedure)
    @> array['search_path=""'],
  'app.hoje fixa search_path vazio'
);

-- Privilégio
select is(has_function_privilege('anon', 'app.hoje(timestamptz)', 'execute'), false,
  'anon não executa app.hoje');
select is(has_function_privilege('authenticated', 'app.hoje(timestamptz)', 'execute'), true,
  'authenticated executa app.hoje');

select * from finish();
rollback;
