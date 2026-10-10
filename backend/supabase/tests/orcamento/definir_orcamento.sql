-- api.definir_orcamento(mes, categoria, valor): conjunto pelos 2, individual só pelo dono, nulo remove.
-- A = Leandro (membro ...0101, usuário ...00a1); B = Ana (membro ...0102, usuário ...00a2); ...00a3 sem membro.
-- Categorias do seed 04: ...0401-0405 conjuntas, ...0411 individual de A, ...0421 receita de A.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(25);

-- Conjunto: A define, B sobrescreve, B remove
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000401', 50000) $$, 'A define orçamento conjunto');
reset role;

select results_eq(
  $$ select escopo, dono_id, valor_centavos from app.orcamento where categoria_id = '00000000-0000-4000-8000-000000000401' and mes = '2026-12-01' $$,
  $$ values ('conjunto'::text, null::uuid, 50000::bigint) $$,
  'linha conjunta sem dono');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000401', 70000) $$, 'B altera o orçamento conjunto');
reset role;

select results_eq(
  $$ select count(*)::int, max(valor_centavos) from app.orcamento where categoria_id = '00000000-0000-4000-8000-000000000401' and mes = '2026-12-01' $$,
  $$ values (1, 70000::bigint) $$,
  'ainda uma linha, com o valor de B');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000401', null) $$, 'B remove o orçamento conjunto');
reset role;

select is((select count(*)::int from app.orcamento where categoria_id = '00000000-0000-4000-8000-000000000401' and mes = '2026-12-01'), 0, 'orçamento removido');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000401', null) $$, 'remover de novo não dá erro');
reset role;

-- Individual: só o dono
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000411', 30000) $$, 'A define orçamento individual');
reset role;

select results_eq(
  $$ select escopo, dono_id from app.orcamento where categoria_id = '00000000-0000-4000-8000-000000000411' and mes = '2026-12-01' $$,
  $$ values ('individual'::text, '00000000-0000-4000-8000-000000000101'::uuid) $$,
  'escopo e dono vêm da categoria');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000411', 1) $$, 'registro_invalido', 'B não define a individual de A');
select throws_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000411', null) $$, 'registro_invalido', 'B não remove a individual de A');
reset role;

select results_eq(
  $$ select count(*)::int, max(valor_centavos) from app.orcamento where categoria_id = '00000000-0000-4000-8000-000000000411' and mes = '2026-12-01' $$,
  $$ values (1, 30000::bigint) $$,
  'individual de A intacta');

-- Entradas inválidas
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000421', 1000) $$, 'registro_invalido', 'categoria de receita');
select throws_ok($$ select api.definir_orcamento('2026-12-01', gen_random_uuid(), 1000) $$, 'registro_invalido', 'categoria inexistente');
select throws_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000402', 0) $$, 'valor_invalido', 'valor zero');
select throws_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000402', -100) $$, 'valor_invalido', 'valor negativo');
select throws_ok($$ select api.definir_orcamento(null, '00000000-0000-4000-8000-000000000402', 1000) $$, 'valor_invalido', 'mês nulo');
select lives_ok($$ select api.definir_orcamento('2026-12-20', '00000000-0000-4000-8000-000000000402', 40000) $$, 'mês no meio é aceito');
reset role;

select is((select mes from app.orcamento where categoria_id = '00000000-0000-4000-8000-000000000402' and valor_centavos = 40000), '2026-12-01'::date, 'mês gravado é o dia 1');

-- Categoria arquivada: não recebe valor, mas pode ter o orçamento removido
update app.categoria set arquivada = true where id = '00000000-0000-4000-8000-000000000403';
insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
values ((select id from app.lar), '2026-12-01', '00000000-0000-4000-8000-000000000403', 'conjunto', null, 1000);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000403', 5000) $$, 'registro_invalido', 'categoria arquivada não recebe valor');
select lives_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000403', null) $$, 'categoria arquivada pode ter o orçamento removido');
reset role;

select is((select count(*)::int from app.orcamento where categoria_id = '00000000-0000-4000-8000-000000000403' and mes = '2026-12-01'), 0, 'orçamento da arquivada removido');

-- Sem membro
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select api.definir_orcamento('2026-12-01', '00000000-0000-4000-8000-000000000401', 1000) $$, 'registro_invalido', 'sem membro: registro_invalido');
reset role;

-- Catálogo
select ok(not has_function_privilege('anon', 'api.definir_orcamento(date, uuid, bigint)', 'execute'), 'anon não executa');
select ok(not (select prosecdef from pg_proc where oid = 'api.definir_orcamento(date, uuid, bigint)'::regprocedure), 'security invoker');

select * from finish();
rollback;
