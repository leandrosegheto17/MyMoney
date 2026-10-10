begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(10);

select testes.preparar_lar();

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Mercado', true),
  ('e1000000-0000-4000-8000-000000000411', (select id from app.lar), 'despesa', 'individual', testes.membro_a(), 'Lazer de A', true),
  ('e1000000-0000-4000-8000-000000000431', (select id from app.lar), 'despesa', 'individual', testes.membro_b(), 'Lazer de B', true);

-- Vínculo para pode_excluir: a conjunta 401 passa a ter lançamento; a individual 411 fica sem vínculo
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas) values
  ('e5300000-0000-4000-8000-000000000001', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
   'e1000000-0000-4000-8000-000000000401', 1000, 1);

-- Definição
select has_view('api', 'categorias', 'api.categorias existe');
select ok(
  (select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'api.categorias'::regclass),
  'a view tem security_invoker');
select columns_are('api', 'categorias',
  array['id', 'nome', 'tipo', 'escopo', 'variavel', 'arquivada', 'pode_excluir'],
  'colunas iguais às de respostas/categorias.json, sem lar_id nem dono_id');

-- Privilégios: só leitura, nada para anon
select table_privs_are('api', 'categorias', 'authenticated', array['SELECT'], 'authenticated só lê');
select table_privs_are('api', 'categorias', 'anon', array[]::text[], 'anon não tem privilégio');

-- A RLS da tabela vale pela view
select testes.como_a();
select results_eq(
  $$select id from api.categorias order by id$$,
  $$values ('e1000000-0000-4000-8000-000000000401'::uuid), ('e1000000-0000-4000-8000-000000000411'::uuid)$$,
  'A vê a conjunta e a própria individual');
select results_eq(
  $$select id::text, pode_excluir from api.categorias order by id$$,
  $$values ('e1000000-0000-4000-8000-000000000401', false), ('e1000000-0000-4000-8000-000000000411', true)$$,
  'pode_excluir: false com lançamento ligado, true sem vínculo');

select testes.como_b();
select is_empty(
  $$select 1 from api.categorias where id = 'e1000000-0000-4000-8000-000000000411'$$,
  'B não vê a individual de A pela view');
select throws_ok(
  $$update api.categorias set nome = 'Alterada' where id = 'e1000000-0000-4000-8000-000000000401'$$,
  '42501', null, 'escrever pela view é proibido');

select testes.como_sem_membro();
select is_empty($$select 1 from api.categorias$$, 'usuário sem membro recebe lista vazia');

select testes.como_postgres();

select * from finish();
rollback;
