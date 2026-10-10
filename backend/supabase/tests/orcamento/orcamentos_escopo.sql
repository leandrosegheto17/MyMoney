-- app.orcamentos_escopo(mes, escopo): orçamentos do escopo no mês, com filtro explícito de dono na individual.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(7);

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('00000000-0000-4000-8000-00000000f301', (select id from app.lar), 'despesa', 'conjunto',   null,                                   'Esc conjunta T', true),
  ('00000000-0000-4000-8000-00000000f302', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000101', 'Esc indiv T',    true),
  ('00000000-0000-4000-8000-00000000f303', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000102', 'Esc indiv T',    true);

insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos) values
  ((select id from app.lar), '2030-04-01', '00000000-0000-4000-8000-00000000f301', 'conjunto',   null,                                   1000),
  ((select id from app.lar), '2030-05-01', '00000000-0000-4000-8000-00000000f301', 'conjunto',   null,                                   2000),
  ((select id from app.lar), '2030-05-01', '00000000-0000-4000-8000-00000000f302', 'individual', '00000000-0000-4000-8000-000000000101', 3000),
  ((select id from app.lar), '2030-05-01', '00000000-0000-4000-8000-00000000f303', 'individual', '00000000-0000-4000-8000-000000000102', 4000);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select categoria_id, valor_centavos from app.orcamentos_escopo('2030-05-20', 'conjunto') $$,
  $$ values ('00000000-0000-4000-8000-00000000f301'::uuid, 2000::bigint) $$,
  'conjunto: só o mês pedido, com a data normalizada');
select results_eq(
  $$ select categoria_id from app.orcamentos_escopo('2030-05-01', 'individual') $$,
  $$ values ('00000000-0000-4000-8000-00000000f302'::uuid) $$,
  'individual de A: só as de A');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select categoria_id from app.orcamentos_escopo('2030-05-01', 'individual') $$,
  $$ values ('00000000-0000-4000-8000-00000000f303'::uuid) $$,
  'individual de B: só as de B');
reset role;

-- Sem RLS (superusuário com o JWT de B): o filtro de dono da própria função ainda vale
select results_eq(
  $$ select categoria_id from app.orcamentos_escopo('2030-05-01', 'individual') $$,
  $$ values ('00000000-0000-4000-8000-00000000f303'::uuid) $$,
  'filtro explícito de dono além da RLS');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select is_empty($$ select 1 from app.orcamentos_escopo('2030-05-01', 'individual') $$, 'sem membro: nenhuma individual');

select ok(not (select prosecdef from pg_proc where oid = 'app.orcamentos_escopo(date, text)'::regprocedure), 'security invoker');
select is((select provolatile from pg_proc where oid = 'app.orcamentos_escopo(date, text)'::regprocedure), 's'::"char", 'função é stable');

select * from finish();
rollback;
