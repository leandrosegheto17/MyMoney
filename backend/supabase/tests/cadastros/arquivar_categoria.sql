begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(11);

select testes.preparar_lar();

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Casa', true),
  ('e1000000-0000-4000-8000-000000000402', (select id from app.lar), 'despesa', 'conjunto', null, 'Pets', true),
  ('e1000000-0000-4000-8000-000000000411', (select id from app.lar), 'despesa', 'individual', testes.membro_a(), 'Lazer de A', true);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto', 'e1000000-0000-4000-8000-000000000401', 3000, 1);

select is((select prosecdef from pg_proc where oid = 'api.arquivar_categoria(uuid)'::regprocedure), false, 'é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.arquivar_categoria(uuid)'::regprocedure), 'search_path vazio');
select is(has_function_privilege('anon', 'api.arquivar_categoria(uuid)', 'execute'), false, 'anon não executa');

-- A arquiva uma conjunta: vale para os 2
select testes.como_a();

select lives_ok($$select api.arquivar_categoria('e1000000-0000-4000-8000-000000000401')$$, 'A arquiva uma conjunta');
select lives_ok($$select api.arquivar_categoria('e1000000-0000-4000-8000-000000000401')$$, 'arquivar de novo não falha');
select throws_ok($$select api.arquivar_categoria('e1000000-0000-4000-8000-0000000004ff')$$,
  'P0001', 'registro_invalido', 'id inexistente recebe registro_invalido');

select testes.como_b();

select results_eq(
  $$select arquivada from app.categoria where id = 'e1000000-0000-4000-8000-000000000401'$$,
  $$values (true)$$, 'B vê a conjunta arquivada por A');
select lives_ok($$select api.arquivar_categoria('e1000000-0000-4000-8000-000000000402')$$, 'B arquiva uma conjunta');
select throws_ok($$select api.arquivar_categoria('e1000000-0000-4000-8000-000000000411')$$,
  'P0001', 'registro_invalido', 'B com uma individual de A recebe registro_invalido');

select testes.como_postgres();

select results_eq(
  $$select id, arquivada from app.categoria order by id$$,
  $$values ('e1000000-0000-4000-8000-000000000401'::uuid, true),
           ('e1000000-0000-4000-8000-000000000402'::uuid, true),
           ('e1000000-0000-4000-8000-000000000411'::uuid, false)$$,
  'as conjuntas ficam arquivadas e a individual de A segue ativa');
select results_eq(
  $$select count(*)::int from app.lancamento where categoria_id = 'e1000000-0000-4000-8000-000000000401'$$,
  $$values (1)$$, 'lançamentos da categoria arquivada mantidos');

select * from finish();
rollback;
