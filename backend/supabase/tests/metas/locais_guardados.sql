begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(13);

select function_privs_are('api', 'locais_guardados', array[]::text[], 'authenticated', array['EXECUTE'],
  'authenticated executa locais_guardados');
select function_privs_are('api', 'locais_guardados', array[]::text[], 'anon', array[]::text[],
  'anon não executa locais_guardados');
select is((select prosecdef from pg_proc where oid = 'api.locais_guardados()'::regprocedure),
  false, 'locais_guardados é security invoker');

-- Local exclusivo numa individual de A e um local usado por último numa compartilhada.
insert into app.movimento_meta (lar_id, meta_id, tipo, valor_centavos, data, local, autor_id) values
  ((select id from app.lar), '00000000-0000-4000-8000-000000000903', 'aporte', 1000, '2020-01-01', 'Cofre Leandro', '00000000-0000-4000-8000-000000000101'),
  ((select id from app.lar), '00000000-0000-4000-8000-000000000902', 'aporte', 1000, '2026-10-08', 'Novo Local', '00000000-0000-4000-8000-000000000101');

-- Como A
select testes.como_a();

select is(api.locais_guardados(),
  '["Novo Local", "Caixinha Nubank", "CDB Banco Inter", "Cofre Leandro"]'::jsonb,
  'A recebe os locais das metas visíveis, do uso mais recente ao mais antigo');
select is(
  (select count(*)::int from jsonb_array_elements_text(api.locais_guardados()) l where l = 'Caixinha Nubank'),
  1, 'local repetido aparece uma vez');
select ok(not api.locais_guardados() ? 'Poupança Ana',
  'A não recebe o local da individual de B');

-- Como B
select testes.como_b();

select ok(not api.locais_guardados() ? 'Cofre Leandro',
  'B não recebe o local exclusivo da individual de A');
select ok(api.locais_guardados() ? 'Poupança Ana',
  'B recebe o local da própria individual');
select ok(api.locais_guardados() @> '["Caixinha Nubank", "CDB Banco Inter"]'::jsonb,
  'B recebe os locais da compartilhada');

-- Sem membro e anon
select testes.como_sem_membro();

select throws_ok($$select api.locais_guardados()$$,
  'P0001', 'registro_invalido', 'usuário sem membro recebe registro_invalido');

select testes.como_postgres();
select testes.como_anon();
select throws_ok($$select api.locais_guardados()$$,
  '42501', null, 'anon não executa locais_guardados');

-- Sem movimentos visíveis
select testes.como_postgres();
delete from app.movimento_conta where movimento_meta_id is not null;
delete from app.movimento_meta;

select testes.como_a();

select is(api.locais_guardados(), '[]'::jsonb, 'sem movimentos visíveis devolve lista vazia');
select is(jsonb_typeof(api.locais_guardados()), 'array', 'a resposta é sempre um array');

select testes.como_postgres();

select * from finish();
rollback;
