begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(16);

-- Lançamento direto nas tabelas (chamado como postgres).
create function pg_temp.lancar(p_id uuid, p_tipo text, p_escopo text, p_categoria uuid, p_forma uuid,
                               p_conta uuid, p_data_operacao date, p_valores bigint[], p_datas date[])
returns void language plpgsql as $$
declare v_lar uuid := (select l.id from app.lar l);
begin
  insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
  values (p_id, v_lar, '00000000-0000-4000-8000-000000000101', p_tipo, p_escopo, p_categoria,
          (select sum(v) from unnest(p_valores) v), cardinality(p_valores));
  insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id, data_operacao)
  values (p_id, '00000000-0000-4000-8000-000000000101', v_lar, p_forma, p_conta, p_data_operacao);
  insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
  select gen_random_uuid(), p_id, v_lar, p_escopo, '00000000-0000-4000-8000-000000000101', n, p_valores[n], p_datas[n]
  from generate_subscripts(p_valores, 1) n;
end $$;

create function pg_temp.movimento(p_tipo text, p_sentido text, p_valor bigint, p_data date, p_forma uuid default null)
returns void language sql as $$
  insert into app.movimento_conta (lar_id, dono_id, conta_id, tipo, sentido, valor_centavos, data, forma_credito_id)
  values ((select id from app.lar), '00000000-0000-4000-8000-000000000101', 'e6400000-0000-4000-8000-0000000000c1',
          p_tipo, p_sentido, p_valor, p_data, p_forma);
$$;

-- Contas de A: X (saldo inicial R$ 1000), Y (outra) e Z (zerada)
insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos) values
  ('e6400000-0000-4000-8000-0000000000c1', (select id from app.lar), testes.membro_a(), 'Conta X', 100000),
  ('e6400000-0000-4000-8000-0000000000c2', (select id from app.lar), testes.membro_a(), 'Conta Y', 0),
  ('e6400000-0000-4000-8000-0000000000c3', (select id from app.lar), testes.membro_a(), 'Conta Z', 0);
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e6400000-0000-4000-8000-0000000000f1', (select id from app.lar), testes.membro_a(), 'Pix X', 'pix', 'e6400000-0000-4000-8000-0000000000c1', null),
  ('e6400000-0000-4000-8000-0000000000f2', (select id from app.lar), testes.membro_a(), 'Débito X', 'debito', 'e6400000-0000-4000-8000-0000000000c1', null),
  ('e6400000-0000-4000-8000-0000000000f3', (select id from app.lar), testes.membro_a(), 'Pix Y', 'pix', 'e6400000-0000-4000-8000-0000000000c2', null),
  ('e6400000-0000-4000-8000-0000000000f4', (select id from app.lar), testes.membro_a(), 'Crédito pago pela X', 'credito', 'e6400000-0000-4000-8000-0000000000c1', 10);

select testes.como_a();
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1'), 100000::bigint, 'só o saldo inicial');
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c3'), 0::bigint, 'conta zerada e sem movimento: 0');

-- Receita
select testes.como_postgres();
select pg_temp.lancar('e6400000-0000-4000-8000-000000000001', 'receita', 'individual', '00000000-0000-4000-8000-000000000421',
  null, 'e6400000-0000-4000-8000-0000000000c1', app.hoje(), array[50000]::bigint[], array[app.hoje()]);
select testes.como_a();
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1'), 150000::bigint, 'receita de hoje soma');

-- Pix e Débito da conta; Pix de outra conta
select testes.como_postgres();
select pg_temp.lancar('e6400000-0000-4000-8000-000000000002', 'despesa', 'conjunto', '00000000-0000-4000-8000-000000000401',
  'e6400000-0000-4000-8000-0000000000f1', 'e6400000-0000-4000-8000-0000000000c1', app.hoje(), array[12000]::bigint[], array[app.hoje()]);
