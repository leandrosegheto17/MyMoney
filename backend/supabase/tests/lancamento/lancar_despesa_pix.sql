begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(18);

-- Seeds: Pix Nubank …0301 (conta …0201), Débito Itaú …0302 (conta …0202),
-- Mercado …0401 (conjunta) e Transporte …0413 (individual de Leandro).
select testes.como_a();

-- Pix com categoria conjunta
select ok(set_config('teste.pix', api.lancar_despesa(
    'e6200000-0000-4000-8000-000000000001', 5000, '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000301', 1, '2026-10-20', '  Feira  ')::text, true) is not null,
  'A lança despesa no Pix');
select is(current_setting('teste.pix')::jsonb->>'escopo', 'conjunto', 'escopo vem da categoria conjunta');
select is(current_setting('teste.pix')::jsonb->>'primeira_parcela_data', '2026-10-20',
  'primeira parcela na data da operação');
select is((current_setting('teste.pix')::jsonb->>'num_parcelas')::int, 1, 'Pix tem 1 parcela');
select is((current_setting('teste.pix')::jsonb->>'ja_existia')::boolean, false, 'primeiro envio: ja_existia falso');
select results_eq(
  $$select numero::int, valor_centavos, data, data_ajustada from app.parcela
     where lancamento_id = 'e6200000-0000-4000-8000-000000000001'$$,
  $$values (1, 5000::bigint, '2026-10-20'::date, false)$$,
  'uma parcela com o total na data informada');
select results_eq(
  $$select forma_pagamento_id, conta_id, data_operacao, dia_vencimento_aplicado::int
      from app.lancamento_pagamento where lancamento_id = 'e6200000-0000-4000-8000-000000000001'$$,
  $$values ('00000000-0000-4000-8000-000000000301'::uuid, '00000000-0000-4000-8000-000000000201'::uuid,
            '2026-10-20'::date, null::int)$$,
  'parte privada com a forma, a conta da forma e a data da operação');
select results_eq(
  $$select tipo, escopo, dono_id, categoria_id, descricao, valor_total_centavos, num_parcelas::int
      from app.lancamento where id = 'e6200000-0000-4000-8000-000000000001'$$,
  $$values ('despesa'::text, 'conjunto'::text, testes.membro_a(), '00000000-0000-4000-8000-000000000401'::uuid,
            'Feira'::text, 5000::bigint, 1)$$,
  'cabeçalho: despesa conjunta, pagador = quem lançou, descrição aparada');

-- Débito com categoria individual
select ok(set_config('teste.debito', api.lancar_despesa(
    'e6200000-0000-4000-8000-000000000002', 3000, '00000000-0000-4000-8000-000000000413',
    '00000000-0000-4000-8000-000000000302', 1, '2026-10-21')::text, true) is not null,
  'A lança despesa no Débito');
select is(current_setting('teste.debito')::jsonb->>'escopo', 'individual', 'escopo vem da categoria individual');
select is(
  (select conta_id from app.lancamento_pagamento where lancamento_id = 'e6200000-0000-4000-8000-000000000002'),
  '00000000-0000-4000-8000-000000000202'::uuid, 'Débito grava a conta da forma');
select is(
  (select escopo from app.parcela where lancamento_id = 'e6200000-0000-4000-8000-000000000002'),
  'individual', 'parcela herda o escopo individual');
select is(
  (select descricao from app.lancamento where id = 'e6200000-0000-4000-8000-000000000002'),
  null::text, 'sem descrição grava nulo');

-- Sem data: hoje em São Paulo
select ok(set_config('teste.hoje', api.lancar_despesa(
    'e6200000-0000-4000-8000-000000000003', 1500, '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000301')::text, true) is not null,
  'A lança sem informar data nem parcelas');
select is((current_setting('teste.hoje')::jsonb->>'primeira_parcela_data')::date, app.hoje(),
  'resposta traz app.hoje() como data');
select is(
  (select data_operacao from app.lancamento_pagamento where lancamento_id = 'e6200000-0000-4000-8000-000000000003'),
  app.hoje(), 'data da operação padrão = app.hoje()');
select is(
  (select data from app.parcela where lancamento_id = 'e6200000-0000-4000-8000-000000000003'),
  app.hoje(), 'parcela na data de hoje');
select is(
  (select count(*)::int from app.lancamento_pagamento where lancamento_id in (
     'e6200000-0000-4000-8000-000000000001', 'e6200000-0000-4000-8000-000000000002',
     'e6200000-0000-4000-8000-000000000003')),
  3, 'uma linha de pagamento por lançamento');

select * from finish();
rollback;
