begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(21);

-- Conta X de A com R$ 1000,00 e nada mais
insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos) values
  ('e6600000-0000-4000-8000-0000000000c1', (select id from app.lar), testes.membro_a(), 'Conta X', 100000);

select set_config('teste.lancamentos', (select count(*) from app.lancamento)::text, true);
select set_config('teste.parcelas', (select count(*) from app.parcela)::text, true);

select testes.como_a();

-- Saldo real abaixo do atual
select is(api.ajustar_saldo('e6600000-0000-4000-8000-0000000000c1', 98770), -1230::bigint,
  'real 987,70 com atual 1000,00: devolve −1230');
select results_eq(
  $$select tipo, sentido, valor_centavos, data from app.movimento_conta
     where conta_id = 'e6600000-0000-4000-8000-0000000000c1'$$,
  $$values ('ajuste'::text, 'saida'::text, 1230::bigint, app.hoje())$$,
  'grava um ajuste de saída de 1230 com a data de hoje');
select is(app.saldo_conta('e6600000-0000-4000-8000-0000000000c1'), 98770::bigint, 'saldo passa a 987,70');

-- Saldo real acima do atual
select is(api.ajustar_saldo('e6600000-0000-4000-8000-0000000000c1', 100000), 1230::bigint,
  'real acima do atual: diferença positiva');
select is(
  (select sentido from app.movimento_conta
    where conta_id = 'e6600000-0000-4000-8000-0000000000c1' and sentido = 'entrada'),
  'entrada', 'grava um ajuste de entrada');
select is(app.saldo_conta('e6600000-0000-4000-8000-0000000000c1'), 100000::bigint, 'saldo volta a 1000,00');

-- Mesmo saldo real de novo
select is(api.ajustar_saldo('e6600000-0000-4000-8000-0000000000c1', 100000), 0::bigint,
  'mesmo saldo real: devolve 0');
select is(
  (select count(*)::int from app.movimento_conta where conta_id = 'e6600000-0000-4000-8000-0000000000c1'),
  2, 'diferença 0 não grava linha');

-- Simulação
select is(api.ajustar_saldo('e6600000-0000-4000-8000-0000000000c1', 50000, true), -50000::bigint,
  'simular devolve a diferença');
select is(api.ajustar_saldo('e6600000-0000-4000-8000-0000000000c1', 150000, true), 50000::bigint,
  'simular para cima devolve a diferença positiva');
select is(
  (select count(*)::int from app.movimento_conta where conta_id = 'e6600000-0000-4000-8000-0000000000c1'),
  2, 'simular não grava');
select is(app.saldo_conta('e6600000-0000-4000-8000-0000000000c1'), 100000::bigint, 'simular não muda o saldo');

-- Entradas inválidas
select throws_ok($$select api.ajustar_saldo(null, 1000)$$, null, 'valor_invalido', 'conta nula');
select throws_ok($$select api.ajustar_saldo('e6600000-0000-4000-8000-0000000000c1', null)$$,
  null, 'valor_invalido', 'saldo real nulo');
select throws_ok($$select api.ajustar_saldo('e6600000-0000-4000-8000-0000000000ff', 1000)$$,
  null, 'registro_invalido', 'conta inexistente');

-- B com a conta de A
select testes.como_b();
select throws_ok($$select api.ajustar_saldo('e6600000-0000-4000-8000-0000000000c1', 1)$$,
  null, 'registro_invalido', 'B ajustando a conta de A');
select throws_ok($$select api.ajustar_saldo('e6600000-0000-4000-8000-0000000000c1', 1, true)$$,
  null, 'registro_invalido', 'B simulando na conta de A: mesmo erro, sem revelar saldo');

select testes.como_sem_membro();
select throws_ok($$select api.ajustar_saldo('e6600000-0000-4000-8000-0000000000c1', 1)$$,
  null, 'registro_invalido', 'usuário sem membro');

-- Nada gravado pelas recusas; ajuste não vira lançamento
select testes.como_postgres();
select is(
  (select count(*)::int from app.movimento_conta where conta_id = 'e6600000-0000-4000-8000-0000000000c1'),
  2, 'as chamadas recusadas não gravaram nada');
select ok(
  (select count(*) from app.lancamento)::text = current_setting('teste.lancamentos')
  and (select count(*) from app.parcela)::text = current_setting('teste.parcelas'),
  'ajuste não cria lançamento nem parcela');

select ok(not has_function_privilege('anon', 'api.ajustar_saldo(uuid,bigint,boolean)', 'execute'),
  'anon não executa api.ajustar_saldo');

select * from finish();
rollback;