select pg_temp.lancar('e6400000-0000-4000-8000-000000000003', 'despesa', 'individual', '00000000-0000-4000-8000-000000000413',
  'e6400000-0000-4000-8000-0000000000f2', 'e6400000-0000-4000-8000-0000000000c1', app.hoje(), array[3000]::bigint[], array[app.hoje()]);
select pg_temp.lancar('e6400000-0000-4000-8000-000000000004', 'despesa', 'conjunto', '00000000-0000-4000-8000-000000000401',
  'e6400000-0000-4000-8000-0000000000f3', 'e6400000-0000-4000-8000-0000000000c2', app.hoje(), array[7777]::bigint[], array[app.hoje()]);
select testes.como_a();
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1'), 135000::bigint, 'Pix 120,00 e Débito 30,00 da conta subtraem');
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c2'), -7777::bigint, 'o Pix da outra conta sai só dela');

-- Crédito não mexe no saldo, mesmo com a conta de pagamento = X
select testes.como_postgres();
select pg_temp.lancar('e6400000-0000-4000-8000-000000000005', 'despesa', 'conjunto', '00000000-0000-4000-8000-000000000401',
  'e6400000-0000-4000-8000-0000000000f4', null, app.hoje(), array[20000, 20000, 20000]::bigint[],
  array[app.hoje(), (app.hoje() + interval '1 month')::date, (app.hoje() + interval '2 months')::date]);
select testes.como_a();
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1'), 135000::bigint, 'compra no crédito 3x não entra no saldo');

-- Movimentos de conta
select testes.como_postgres();
select pg_temp.movimento('ajuste', 'entrada', 1230, app.hoje());
select testes.como_a();
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1'), 136230::bigint, 'ajuste de entrada soma');
select testes.como_postgres();
select pg_temp.movimento('aporte', 'saida', 20000, app.hoje());
select testes.como_a();
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1'), 116230::bigint, 'aporte (saída) subtrai');
select testes.como_postgres();
select pg_temp.movimento('retirada', 'entrada', 5000, app.hoje());
select testes.como_a();
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1'), 121230::bigint, 'retirada (entrada) soma');
select testes.como_postgres();
select pg_temp.movimento('pagamento_cartao', 'saida', 10000, app.hoje(), 'e6400000-0000-4000-8000-0000000000f4');
select testes.como_a();
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1'), 111230::bigint, 'pagamento de cartão (saída) subtrai');

-- D-12: só até hoje
select testes.como_postgres();
select pg_temp.lancar('e6400000-0000-4000-8000-000000000006', 'receita', 'individual', '00000000-0000-4000-8000-000000000421',
  null, 'e6400000-0000-4000-8000-0000000000c1', app.hoje() + 1, array[1000]::bigint[], array[app.hoje() + 1]);
select pg_temp.movimento('ajuste', 'entrada', 700, app.hoje() + 1);
select testes.como_a();
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1'), 111230::bigint, 'receita e movimento de amanhã ficam de fora');
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1', app.hoje() + 1), 112930::bigint,
  'com a data de corte em amanhã, entram');

-- Fixa paga hoje no Pix com parcela no vencimento futuro: vale a data da operação
select testes.como_postgres();
select pg_temp.lancar('e6400000-0000-4000-8000-000000000007', 'despesa', 'conjunto', '00000000-0000-4000-8000-000000000403',
  'e6400000-0000-4000-8000-0000000000f1', 'e6400000-0000-4000-8000-0000000000c1', app.hoje(),
  array[4000]::bigint[], array[app.hoje() + 20]);
select testes.como_a();
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1'), 107230::bigint,
  'despesa paga hoje com parcela no futuro sai do saldo hoje');

-- Isolamento
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000ff'), null::bigint, 'id inexistente: null');
select testes.como_b();
select is(app.saldo_conta('e6400000-0000-4000-8000-0000000000c1'), null::bigint, 'B com a conta de A: null, igual a inexistente');

select testes.como_postgres();
select ok(not has_function_privilege('anon', 'app.saldo_conta(uuid,date)', 'execute'), 'anon não executa app.saldo_conta');

select * from finish();
rollback;
