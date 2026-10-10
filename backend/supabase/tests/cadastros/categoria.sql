begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(22);

select testes.preparar_lar();

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Mercado', true),
  ('e1000000-0000-4000-8000-000000000411', (select id from app.lar), 'despesa', 'individual', testes.membro_a(), 'Transporte', true);

-- Estrutura
select ok((select relrowsecurity from pg_class where oid = 'app.categoria'::regclass), 'RLS habilitada em app.categoria');
select ok((select relforcerowsecurity from pg_class where oid = 'app.categoria'::regclass), 'RLS forçada em app.categoria');
select col_is_unique('app', 'categoria', array['id', 'tipo', 'escopo'], 'unique (id, tipo, escopo) para o FK composto do lançamento');

-- Restrições
select throws_ok(
  $$insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel)
    values ((select id from app.lar), 'despesa', 'individual', null, 'Sem dono', false)$$,
  '23514', null, 'individual sem dono é recusada');
select throws_ok(
  $$insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel)
    values ((select id from app.lar), 'despesa', 'conjunto', testes.membro_a(), 'Conjunta com dono', false)$$,
  '23514', null, 'conjunta com dono é recusada');
select throws_ok(
  $$insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel)
    values ((select id from app.lar), 'receita', 'conjunto', null, 'Receita da casa', null)$$,
  '23514', null, 'receita conjunta é recusada');
select throws_ok(
  $$insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel)
    values ((select id from app.lar), 'receita', 'individual', testes.membro_a(), 'Bônus', false)$$,
  '23514', null, 'receita com variavel não nulo é recusada');
select throws_ok(
  $$insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel)
    values ((select id from app.lar), 'despesa', 'individual', testes.membro_a(), 'Sem marca', null)$$,
  '23514', null, 'despesa com variavel nulo é recusada');
select throws_ok(
  $$insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel)
    values ((select id from app.lar), 'despesa', 'conjunto', null, '  ', false)$$,
  '23514', null, 'nome só com espaços é recusado');

-- Unicidade
select throws_ok(
  $$insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel)
    values ((select id from app.lar), 'despesa', 'conjunto', null, 'Mercado', true)$$,
  '23505', null, 'duas conjuntas "Mercado" no lar são recusadas');
select lives_ok(
  $$insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel)
    values ((select id from app.lar), 'despesa', 'individual', testes.membro_b(), 'Transporte', true)$$,
  'A e B podem ter cada um a individual "Transporte"');
select lives_ok(
  $$insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel) values
    ((select id from app.lar), 'despesa', 'individual', testes.membro_a(), 'Outros', false),
    ((select id from app.lar), 'receita', 'individual', testes.membro_a(), 'Outros', null)$$,
  '"Outros" de despesa e de receita do mesmo dono convivem');

-- Visibilidade, como A
select testes.como_a();

select results_eq(
  $$select count(*)::int from app.categoria where escopo = 'conjunto'$$,
  $$values (1)$$, 'A vê a conjunta do lar');
select is_empty(
  $$select 1 from app.categoria where escopo = 'individual' and dono_id <> testes.membro_a()$$,
  'A vê só as próprias individuais');
select results_eq(
  $$select count(*)::int from app.categoria where escopo = 'individual'$$,
  $$values (3)$$, 'A vê as 3 individuais dele');

-- Como B
select testes.como_b();

select is_empty(
  $$select 1 from app.categoria where id = 'e1000000-0000-4000-8000-000000000411'$$,
  'B não lê a individual de A pelo id');
select results_eq(
  $$with u as (update app.categoria set nome = 'Renomeada por B'
               where id = 'e1000000-0000-4000-8000-000000000411' returning 1)
    select count(*)::int from u$$,
  $$values (0)$$, 'B não renomeia a individual de A');
select results_eq(
  $$with d as (delete from app.categoria where id = 'e1000000-0000-4000-8000-000000000411' returning 1)
    select count(*)::int from d$$,
  $$values (0)$$, 'B não exclui a individual de A');
select results_eq(
  $$with u as (update app.categoria set nome = 'Supermercado'
               where id = 'e1000000-0000-4000-8000-000000000401' returning 1)
    select count(*)::int from u$$,
  $$values (1)$$, 'B renomeia a conjunta criada por A');
select throws_ok(
  $$insert into app.categoria (tipo, escopo, dono_id, nome, variavel)
    values ('despesa', 'individual', testes.membro_a(), 'Forjada', false)$$,
  '42501', null, 'B não cria individual em nome de A');

select testes.como_postgres();

select results_eq(
  $$select nome from app.categoria where id = 'e1000000-0000-4000-8000-000000000411'$$,
  $$values ('Transporte'::text)$$, 'a individual de A continua intacta');
select results_eq(
  $$select nome from app.categoria where id = 'e1000000-0000-4000-8000-000000000401'$$,
  $$values ('Supermercado'::text)$$, 'a renomeação da conjunta por B foi gravada');

select * from finish();
rollback;
