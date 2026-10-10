begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(11);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta com histórico'),
  ('e1000000-0000-4000-8000-000000000202', (select id from app.lar), testes.membro_a(), 'Outra conta de A');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id) values
  ('e1000000-0000-4000-8000-000000000301', (select id from app.lar), testes.membro_a(), 'Pix de A', 'pix', 'e1000000-0000-4000-8000-000000000201');
insert into app.movimento_conta (id, lar_id, dono_id, conta_id, tipo, sentido, valor_centavos, data) values
  ('e1000000-0000-4000-8000-000000000701', (select id from app.lar), testes.membro_a(), 'e1000000-0000-4000-8000-000000000201', 'ajuste', 'entrada', 5000, '2026-10-01');
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Casa', true);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto', 'e1000000-0000-4000-8000-000000000401', 3000, 1);
insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id, conta_id, data_operacao) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(),
   'e1000000-0000-4000-8000-000000000301', 'e1000000-0000-4000-8000-000000000201', '2026-10-05');

select is((select prosecdef from pg_proc where oid = 'api.arquivar_conta(uuid)'::regprocedure), false, 'é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.arquivar_conta(uuid)'::regprocedure), 'search_path vazio');
select is(has_function_privilege('anon', 'api.arquivar_conta(uuid)', 'execute'), false, 'anon não executa');

-- Como A
select testes.como_a();

select lives_ok($$select api.arquivar_conta('e1000000-0000-4000-8000-000000000201')$$, 'A arquiva a própria conta');
select lives_ok($$select api.arquivar_conta('e1000000-0000-4000-8000-000000000201')$$, 'arquivar de novo não falha');
select throws_ok($$select api.arquivar_conta('e1000000-0000-4000-8000-0000000002ff')$$,
  'P0001', 'registro_invalido', 'id inexistente recebe registro_invalido');

-- Como B
select testes.como_b();

select throws_ok($$select api.arquivar_conta('e1000000-0000-4000-8000-000000000202')$$,
  'P0001', 'registro_invalido', 'B com o id de uma conta de A recebe registro_invalido');

select testes.como_postgres();

select results_eq(
  $$select id, arquivada from app.conta order by id$$,
  $$values ('e1000000-0000-4000-8000-000000000201'::uuid, true),
           ('e1000000-0000-4000-8000-000000000202'::uuid, false)$$,
  'só a conta arquivada por A mudou');
select results_eq(
  $$select count(*)::int from app.movimento_conta where conta_id = 'e1000000-0000-4000-8000-000000000201'$$,
  $$values (1)$$, 'movimentos da conta arquivada mantidos');
select results_eq(
  $$select count(*)::int from app.forma_pagamento
    where conta_id = 'e1000000-0000-4000-8000-000000000201' and not arquivada$$,
  $$values (1)$$, 'forma ligada à conta mantida, sem arquivar');
select results_eq(
  $$select count(*)::int from app.lancamento_pagamento where conta_id = 'e1000000-0000-4000-8000-000000000201'$$,
  $$values (1)$$, 'lançamentos da conta arquivada mantidos');

select * from finish();
rollback;
