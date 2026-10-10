-- api.registrar_pagamento_cartao: grava movimento_conta de pagamento de cartão,
-- debita a conta e não altera nenhum total, orçamento, gasto do cartão ou resultado.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(37);

-- Ids do seed: A = Leandro (…0101, usuário …00a1), B = Ana (…0102, usuário …00a2),
-- sem membro = usuário …00a3. Conta Itaú …0202, Pix Nubank …0301, Cartão XP …0303.
-- Dados de B e a conta arquivada de A nascem aqui (superusuário) e somem no rollback.
insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos)
select '00000000-0000-4000-8000-000000000d01', lar_id, id, 'Conta teste Ana', 10000
from app.membro where id = '00000000-0000-4000-8000-000000000102';

insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento)
select '00000000-0000-4000-8000-000000000d02', lar_id, id, 'Cartão teste Ana', 'credito',
       '00000000-0000-4000-8000-000000000d01', 5
from app.membro where id = '00000000-0000-4000-8000-000000000102';

insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos, arquivada)
select '00000000-0000-4000-8000-000000000d03', lar_id, id, 'Conta arquivada teste', 0, true
from app.membro where id = '00000000-0000-4000-8000-000000000101';

select set_config('teste.lancamentos_antes', (select count(*) from app.lancamento)::text, true);
select set_config('teste.parcelas_antes', (select count(*) from app.parcela)::text, true);

-- Como A: fotografia antes do pagamento
select testes.como_a();

select set_config('teste.mes', app.inicio_mes(app.hoje())::text, true);
select set_config('teste.saldo_antes',
  app.saldo_conta('00000000-0000-4000-8000-000000000202')::text, true);
select set_config('teste.saldo_amanha_antes',
  app.saldo_conta('00000000-0000-4000-8000-000000000202', app.hoje() + 1)::text, true);
select set_config('teste.resumo_antes',
  (api.resumo_mes(current_setting('teste.mes')::date) #- '{individual,contas}')::text, true);
select set_config('teste.orc_casa_antes',
  api.orcamento_mes(current_setting('teste.mes')::date, 'conjunto')::text, true);
select set_config('teste.orc_meu_antes',
  api.orcamento_mes(current_setting('teste.mes')::date, 'individual')::text, true);
select set_config('teste.gasto_antes',
  (select row(g.*)::text from app.gasto_cartao('00000000-0000-4000-8000-000000000303',
    current_setting('teste.mes')::date) g), true);
select set_config('teste.total_antes',
  coalesce(api.lancamentos_mes(current_setting('teste.mes')::date) ->> 'total_filtrado_centavos', ''), true);

-- Sucesso
select is(
  api.registrar_pagamento_cartao(
    p_id => '00000000-0000-4000-8000-000000000e01',
    p_forma_id => '00000000-0000-4000-8000-000000000303',
    p_conta_id => '00000000-0000-4000-8000-000000000202',
    p_valor_centavos => 50000),
  '00000000-0000-4000-8000-000000000e01'::uuid,
  'devolve o id enviado');

select results_eq(
  $$select tipo::text, sentido::text, valor_centavos, data, forma_credito_id, conta_id
      from app.movimento_conta where id = '00000000-0000-4000-8000-000000000e01'$$,
  $$values ('pagamento_cartao', 'saida', 50000::bigint, app.hoje(),
            '00000000-0000-4000-8000-000000000303'::uuid, '00000000-0000-4000-8000-000000000202'::uuid)$$,
  'grava um movimento_conta de pagamento de cartão, saída, com a data de hoje e a forma');

select is(
  app.saldo_conta('00000000-0000-4000-8000-000000000202'),
  current_setting('teste.saldo_antes')::bigint - 50000,
  'saldo da conta de origem cai exatamente o valor pago');

-- I-14: nenhum total muda
select is(
  api.resumo_mes(current_setting('teste.mes')::date) #- '{individual,contas}',
  current_setting('teste.resumo_antes')::jsonb,
  'resumo do mês igual, fora o saldo das contas');

select is(
  api.orcamento_mes(current_setting('teste.mes')::date, 'conjunto'),
  current_setting('teste.orc_casa_antes')::jsonb,
  'orçamento da casa igual');

select is(
  api.orcamento_mes(current_setting('teste.mes')::date, 'individual'),
  current_setting('teste.orc_meu_antes')::jsonb,
  'orçamento individual igual');

select is(
  (select row(g.*)::text from app.gasto_cartao('00000000-0000-4000-8000-000000000303',
    current_setting('teste.mes')::date) g),
  current_setting('teste.gasto_antes'),
  'gasto do cartão no mês e comprometido futuro iguais (o pagamento não abate)');

select is(
  coalesce(api.lancamentos_mes(current_setting('teste.mes')::date) ->> 'total_filtrado_centavos', ''),
  current_setting('teste.total_antes'),
  'total filtrado dos lançamentos do mês igual');

-- Idempotência
select is(
  api.registrar_pagamento_cartao(
    p_id => '00000000-0000-4000-8000-000000000e01',
    p_forma_id => '00000000-0000-4000-8000-000000000303',
    p_conta_id => '00000000-0000-4000-8000-000000000202',
    p_valor_centavos => 50000),
  '00000000-0000-4000-8000-000000000e01'::uuid,
  'reenvio com o mesmo id devolve o mesmo id');

select is(
  (select count(*)::int from app.movimento_conta where id = '00000000-0000-4000-8000-000000000e01'),
  1,
  'reenvio não duplica');

-- Recusas: registro_invalido
select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e02',
      '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000202', 1000)$$,
  'P0001', 'registro_invalido', 'forma Pix própria é recusada');

