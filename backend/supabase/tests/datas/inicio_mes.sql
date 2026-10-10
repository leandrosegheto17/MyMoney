begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select is(app.inicio_mes('2026-12-31'::date), '2026-12-01'::date,
  'último dia do ano volta para 01/12');
select is(app.inicio_mes('2028-02-29'::date), '2028-02-01'::date,
  '29/02 de ano bissexto volta para 01/02');
select is(app.inicio_mes('2027-01-01'::date), '2027-01-01'::date,
  'primeiro dia do mês continua igual');

-- Propriedades da função
select volatility_is('app', 'inicio_mes', array['date'], 'immutable',
  'app.inicio_mes é immutable');
select isnt_definer('app', 'inicio_mes', array['date'],
  'app.inicio_mes é security invoker');
select ok(
  (select proconfig from pg_proc where oid = 'app.inicio_mes(date)'::regprocedure)
    @> array['search_path=""'],
  'app.inicio_mes fixa search_path vazio'
);

-- Privilégio
select is(has_function_privilege('anon', 'app.inicio_mes(date)', 'execute'), false,
  'anon não executa app.inicio_mes');
select is(has_function_privilege('authenticated', 'app.inicio_mes(date)', 'execute'), true,
  'authenticated executa app.inicio_mes');

select * from finish();
rollback;
