-- app.situacao_orcamento(orcado, realizado): percentual arredondado e situação pela razão exata.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select is(app.situacao_orcamento(10000, 7999), '{"percentual": 80, "situacao": "dentro"}'::jsonb, '79,99% fica dentro (percentual exibido 80)');
select is(app.situacao_orcamento(10000, 8000), '{"percentual": 80, "situacao": "atencao"}'::jsonb, '80% é atenção');
select is(app.situacao_orcamento(10000, 10000), '{"percentual": 100, "situacao": "atencao"}'::jsonb, '100% é atenção');
select is(app.situacao_orcamento(10000, 10001), '{"percentual": 100, "situacao": "estourado"}'::jsonb, '100,01% é estourado');
select is(app.situacao_orcamento(10000, 0), '{"percentual": 0, "situacao": "dentro"}'::jsonb, 'realizado zero é 0% dentro');
select is(app.situacao_orcamento(30000, 33250), '{"percentual": 111, "situacao": "estourado"}'::jsonb, '33250 de 30000 é 111% estourado');

select is((select provolatile from pg_proc where oid = 'app.situacao_orcamento(bigint, bigint)'::regprocedure), 'i'::"char", 'função é immutable');
select ok(not (select prosecdef from pg_proc where oid = 'app.situacao_orcamento(bigint, bigint)'::regprocedure), 'função é security invoker');
select ok((select proconfig from pg_proc where oid = 'app.situacao_orcamento(bigint, bigint)'::regprocedure) @> array['search_path=""'], 'search_path vazio');
select ok(not has_function_privilege('anon', 'app.situacao_orcamento(bigint, bigint)', 'execute'), 'anon não executa');
select ok(not has_function_privilege('public', 'app.situacao_orcamento(bigint, bigint)', 'execute'), 'public não executa');

select * from finish();
rollback;