select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e03',
      '00000000-0000-4000-8000-000000000d02', '00000000-0000-4000-8000-000000000202', 1000)$$,
  'P0001', 'registro_invalido', 'forma de crédito de B é recusada como inexistente');

select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e04',
      '00000000-0000-4000-8000-00000000ffff', '00000000-0000-4000-8000-000000000202', 1000)$$,
  'P0001', 'registro_invalido', 'forma inexistente');

select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e05',
      '00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000d01', 1000)$$,
  'P0001', 'registro_invalido', 'conta de B é recusada');

select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e06',
      '00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000d03', 1000)$$,
  'P0001', 'registro_invalido', 'conta arquivada é recusada');

-- Recusas: valor_invalido
select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e07',
      '00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000202', 0)$$,
  'P0001', 'valor_invalido', 'valor zero');

select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e08',
      '00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000202', -100)$$,
  'P0001', 'valor_invalido', 'valor negativo');

select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e09',
      '00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000202', null)$$,
  'P0001', 'valor_invalido', 'valor nulo');

select throws_ok(
  $$select api.registrar_pagamento_cartao(null,
      '00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000202', 1000)$$,
  'P0001', 'valor_invalido', 'id nulo');

select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e0a',
      null, '00000000-0000-4000-8000-000000000202', 1000)$$,
  'P0001', 'valor_invalido', 'forma nula');

select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e0b',
      '00000000-0000-4000-8000-000000000303', null, 1000)$$,
  'P0001', 'valor_invalido', 'conta nula');

-- Data futura: gravada, fora do saldo de hoje, dentro do saldo do dia
select is(
  api.registrar_pagamento_cartao(
    p_id => '00000000-0000-4000-8000-000000000e0c',
    p_forma_id => '00000000-0000-4000-8000-000000000303',
    p_conta_id => '00000000-0000-4000-8000-000000000202',
    p_valor_centavos => 10000,
    p_data => app.hoje() + 1),
  '00000000-0000-4000-8000-000000000e0c'::uuid,
  'data futura é aceita');

