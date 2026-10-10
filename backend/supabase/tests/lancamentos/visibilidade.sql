begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(10);

select testes.preparar_lar();

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Casa', true),
  ('e1000000-0000-4000-8000-000000000411', (select id from app.lar), 'despesa', 'individual', testes.membro_a(), 'Lazer de A', true);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao, valor_total_centavos, num_parcelas) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
   'e1000000-0000-4000-8000-000000000401', 'Conjunta de A', 30000, 1),
  ('e1000000-0000-4000-8000-000000000502', (select id from app.lar), testes.membro_a(), 'despesa', 'individual',
   'e1000000-0000-4000-8000-000000000411', 'Individual de A', 20000, 2);
insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data) values
  ('e1000000-0000-4000-8000-000000000601', 'e1000000-0000-4000-8000-000000000501', (select id from app.lar), 'conjunto', testes.membro_a(), 1, 30000, '2026-10-05'),
  ('e1000000-0000-4000-8000-000000000611', 'e1000000-0000-4000-8000-000000000502', (select id from app.lar), 'individual', testes.membro_a(), 1, 10000, '2026-10-05'),
  ('e1000000-0000-4000-8000-000000000612', 'e1000000-0000-4000-8000-000000000502', (select id from app.lar), 'individual', testes.membro_a(), 2, 10000, '2026-11-05');

-- Como A
select testes.como_a();

select results_eq(
  $$select count(*)::int from app.lancamento$$,
  $$values (2)$$, 'A vê a conjunta e a própria individual');
select results_eq(
  $$select count(*)::int from app.parcela$$,
  $$values (3)$$, 'A vê todas as parcelas dele');

-- Como B
select testes.como_b();

select is_empty(
  $$select 1 from app.lancamento where id = 'e1000000-0000-4000-8000-000000000502'$$,
  'B não vê o lançamento individual de A');
select is_empty(
  $$select 1 from app.parcela where lancamento_id = 'e1000000-0000-4000-8000-000000000502'$$,
  'B não vê as parcelas da individual de A');
select results_eq(
  $$select count(*)::int from app.parcela$$,
  $$values (1)$$, 'B vê só a parcela da conjunta');
select results_eq(
  $$with u as (update app.lancamento set descricao = 'Alterada por B'
               where id = 'e1000000-0000-4000-8000-000000000501' returning 1)
    select count(*)::int from u$$,
  $$values (0)$$, 'B não altera diretamente a conjunta de A');
select results_eq(
  $$with u as (update app.lancamento set descricao = 'Alterada por B'
               where id = 'e1000000-0000-4000-8000-000000000502' returning 1)
    select count(*)::int from u$$,
  $$values (0)$$, 'B não altera a individual de A');
select results_eq(
  $$with d as (delete from app.lancamento where id = 'e1000000-0000-4000-8000-000000000502' returning 1)
    select count(*)::int from d$$,
  $$values (0)$$, 'B não exclui a individual de A');
select throws_ok(
  $$insert into app.lancamento (dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
    values (testes.membro_a(), 'despesa', 'conjunto', 'e1000000-0000-4000-8000-000000000401', 1000, 1)$$,
  '42501', null, 'B não cria lançamento em nome de A');

select testes.como_postgres();

select results_eq(
  $$select id, descricao from app.lancamento order by id$$,
  $$values ('e1000000-0000-4000-8000-000000000501'::uuid, 'Conjunta de A'::text),
           ('e1000000-0000-4000-8000-000000000502'::uuid, 'Individual de A'::text)$$,
  'os lançamentos de A continuam intactos');

select * from finish();
rollback;
