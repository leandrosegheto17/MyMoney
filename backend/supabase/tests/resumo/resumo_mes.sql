begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(28);

-- Conta arquivada de A; conta e cartão de B
insert into app.conta (id, lar_id, dono_id, nome, arquivada) values
  ('e8700000-0000-4000-8000-0000000000c1', (select id from app.lar), testes.membro_a(), 'Conta arquivada A', true),
  ('e8700000-0000-4000-8000-0000000000c2', (select id from app.lar), testes.membro_b(), 'Conta teste B', false);
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e8700000-0000-4000-8000-0000000000f2', (select id from app.lar), testes.membro_b(), 'Crédito de B', 'credito', null, 5);

select testes.como_a();

-- Estrutura (mês do seed)
select is(
  (select array_agg(k order by k) from jsonb_object_keys(api.resumo_mes('2026-10-01')) k),
  array['conjunto', 'individual', 'mes', 'mes_fechado', 'pendentes_previstos_centavos'],
  'chaves da raiz');
select is(
  (select array_agg(k order by k) from jsonb_object_keys(api.resumo_mes('2026-10-01')->'conjunto') k),
  array['fixas_pendentes', 'fixas_total', 'metas', 'orcamento', 'pago_por_membro', 'por_categoria',
        'previsto_a_pagar_centavos', 'resultado', 'total_centavos', 'total_variaveis_centavos'],
  'chaves do bloco conjunto');
select is(
  (select array_agg(k order by k) from jsonb_object_keys(api.resumo_mes('2026-10-01')->'individual') k),
  array['contas', 'credito', 'guardado_no_mes_centavos', 'metas', 'meu_individual_centavos', 'meu_total_centavos',
        'minha_parte_conjunto_centavos', 'minha_parte_por_categoria', 'orcamento', 'por_categoria',
        'receitas_centavos', 'resultado', 'total_variaveis_centavos'],
  'chaves do bloco individual');
select is(
  (select array_agg(k order by k) from jsonb_object_keys(api.resumo_mes('2026-10-01')->'conjunto'->'resultado') k),
  array['parcial', 'valor_centavos'], 'chaves de conjunto.resultado');

-- Mês
select is(api.resumo_mes('2026-10-17')->>'mes', '2026-10-01', 'mês normalizado para o dia 1');
select is((api.resumo_mes(null)->>'mes')::date, app.inicio_mes(app.hoje()), 'sem mês: mês corrente');

-- Fechado e parcial
select is(
  jsonb_build_array(r->'mes_fechado', r->'conjunto'->'resultado'->'parcial', r->'individual'->'resultado'->'parcial'),
  '[true, false, false]'::jsonb, 'mês passado: fechado e sem rótulo parcial')
from (select api.resumo_mes((app.inicio_mes(app.hoje()) - interval '1 month')::date) r) t;
select is(
  jsonb_build_array(r->'mes_fechado', r->'conjunto'->'resultado'->'parcial', r->'individual'->'resultado'->'parcial'),
  '[false, true, true]'::jsonb, 'mês corrente: aberto e parcial')
from (select api.resumo_mes(app.hoje()) r) t;
select is(
  jsonb_build_array(r->'mes_fechado', r->'conjunto'->'resultado'->'parcial', r->'individual'->'resultado'->'parcial'),
  '[false, true, true]'::jsonb, 'mês futuro: aberto e parcial')
from (select api.resumo_mes((app.inicio_mes(app.hoje()) + interval '2 months')::date) r) t;

-- Seções que ainda não existem
select is((api.resumo_mes('2026-10-01')->>'pendentes_previstos_centavos')::bigint, 0::bigint, 'pendentes previstos 0');
select is(
  (select jsonb_build_array(c->'previsto_a_pagar_centavos', c->'fixas_total', c->'fixas_pendentes', c->'orcamento', c->'metas')
     from (select api.resumo_mes('2026-10-01')->'conjunto' c) t),
  '[0, 0, [], null, []]'::jsonb, 'conjunto: previsto, fixas, orçamento e metas vazios');
select is(
  (select jsonb_build_array(i->'guardado_no_mes_centavos', i->'orcamento', i->'metas')
     from (select api.resumo_mes('2026-10-01')->'individual' i) t),
  '[0, null, []]'::jsonb, 'individual: guardado, orçamento e metas vazios');

-- Composição das regras
select is(
  (api.resumo_mes('2026-10-01')->'conjunto')
    - array['previsto_a_pagar_centavos', 'fixas_total', 'fixas_pendentes', 'orcamento', 'metas', 'resultado'],
  app.totais_conjunto('2026-10-01'),
  'bloco conjunto = app.totais_conjunto');
