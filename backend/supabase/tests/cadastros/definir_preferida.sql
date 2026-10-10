begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(15);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A'),
  ('e1000000-0000-4000-8000-000000000211', (select id from app.lar), testes.membro_b(), 'Conta de B');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, preferida, arquivada) values
  ('e1000000-0000-4000-8000-000000000301', (select id from app.lar), testes.membro_a(), 'Pix de A', 'pix', 'e1000000-0000-4000-8000-000000000201', true, false),
  ('e1000000-0000-4000-8000-000000000302', (select id from app.lar), testes.membro_a(), 'Débito de A', 'debito', 'e1000000-0000-4000-8000-000000000201', false, false),
  ('e1000000-0000-4000-8000-000000000303', (select id from app.lar), testes.membro_a(), 'Arquivada de A', 'pix', 'e1000000-0000-4000-8000-000000000201', false, true),
  ('e1000000-0000-4000-8000-000000000311', (select id from app.lar), testes.membro_b(), 'Pix de B', 'pix', 'e1000000-0000-4000-8000-000000000211', true, false);

select is((select prosecdef from pg_proc where oid = 'api.definir_preferida(uuid, boolean)'::regprocedure), false, 'é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.definir_preferida(uuid, boolean)'::regprocedure), 'search_path vazio');
select is(has_function_privilege('anon', 'api.definir_preferida(uuid, boolean)', 'execute'), false, 'anon não executa');

-- Como A
select testes.como_a();

select lives_ok($$select api.definir_preferida('e1000000-0000-4000-8000-000000000302')$$, 'A troca a preferida');
select results_eq(
  $$select id from app.forma_pagamento where preferida$$,
  $$values ('e1000000-0000-4000-8000-000000000302'::uuid)$$,
  'a nova é a única preferida de A; a anterior deixou de ser');

select lives_ok($$select api.definir_preferida('e1000000-0000-4000-8000-000000000302')$$, 'repetir a chamada não falha');
select results_eq(
  $$select id from app.forma_pagamento where preferida$$,
  $$values ('e1000000-0000-4000-8000-000000000302'::uuid)$$,
  'repetir mantém o mesmo estado');

select lives_ok($$select api.definir_preferida('e1000000-0000-4000-8000-000000000302', false)$$, 'A desliga a preferida');
select is_empty($$select 1 from app.forma_pagamento where preferida$$, 'A fica sem preferida');

select throws_ok($$select api.definir_preferida('e1000000-0000-4000-8000-000000000303')$$,
  'P0001', 'valor_invalido', 'forma própria arquivada não vira preferida');
select throws_ok($$select api.definir_preferida('e1000000-0000-4000-8000-0000000003ff')$$,
  'P0001', 'registro_invalido', 'id inexistente recebe registro_invalido');
select throws_ok($$select api.definir_preferida('e1000000-0000-4000-8000-000000000311')$$,
  'P0001', 'registro_invalido', 'forma de B recebe registro_invalido');

select lives_ok($$select api.definir_preferida('e1000000-0000-4000-8000-000000000301')$$, 'A volta a preferida para o Pix');

-- Como B
select testes.como_b();

select throws_ok($$select api.definir_preferida('e1000000-0000-4000-8000-000000000302')$$,
  'P0001', 'registro_invalido', 'B com o id de uma forma de A recebe registro_invalido');

select testes.como_postgres();

select results_eq(
  $$select dono_id, id from app.forma_pagamento where preferida order by dono_id$$,
  $$values (testes.membro_a(), 'e1000000-0000-4000-8000-000000000301'::uuid),
           (testes.membro_b(), 'e1000000-0000-4000-8000-000000000311'::uuid)$$,
  'a preferida de B não mudou com as trocas de A e B não mexeu na de A');

select * from finish();
rollback;