select is(
  (select data from app.movimento_conta where id = '00000000-0000-4000-8000-000000000e0c'),
  app.hoje() + 1,
  'data futura gravada como enviada');

select is(
  app.saldo_conta('00000000-0000-4000-8000-000000000202'),
  current_setting('teste.saldo_antes')::bigint - 50000,
  'pagamento de amanhã não pesa no saldo de hoje');

select is(
  app.saldo_conta('00000000-0000-4000-8000-000000000202', app.hoje() + 1),
  current_setting('teste.saldo_amanha_antes')::bigint - 60000,
  'pagamento de amanhã pesa no saldo a partir do dia');

-- Como B
select testes.como_b();

select is(
  (select count(*)::int from app.movimento_conta where id = '00000000-0000-4000-8000-000000000e01'),
  0,
  'B não lê o movimento de pagamento de A');

select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e01',
      '00000000-0000-4000-8000-000000000d02', '00000000-0000-4000-8000-000000000d01', 1000)$$,
  'P0001', 'registro_invalido', 'B reusando o id de A recebe registro_invalido');

select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e0d',
      '00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000d01', 1000)$$,
  'P0001', 'registro_invalido', 'B com a forma de A recebe registro_invalido');

-- Sem membro
select testes.como_sem_membro();

select throws_ok(
  $$select api.registrar_pagamento_cartao('00000000-0000-4000-8000-000000000e0e',
      '00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000202', 1000)$$,
  'P0001', 'registro_invalido', 'usuário sem membro recebe registro_invalido');

-- Superusuário: efeitos
select testes.como_postgres();

select is(
  (select count(*)::int from app.movimento_conta where id in (
    '00000000-0000-4000-8000-000000000e02', '00000000-0000-4000-8000-000000000e03',
    '00000000-0000-4000-8000-000000000e04', '00000000-0000-4000-8000-000000000e05',
    '00000000-0000-4000-8000-000000000e06', '00000000-0000-4000-8000-000000000e07',
    '00000000-0000-4000-8000-000000000e08', '00000000-0000-4000-8000-000000000e09',
    '00000000-0000-4000-8000-000000000e0a', '00000000-0000-4000-8000-000000000e0b',
    '00000000-0000-4000-8000-000000000e0d', '00000000-0000-4000-8000-000000000e0e')),
  0,
  'nenhuma recusa gravou movimento');

select is(
  (select dono_id from app.movimento_conta where id = '00000000-0000-4000-8000-000000000e01'),
  '00000000-0000-4000-8000-000000000101'::uuid,
  'o movimento de A continua de A depois da tentativa de B');

select is(
  (select count(*)::text from app.lancamento) || '/' || (select count(*)::text from app.parcela),
  current_setting('teste.lancamentos_antes') || '/' || current_setting('teste.parcelas_antes'),
  'nenhum lançamento ou parcela criado');

-- Catálogo e privilégios
select is(
  (select prosecdef from pg_proc
    where oid = 'api.registrar_pagamento_cartao(uuid, uuid, uuid, bigint, date)'::regprocedure),
  false,
  'security invoker');

select ok(
  (select proconfig from pg_proc
    where oid = 'api.registrar_pagamento_cartao(uuid, uuid, uuid, bigint, date)'::regprocedure)
    @> array['search_path=""'],
  'search_path vazio');

select ok(
  not has_function_privilege('anon',
    'api.registrar_pagamento_cartao(uuid, uuid, uuid, bigint, date)', 'execute'),
  'anon sem execute');

select ok(
  has_function_privilege('authenticated',
    'api.registrar_pagamento_cartao(uuid, uuid, uuid, bigint, date)', 'execute'),
  'authenticated com execute');

select function_returns('api', 'registrar_pagamento_cartao',
  array['uuid', 'uuid', 'uuid', 'bigint', 'date'], 'uuid', 'retorna uuid');

select * from finish();
rollback;
