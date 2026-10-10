begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(19);

-- Membros do seed 01-acesso: A = Leandro, B = Ana.
insert into app.meta (id, lar_id, dono_id, nome, alvo_centavos, prazo, escopo) values
  ('f1000000-0000-4000-8000-000000000001', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Compartilhada de teste', 100000, '2027-01-01', 'conjunto'),
  ('f1000000-0000-4000-8000-000000000002', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Individual de A', 50000, null, 'individual');

select ok((select relrowsecurity from pg_class where oid = 'app.meta'::regclass), 'RLS habilitada em app.meta');
select ok((select relforcerowsecurity from pg_class where oid = 'app.meta'::regclass), 'RLS forçada em app.meta');
select col_type_is('app', 'meta', 'alvo_centavos', 'bigint', 'alvo em centavos inteiros');
select col_type_is('app', 'meta', 'atingida_em', 'date', 'atingida_em é data');

select throws_ok(
  $$insert into app.meta (lar_id, dono_id, nome, alvo_centavos, escopo)
    values ((select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Meta', 0, 'conjunto')$$,
  '23514', null, 'alvo zero é recusado');
select throws_ok(
  $$insert into app.meta (lar_id, dono_id, nome, alvo_centavos, escopo)
    values ((select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Meta', -100, 'conjunto')$$,
  '23514', null, 'alvo negativo é recusado');
select throws_ok(
  $$insert into app.meta (lar_id, dono_id, nome, alvo_centavos, prazo, escopo)
    values ((select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Meta', 1000, '2027-07-15', 'conjunto')$$,
  '23514', null, 'prazo fora do primeiro dia do mês é recusado');
select throws_ok(
  $$insert into app.meta (lar_id, dono_id, nome, alvo_centavos, escopo)
    values ((select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Meta', 1000, 'casal')$$,
  '23514', null, 'escopo fora da lista é recusado');
select throws_ok(
  $$insert into app.meta (lar_id, dono_id, nome, alvo_centavos, escopo)
    values ((select id from app.lar), '00000000-0000-4000-8000-000000000101', '', 1000, 'conjunto')$$,
  '23514', null, 'nome vazio é recusado');
select throws_ok(
  $$insert into app.meta (lar_id, dono_id, nome, alvo_centavos, escopo)
    values ((select id from app.lar), '00000000-0000-4000-8000-000000000101', '   ', 1000, 'conjunto')$$,
  '23514', null, 'nome só com espaços é recusado');

-- Como A
select testes.como_a();

select results_eq(
  $$select count(*)::int from app.meta where id in ('f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002')$$,
  $$values (2)$$, 'A vê a compartilhada e a própria individual');

-- Como B
select testes.como_b();

select results_eq(
  $$select count(*)::int from app.meta where id = 'f1000000-0000-4000-8000-000000000001'$$,
  $$values (1)$$, 'B vê a compartilhada criada por A');
select results_eq(
  $$select count(*)::int from app.meta where id = 'f1000000-0000-4000-8000-000000000002'$$,
  $$values (0)$$, 'B não vê a individual de A');
select lives_ok(
  $$update app.meta set nome = 'Alterada por B' where id = 'f1000000-0000-4000-8000-000000000002'$$,
  'update de B na individual de A não falha, mas não atinge linha');
select lives_ok(
  $$update app.meta set nome = 'Editada por B' where id = 'f1000000-0000-4000-8000-000000000001'$$,
  'B altera a compartilhada criada por A');
select throws_ok(
  $$insert into app.meta (dono_id, nome, alvo_centavos, escopo)
    values ('00000000-0000-4000-8000-000000000101', 'Forjada', 1000, 'individual')$$,
  '42501', null, 'B não cria individual em nome de A');
select throws_ok(
  $$delete from app.meta where id = 'f1000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'excluir meta é proibido');

select testes.como_postgres();

select is((select nome from app.meta where id = 'f1000000-0000-4000-8000-000000000002'),
  'Individual de A', 'a individual de A continua intacta');
select is((select nome from app.meta where id = 'f1000000-0000-4000-8000-000000000001'),
  'Editada por B', 'a edição de B na compartilhada foi gravada');

select * from finish();
rollback;
