begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(7);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A'),
  ('e1000000-0000-4000-8000-000000000211', (select id from app.lar), testes.membro_b(), 'Conta de B');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e1000000-0000-4000-8000-000000000303', (select id from app.lar), testes.membro_a(), 'Crédito de A', 'credito', null, 10),
  ('e1000000-0000-4000-8000-000000000313', (select id from app.lar), testes.membro_b(), 'Crédito de B', 'credito', null, 5);

select has_column('app', 'movimento_conta', 'forma_credito_id', 'movimento_conta tem forma_credito_id');
select col_is_null('app', 'movimento_conta', 'forma_credito_id', 'forma_credito_id é opcional');

select testes.como_a();

select throws_ok(
  $$insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000201', 'pagamento_cartao', 'saida', 1000, '2026-10-10')$$,
  '23514', null, 'pagamento de cartão sem forma de crédito é recusado');
select throws_ok(
  $$insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data, forma_credito_id)
    values ('e1000000-0000-4000-8000-000000000201', 'pagamento_cartao', 'saida', 1000, '2026-10-10',
            'e1000000-0000-4000-8000-000000000313')$$,
  '23503', null, 'pagamento de cartão com forma de crédito de outro dono é recusado');
select throws_ok(
  $$insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data, forma_credito_id)
    values ('e1000000-0000-4000-8000-000000000201', 'ajuste', 'saida', 1000, '2026-10-10',
            'e1000000-0000-4000-8000-000000000303')$$,
  '23514', null, 'ajuste com forma de crédito é recusado');
select lives_ok(
  $$insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data, forma_credito_id)
    values ('e1000000-0000-4000-8000-000000000201', 'pagamento_cartao', 'saida', 1000, '2026-10-10',
            'e1000000-0000-4000-8000-000000000303')$$,
  'pagamento de cartão com a própria forma de crédito é aceito');
select lives_ok(
  $$insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data)
    values ('e1000000-0000-4000-8000-000000000201', 'ajuste', 'entrada', 1000, '2026-10-10')$$,
  'ajuste sem forma continua aceito');

select testes.como_postgres();

select * from finish();
rollback;
