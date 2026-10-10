-- api.copiar_orcamento(mes, escopo): copia o mês anterior do escopo sem sobrescrever, só o visível ao membro.
-- Seed 07: outubro/2026 com 5 conjuntas, 4 individuais de A (Leandro) e 1 de B (Ana); novembro vazio.
-- A = usuário ...00a1 (membro ...0101); B = usuário ...00a2 (membro ...0102); ...00a3 sem membro.
begin;
-- Cada cenário limpa novembro ao final (sem savepoint: o pgTAP guarda os resultados na transação).
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(24);

-- A copia o conjunto; B repete e nada é copiado
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is(api.copiar_orcamento('2026-11-01', 'conjunto'), 5, 'A copia as 5 conjuntas');
reset role;

select results_eq(
  $$ select categoria_id, escopo, dono_id, valor_centavos from app.orcamento where mes = '2026-11-01' order by categoria_id $$,
  $$ select categoria_id, escopo, dono_id, valor_centavos from app.orcamento where mes = '2026-10-01' and escopo = 'conjunto' order by categoria_id $$,
  'novembro igual ao conjunto de outubro');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select is(api.copiar_orcamento('2026-11-01', 'conjunto'), 0, 'B copia de novo e nada muda');
reset role;
select is((select count(*)::int from app.orcamento where mes = '2026-11-01'), 5, 'continuam 5 linhas');
delete from app.orcamento where mes = '2026-11-01';

-- Não sobrescreve o que já existe
insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
values ((select id from app.lar), '2026-11-01', '00000000-0000-4000-8000-000000000401', 'conjunto', null, 99999);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is(api.copiar_orcamento('2026-11-01', 'conjunto'), 4, 'copia só as 4 que faltam');
reset role;
select is((select valor_centavos from app.orcamento where mes = '2026-11-01' and categoria_id = '00000000-0000-4000-8000-000000000401'), 99999::bigint, 'valor já definido é mantido');
select is((select count(*)::int from app.orcamento where mes = '2026-11-01'), 5, 'novembro com 5 linhas');
delete from app.orcamento where mes = '2026-11-01';

-- Individual de A: só as de A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is(api.copiar_orcamento('2026-11-01', 'individual'), 4, 'A copia as 4 individuais dela');
reset role;
select is((select count(*)::int from app.orcamento where mes = '2026-11-01' and dono_id = '00000000-0000-4000-8000-000000000101'), 4, '4 individuais de A em novembro');
select is((select count(*)::int from app.orcamento where mes = '2026-11-01' and dono_id = '00000000-0000-4000-8000-000000000102'), 0, 'nenhuma individual de B copiada por A');
select is((select count(*)::int from app.orcamento where mes = '2026-11-01' and escopo = 'conjunto'), 0, 'o conjunto não é copiado junto');
delete from app.orcamento where mes = '2026-11-01';

-- Individual de B: só a de B, nunca as de A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select is(api.copiar_orcamento('2026-11-01', 'individual'), 1, 'B copia só a própria individual');
reset role;
select is((select count(*)::int from app.orcamento where mes = '2026-11-01' and dono_id = '00000000-0000-4000-8000-000000000102'), 1, '1 individual de B em novembro');
select is((select count(*)::int from app.orcamento where mes = '2026-11-01' and dono_id = '00000000-0000-4000-8000-000000000101'), 0, 'nenhuma individual de A copiada por B');
delete from app.orcamento where mes = '2026-11-01';

-- Categoria arquivada não volta
update app.categoria set arquivada = true where id = '00000000-0000-4000-8000-000000000402';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is(api.copiar_orcamento('2026-11-01', 'conjunto'), 4, 'arquivada fica de fora da contagem');
reset role;
select is((select count(*)::int from app.orcamento where mes = '2026-11-01' and categoria_id = '00000000-0000-4000-8000-000000000402'), 0, 'arquivada não é copiada');
update app.categoria set arquivada = false where id = '00000000-0000-4000-8000-000000000402';
delete from app.orcamento where mes = '2026-11-01';

-- Mês anterior vazio e virada de ano
insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
values ((select id from app.lar), '2026-12-01', '00000000-0000-4000-8000-000000000401', 'conjunto', null, 12345);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is(api.copiar_orcamento('2027-03-01', 'conjunto'), 0, 'mês anterior vazio: 0, sem erro');
select is(api.copiar_orcamento('2027-01-15', 'conjunto'), 1, 'janeiro copia de dezembro do ano anterior');
select throws_ok($$ select api.copiar_orcamento('2026-11-01', 'casal') $$, 'valor_invalido', 'escopo inválido');
select throws_ok($$ select api.copiar_orcamento(null, 'conjunto') $$, 'valor_invalido', 'mês nulo');
reset role;

select results_eq(
  $$ select mes, valor_centavos from app.orcamento where mes = '2027-01-01' $$,
  $$ values ('2027-01-01'::date, 12345::bigint) $$,
  'linha de janeiro com o valor de dezembro');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select api.copiar_orcamento('2026-11-01', 'conjunto') $$, 'registro_invalido', 'sem membro: registro_invalido');
reset role;

select ok(not has_function_privilege('anon', 'api.copiar_orcamento(date, text)', 'execute'), 'anon não executa');
select ok(not (select prosecdef from pg_proc where oid = 'api.copiar_orcamento(date, text)'::regprocedure), 'security invoker');

select * from finish();
rollback;
