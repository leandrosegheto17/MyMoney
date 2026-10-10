begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Dia maior que o mês: cai no último dia
select is(app.dia_no_mes('2026-02-01'::date, 31), '2026-02-28'::date,
  '31 em fevereiro de 2026 vira 28');
select is(app.dia_no_mes('2028-02-01'::date, 31), '2028-02-29'::date,
  '31 em fevereiro de 2028 (bissexto) vira 29');
select is(app.dia_no_mes('2100-02-01'::date, 29), '2100-02-28'::date,
  '29 em fevereiro de 2100 (não bissexto) vira 28');
select is(app.dia_no_mes('2026-04-01'::date, 31), '2026-04-30'::date,
  '31 em abril vira 30');

-- Dia que existe no mês
select is(app.dia_no_mes('2026-12-15'::date, 10), '2026-12-10'::date,
  'qualquer data do mês serve como referência');
select is(app.dia_no_mes('2027-01-01'::date, 31), '2027-01-31'::date,
  '31 em janeiro depois da virada de ano');
select is(app.dia_no_mes('2026-03-20'::date, 1), '2026-03-01'::date,
  'dia 1 devolve o primeiro dia do mês');
select is(app.dia_no_mes('2026-12-31'::date, 31), '2026-12-31'::date,
  'referência no último dia do ano não pula para o mês seguinte');

-- Dia inválido
select throws_ok($$ select app.dia_no_mes('2026-02-01'::date, 0) $$,
  null, 'valor_invalido', 'dia 0 é recusado');
select throws_ok($$ select app.dia_no_mes('2026-02-01'::date, 32) $$,
  null, 'valor_invalido', 'dia 32 é recusado');
select throws_ok($$ select app.dia_no_mes('2026-02-01'::date, null) $$,
  null, 'valor_invalido', 'dia nulo é recusado');

-- Propriedades da função
select volatility_is('app', 'dia_no_mes', array['date', 'integer'], 'immutable',
  'app.dia_no_mes é immutable');
select isnt_definer('app', 'dia_no_mes', array['date', 'integer'],
  'app.dia_no_mes é security invoker');
select ok(
  (select proconfig from pg_proc where oid = 'app.dia_no_mes(date, integer)'::regprocedure)
    @> array['search_path=""'],
  'app.dia_no_mes fixa search_path vazio'
);

-- Privilégio
select is(has_function_privilege('anon', 'app.dia_no_mes(date, integer)', 'execute'), false,
  'anon não executa app.dia_no_mes');
select is(has_function_privilege('authenticated', 'app.dia_no_mes(date, integer)', 'execute'), true,
  'authenticated executa app.dia_no_mes');

select * from finish();
rollback;
