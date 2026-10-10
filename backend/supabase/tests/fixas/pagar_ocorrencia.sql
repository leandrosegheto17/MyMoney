-- api.pagar_ocorrencia: lançamento conjunto do pagador, 1 parcela no vencimento, parte privada com a data do pagamento.
-- Ocorrências de outubro/2026 com vencimento 10/10; app.hoje() fixado em 2026-10-12 dentro da transação.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(34);

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
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Condomínio', '00000000-0000-4000-8000-00000000c401', 22010, 10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Luz',        '00000000-0000-4000-8000-00000000c402', 18000, 10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d703', '00000000-0000-4000-8000-000000000100', 'Gás',        '00000000-0000-4000-8000-00000000c402', 5000,  10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d704', '00000000-0000-4000-8000-000000000100', 'Internet',   '00000000-0000-4000-8000-00000000c402', 11990, 10, '2026-01-01');
insert into app.ocorrencia_fixa (id, lar_id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos) values
  ('00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d701', '2026-10-01', '2026-10-10', 22010),
  ('00000000-0000-4000-8000-00000000d802', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d702', '2026-10-01', '2026-10-10', 18000),
  ('00000000-0000-4000-8000-00000000d803', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d703', '2026-10-01', '2026-10-10', 5000),
  ('00000000-0000-4000-8000-00000000d804', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d704', '2026-10-01', '2026-10-10', 11990);

-- Catálogo
select ok(not (select prosecdef from pg_proc where oid = 'api.pagar_ocorrencia(uuid,uuid,uuid,bigint,date)'::regprocedure),
  'pagar_ocorrencia é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc
           where oid = 'api.pagar_ocorrencia(uuid,uuid,uuid,bigint,date)'::regprocedure),
  'pagar_ocorrencia com search_path vazio');
select ok(not has_function_privilege('anon', 'api.pagar_ocorrencia(uuid,uuid,uuid,bigint,date)', 'execute'),
  'anon não executa pagar_ocorrencia');

-- Pix de A, sem valor nem data
select set_config('teste.saldo_nubank', app.saldo_conta('00000000-0000-4000-8000-00000000c201')::text, true);
select testes.como_a();
select is((api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-00000000c301') ->> 'ja_existia')::boolean, false,
  'Pix de A: primeira chamada com ja_existia = false');

select testes.como_postgres();
select results_eq(
  $$select dono_id, tipo::text, escopo::text, categoria_id, descricao, valor_total_centavos, num_parcelas::int
    from app.lancamento where id = '00000000-0000-4000-8000-00000000e501'$$,
  $$values ('00000000-0000-4000-8000-000000000101'::uuid, 'despesa'::text, 'conjunto'::text, '00000000-0000-4000-8000-00000000c401'::uuid, 'Condomínio'::text, 22010::bigint, 1)$$,
  'lançamento conjunto de A com a categoria e a descrição da fixa e o valor previsto');
select results_eq(
  $$select numero::int, valor_centavos, data from app.parcela where lancamento_id = '00000000-0000-4000-8000-00000000e501'$$,
  $$values (1, 22010::bigint, '2026-10-10'::date)$$,
  '1 parcela no vencimento da ocorrência');
select results_eq(
  $$select forma_pagamento_id, conta_id, data_operacao from app.lancamento_pagamento where lancamento_id = '00000000-0000-4000-8000-00000000e501'$$,
  $$values ('00000000-0000-4000-8000-00000000c301'::uuid, '00000000-0000-4000-8000-00000000c201'::uuid, '2026-10-12'::date)$$,
  'parte privada com a forma, a conta da forma e data_operacao = app.hoje()');
select is((select lancamento_id from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d801'), '00000000-0000-4000-8000-00000000e501'::uuid,
  'a ocorrência fica ligada ao lançamento');
select is(app.saldo_conta('00000000-0000-4000-8000-00000000c201'), current_setting('teste.saldo_nubank')::bigint - 22010,
  'o saldo da conta do Pix cai o valor pago');

-- Débito com valor e data
select set_config('teste.saldo_itau', app.saldo_conta('00000000-0000-4000-8000-00000000c202')::text, true);
select testes.como_a();
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e502', '00000000-0000-4000-8000-00000000d802', '00000000-0000-4000-8000-00000000c302', 18740, '2026-10-08')$$,
  'Débito com valor 18740 e data 08/10');
select testes.como_postgres();
select results_eq(
  $$select numero::int, valor_centavos, data from app.parcela where lancamento_id = '00000000-0000-4000-8000-00000000e502'$$,
  $$values (1, 18740::bigint, '2026-10-10'::date)$$,
  'parcela de 18740 no vencimento 10/10, não na data do pagamento');
select results_eq(
  $$select conta_id, data_operacao from app.lancamento_pagamento where lancamento_id = '00000000-0000-4000-8000-00000000e502'$$,
  $$values ('00000000-0000-4000-8000-00000000c202'::uuid, '2026-10-08'::date)$$,
  'data_operacao 08/10 na conta do débito');
select is(app.saldo_conta('00000000-0000-4000-8000-00000000c202'), current_setting('teste.saldo_itau')::bigint - 18740,
  'o saldo da conta do débito cai o valor pago');

-- Crédito pago em 03/11
select set_config('teste.saldo_nubank', app.saldo_conta('00000000-0000-4000-8000-00000000c201')::text, true);
select set_config('teste.saldo_itau', app.saldo_conta('00000000-0000-4000-8000-00000000c202')::text, true);
select testes.como_a();
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e503', '00000000-0000-4000-8000-00000000d803', '00000000-0000-4000-8000-00000000c303', null, '2026-11-03')$$,
  'Crédito pago em 03/11');
select testes.como_postgres();
select results_eq(
  $$select numero::int, valor_centavos, data from app.parcela where lancamento_id = '00000000-0000-4000-8000-00000000e503'$$,
  $$values (1, 5000::bigint, '2026-10-10'::date)$$,
  'crédito: parcela única no vencimento (competência de outubro)');
select results_eq(
  $$select conta_id, dia_vencimento_aplicado::int, data_operacao from app.lancamento_pagamento where lancamento_id = '00000000-0000-4000-8000-00000000e503'$$,
  $$values (null::uuid, 10, '2026-11-03'::date)$$,
  'crédito: conta nula, dia de vencimento do cartão gravado e data do pagamento');
select is(app.saldo_conta('00000000-0000-4000-8000-00000000c201'), current_setting('teste.saldo_nubank')::bigint, 'crédito não muda o saldo do Nubank');
select is(app.saldo_conta('00000000-0000-4000-8000-00000000c202'), current_setting('teste.saldo_itau')::bigint, 'crédito não muda o saldo do Itaú');

-- Idempotência e ocorrência já paga
select testes.como_a();
select is((api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-00000000c301') ->> 'ja_existia')::boolean, true,
  'reenvio do mesmo id → ja_existia = true');
select ok(
  not (api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-00000000c301')
       ?| array['forma', 'forma_pagamento_id', 'conta', 'conta_id', 'data_operacao', 'data']),
  'a resposta não traz forma, conta nem data do pagamento');
select testes.como_postgres();
select is((select count(*)::int from app.lancamento where id = '00000000-0000-4000-8000-00000000e501'), 1, 'reenvio não duplica o lançamento');
select is((select count(*)::int from app.parcela where lancamento_id = '00000000-0000-4000-8000-00000000e501'), 1, 'reenvio não duplica a parcela');

select testes.como_b();
select throws_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-00000000c311')$$,
  null, 'registro_invalido', 'B reenviando o id de A → registro_invalido');
select throws_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e509', '00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-00000000c311')$$,
  null, 'ocorrencia_paga', 'B pagando a ocorrência já paga com outro id → ocorrencia_paga');

-- Validação
select testes.como_a();
select throws_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e504', '00000000-0000-4000-8000-00000000d804', '00000000-0000-4000-8000-00000000c311')$$,
  null, 'registro_invalido', 'forma de B usada por A → registro_invalido');
