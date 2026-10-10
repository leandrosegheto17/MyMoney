begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(15);

-- Forma de B para os reenvios de B
insert into app.conta (id, lar_id, dono_id, nome) values
  ('e6200000-0000-4000-8000-0000000000c3', (select id from app.lar), testes.membro_b(), 'Conta teste B');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id) values
  ('e6200000-0000-4000-8000-0000000000f3', (select id from app.lar), testes.membro_b(), 'Pix teste B', 'pix',
   'e6200000-0000-4000-8000-0000000000c3');

select testes.como_a();

select ok(set_config('teste.r1', api.lancar_despesa(
    'e6200000-0000-4000-8000-000000000031', 36000, '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000303', 3, '2026-10-15')::text, true) is not null,
  'primeiro envio');
select ok(set_config('teste.r2', api.lancar_despesa(
    'e6200000-0000-4000-8000-000000000031', 36000, '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000303', 3, '2026-10-15')::text, true) is not null,
  'reenvio com o mesmo id não dá erro');

select is((current_setting('teste.r1')::jsonb->>'ja_existia')::boolean, false, 'primeira resposta: ja_existia falso');
select is(current_setting('teste.r2')::jsonb,
  current_setting('teste.r1')::jsonb || '{"ja_existia": true}'::jsonb,
  'segunda resposta igual à primeira, com ja_existia verdadeiro');

select is((select count(*)::int from app.lancamento where id = 'e6200000-0000-4000-8000-000000000031'), 1,
  'um único lançamento');
select is((select count(*)::int from app.lancamento_pagamento where lancamento_id = 'e6200000-0000-4000-8000-000000000031'), 1,
  'uma única linha de pagamento');
select is((select count(*)::int from app.parcela where lancamento_id = 'e6200000-0000-4000-8000-000000000031'), 3,
  'as 3 parcelas, sem duplicar');

-- Reenvio com parâmetros diferentes não altera nada
select is(
  (api.lancar_despesa('e6200000-0000-4000-8000-000000000031', 99999, '00000000-0000-4000-8000-000000000413',
     '00000000-0000-4000-8000-000000000301', 1, '2026-12-01')->>'ja_existia')::boolean,
  true, 'reenvio com outros valores devolve o gravado');
select results_eq(
  $$select valor_total_centavos, num_parcelas::int, categoria_id, escopo from app.lancamento
     where id = 'e6200000-0000-4000-8000-000000000031'$$,
  $$values (36000::bigint, 3, '00000000-0000-4000-8000-000000000401'::uuid, 'conjunto'::text)$$,
  'cabeçalho continua o do primeiro envio');
select results_eq(
  $$select forma_pagamento_id, data_operacao from app.lancamento_pagamento
     where lancamento_id = 'e6200000-0000-4000-8000-000000000031'$$,
  $$values ('00000000-0000-4000-8000-000000000303'::uuid, '2026-10-15'::date)$$,
  'parte privada continua a do primeiro envio');
select is((select sum(valor_centavos)::bigint from app.parcela where lancamento_id = 'e6200000-0000-4000-8000-000000000031'),
  36000::bigint, 'parcelas continuam somando o total original');

-- Individual de A, para o reenvio de B
select ok(api.lancar_despesa('e6200000-0000-4000-8000-000000000032', 2000, '00000000-0000-4000-8000-000000000413',
    '00000000-0000-4000-8000-000000000301', 1, '2026-10-15') is not null, 'A lança uma individual');

-- B reusando ids de A
select testes.como_b();
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-000000000032', 2000,
    '00000000-0000-4000-8000-000000000401', 'e6200000-0000-4000-8000-0000000000f3')$$,
  null, 'registro_invalido', 'B com o id de uma individual de A recebe registro_invalido');
select throws_ok($$select api.lancar_despesa('e6200000-0000-4000-8000-000000000031', 36000,
    '00000000-0000-4000-8000-000000000401', 'e6200000-0000-4000-8000-0000000000f3')$$,
  null, 'registro_invalido', 'B com o id de uma conjunta de A recebe registro_invalido');

select testes.como_postgres();
select results_eq(
  $$select id, dono_id from app.lancamento
     where id in ('e6200000-0000-4000-8000-000000000031', 'e6200000-0000-4000-8000-000000000032') order by id$$,
  $$values ('e6200000-0000-4000-8000-000000000031'::uuid, testes.membro_a()),
           ('e6200000-0000-4000-8000-000000000032'::uuid, testes.membro_a())$$,
  'os lançamentos de A continuam sendo de A');

select * from finish();
rollback;
