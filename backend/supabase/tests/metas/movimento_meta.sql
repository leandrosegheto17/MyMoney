begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(16);

insert into app.meta (id, lar_id, dono_id, nome, alvo_centavos, escopo) values
  ('f2000000-0000-4000-8000-000000000001', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Compartilhada de teste', 100000, 'conjunto'),
  ('f2000000-0000-4000-8000-000000000002', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Individual de A', 50000, 'individual');

insert into app.movimento_meta (id, lar_id, meta_id, tipo, valor_centavos, data, local, autor_id) values
  ('f2000000-0000-4000-8000-000000000101', (select id from app.lar), 'f2000000-0000-4000-8000-000000000001', 'aporte', 1000, '2026-10-01', 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101'),
  ('f2000000-0000-4000-8000-000000000102', (select id from app.lar), 'f2000000-0000-4000-8000-000000000002', 'aporte', 2000, '2026-10-01', 'Cofre de A', '00000000-0000-4000-8000-000000000101');

select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'app.movimento_meta'::regclass),
  'RLS habilitada e forçada em app.movimento_meta');

select throws_ok(
  $$insert into app.movimento_meta (lar_id, meta_id, tipo, valor_centavos, data, local, autor_id)
    values ((select id from app.lar), 'f2000000-0000-4000-8000-000000000001', 'aporte', 0, '2026-10-01', 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101')$$,
  '23514', null, 'valor zero é recusado');
select throws_ok(
  $$insert into app.movimento_meta (lar_id, meta_id, tipo, valor_centavos, data, local, autor_id)
    values ((select id from app.lar), 'f2000000-0000-4000-8000-000000000001', 'aporte', -10, '2026-10-01', 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101')$$,
  '23514', null, 'valor negativo é recusado');
select throws_ok(
  $$insert into app.movimento_meta (lar_id, meta_id, tipo, valor_centavos, data, local, autor_id)
    values ((select id from app.lar), 'f2000000-0000-4000-8000-000000000001', 'saque', 100, '2026-10-01', 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101')$$,
  '23514', null, 'tipo inválido é recusado');
select throws_ok(
  $$insert into app.movimento_meta (lar_id, meta_id, tipo, valor_centavos, data, local, autor_id)
    values ((select id from app.lar), 'f2000000-0000-4000-8000-000000000001', 'aporte', 100, '2026-10-01', ' x', '00000000-0000-4000-8000-000000000101')$$,
  '23514', null, 'local com espaço na ponta é recusado');
select throws_ok(
  $$insert into app.movimento_meta (lar_id, meta_id, tipo, valor_centavos, data, local, autor_id)
    values ((select id from app.lar), 'f2000000-0000-4000-8000-000000000001', 'aporte', 100, '2026-10-01', '', '00000000-0000-4000-8000-000000000101')$$,
  '23514', null, 'local vazio é recusado');
select throws_ok(
  $$insert into app.movimento_meta (lar_id, meta_id, tipo, valor_centavos, data, local, autor_id)
    values ((select id from app.lar), 'f2000000-0000-4000-8000-000000000001', 'aporte', 100, '2026-10-01', repeat('a', 61), '00000000-0000-4000-8000-000000000101')$$,
  '23514', null, 'local com mais de 60 caracteres é recusado');
select hasnt_column('app', 'movimento_meta', 'conta_id', 'movimento_meta não guarda conta');

-- Como B
select testes.como_b();

select results_eq(
  $$select count(*)::int from app.movimento_meta where meta_id = 'f2000000-0000-4000-8000-000000000002'$$,
  $$values (0)$$, 'B não vê movimentos da individual de A');
select results_eq(
  $$select count(*)::int from app.movimento_meta where meta_id = 'f2000000-0000-4000-8000-000000000001'$$,
  $$values (1)$$, 'B vê os movimentos da compartilhada');
select throws_ok(
  $$insert into app.movimento_meta (meta_id, tipo, valor_centavos, data, local)
    values ('f2000000-0000-4000-8000-000000000002', 'aporte', 100, '2026-10-02', 'Cofre de B')$$,
  '42501', null, 'B não movimenta a individual de A');
select throws_ok(
  $$insert into app.movimento_meta (meta_id, tipo, valor_centavos, data, local, autor_id)
    values ('f2000000-0000-4000-8000-000000000001', 'aporte', 100, '2026-10-02', 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101')$$,
  '42501', null, 'B não grava movimento com autor A');
select lives_ok(
  $$insert into app.movimento_meta (meta_id, tipo, valor_centavos, data, local)
    values ('f2000000-0000-4000-8000-000000000001', 'aporte', 100, '2026-10-02', 'CDB Banco Inter')$$,
  'B movimenta a compartilhada como autor');

-- Como A
select testes.como_a();

select throws_ok(
  $$update app.movimento_meta set valor_centavos = 5 where id = 'f2000000-0000-4000-8000-000000000101'$$,
  '42501', null, 'movimento é imutável: update proibido');
select throws_ok(
  $$delete from app.movimento_meta where id = 'f2000000-0000-4000-8000-000000000101'$$,
  '42501', null, 'movimento é imutável: delete proibido');

select testes.como_postgres();

select is((select valor_centavos from app.movimento_meta where id = 'f2000000-0000-4000-8000-000000000101'),
  1000::bigint, 'o movimento de A continua intacto');

select * from finish();
rollback;