select throws_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e504', '00000000-0000-4000-8000-00000000d804', '00000000-0000-4000-8000-00000000ffff')$$,
  null, 'registro_invalido', 'forma inexistente → registro_invalido');
select throws_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e504', '00000000-0000-4000-8000-00000000ffff', '00000000-0000-4000-8000-00000000c301')$$,
  null, 'registro_invalido', 'ocorrência inexistente → registro_invalido');
select throws_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e504', '00000000-0000-4000-8000-00000000d804', '00000000-0000-4000-8000-00000000c301', 0)$$,
  null, 'valor_invalido', 'valor 0 → valor_invalido');
select testes.como_postgres();
select is((select count(*)::int from app.lancamento where id in ('00000000-0000-4000-8000-00000000e504', '00000000-0000-4000-8000-00000000e509')), 0,
  'nenhuma chamada recusada criou lançamento');
select is((select lancamento_id from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d804'), null::uuid,
  'a ocorrência das chamadas recusadas continua pendente');

-- B vê o lançamento e a parcela, não a parte privada
select testes.como_b();
select is((select count(*)::int from app.lancamento where id = '00000000-0000-4000-8000-00000000e501'), 1, 'B vê o lançamento conjunto de A');
select is((select count(*)::int from app.parcela where lancamento_id = '00000000-0000-4000-8000-00000000e501'), 1, 'B vê a parcela');
select is((select count(*)::int from app.lancamento_pagamento where lancamento_id = '00000000-0000-4000-8000-00000000e501'), 0,
  'B não vê a parte privada de A');

-- Usuário sem membro
select testes.como_sem_membro();
select throws_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e505', '00000000-0000-4000-8000-00000000d804', '00000000-0000-4000-8000-00000000c301')$$,
  null, 'registro_invalido', 'sem membro → registro_invalido');

select * from finish();
rollback;
