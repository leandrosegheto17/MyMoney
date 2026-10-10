-- api.resumo_mes: seção de fixas (fixas_total, fixas_pendentes, previsto_a_pagar e pendentes_previstos).
-- app.hoje() fixado em 2026-10-12; 4 fixas com vencimentos 05, 10, 15 e 08.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(25);

create or replace function app.hoje(p_instante timestamptz default now()) returns date
language sql stable set search_path = '' as $$ select date '2026-10-12' $$;

select testes.preparar_lar();

-- Cadastros de teste criados na transação (como postgres).
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('00000000-0000-4000-8000-00000000c401', '00000000-0000-4000-8000-000000000100', 'despesa', 'conjunto',   null,              'Moradia',        false),
  ('00000000-0000-4000-8000-00000000c402', '00000000-0000-4000-8000-000000000100', 'despesa', 'conjunto',   null,              'Contas da casa', false),
  ('00000000-0000-4000-8000-00000000c411', '00000000-0000-4000-8000-000000000100', 'despesa', 'individual', testes.membro_a(), 'Transporte',     true),
  ('00000000-0000-4000-8000-00000000c412', '00000000-0000-4000-8000-000000000100', 'despesa', 'individual', testes.membro_b(), 'Transporte',     true),
  ('00000000-0000-4000-8000-00000000c421', '00000000-0000-4000-8000-000000000100', 'receita', 'individual', testes.membro_a(), 'Salário',        null);
insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos) values
  ('00000000-0000-4000-8000-00000000c201', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Nubank',    250000),
  ('00000000-0000-4000-8000-00000000c202', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Itaú',      80000),
  ('00000000-0000-4000-8000-00000000c211', '00000000-0000-4000-8000-000000000100', testes.membro_b(), 'Conta Ana', 100000);
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento, preferida) values
  ('00000000-0000-4000-8000-00000000c301', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Pix Nubank',           'pix',     '00000000-0000-4000-8000-00000000c201', null, true),
  ('00000000-0000-4000-8000-00000000c302', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Débito Itaú',          'debito',  '00000000-0000-4000-8000-00000000c202', null, false),
  ('00000000-0000-4000-8000-00000000c303', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Cartão de crédito XP', 'credito', '00000000-0000-4000-8000-00000000c202', 10,   false),
  ('00000000-0000-4000-8000-00000000c311', '00000000-0000-4000-8000-000000000100', testes.membro_b(), 'Pix Ana',              'pix',     '00000000-0000-4000-8000-00000000c211', null, true);

insert into app.despesa_fixa (id, lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento, inicio) values
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Internet',   '00000000-0000-4000-8000-00000000c402', 11990,  5,  '2026-10-01'),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Aluguel',    '00000000-0000-4000-8000-00000000c401', 120000, 10, '2026-10-01'),
  ('00000000-0000-4000-8000-00000000d703', '00000000-0000-4000-8000-000000000100', 'Condomínio', '00000000-0000-4000-8000-00000000c401', 22010,  15, '2026-10-01'),
  ('00000000-0000-4000-8000-00000000d704', '00000000-0000-4000-8000-000000000100', 'Luz',        '00000000-0000-4000-8000-00000000c402', 18000,  8,  '2026-10-01');

-- Catálogo
select is((select provolatile::text from pg_proc where oid = 'api.resumo_mes(date)'::regprocedure),
  'v', 'resumo_mes passa a volatile (escreve pelo garantir)');
select ok(not (select prosecdef from pg_proc where oid = 'api.resumo_mes(date)'::regprocedure),
  'resumo_mes continua security invoker');
select ok(not has_function_privilege('anon', 'api.resumo_mes(date)', 'execute'), 'anon não executa resumo_mes');

-- Mês sem ocorrências: a chamada cria 1 por fixa ativa
select testes.como_a();
select is((api.resumo_mes('2026-10-01') -> 'conjunto' ->> 'fixas_total')::int, 4, 'fixas_total = 4');
select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2026-10-01'), 4,
  'a chamada criou exatamente 1 ocorrência por fixa ativa');
select testes.como_a();
select lives_ok($$select api.resumo_mes('2026-10-01')$$, 'segunda chamada');
select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2026-10-01'), 4, 'segunda chamada não duplica');

-- A paga o Aluguel (10/10) no Pix
select testes.como_a();
select lives_ok(
  $$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e501',
      (select id from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d702' and mes = '2026-10-01'), '00000000-0000-4000-8000-00000000c301')$$,
  'A paga o Aluguel');

select results_eq(
  $$select e ->> 'vencimento', e ->> 'situacao', e ->> 'descricao'
    from jsonb_array_elements(api.resumo_mes('2026-10-01') -> 'conjunto' -> 'fixas_pendentes') with ordinality as x(e, n)
    order by n$$,
  $$values ('2026-10-05', 'atrasada', 'Internet'), ('2026-10-08', 'atrasada', 'Luz'), ('2026-10-15', 'pendente', 'Condomínio')$$,
  'atrasadas primeiro (05 e 08), depois a pendente de 15/10; a paga fica fora');
select is(
  (select array_agg(k order by k) from (select distinct jsonb_object_keys(e) as k
     from jsonb_array_elements(api.resumo_mes('2026-10-01') -> 'conjunto' -> 'fixas_pendentes') e) s),
  array['descricao', 'ocorrencia_id', 'situacao', 'valor_previsto_centavos', 'vencimento'],
  'itens de fixas_pendentes na forma de resumo-mes.json, sem pagador, forma ou data de pagamento');
select is(
  (select (e ->> 'ocorrencia_id')::uuid
   from jsonb_array_elements(api.resumo_mes('2026-10-01') -> 'conjunto' -> 'fixas_pendentes') e
   where e ->> 'descricao' = 'Condomínio'),
  (select id from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d703' and mes = '2026-10-01'),
  'ocorrencia_id é o id da ocorrência');
select is((r -> 'conjunto' ->> 'fixas_total')::int, 4, 'fixas_total continua 4 com uma paga')
  from api.resumo_mes('2026-10-01') as t(r);
select is((r -> 'conjunto' ->> 'previsto_a_pagar_centavos')::bigint, 52000::bigint,
  'previsto_a_pagar = 11990 + 18000 + 22010')
  from api.resumo_mes('2026-10-01') as t(r);
select is((r ->> 'pendentes_previstos_centavos')::bigint, 52000::bigint, 'pendentes_previstos = previsto_a_pagar')
  from api.resumo_mes('2026-10-01') as t(r);

-- B vê o mesmo bloco de fixas
select set_config('teste.fixas_a',
  (select jsonb_build_object('total', r -> 'conjunto' -> 'fixas_total',
                             'pendentes', r -> 'conjunto' -> 'fixas_pendentes',
                             'previsto', r -> 'conjunto' -> 'previsto_a_pagar_centavos',
                             'pendentes_previstos', r -> 'pendentes_previstos_centavos')::text
   from api.resumo_mes('2026-10-01') as t(r)), true);
select testes.como_b();
select is(
  jsonb_build_object('total', r -> 'conjunto' -> 'fixas_total',
                     'pendentes', r -> 'conjunto' -> 'fixas_pendentes',
                     'previsto', r -> 'conjunto' -> 'previsto_a_pagar_centavos',
                     'pendentes_previstos', r -> 'pendentes_previstos_centavos'),
  current_setting('teste.fixas_a')::jsonb, 'B vê o mesmo bloco de fixas que A')
  from api.resumo_mes('2026-10-01') as t(r);

-- A paga a Luz (08/10) no Crédito em 03/11 com 18740: entra no total de outubro, não no de novembro
select testes.como_a();
select set_config('teste.total_out', (api.resumo_mes('2026-10-01') -> 'conjunto' ->> 'total_centavos'), true);
select set_config('teste.total_nov', (api.resumo_mes('2026-11-01') -> 'conjunto' ->> 'total_centavos'), true);
select lives_ok(
  $$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e502',
      (select id from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d704' and mes = '2026-10-01'),
      '00000000-0000-4000-8000-00000000c303', 18740, '2026-11-03')$$,
  'A paga a Luz no Crédito em 03/11');
select is((api.resumo_mes('2026-10-01') -> 'conjunto' ->> 'total_centavos')::bigint,
  current_setting('teste.total_out')::bigint + 18740, 'o total do conjunto de outubro sobe o valor efetivo');
select is((api.resumo_mes('2026-11-01') -> 'conjunto' ->> 'total_centavos')::bigint,
  current_setting('teste.total_nov')::bigint, 'o total do conjunto de novembro não muda');
select is((api.resumo_mes('2026-10-01') -> 'conjunto' ->> 'previsto_a_pagar_centavos')::bigint, 34000::bigint,
  'previsto_a_pagar cai o previsto da Luz');
select is((api.resumo_mes('2026-10-01') ->> 'pendentes_previstos_centavos')::bigint, 34000::bigint,
  'pendentes_previstos acompanha');
select is(jsonb_array_length(api.resumo_mes('2026-10-01') -> 'conjunto' -> 'fixas_pendentes'), 2,
  'restam 2 fixas pendentes');

-- Mês sem fixas
select is((r -> 'conjunto' ->> 'fixas_total')::int, 0, 'mês sem fixas: fixas_total = 0')
  from api.resumo_mes('2026-09-01') as t(r);
select is(r -> 'conjunto' -> 'fixas_pendentes', '[]'::jsonb, 'mês sem fixas: fixas_pendentes = []')
  from api.resumo_mes('2026-09-01') as t(r);
select is((r -> 'conjunto' ->> 'previsto_a_pagar_centavos')::bigint, 0::bigint, 'mês sem fixas: previsto_a_pagar = 0')
  from api.resumo_mes('2026-09-01') as t(r);
select is((r ->> 'pendentes_previstos_centavos')::bigint, 0::bigint, 'mês sem fixas: pendentes_previstos = 0')
  from api.resumo_mes('2026-09-01') as t(r);

select * from finish();
rollback;
