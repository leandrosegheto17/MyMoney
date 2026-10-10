begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(30);

select testes.preparar_lar();

select is((select prosecdef from pg_proc where oid = 'api.salvar_categoria(uuid, text, text, text, boolean)'::regprocedure),
  false, 'é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.salvar_categoria(uuid, text, text, text, boolean)'::regprocedure),
  'search_path vazio');
select is(has_function_privilege('anon', 'api.salvar_categoria(uuid, text, text, text, boolean)', 'execute'), false, 'anon não executa');

-- Conjunta: criada por A, editável pelos 2
select testes.como_a();

select is(api.salvar_categoria('e1000000-0000-4000-8000-000000000401', 'Feira', 'despesa', 'conjunto', true),
  'e1000000-0000-4000-8000-000000000401'::uuid, 'A cria despesa conjunta');
select results_eq(
  $$select escopo, dono_id, variavel from app.categoria where id = 'e1000000-0000-4000-8000-000000000401'$$,
  $$values ('conjunto'::text, null::uuid, true)$$, 'conjunta sem dono');

select testes.como_b();

select is(api.salvar_categoria('e1000000-0000-4000-8000-000000000401', 'Feira da semana', 'despesa', 'conjunto', true),
  'e1000000-0000-4000-8000-000000000401'::uuid, 'B renomeia a conjunta de A');

select testes.como_a();

select results_eq(
  $$select nome from app.categoria where id = 'e1000000-0000-4000-8000-000000000401'$$,
  $$values ('Feira da semana'::text)$$, 'A vê o nome novo da conjunta');

-- Individual: só o dono
select is(api.salvar_categoria('e1000000-0000-4000-8000-000000000411', 'Academia', 'despesa', 'individual', false),
  'e1000000-0000-4000-8000-000000000411'::uuid, 'A cria despesa individual');
select results_eq(
  $$select dono_id from app.categoria where id = 'e1000000-0000-4000-8000-000000000411'$$,
  $$values (testes.membro_a())$$, 'individual com dono A');

-- Receita sempre individual
select is(api.salvar_categoria('e1000000-0000-4000-8000-000000000421', 'Freelas', 'receita', 'conjunto', true),
  'e1000000-0000-4000-8000-000000000421'::uuid, 'receita pedida como conjunta é aceita');
select results_eq(
  $$select escopo, dono_id, variavel from app.categoria where id = 'e1000000-0000-4000-8000-000000000421'$$,
  $$values ('individual'::text, testes.membro_a(), null::boolean)$$, 'receita gravada individual e sem variavel');

-- Escopo e tipo imutáveis
select throws_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000401', 'Feira da semana', 'despesa', 'individual', true)$$,
  'P0001', 'valor_invalido', 'mudar o escopo é recusado');
select throws_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000411', 'Academia', 'receita', 'individual', null)$$,
  'P0001', 'valor_invalido', 'mudar o tipo é recusado');
select results_eq(
  $$select id, tipo, escopo, nome from app.categoria
    where id in ('e1000000-0000-4000-8000-000000000401', 'e1000000-0000-4000-8000-000000000411') order by id$$,
  $$values ('e1000000-0000-4000-8000-000000000401'::uuid, 'despesa'::text, 'conjunto'::text, 'Feira da semana'::text),
           ('e1000000-0000-4000-8000-000000000411'::uuid, 'despesa', 'individual', 'Academia')$$,
  'as linhas ficam iguais depois das mudanças recusadas');

select lives_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000411', 'Academia', 'despesa', 'individual', true)$$,
  'alternar variavel de uma despesa é aceito');
select results_eq(
  $$select variavel from app.categoria where id = 'e1000000-0000-4000-8000-000000000411'$$,
  $$values (true)$$, 'variavel alternada');

-- Nome repetido
select throws_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000402', 'Feira da semana', 'despesa', 'conjunto', false)$$,
  'P0001', 'nome_repetido', 'segunda conjunta com o mesmo nome recebe nome_repetido');
select lives_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000412', 'Lazer', 'despesa', 'individual', true)$$,
  'A cria a individual "Lazer"');
select lives_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000412', 'Lazer', 'despesa', 'individual', true)$$,
  'reenvio idêntico não falha');
select results_eq(
  $$select count(*)::int from app.categoria where id = 'e1000000-0000-4000-8000-000000000412'$$,
  $$values (1)$$, 'reenvio idêntico não duplica');

-- Entradas inválidas
select throws_ok($$select api.salvar_categoria(null, 'Sem id', 'despesa', 'conjunto', false)$$,
  'P0001', 'valor_invalido', 'id nulo é recusado');
select throws_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000403', '  ', 'despesa', 'conjunto', false)$$,
  'P0001', 'valor_invalido', 'nome vazio é recusado');
select throws_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000403', 'Outra', 'transferencia', 'conjunto', false)$$,
  'P0001', 'valor_invalido', 'tipo fora da lista é recusado');
select throws_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000403', 'Outra', 'despesa', 'casal', false)$$,
  'P0001', 'valor_invalido', 'escopo fora da lista é recusado');

-- Como B: individual de A
select testes.como_b();

select throws_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000411', 'Invadida', 'despesa', 'individual', false)$$,
  'P0001', 'registro_invalido', 'B editando a individual de A recebe registro_invalido');
select lives_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000432', 'Lazer', 'despesa', 'individual', true)$$,
  'B cria a própria individual "Lazer" sem colidir com a de A');

-- Usuário sem membro
select testes.como_sem_membro();

select throws_ok($$select api.salvar_categoria('e1000000-0000-4000-8000-000000000404', 'Sem membro', 'despesa', 'conjunto', false)$$,
  'P0001', 'registro_invalido', 'usuário sem membro recebe registro_invalido');

select testes.como_postgres();

select results_eq(
  $$select nome, dono_id from app.categoria where id = 'e1000000-0000-4000-8000-000000000411'$$,
  $$values ('Academia'::text, testes.membro_a())$$, 'a individual de A continua intacta');
select results_eq(
  $$select dono_id from app.categoria where id = 'e1000000-0000-4000-8000-000000000432'$$,
  $$values (testes.membro_b())$$, 'a individual "Lazer" de B é dele');
select is_empty(
  $$select 1 from app.categoria where id in ('e1000000-0000-4000-8000-000000000402',
    'e1000000-0000-4000-8000-000000000403', 'e1000000-0000-4000-8000-000000000404')$$,
  'nada foi criado pelas chamadas recusadas');

select * from finish();
rollback;
