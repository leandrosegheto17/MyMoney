begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(16);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A'),
  ('e1000000-0000-4000-8000-000000000211', (select id from app.lar), testes.membro_b(), 'Conta de B');
insert into app.movimento_conta (id, lar_id, dono_id, conta_id, tipo, sentido, valor_centavos, data)
values ('e1000000-0000-4000-8000-000000000701', (select id from app.lar), testes.membro_a(),
        'e1000000-0000-4000-8000-000000000201', 'ajuste', 'entrada', 5000, '2026-10-01');

-- Estrutura
select ok((select relrowsecurity from pg_class where oid = 'app.movimento_conta'::regclass), 'RLS habilitada em app.movimento_conta');
select ok((select relforcerowsecurity from pg_class where oid = 'app.movimento_conta'::regclass), 'RLS forçada em app.movimento_conta');
select col_type_is('app', 'movimento_conta', 'valor_centavos', 'bigint', 'valor em centavos bigint');
select col_type_is('app', 'movimento_conta', 'data', 'date', 'data do movimento é date');

-- Restrições, como A
select testes.como_a();

select throws_ok(
  $$insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000201', 'ajuste', 'entrada', 0, '2026-10-02')$$,
  '23514', null, 'valor zero é recusado');
select throws_ok(
  $$insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000201', 'ajuste', 'saida', -100, '2026-10-02')$$,
  '23514', null, 'valor negativo é recusado');
select throws_ok(
  $$insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000201', 'transferencia', 'entrada', 100, '2026-10-02')$$,
  '23514', null, 'tipo fora da lista é recusado');
select throws_ok(
  $$insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000201', 'ajuste', 'credito', 100, '2026-10-02')$$,
  '23514', null, 'sentido fora da lista é recusado');
select lives_ok(
  $$insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000201', 'ajuste', 'saida', 100, '2026-10-02')$$,
  'A registra ajuste na própria conta');

-- Isolamento, como B
select testes.como_b();

select throws_ok(
  $$insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000201', 'ajuste', 'entrada', 100, '2026-10-02')$$,
  '23503', null, 'B não registra movimento na conta de A (FK composto)');
select throws_ok(
  $$insert into app.movimento_conta (dono_id, conta_id, tipo, sentido, valor_centavos, data)
    values (testes.membro_a(), 'e1000000-0000-4000-8000-000000000201', 'ajuste', 'entrada', 100, '2026-10-02')$$,
  '42501', null, 'B não registra movimento em nome de A');
select is_empty(
  $$select 1 from app.movimento_conta where dono_id = testes.membro_a()$$,
  'B não lê movimentos de A');
select results_eq(
  $$with u as (update app.movimento_conta set valor_centavos = 1
               where id = 'e1000000-0000-4000-8000-000000000701' returning 1)
    select count(*)::int from u$$,
  $$values (0)$$, 'update de B no movimento de A não atinge linha');
select results_eq(
  $$with d as (delete from app.movimento_conta where id = 'e1000000-0000-4000-8000-000000000701' returning 1)
    select count(*)::int from d$$,
  $$values (0)$$, 'delete de B no movimento de A não atinge linha');

select testes.como_postgres();

select results_eq(
  $$select valor_centavos from app.movimento_conta where id = 'e1000000-0000-4000-8000-000000000701'$$,
  $$values (5000::bigint)$$, 'o movimento de A continua intacto');
select results_eq(
  $$select count(*)::int from app.movimento_conta where dono_id = testes.membro_a()$$,
  $$values (2)$$, 'A continua com os 2 movimentos');

select * from finish();
rollback;
