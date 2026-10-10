begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(11);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e1000000-0000-4000-8000-000000000301', (select id from app.lar), testes.membro_a(), 'Sem uso', 'pix', 'e1000000-0000-4000-8000-000000000201', null),
  ('e1000000-0000-4000-8000-000000000302', (select id from app.lar), testes.membro_a(), 'Com lançamento', 'debito', 'e1000000-0000-4000-8000-000000000201', null),
  ('e1000000-0000-4000-8000-000000000303', (select id from app.lar), testes.membro_a(), 'Cartão pago', 'credito', null, 10),
  ('e1000000-0000-4000-8000-000000000304', (select id from app.lar), testes.membro_a(), 'Outra sem uso', 'credito', null, 5);
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Casa', true);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto', 'e1000000-0000-4000-8000-000000000401', 3000, 1);
insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id, conta_id, data_operacao) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(),
   'e1000000-0000-4000-8000-000000000302', 'e1000000-0000-4000-8000-000000000201', '2026-10-05');
insert into app.movimento_conta (lar_id, dono_id, conta_id, tipo, sentido, valor_centavos, data, forma_credito_id) values
  ((select id from app.lar), testes.membro_a(), 'e1000000-0000-4000-8000-000000000201', 'pagamento_cartao', 'saida', 12000, '2026-10-10',
   'e1000000-0000-4000-8000-000000000303');

select is((select prosecdef from pg_proc where oid = 'api.excluir_forma(uuid)'::regprocedure), false, 'é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.excluir_forma(uuid)'::regprocedure), 'search_path vazio');
select is(has_function_privilege('anon', 'api.excluir_forma(uuid)', 'execute'), false, 'anon não executa');
select is_empty(
  $$select conrelid::regclass from pg_constraint
    where contype = 'f' and confrelid = 'app.forma_pagamento'::regclass and confdeltype not in ('a', 'r')$$,
  'nenhum FK para app.forma_pagamento apaga ou anula em cascata');

-- Como B: nunca descobre se a forma de A está em uso
select testes.como_b();

select throws_ok($$select api.excluir_forma('e1000000-0000-4000-8000-000000000304')$$,
  'P0001', 'registro_invalido', 'B com forma de A sem uso recebe registro_invalido');
select throws_ok($$select api.excluir_forma('e1000000-0000-4000-8000-000000000302')$$,
  'P0001', 'registro_invalido', 'B com forma de A em uso recebe registro_invalido, não em_uso');

-- Como A
select testes.como_a();

select lives_ok($$select api.excluir_forma('e1000000-0000-4000-8000-000000000301')$$, 'A exclui forma sem uso');
select throws_ok($$select api.excluir_forma('e1000000-0000-4000-8000-000000000302')$$,
  'P0001', 'em_uso', 'forma com lançamento recebe em_uso');
select throws_ok($$select api.excluir_forma('e1000000-0000-4000-8000-000000000303')$$,
  'P0001', 'em_uso', 'crédito com pagamento de cartão recebe em_uso');
select throws_ok($$select api.excluir_forma('e1000000-0000-4000-8000-0000000003ff')$$,
  'P0001', 'registro_invalido', 'id inexistente recebe registro_invalido');

select testes.como_postgres();

select results_eq(
  $$select id from app.forma_pagamento order by id$$,
  $$values ('e1000000-0000-4000-8000-000000000302'::uuid), ('e1000000-0000-4000-8000-000000000303'::uuid),
           ('e1000000-0000-4000-8000-000000000304'::uuid)$$,
  'só a forma sem uso de A foi apagada; as em uso e a tentada por B continuam');

select * from finish();
rollback;
