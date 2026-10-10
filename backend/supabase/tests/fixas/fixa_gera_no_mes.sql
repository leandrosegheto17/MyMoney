-- app.fixa_gera_no_mes(inicio, encerrada_em, mes): bordas do início e do encerramento.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(18);

select ok(not (select prosecdef from pg_proc where oid = 'app.fixa_gera_no_mes(date,date,date)'::regprocedure),
  'fixa_gera_no_mes é security invoker');
select is((select provolatile::text from pg_proc where oid = 'app.fixa_gera_no_mes(date,date,date)'::regprocedure),
  'i', 'fixa_gera_no_mes é immutable');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'app.fixa_gera_no_mes(date,date,date)'::regprocedure),
  'fixa_gera_no_mes com search_path vazio');
select ok(not has_function_privilege('anon', 'app.fixa_gera_no_mes(date,date,date)', 'execute'),
  'anon não executa fixa_gera_no_mes');

-- Sem encerramento
select is(app.fixa_gera_no_mes('2026-10-01', null, '2026-09-01'), false, 'mês anterior ao início não gera');
select is(app.fixa_gera_no_mes('2026-10-01', null, '2026-10-01'), true,  'mês do início gera');
select is(app.fixa_gera_no_mes('2026-10-01', null, '2026-10-17'), true,  'dia no meio do mês do início gera');
select is(app.fixa_gera_no_mes('2026-10-01', null, '2026-11-01'), true,  'mês seguinte ao início gera');
select is(app.fixa_gera_no_mes('2026-10-01', null, '2030-01-01'), true,  'encerrada_em nulo gera indefinidamente');

-- Com encerramento
select is(app.fixa_gera_no_mes('2026-01-01', '2026-10-20', '2026-09-01'), true,  'mês anterior ao encerramento gera');
select is(app.fixa_gera_no_mes('2026-01-01', '2026-10-20', '2026-10-01'), true,  'mês do encerramento gera');
select is(app.fixa_gera_no_mes('2026-01-01', '2026-10-01', '2026-10-01'), true,  'encerrada no dia 1 ainda gera o mês');
select is(app.fixa_gera_no_mes('2026-01-01', '2026-10-31', '2026-10-15'), true,  'encerrada no último dia gera o mês');
select is(app.fixa_gera_no_mes('2026-01-01', '2026-10-20', '2026-11-01'), false, 'mês seguinte ao encerramento não gera');
select is(app.fixa_gera_no_mes('2026-01-01', '2026-10-20', '2027-01-01'), false, 'meses depois do encerramento não geram');
select is(app.fixa_gera_no_mes('2026-10-01', '2026-10-05', '2026-10-01'), true,  'início e encerramento no mesmo mês: gera o mês');
select is(app.fixa_gera_no_mes('2026-10-01', '2026-10-05', '2026-11-01'), false, 'início e encerramento no mesmo mês: não gera o seguinte');
select is(app.fixa_gera_no_mes('2026-12-01', '2027-02-10', '2026-11-01'), false, 'encerrada, mas antes do início não gera');

select * from finish();
rollback;
