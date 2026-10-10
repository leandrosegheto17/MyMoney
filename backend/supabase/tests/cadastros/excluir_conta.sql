begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(12);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Sem vínculo'),
  ('e1000000-0000-4000-8000-000000000202', (select id from app.lar), testes.membro_a(), 'Com movimento'),
  ('e1000000-0000-4000-8000-000000000203', (select id from app.lar), testes.membro_a(), 'Com forma'),
  ('e1000000-0000-4000-8000-000000000204', (select id from app.lar), testes.membro_a(), 'Com lançamento'),
  ('e1000000-0000-4000-8000-000000000205', (select id from app.lar), testes.membro_a(), 'Outra sem vínculo');
insert into app.movimento_conta (lar_id, dono_id, conta_id, tipo, sentido, valor_centavos, data) values
  ((select id from app.lar), testes.membro_a(), 'e1000000-0000-4000-8000-000000000202', 'ajuste', 'entrada', 5000, '2026-10-01');
insert into app.forma_pagamento (lar_id, dono_id, nome, tipo, conta_id) values
  ((select id from app.lar), testes.membro_a(), 'Pix de A', 'pix', 'e1000000-0000-4000-8000-000000000203');
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Casa', true);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto', 'e1000000-0000-4000-8000-000000000401', 3000, 1);
insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, conta_id, data_operacao) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'e1000000-0000-4000-8000-000000000204', '2026-10-05');

select is((select prosecdef from pg_proc where oid = 'api.excluir_conta(uuid)'::regprocedure), false, 'é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.excluir_conta(uuid)'::regprocedure), 'search_path vazio');
select is(has_function_privilege('anon', 'api.excluir_conta(uuid)', 'execute'), false, 'anon não executa');
select is_empty(
  $$select conrelid::regclass from pg_constraint
    where contype = 'f' and confrelid = 'app.conta'::regclass and confdeltype not in ('a', 'r')$$,
  'nenhum FK para app.conta apaga ou anula em cascata');

-- Como B: nunca descobre se a conta de A está em uso
select testes.como_b();

select throws_ok($$select api.excluir_conta('e1000000-0000-4000-8000-000000000205')$$,
  'P0001', 'registro_invalido', 'B com conta de A sem vínculo recebe registro_invalido');
select throws_ok($$select api.excluir_conta('e1000000-0000-4000-8000-000000000202')$$,
  'P0001', 'registro_invalido', 'B com conta de A em uso recebe registro_invalido, não em_uso');

-- Como A
select testes.como_a();

select lives_ok($$select api.excluir_conta('e1000000-0000-4000-8000-000000000201')$$, 'A exclui conta sem vínculo');
select throws_ok($$select api.excluir_conta('e1000000-0000-4000-8000-000000000202')$$,
  'P0001', 'em_uso', 'conta com movimento recebe em_uso');
select throws_ok($$select api.excluir_conta('e1000000-0000-4000-8000-000000000203')$$,
  'P0001', 'em_uso', 'conta com forma ligada recebe em_uso');
select throws_ok($$select api.excluir_conta('e1000000-0000-4000-8000-000000000204')$$,
  'P0001', 'em_uso', 'conta com lançamento recebe em_uso');
select throws_ok($$select api.excluir_conta('e1000000-0000-4000-8000-0000000002ff')$$,
  'P0001', 'registro_invalido', 'id inexistente recebe registro_invalido');

select testes.como_postgres();

select results_eq(
  $$select id from app.conta order by id$$,
  $$values ('e1000000-0000-4000-8000-000000000202'::uuid), ('e1000000-0000-4000-8000-000000000203'::uuid),
           ('e1000000-0000-4000-8000-000000000204'::uuid), ('e1000000-0000-4000-8000-000000000205'::uuid)$$,
  'só a conta sem vínculo de A foi apagada; as em uso e a tentada por B continuam');

select * from finish();
rollback;
