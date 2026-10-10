begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(22);

-- Lançamento direto nas tabelas (chamado como postgres).
create function pg_temp.lancar(p_id uuid, p_dono uuid, p_tipo text, p_escopo text, p_categoria uuid,
                               p_valores bigint[], p_datas date[])
returns void language plpgsql as $$
declare v_lar uuid := (select l.id from app.lar l);
begin
  insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
  values (p_id, v_lar, p_dono, p_tipo, p_escopo, p_categoria,
          (select sum(v) from unnest(p_valores) v), cardinality(p_valores));
  insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, data_operacao)
  values (p_id, p_dono, v_lar, p_datas[1]);
  insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
  select gen_random_uuid(), p_id, v_lar, p_escopo, p_dono, n, p_valores[n], p_datas[n]
  from generate_subscripts(p_valores, 1) n;
end $$;

create function pg_temp.membro(p_id uuid, p_valor bigint, p_percentual int) returns jsonb language sql as $$
  select jsonb_build_object('membro_id', p_id, 'nome', (select m.nome from app.membro m where m.id = p_id),
                            'valor_centavos', p_valor, 'percentual', p_percentual)
$$;
create function pg_temp.categoria(p_id uuid, p_total bigint) returns jsonb language sql as $$
  select jsonb_build_object('categoria_id', p_id, 'nome', c.nome, 'variavel', c.variavel, 'total_centavos', p_total)
  from app.categoria c where c.id = p_id
$$;
-- Usadas nas comparações feitas como A e B.
grant execute on function pg_temp.membro(uuid, bigint, int), pg_temp.categoria(uuid, bigint) to authenticated;

delete from app.lancamento;

-- Crédito conjunto 3x de A (nov, dez, jan)
select pg_temp.lancar('e8500000-0000-4000-8000-000000000101', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[20000, 20000, 20000]::bigint[],
  array['2026-11-10', '2026-12-10', '2027-01-10']::date[]);
