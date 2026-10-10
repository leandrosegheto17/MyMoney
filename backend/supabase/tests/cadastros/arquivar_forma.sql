begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(11);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, preferida) values
  ('e1000000-0000-4000-8000-000000000301', (select id from app.lar), testes.membro_a(), 'Pix preferido', 'pix', 'e1000000-0000-4000-8000-000000000201', true),
  ('e1000000-0000-4000-8000-000000000302', (select id from app.lar), testes.membro_a(), 'Débito de A', 'debito', 'e1000000-0000-4000-8000-000000000201', false);
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Casa', true);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto', 'e1000000-0000-4000-8000-000000000401', 3000, 1);
insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id, conta_id, data_operacao) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(),
   'e1000000-0000-4000-8000-000000000301', 'e1000000-0000-4000-8000-000000000201', '2026-10-05');
insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), 'conjunto', testes.membro_a(), 1, 3000, '2026-10-05');

select is((select prosecdef from pg_proc where oid = 'api.arquivar_forma(uuid)'::regprocedure), false, 'é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.arquivar_forma(uuid)'::regprocedure), 'search_path vazio');
select is(has_function_privilege('anon', 'api.arquivar_forma(uuid)', 'execute'), false, 'anon não executa');

-- Como A
select testes.como_a();

select lives_ok($$select api.arquivar_forma('e1000000-0000-4000-8000-000000000301')$$, 'A arquiva a preferida');
select results_eq(
  $$select arquivada, preferida from app.forma_pagamento where id = 'e1000000-0000-4000-8000-000000000301'$$,
  $$values (true, false)$$, 'a forma fica arquivada e deixa de ser preferida');
select lives_ok($$select api.arquivar_forma('e1000000-0000-4000-8000-000000000301')$$, 'arquivar de novo não falha');
select throws_ok($$select api.arquivar_forma('e1000000-0000-4000-8000-0000000003ff')$$,
  'P0001', 'registro_invalido', 'id inexistente recebe registro_invalido');

-- Como B
select testes.como_b();

select throws_ok($$select api.arquivar_forma('e1000000-0000-4000-8000-000000000302')$$,
  'P0001', 'registro_invalido', 'B com o id de uma forma de A recebe registro_invalido');

select testes.como_postgres();

select results_eq(
  $$select arquivada from app.forma_pagamento where id = 'e1000000-0000-4000-8000-000000000302'$$,
  $$values (false)$$, 'a forma de A tentada por B continua ativa');
select results_eq(
  $$select count(*)::int from app.lancamento_pagamento where forma_pagamento_id = 'e1000000-0000-4000-8000-000000000301'$$,
  $$values (1)$$, 'lançamentos da forma arquivada mantidos');
select results_eq(
  $$select count(*)::int from app.parcela where lancamento_id = 'e1000000-0000-4000-8000-000000000501'$$,
  $$values (1)$$, 'parcelas da forma arquivada mantidas');

select * from finish();
rollback;
