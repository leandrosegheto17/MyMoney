begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(19);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos)
values ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A', 1000);

-- Função
select is((select prosecdef from pg_proc where oid = 'api.salvar_conta(uuid, text, bigint)'::regprocedure),
  false, 'é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.salvar_conta(uuid, text, bigint)'::regprocedure),
  'search_path vazio');
select is(has_function_privilege('anon', 'api.salvar_conta(uuid, text, bigint)', 'execute'), false, 'anon não executa');
select is(has_function_privilege('authenticated', 'api.salvar_conta(uuid, text, bigint)', 'execute'), true, 'authenticated executa');

-- Como A
select testes.como_a();

select is(api.salvar_conta('e1000000-0000-4000-8000-000000000202', 'Poupança'),
  'e1000000-0000-4000-8000-000000000202'::uuid, 'criar sem saldo devolve o id');
select results_eq(
  $$select nome, saldo_inicial_centavos, dono_id, arquivada from app.conta
    where id = 'e1000000-0000-4000-8000-000000000202'$$,
  $$values ('Poupança'::text, 0::bigint, testes.membro_a(), false)$$,
  'conta criada com saldo 0, dono A e não arquivada');

select is(api.salvar_conta('e1000000-0000-4000-8000-000000000202', 'Poupança nova', 12345),
  'e1000000-0000-4000-8000-000000000202'::uuid, 'editar devolve o mesmo id');
select results_eq(
  $$select nome, saldo_inicial_centavos from app.conta where id = 'e1000000-0000-4000-8000-000000000202'$$,
  $$values ('Poupança nova'::text, 12345::bigint)$$,
  'nome e saldo editados na mesma linha');

select lives_ok(
  $$select api.salvar_conta('e1000000-0000-4000-8000-000000000202', 'Poupança nova', 12345)$$,
  'reenvio idêntico não falha');
select results_eq(
  $$select count(*)::int from app.conta where id = 'e1000000-0000-4000-8000-000000000202'$$,
  $$values (1)$$, 'reenvio idêntico não duplica');

select lives_ok(
  $$select api.salvar_conta('e1000000-0000-4000-8000-000000000203', '  Reserva  ', -5000)$$,
  'saldo inicial negativo é aceito');
select results_eq(
  $$select nome, saldo_inicial_centavos from app.conta where id = 'e1000000-0000-4000-8000-000000000203'$$,
  $$values ('Reserva'::text, -5000::bigint)$$,
  'nome gravado sem espaços nas pontas');

select throws_ok($$select api.salvar_conta('e1000000-0000-4000-8000-000000000204', '')$$,
  'P0001', 'valor_invalido', 'nome vazio é recusado');
select throws_ok($$select api.salvar_conta('e1000000-0000-4000-8000-000000000204', '   ')$$,
  'P0001', 'valor_invalido', 'nome só com espaços é recusado');
select throws_ok($$select api.salvar_conta(null, 'Sem id')$$,
  'P0001', 'valor_invalido', 'id nulo é recusado');

-- Como B, com o id de uma conta de A
select testes.como_b();

select throws_ok(
  $$select api.salvar_conta('e1000000-0000-4000-8000-000000000201', 'Invadida', 1)$$,
  'P0001', 'registro_invalido', 'B com o id de uma conta de A recebe registro_invalido');

-- Usuário sem membro
select testes.como_sem_membro();

select throws_ok(
  $$select api.salvar_conta('e1000000-0000-4000-8000-000000000205', 'Sem membro')$$,
  'P0001', 'registro_invalido', 'usuário sem membro recebe registro_invalido');

select testes.como_postgres();

select results_eq(
  $$select nome, saldo_inicial_centavos, dono_id from app.conta where id = 'e1000000-0000-4000-8000-000000000201'$$,
  $$values ('Conta de A'::text, 1000::bigint, testes.membro_a())$$,
  'a conta de A continua intacta');
select is_empty(
  $$select 1 from app.conta where dono_id = testes.membro_b()
    or id in ('e1000000-0000-4000-8000-000000000204', 'e1000000-0000-4000-8000-000000000205')$$,
  'nenhuma conta criada pelas chamadas recusadas');

select * from finish();
rollback;
