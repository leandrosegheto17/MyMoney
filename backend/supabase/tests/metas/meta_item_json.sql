begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(9);

select is(app.prazo_meta_texto('2026-12-15'), '2026-12', 'prazo em texto YYYY-MM');
select is(app.prazo_meta_texto(null), null, 'sem prazo, nulo');
select ok(
  (select p.prosecdef = false and p.proconfig @> array['search_path=""'] from pg_proc p where p.oid = 'app.meta_item_json(uuid)'::regprocedure),
  'meta_item_json é security invoker com search_path vazio');
select ok(not has_function_privilege('anon', 'app.meta_item_json(uuid)', 'execute'),
  'anon não executa meta_item_json');

select testes.como_a();

select is(
  (select array_agg(k order by k) from jsonb_object_keys(app.meta_item_json('00000000-0000-4000-8000-000000000903')) k),
  array['alvo_centavos', 'atingida', 'falta_centavos', 'guardado_centavos', 'mensal_necessario_centavos',
        'meta_id', 'nome', 'percentual', 'prazo'],
  'item com as chaves do resumo, sem escopo nem por_local');
select is(
  app.meta_item_json('00000000-0000-4000-8000-000000000903') ->> 'prazo',
  (select prazo from api.metas where id = '00000000-0000-4000-8000-000000000903'),
  'prazo do item = prazo de api.metas');
select is(
  (select i from jsonb_array_elements(api.resumo_mes('2026-10-01') -> 'individual' -> 'metas') i
    where i ->> 'meta_id' = '00000000-0000-4000-8000-000000000903'),
  app.meta_item_json('00000000-0000-4000-8000-000000000903'),
  'resumo_mes usa o item da função');
select is(app.meta_item_json('00000000-0000-4000-8000-000000000911'), null,
  'meta individual de B é invisível para A (RLS)');
select is(app.meta_item_json('00000000-0000-4000-8000-0000000fffff'), null, 'meta inexistente, nulo');

select * from finish();
rollback;
