begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(13);

select testes.preparar_lar();

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Conjunta sem uso', true),
  ('e1000000-0000-4000-8000-000000000402', (select id from app.lar), 'despesa', 'conjunto', null, 'Conjunta em uso', true),
  ('e1000000-0000-4000-8000-000000000411', (select id from app.lar), 'despesa', 'individual', testes.membro_a(), 'Individual sem uso', true),
  ('e1000000-0000-4000-8000-000000000412', (select id from app.lar), 'despesa', 'individual', testes.membro_a(), 'Individual em uso', true),
  ('e1000000-0000-4000-8000-000000000413', (select id from app.lar), 'despesa', 'individual', testes.membro_a(), 'Outra individual sem uso', true);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto', 'e1000000-0000-4000-8000-000000000402', 3000, 1),
  ('e1000000-0000-4000-8000-000000000502', (select id from app.lar), testes.membro_a(), 'despesa', 'individual', 'e1000000-0000-4000-8000-000000000412', 2000, 1);

select is((select prosecdef from pg_proc where oid = 'api.excluir_categoria(uuid)'::regprocedure), false, 'é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.excluir_categoria(uuid)'::regprocedure), 'search_path vazio');
select is(has_function_privilege('anon', 'api.excluir_categoria(uuid)', 'execute'), false, 'anon não executa');
select is_empty(
  $$select conrelid::regclass from pg_constraint
    where contype = 'f' and confrelid = 'app.categoria'::regclass and confdeltype not in ('a', 'r')$$,
  'nenhum FK para app.categoria apaga ou anula em cascata');

-- Como B
select testes.como_b();

select lives_ok($$select api.excluir_categoria('e1000000-0000-4000-8000-000000000401')$$, 'B exclui uma conjunta sem uso');
select throws_ok($$select api.excluir_categoria('e1000000-0000-4000-8000-000000000402')$$,
  'P0001', 'categoria_em_uso', 'B excluindo conjunta em uso recebe categoria_em_uso');
select throws_ok($$select api.excluir_categoria('e1000000-0000-4000-8000-000000000413')$$,
  'P0001', 'registro_invalido', 'B com individual de A sem uso recebe registro_invalido');
select throws_ok($$select api.excluir_categoria('e1000000-0000-4000-8000-000000000412')$$,
  'P0001', 'registro_invalido', 'B com individual de A em uso recebe registro_invalido, não categoria_em_uso');

-- Como A
select testes.como_a();

select lives_ok($$select api.excluir_categoria('e1000000-0000-4000-8000-000000000411')$$, 'A exclui a própria individual sem uso');
select throws_ok($$select api.excluir_categoria('e1000000-0000-4000-8000-000000000412')$$,
  'P0001', 'categoria_em_uso', 'individual em uso recebe categoria_em_uso');
select throws_ok($$select api.excluir_categoria('e1000000-0000-4000-8000-0000000004ff')$$,
  'P0001', 'registro_invalido', 'id inexistente recebe registro_invalido');

select testes.como_postgres();

select results_eq(
  $$select id from app.categoria order by id$$,
  $$values ('e1000000-0000-4000-8000-000000000402'::uuid), ('e1000000-0000-4000-8000-000000000412'::uuid),
           ('e1000000-0000-4000-8000-000000000413'::uuid)$$,
  'só as sem uso permitidas foram apagadas; as em uso e a tentada por B continuam');
select results_eq(
  $$select count(*)::int from app.lancamento$$,
  $$values (2)$$, 'lançamentos intactos');

select * from finish();
rollback;