select is(
  (api.resumo_mes('2026-10-01')->'individual')
    - array['guardado_no_mes_centavos', 'orcamento', 'metas', 'contas', 'credito', 'resultado'],
  app.totais_individuais('2026-10-01') - 'resultado',
  'bloco individual = app.totais_individuais');
select is(
  api.resumo_mes('2026-10-01')->'individual'->'resultado'->'valor_centavos',
  app.totais_individuais('2026-10-01')->'resultado'->'valor_centavos',
  'resultado individual vem de app.totais_individuais');

-- Contas e cartões do membro
select is(
  api.resumo_mes('2026-10-01')->'individual'->'contas',
  (select jsonb_agg(jsonb_build_object('conta_id', c.id, 'nome', c.nome, 'saldo_centavos', app.saldo_conta(c.id))
                    order by c.nome)
     from app.conta c where c.dono_id = testes.membro_a() and not c.arquivada),
  'contas ativas de A por nome, saldo de app.saldo_conta');
select is(
  (select count(*)::int from jsonb_array_elements(api.resumo_mes('2026-10-01')->'individual'->'contas') c
    where c->>'conta_id' = 'e8700000-0000-4000-8000-0000000000c1'),
  0, 'conta arquivada não aparece');
select is(
  api.resumo_mes('2026-10-01')->'individual'->'credito',
  (select jsonb_agg(jsonb_build_object('forma_id', f.id, 'nome', f.nome, 'dia_vencimento', f.dia_vencimento,
                                       'gasto_mes_centavos', g.gasto_mes_centavos,
                                       'comprometido_futuro_centavos', g.comprometido_futuro_centavos)
                    order by f.nome)
     from app.forma_pagamento f, app.gasto_cartao(f.id, '2026-10-01') g
    where f.dono_id = testes.membro_a() and f.tipo = 'credito' and not f.arquivada),
  'cartões de crédito de A com os valores de app.gasto_cartao');
select is(
  (select count(*)::int from jsonb_array_elements(api.resumo_mes('2026-10-01')->'individual'->'credito') c
    where c->>'forma_id' in ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000302')),
  0, 'Pix e Débito não aparecem em crédito');
select ok(
  (select bool_and(c->>'conta_id' <> 'e8700000-0000-4000-8000-0000000000c2')
     from jsonb_array_elements(api.resumo_mes('2026-10-01')->'individual'->'contas') c)
  and (select bool_and(c->>'forma_id' <> 'e8700000-0000-4000-8000-0000000000f2')
     from jsonb_array_elements(api.resumo_mes('2026-10-01')->'individual'->'credito') c),
  'A não recebe conta nem cartão de B');

select ok(set_config('teste.conjunto_a', (api.resumo_mes('2026-10-01')->'conjunto')::text, true) is not null,
  'resumo calculado como A');

-- B
select testes.como_b();
select is(api.resumo_mes('2026-10-01')->'conjunto', current_setting('teste.conjunto_a')::jsonb,
  'B recebe o mesmo bloco conjunto que A');
select is(
  (select count(*)::int from jsonb_array_elements(api.resumo_mes('2026-10-01')->'individual'->'contas') c
    where c->>'conta_id' in ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000202')),
  0, 'B não recebe contas de A');
select is(
  (select count(*)::int from jsonb_array_elements(api.resumo_mes('2026-10-01')->'individual'->'credito') c
    where c->>'forma_id' = '00000000-0000-4000-8000-000000000303'),
  0, 'B não recebe o cartão de A');
select is(
  (select array_agg(c->>'forma_id') from jsonb_array_elements(api.resumo_mes('2026-10-01')->'individual'->'credito') c
    where c->>'forma_id' = 'e8700000-0000-4000-8000-0000000000f2'),
  array['e8700000-0000-4000-8000-0000000000f2'], 'B recebe o próprio cartão');

-- Sem membro e privilégios
select testes.como_sem_membro();
select throws_ok($$select api.resumo_mes('2026-10-01')$$, null, 'registro_invalido', 'usuário sem membro');

select testes.como_postgres();
select ok(not has_function_privilege('anon', 'api.resumo_mes(date)', 'execute'), 'anon não executa api.resumo_mes');
select ok(has_function_privilege('authenticated', 'api.resumo_mes(date)', 'execute'), 'authenticated executa api.resumo_mes');

select * from finish();
rollback;