-- Fevereiro: variável × fixa
select pg_temp.lancar('e8500000-0000-4000-8000-000000000201', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[30000]::bigint[], array['2027-02-03']::date[]);
select pg_temp.lancar('e8500000-0000-4000-8000-000000000202', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000403', array[50000]::bigint[], array['2027-02-05']::date[]);
select pg_temp.lancar('e8500000-0000-4000-8000-000000000203', testes.membro_b(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000402', array[10000]::bigint[], array['2027-02-07']::date[]);
-- Março: valores do mockup
select pg_temp.lancar('e8500000-0000-4000-8000-000000000301', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000403', array[140250]::bigint[], array['2027-03-03']::date[]);
select pg_temp.lancar('e8500000-0000-4000-8000-000000000302', testes.membro_b(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[101620]::bigint[], array['2027-03-04']::date[]);
-- Abril: 1 centavo de 3; junho: meio ponto percentual
select pg_temp.lancar('e8500000-0000-4000-8000-000000000401', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[1]::bigint[], array['2027-04-03']::date[]);
select pg_temp.lancar('e8500000-0000-4000-8000-000000000402', testes.membro_b(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[2]::bigint[], array['2027-04-04']::date[]);
select pg_temp.lancar('e8500000-0000-4000-8000-000000000601', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[1]::bigint[], array['2027-06-03']::date[]);
select pg_temp.lancar('e8500000-0000-4000-8000-000000000602', testes.membro_b(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[199]::bigint[], array['2027-06-04']::date[]);
-- Maio: só A pagou
select pg_temp.lancar('e8500000-0000-4000-8000-000000000501', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[5000]::bigint[], array['2027-05-03']::date[]);
-- Julho: conjunta de A, base da garantia de não usar dado individual
select pg_temp.lancar('e8500000-0000-4000-8000-000000000701', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[10000]::bigint[], array['2027-07-03']::date[]);

select testes.como_a();

-- Crédito parcelado atravessando meses e o ano
select is((app.totais_conjunto('2026-10-01')->>'total_centavos')::bigint, 0::bigint, 'outubro: 0');
select is((app.totais_conjunto('2026-11-01')->>'total_centavos')::bigint, 20000::bigint, 'novembro: 1ª parcela');
select is((app.totais_conjunto('2026-12-15')->>'total_centavos')::bigint, 20000::bigint, 'dezembro: 2ª parcela');
select is((app.totais_conjunto('2027-01-01')->>'total_centavos')::bigint, 20000::bigint, 'janeiro: 3ª parcela, depois da virada');

-- Mês vazio
select is(app.totais_conjunto('2026-10-01'),
  '{"total_centavos": 0, "total_variaveis_centavos": 0, "por_categoria": [], "pago_por_membro": []}'::jsonb,
  'mês vazio: totais 0 e listas vazias');

-- Variável × fixa e por categoria
select is((app.totais_conjunto('2027-02-01')->>'total_centavos')::bigint, 90000::bigint, 'fevereiro: total do casal');
select is((app.totais_conjunto('2027-02-01')->>'total_variaveis_centavos')::bigint, 40000::bigint,
  'fevereiro: só as categorias variáveis');
select is(app.totais_conjunto('2027-02-01')->'por_categoria',
  jsonb_build_array(
    pg_temp.categoria('00000000-0000-4000-8000-000000000403', 50000),
    pg_temp.categoria('00000000-0000-4000-8000-000000000401', 30000),
    pg_temp.categoria('00000000-0000-4000-8000-000000000402', 10000)),
  'por categoria: ordem por total, variável correto, sem as categorias sem gasto');
select is(app.totais_conjunto('2027-02-01')->'pago_por_membro',
  jsonb_build_array(pg_temp.membro(testes.membro_a(), 80000, 89), pg_temp.membro(testes.membro_b(), 10000, 11)),
  'fevereiro: quanto cada um pagou');

-- Valores do mockup
select is(app.totais_conjunto('2027-03-01')->'pago_por_membro',
  jsonb_build_array(pg_temp.membro(testes.membro_a(), 140250, 58), pg_temp.membro(testes.membro_b(), 101620, 42)),
  '140250 e 101620: 58% e 42%');

-- Percentuais sempre somam 100
select is((app.totais_conjunto('2027-04-01')->'pago_por_membro'->0->>'percentual')::int, 33, '1 de 3 centavos: 33%');
select is(
  (select sum((p->>'percentual')::int)::int from jsonb_array_elements(app.totais_conjunto('2027-04-01')->'pago_por_membro') p),
  100, '1 de 3 centavos: soma 100');
select is(
  (select sum((p->>'percentual')::int)::int from jsonb_array_elements(app.totais_conjunto('2027-06-01')->'pago_por_membro') p),
  100, '1 de 200 centavos: soma 100');

-- Só A pagou
select is(app.totais_conjunto('2027-05-01')->'pago_por_membro',
  jsonb_build_array(pg_temp.membro(testes.membro_a(), 5000, 100), pg_temp.membro(testes.membro_b(), 0, 0)),
  'só A pagou: B aparece com 0 e 0%');

-- Garantia: nenhum total usa dado individual
select ok(set_config('teste.julho_a', app.totais_conjunto('2027-07-01')::text, true) is not null, 'julho calculado como A');
select testes.como_b();
select ok(set_config('teste.julho_b', app.totais_conjunto('2027-07-01')::text, true) is not null, 'julho calculado como B');
select is(current_setting('teste.julho_b')::jsonb, current_setting('teste.julho_a')::jsonb,
  'o resultado como A é igual ao resultado como B');

select testes.como_postgres();
select pg_temp.lancar('e8500000-0000-4000-8000-000000000702', testes.membro_a(), 'despesa', 'individual',
  '00000000-0000-4000-8000-000000000413', array[7000]::bigint[], array['2027-07-05']::date[]);
select pg_temp.lancar('e8500000-0000-4000-8000-000000000703', testes.membro_a(), 'despesa', 'individual',
  '00000000-0000-4000-8000-000000000414', array[3000, 3000, 3000]::bigint[],
  array['2027-07-10', '2027-08-10', '2027-09-10']::date[]);
update app.lancamento_pagamento set forma_pagamento_id = '00000000-0000-4000-8000-000000000301',
                                    conta_id = '00000000-0000-4000-8000-000000000201'
 where lancamento_id = 'e8500000-0000-4000-8000-000000000702';
update app.lancamento_pagamento set forma_pagamento_id = '00000000-0000-4000-8000-000000000303',
                                    dia_vencimento_aplicado = 10
 where lancamento_id = 'e8500000-0000-4000-8000-000000000703';

select testes.como_a();
select is(app.totais_conjunto('2027-07-01'), current_setting('teste.julho_a')::jsonb,
  'individuais de A (Pix e crédito) não mudam nada para A');
select testes.como_b();
select is(app.totais_conjunto('2027-07-01'), current_setting('teste.julho_b')::jsonb,
  'individuais de A não mudam nada para B');

select testes.como_postgres();
select pg_temp.lancar('e8500000-0000-4000-8000-000000000704', testes.membro_a(), 'receita', 'individual',
  '00000000-0000-4000-8000-000000000421', array[750000]::bigint[], array['2027-07-05']::date[]);
select testes.como_a();
select is(app.totais_conjunto('2027-07-01'), current_setting('teste.julho_a')::jsonb,
  'receita de A no mês não entra');

select testes.como_postgres();
select ok(not has_function_privilege('anon', 'app.totais_conjunto(date)', 'execute'), 'anon não executa app.totais_conjunto');
select is(
  (select proconfig from pg_proc where oid = 'app.totais_conjunto(date)'::regprocedure),
  array['search_path=""'], 'search_path vazio');

select * from finish();
rollback;
