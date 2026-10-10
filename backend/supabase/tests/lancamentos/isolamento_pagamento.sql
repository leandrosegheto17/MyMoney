begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(9);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A'),
  ('e1000000-0000-4000-8000-000000000211', (select id from app.lar), testes.membro_b(), 'Conta de B');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id) values
  ('e1000000-0000-4000-8000-000000000301', (select id from app.lar), testes.membro_a(), 'Pix de A', 'pix', 'e1000000-0000-4000-8000-000000000201'),
  ('e1000000-0000-4000-8000-000000000311', (select id from app.lar), testes.membro_b(), 'Pix de B', 'pix', 'e1000000-0000-4000-8000-000000000211');
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Casa', true);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
        'e1000000-0000-4000-8000-000000000401', 30000, 1);
-- Segundo lançamento de A, ainda sem parte privada (o 23505 do primeiro vem da PK)
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
values ('e1000000-0000-4000-8000-000000000502', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
        'e1000000-0000-4000-8000-000000000401', 10000, 1);
insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id, conta_id, data_operacao)
values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(),
        'e1000000-0000-4000-8000-000000000301', 'e1000000-0000-4000-8000-000000000201', '2026-10-05');
insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
values ('e1000000-0000-4000-8000-000000000601', 'e1000000-0000-4000-8000-000000000501', (select id from app.lar),
        'conjunto', testes.membro_a(), 1, 30000, '2026-10-05');

-- Como A: o pagador vê a parte privada
select testes.como_a();

select isnt_empty(
  $$select 1 from app.lancamento_pagamento where lancamento_id = 'e1000000-0000-4000-8000-000000000501'$$,
  'A vê a parte privada do próprio lançamento');

-- Como B
select testes.como_b();

select isnt_empty(
  $$select 1 from app.lancamento where id = 'e1000000-0000-4000-8000-000000000501'$$,
  'B vê o lançamento conjunto de A');
select isnt_empty(
  $$select 1 from app.parcela where lancamento_id = 'e1000000-0000-4000-8000-000000000501'$$,
  'B vê as parcelas da conjunta de A');
select is_empty(
  $$select 1 from app.lancamento_pagamento where lancamento_id = 'e1000000-0000-4000-8000-000000000501'$$,
  'B não vê a parte privada da conjunta de A');
select results_eq(
  $$select count(*)::int from app.lancamento_pagamento$$,
  $$values (0)$$, 'B não vê nenhuma linha de lancamento_pagamento de A');
select throws_ok(
  $$insert into app.lancamento_pagamento (lancamento_id, forma_pagamento_id, conta_id, data_operacao)
    values ('e1000000-0000-4000-8000-000000000502', 'e1000000-0000-4000-8000-000000000311',
            'e1000000-0000-4000-8000-000000000211', '2026-10-05')$$,
  '23503', null, 'B não cria parte privada no lançamento de A (FK composto)');
select throws_ok(
  $$insert into app.lancamento_pagamento (lancamento_id, dono_id, data_operacao)
    values ('e1000000-0000-4000-8000-000000000501', testes.membro_a(), '2026-10-05')$$,
  '42501', null, 'B não cria parte privada em nome de A');
select results_eq(
  $$with u as (update app.lancamento_pagamento set data_operacao = '2026-01-01'
               where lancamento_id = 'e1000000-0000-4000-8000-000000000501' returning 1)
    select count(*)::int from u$$,
  $$values (0)$$, 'B não altera a parte privada de A');

select testes.como_postgres();

select results_eq(
  $$select dono_id, forma_pagamento_id, conta_id, data_operacao from app.lancamento_pagamento
    where lancamento_id = 'e1000000-0000-4000-8000-000000000501'$$,
  $$values (testes.membro_a(), 'e1000000-0000-4000-8000-000000000301'::uuid,
            'e1000000-0000-4000-8000-000000000201'::uuid, '2026-10-05'::date)$$,
  'a parte privada de A continua intacta e única');

select * from finish();
rollback;
