begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(11);

-- Chaves em cada nível iguais às de .md/mockup/respostas/dados-lancamento.json

select testes.como_a();

select is(
  (select array_agg(k order by k) from jsonb_object_keys(api.dados_lancamento()) k),
  array['categorias_despesa', 'categorias_receita', 'conta_receita_padrao_id', 'contas', 'forma_padrao_id', 'formas'],
  'chaves da raiz');
select is((select array_agg(distinct k order by k) from jsonb_array_elements(api.dados_lancamento()->'categorias_despesa') e, jsonb_object_keys(e) k),
  array['escopo', 'id', 'nome', 'variavel'], 'chaves de categorias_despesa');
select is((select array_agg(distinct k order by k) from jsonb_array_elements(api.dados_lancamento()->'categorias_receita') e, jsonb_object_keys(e) k),
  array['escopo', 'id', 'nome'], 'chaves de categorias_receita');
select is((select array_agg(distinct k order by k) from jsonb_array_elements(api.dados_lancamento()->'formas') e, jsonb_object_keys(e) k),
  array['id', 'nome', 'preferida', 'tipo'], 'chaves de formas');
select is((select array_agg(distinct k order by k) from jsonb_array_elements(api.dados_lancamento()->'contas') e, jsonb_object_keys(e) k),
  array['id', 'nome'], 'chaves de contas');

select ok(
  jsonb_typeof(api.dados_lancamento()->'categorias_despesa') = 'array'
  and jsonb_typeof(api.dados_lancamento()->'categorias_receita') = 'array'
  and jsonb_typeof(api.dados_lancamento()->'formas') = 'array'
  and jsonb_typeof(api.dados_lancamento()->'contas') = 'array',
  'as quatro listas são arrays');
select ok(
  jsonb_array_length(api.dados_lancamento()->'categorias_despesa') > 0
  and jsonb_array_length(api.dados_lancamento()->'formas') > 0
  and jsonb_array_length(api.dados_lancamento()->'contas') > 0,
  'com o seed, A tem categorias, formas e contas (as chaves acima foram conferidas em itens reais)');
select is(
  (select count(*)::int from jsonb_array_elements(api.dados_lancamento()->'formas') f
    where f ? 'conta_id' or f ? 'dono_id' or f ? 'saldo_centavos'),
  0, 'formas não trazem conta, dono nem saldo');

-- Privilégios e cabeçalho
select testes.como_postgres();
select ok(not has_function_privilege('anon', 'api.dados_lancamento()', 'execute'), 'anon não executa api.dados_lancamento');
select ok(has_function_privilege('authenticated', 'api.dados_lancamento()', 'execute'), 'authenticated executa api.dados_lancamento');
select is(
  (select proconfig from pg_proc where oid = 'api.dados_lancamento()'::regprocedure),
  array['search_path=""'], 'search_path vazio');

select * from finish();
rollback;
