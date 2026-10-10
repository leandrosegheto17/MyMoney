begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(7);

-- Conta Nubank de A (…0201, seed 02-contas) e a conta de B do mesmo seed.
insert into app.meta (id, lar_id, dono_id, nome, alvo_centavos, escopo) values
  ('f3000000-0000-4000-8000-000000000001', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Compartilhada de teste', 100000, 'conjunto');

insert into app.movimento_meta (id, lar_id, meta_id, tipo, valor_centavos, data, local, autor_id) values
  ('f3000000-0000-4000-8000-000000000101', (select id from app.lar), 'f3000000-0000-4000-8000-000000000001', 'aporte', 1000, '2026-10-01', 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101'),
  ('f3000000-0000-4000-8000-000000000102', (select id from app.lar), 'f3000000-0000-4000-8000-000000000001', 'aporte', 500, '2026-10-01', 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101');

select has_column('app', 'movimento_conta', 'movimento_meta_id', 'movimento_conta ganha movimento_meta_id');

select throws_ok(
  $$insert into app.movimento_conta (lar_id, dono_id, conta_id, tipo, sentido, valor_centavos, data)
    values ((select id from app.lar), '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'aporte', 'saida', 1000, '2026-10-01')$$,
  '23514', null, 'aporte sem movimento_meta_id é recusado');
select throws_ok(
  $$insert into app.movimento_conta (lar_id, dono_id, conta_id, tipo, sentido, valor_centavos, data, movimento_meta_id)
    values ((select id from app.lar), '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'ajuste', 'entrada', 1000, '2026-10-01', 'f3000000-0000-4000-8000-000000000101')$$,
  '23514', null, 'ajuste com movimento_meta_id é recusado');
select throws_ok(
  $$insert into app.movimento_conta (lar_id, dono_id, conta_id, tipo, sentido, valor_centavos, data, movimento_meta_id)
    values ((select id from app.lar), '00000000-0000-4000-8000-000000000102',
            (select id from app.conta where dono_id = '00000000-0000-4000-8000-000000000102' order by criado_em limit 1),
            'aporte', 'saida', 500, '2026-10-01', 'f3000000-0000-4000-8000-000000000102')$$,
  '23503', null, 'conta de B não pode ser ligada a movimento de meta de A');

insert into app.movimento_conta (lar_id, dono_id, conta_id, tipo, sentido, valor_centavos, data, movimento_meta_id)
values ((select id from app.lar), '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'aporte', 'saida', 1000, '2026-10-01', 'f3000000-0000-4000-8000-000000000101');

select throws_ok(
  $$insert into app.movimento_conta (lar_id, dono_id, conta_id, tipo, sentido, valor_centavos, data, movimento_meta_id)
    values ((select id from app.lar), '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000202', 'aporte', 'saida', 1000, '2026-10-01', 'f3000000-0000-4000-8000-000000000101')$$,
  '23505', null, 'um movimento de meta liga no máximo uma linha de conta');

-- Como B
select testes.como_b();

select results_eq(
  $$select count(*)::int from app.movimento_conta where movimento_meta_id = 'f3000000-0000-4000-8000-000000000101'$$,
  $$values (0)$$, 'B não lê o movimento de conta do aporte de A na compartilhada');

-- Como A
select testes.como_a();

select results_eq(
  $$select count(*)::int from app.movimento_conta where movimento_meta_id = 'f3000000-0000-4000-8000-000000000101'$$,
  $$values (1)$$, 'A lê o movimento de conta do próprio aporte');

select testes.como_postgres();

select * from finish();
rollback;
