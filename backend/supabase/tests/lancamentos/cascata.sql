begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(6);

select testes.preparar_lar();

insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e1000000-0000-4000-8000-000000000303', (select id from app.lar), testes.membro_a(), 'Crédito de A', 'credito', null, 10);
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Casa', true),
  ('e1000000-0000-4000-8000-000000000411', (select id from app.lar), 'despesa', 'individual', testes.membro_a(), 'Lazer de A', true);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
   'e1000000-0000-4000-8000-000000000401', 30000, 3),
  ('e1000000-0000-4000-8000-000000000502', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
   'e1000000-0000-4000-8000-000000000401', 20000, 2);
insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id, data_operacao, dia_vencimento_aplicado)
values ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(),
        'e1000000-0000-4000-8000-000000000303', '2026-10-05', 10);
insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data) values
  ('e1000000-0000-4000-8000-000000000601', 'e1000000-0000-4000-8000-000000000501', (select id from app.lar), 'conjunto', testes.membro_a(), 1, 10000, '2026-11-10'),
  ('e1000000-0000-4000-8000-000000000602', 'e1000000-0000-4000-8000-000000000501', (select id from app.lar), 'conjunto', testes.membro_a(), 2, 10000, '2026-12-10'),
  ('e1000000-0000-4000-8000-000000000603', 'e1000000-0000-4000-8000-000000000501', (select id from app.lar), 'conjunto', testes.membro_a(), 3, 10000, '2027-01-10'),
  ('e1000000-0000-4000-8000-000000000611', 'e1000000-0000-4000-8000-000000000502', (select id from app.lar), 'conjunto', testes.membro_a(), 1, 10000, '2026-10-05'),
  ('e1000000-0000-4000-8000-000000000612', 'e1000000-0000-4000-8000-000000000502', (select id from app.lar), 'conjunto', testes.membro_a(), 2, 10000, '2026-11-05');

-- B exclui a conjunta de A: a cascata leva parcelas e a parte privada que B não vê
select testes.como_b();

select results_eq(
  $$with d as (delete from app.lancamento where id = 'e1000000-0000-4000-8000-000000000501' returning 1)
    select count(*)::int from d$$,
  $$values (1)$$, 'B exclui a conjunta de A');

select testes.como_postgres();

select is_empty(
  $$select 1 from app.lancamento where id = 'e1000000-0000-4000-8000-000000000501'$$,
  'o lançamento excluído sumiu');
select is_empty(
  $$select 1 from app.parcela where lancamento_id = 'e1000000-0000-4000-8000-000000000501'$$,
  'as parcelas da conjunta excluída sumiram');
select is_empty(
  $$select 1 from app.lancamento_pagamento where lancamento_id = 'e1000000-0000-4000-8000-000000000501'$$,
  'a parte privada de A sumiu junto, mesmo invisível para B');
select results_eq(
  $$select count(*)::int from app.parcela where lancamento_id = 'e1000000-0000-4000-8000-000000000502'$$,
  $$values (2)$$, 'as parcelas do outro lançamento ficam');

-- Troca de escopo no lançamento propaga às parcelas
update app.lancamento
   set escopo = 'individual', categoria_id = 'e1000000-0000-4000-8000-000000000411'
 where id = 'e1000000-0000-4000-8000-000000000502';

select results_eq(
  $$select distinct escopo from app.parcela where lancamento_id = 'e1000000-0000-4000-8000-000000000502'$$,
  $$values ('individual'::text)$$, 'a troca de escopo do lançamento chega às parcelas');

select * from finish();
rollback;
