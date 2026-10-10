begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(19);

-- Lar limpo: sem nenhuma categoria
select testes.preparar_lar();

-- Função
select has_function('api', 'inicializar_membro', array[]::name[], 'api.inicializar_membro() existe');
select is((select prosecdef from pg_proc where oid = 'api.inicializar_membro()'::regprocedure),
  false, 'é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.inicializar_membro()'::regprocedure),
  'search_path vazio');
select is(has_function_privilege('anon', 'api.inicializar_membro()', 'execute'), false, 'anon não executa');
select is(has_function_privilege('authenticated', 'api.inicializar_membro()', 'execute'), true, 'authenticated executa');

-- Primeira chamada, como A
select testes.como_a();
select lives_ok($$select api.inicializar_membro()$$, 'A inicializa');
select testes.como_postgres();

select results_eq(
  $$select nome, variavel from app.categoria
    where escopo = 'conjunto' and tipo = 'despesa' and dono_id is null order by nome$$,
  $$values ('Contas da casa'::text, false), ('Delivery/iFood do casal', true), ('Mercado', true),
           ('Moradia', false), ('Outros da casa', false)$$,
  'as 5 despesas conjuntas da lista inicial');
select results_eq(
  $$select tipo, nome, variavel from app.categoria
    where escopo = 'individual' and dono_id = testes.membro_a() order by tipo, nome$$,
  $$values ('despesa'::text, 'Almoço/Alimentação fora'::text, true::boolean),
           ('despesa', 'Delivery pessoal', true), ('despesa', 'Lazer pessoal', true),
           ('despesa', 'Outros', false), ('despesa', 'Transporte', true),
           ('receita', 'Extra', null), ('receita', 'Outros', null), ('receita', 'Salário', null)$$,
  'as 8 individuais de A (5 despesas e 3 receitas)');
select results_eq(
  $$select count(*)::int from app.categoria where arquivada$$,
  $$values (0)$$, 'nenhuma nasce arquivada');

-- Segunda chamada de A é idempotente
select testes.como_a();
select lives_ok($$select api.inicializar_membro()$$, 'A chama de novo');
select testes.como_postgres();

select results_eq(
  $$select count(*)::int from app.categoria$$,
  $$values (13)$$, 'a segunda chamada não cria nada (13 linhas)');

-- Como B
select testes.como_b();
select lives_ok($$select api.inicializar_membro()$$, 'B inicializa');
select is_empty(
  $$select 1 from app.categoria where dono_id = testes.membro_a()$$,
  'B não vê as individuais de A');
select results_eq(
  $$select count(*)::int from app.categoria$$,
  $$values (13)$$, 'B vê as 5 conjuntas e as 8 individuais dele');
select testes.como_postgres();

select results_eq(
  $$select count(*)::int from app.categoria where escopo = 'conjunto'$$,
  $$values (5)$$, 'as conjuntas continuam 5');
select results_eq(
  $$select count(*)::int from app.categoria where dono_id = testes.membro_b()$$,
  $$values (8)$$, 'B ganha 8 individuais');
select results_eq(
  $$select count(*)::int from app.categoria where dono_id = testes.membro_a()$$,
  $$values (8)$$, 'A continua com 8 individuais');

-- Usuário sem membro
select testes.como_sem_membro();
select throws_ok($$select api.inicializar_membro()$$, 'P0001', 'registro_invalido',
  'usuário sem membro recebe registro_invalido');
select testes.como_postgres();

select results_eq(
  $$select count(*)::int from app.categoria$$,
  $$values (21)$$, 'usuário sem membro não cria nada');

select * from finish();
rollback;
