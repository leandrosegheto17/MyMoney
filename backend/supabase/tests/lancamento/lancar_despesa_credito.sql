begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(8);

-- Seeds: Cartão de crédito XP …0303 (dia 10) de Leandro e Mercado …0401 (conjunta).
select testes.como_a();

select ok(set_config('teste.credito', api.lancar_despesa(
    'e6200000-0000-4000-8000-000000000011', 36000, '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000303', 3, '2026-10-15')::text, true) is not null,
  'A lança R$ 360 em 3x no crédito');

select is(current_setting('teste.credito')::jsonb,
  jsonb_build_object(
    'id', 'e6200000-0000-4000-8000-000000000011',
    'escopo', 'conjunto',
    'categoria', 'Mercado',
    'valor_total_centavos', 36000,
    'num_parcelas', 3,
    'primeira_parcela_data', '2026-11-10',
    'ja_existia', false),
  'resposta na forma de lancar-despesa-credito.json');

select results_eq(
  $$select numero::int, valor_centavos, data, data_ajustada from app.parcela
     where lancamento_id = 'e6200000-0000-4000-8000-000000000011' order by numero$$,
  $$values (1, 12000::bigint, '2026-11-10'::date, false), (2, 12000::bigint, '2026-12-10'::date, false),
           (3, 12000::bigint, '2027-01-10'::date, false)$$,
  '3 parcelas de R$ 120 em 10/11, 10/12 e 10/01');

select results_eq(
  $$select forma_pagamento_id, conta_id, data_operacao, dia_vencimento_aplicado::int
      from app.lancamento_pagamento where lancamento_id = 'e6200000-0000-4000-8000-000000000011'$$,
  $$values ('00000000-0000-4000-8000-000000000303'::uuid, null::uuid, '2026-10-15'::date, 10)$$,
  'crédito grava o dia aplicado e nenhuma conta');

select is(
  (select num_parcelas::int from app.lancamento where id = 'e6200000-0000-4000-8000-000000000011'),
  3, 'cabeçalho com 3 parcelas');

-- Trocar o dia da forma depois não mexe nas parcelas gravadas
select testes.como_postgres();
update app.forma_pagamento set dia_vencimento = 20 where id = '00000000-0000-4000-8000-000000000303';
select testes.como_a();

select results_eq(
  $$select data from app.parcela where lancamento_id = 'e6200000-0000-4000-8000-000000000011' order by numero$$,
  $$values ('2026-11-10'::date), ('2026-12-10'::date), ('2027-01-10'::date)$$,
  'mudar o dia da forma não altera as parcelas já lançadas');
select is(
  (select dia_vencimento_aplicado::int from app.lancamento_pagamento
    where lancamento_id = 'e6200000-0000-4000-8000-000000000011'),
  10, 'dia aplicado continua 10');

-- Lançamento novo usa o dia atual da forma
select is(
  api.lancar_despesa('e6200000-0000-4000-8000-000000000012', 5000, '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000303', 1, '2026-10-15')->>'primeira_parcela_data',
  '2026-11-20', 'compra nova usa o novo dia da forma');

select * from finish();
rollback;
