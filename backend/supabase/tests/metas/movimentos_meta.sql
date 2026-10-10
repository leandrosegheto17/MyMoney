begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(14);

insert into app.meta (id, lar_id, dono_id, nome, alvo_centavos, escopo) values
  ('f5000000-0000-4000-8000-000000000001', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Compartilhada de teste', 100000, 'conjunto');
insert into app.movimento_meta (id, lar_id, meta_id, tipo, valor_centavos, data, local, autor_id) values
  ('f5000000-0000-4000-8000-000000000101', (select id from app.lar), 'f5000000-0000-4000-8000-000000000001', 'aporte', 1000, '2026-10-01', 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101');

select function_privs_are('api', 'movimentos_meta', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated executa movimentos_meta');
select function_privs_are('api', 'movimentos_meta', array['uuid'], 'anon', array[]::text[],
  'anon não executa movimentos_meta');
select ok(not has_function_privilege('public', 'api.movimentos_meta(uuid)', 'execute'),
  'public não executa movimentos_meta');
select is((select prosecdef from pg_proc where oid = 'api.movimentos_meta(uuid)'::regprocedure),
  false, 'movimentos_meta é security invoker');

-- Como A
select testes.como_a();

select ok(not (api.movimentos_meta('f5000000-0000-4000-8000-000000000001') -> 0 ? 'conta'),
  'movimento próprio sem conta não traz a chave conta');
select is(api.movimentos_meta('f5000000-0000-4000-8000-000000000001') -> 0 -> 'autor',
  '{"nome": "Leandro", "sou_eu": true}'::jsonb, 'autor com nome e sou_eu');
select is(jsonb_array_length(api.movimentos_meta('00000000-0000-4000-8000-000000000902')),
  7, 'a 902 tem 7 movimentos');
select is(
  (select jsonb_agg(l -> 'id' order by ord) from jsonb_array_elements(api.movimentos_meta('00000000-0000-4000-8000-000000000902')) with ordinality as t(l, ord)),
  '["00000000-0000-4000-8000-000000000b07", "00000000-0000-4000-8000-000000000b06", "00000000-0000-4000-8000-000000000b05", "00000000-0000-4000-8000-000000000b04", "00000000-0000-4000-8000-000000000b03", "00000000-0000-4000-8000-000000000b02", "00000000-0000-4000-8000-000000000b01"]'::jsonb,
  'ordem por data decrescente');
select is(
  (select count(*)::int from jsonb_array_elements(api.movimentos_meta('00000000-0000-4000-8000-000000000902')) l
    where (l -> 'autor' ->> 'sou_eu')::boolean and l -> 'conta' ->> 'nome' = 'Nubank'),
  4, 'as linhas de A trazem a conta Nubank');
select is(
  (select count(*)::int from jsonb_array_elements(api.movimentos_meta('00000000-0000-4000-8000-000000000902')) l
    where l ? 'conta' and not (l -> 'autor' ->> 'sou_eu')::boolean),
  0, 'as linhas de B não trazem conta para A');
select is(api.movimentos_meta('00000000-0000-4000-8000-000000000905'), '[]'::jsonb,
  'meta visível sem movimentos devolve lista vazia');

-- Como B
select testes.como_b();

select throws_ok($$select api.movimentos_meta('00000000-0000-4000-8000-000000000903')$$,
  'P0001', 'registro_invalido', 'B na individual de A recebe registro_invalido');
select throws_ok($$select api.movimentos_meta('0f0f0f0f-0000-4000-8000-000000000000')$$,
  'P0001', 'registro_invalido', 'meta inexistente recebe o mesmo registro_invalido');

-- Sem membro
select testes.como_sem_membro();

select throws_ok($$select api.movimentos_meta('00000000-0000-4000-8000-000000000902')$$,
  'P0001', 'registro_invalido', 'usuário sem membro recebe registro_invalido');

select testes.como_postgres();

select * from finish();
rollback;
