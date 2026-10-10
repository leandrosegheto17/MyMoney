begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(17);

-- Compra direto nas tabelas (chamado como postgres).
create function pg_temp.comprar(p_id uuid, p_dono uuid, p_escopo text, p_categoria uuid, p_forma uuid,
                                p_valores bigint[], p_datas date[])
returns void language plpgsql as $$
declare v_lar uuid := (select l.id from app.lar l);
begin
  insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
  values (p_id, v_lar, p_dono, 'despesa', p_escopo, p_categoria,
          (select sum(v) from unnest(p_valores) v), cardinality(p_valores));
  insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id,
                                        data_operacao, dia_vencimento_aplicado)
  values (p_id, p_dono, v_lar, p_forma, null, '2026-10-15', 10);
  insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
  select gen_random_uuid(), p_id, v_lar, p_escopo, p_dono, n, p_valores[n], p_datas[n]
  from generate_subscripts(p_valores, 1) n;
end $$;

-- Formas: F, F2 e F24 de crédito de A; FB de crédito de B
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e6700000-0000-4000-8000-0000000000f1', (select id from app.lar), testes.membro_a(), 'Crédito F', 'credito', null, 10),
  ('e6700000-0000-4000-8000-0000000000f2', (select id from app.lar), testes.membro_a(), 'Crédito F2', 'credito', null, 10),
  ('e6700000-0000-4000-8000-0000000000f3', (select id from app.lar), testes.membro_a(), 'Crédito F24', 'credito', null, 5),
  ('e6700000-0000-4000-8000-0000000000fb', (select id from app.lar), testes.membro_b(), 'Crédito de B', 'credito', null, 10);

-- Compra conjunta de A em F: 3x de R$ 200
select pg_temp.comprar('e6700000-0000-4000-8000-000000000001', testes.membro_a(), 'conjunto',
  '00000000-0000-4000-8000-000000000401', 'e6700000-0000-4000-8000-0000000000f1',
  array[20000, 20000, 20000]::bigint[], array['2026-11-10', '2026-12-10', '2027-01-10']::date[]);

select testes.como_a();
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000f1', '2026-11-01')$$,
  $$values (20000::bigint, 40000::bigint)$$, 'novembro: 200 no mês e 400 depois');
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000f1', '2026-12-15')$$,
  $$values (20000::bigint, 20000::bigint)$$, 'dia no meio do mês é normalizado para dezembro');
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000f1', '2027-01-01')$$,
  $$values (20000::bigint, 0::bigint)$$, 'janeiro, depois da virada: última parcela e nada futuro');
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000f1', '2026-10-01')$$,
  $$values (0::bigint, 60000::bigint)$$, 'outubro: nada no mês e tudo comprometido');

-- Outra compra no mesmo mês, compra em outra forma e parcela com data ajustada
select testes.como_postgres();
select pg_temp.comprar('e6700000-0000-4000-8000-000000000002', testes.membro_a(), 'individual',
  '00000000-0000-4000-8000-000000000413', 'e6700000-0000-4000-8000-0000000000f1',
  array[5000]::bigint[], array['2026-11-10']::date[]);
select pg_temp.comprar('e6700000-0000-4000-8000-000000000003', testes.membro_a(), 'individual',
  '00000000-0000-4000-8000-000000000413', 'e6700000-0000-4000-8000-0000000000f2',
  array[9900]::bigint[], array['2026-11-10']::date[]);
select pg_temp.comprar('e6700000-0000-4000-8000-000000000004', testes.membro_a(), 'individual',
  '00000000-0000-4000-8000-000000000413', 'e6700000-0000-4000-8000-0000000000f1',
  array[3000]::bigint[], array['2026-12-10']::date[]);
update app.parcela set data = '2026-11-28', data_ajustada = true
 where lancamento_id = 'e6700000-0000-4000-8000-000000000004';

select testes.como_a();
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000f1', '2026-11-01')$$,
  $$values (28000::bigint, 40000::bigint)$$,
  'compras do mesmo mês somam, parcela ajustada vale pela data gravada e a outra forma não entra');
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000f2', '2026-11-01')$$,
  $$values (9900::bigint, 0::bigint)$$, 'F2 só soma a própria compra');

-- Só o dono enxerga; demais casos sem revelar existência
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('00000000-0000-4000-8000-000000000301', '2026-11-01')$$,
  $$values (null::bigint, null::bigint)$$, 'forma Pix: null/null');
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000ff', '2026-11-01')$$,
  $$values (null::bigint, null::bigint)$$, 'forma inexistente: null/null');
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000fb', '2026-11-01')$$,
  $$values (null::bigint, null::bigint)$$, 'A com a forma de B: null/null');

select testes.como_b();
select ok(
  exists (select 1 from app.parcela where lancamento_id = 'e6700000-0000-4000-8000-000000000001'),
  'B vê as parcelas da compra conjunta de A');
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000f1', '2026-11-01')$$,
  $$values (null::bigint, null::bigint)$$, 'B com a forma de A: null/null, mesmo vendo a conjunta');
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000fb', '2026-11-01')$$,
  $$values (0::bigint, 0::bigint)$$, 'forma de B sem compras: 0/0');

-- 24x atravessando 2 anos
select testes.como_postgres();
select pg_temp.comprar('e6700000-0000-4000-8000-000000000024', testes.membro_a(), 'individual',
  '00000000-0000-4000-8000-000000000413', 'e6700000-0000-4000-8000-0000000000f3',
  array_prepend(4182::bigint, array_fill(4166::bigint, array[23])),
  array(select (date '2026-11-05' + make_interval(months => k))::date from generate_series(0, 23) k));

select testes.como_a();
select is(
  (select sum(g.gasto_mes_centavos)::bigint
     from generate_series(date '2026-11-01', date '2028-10-01', interval '1 month') m,
          app.gasto_cartao('e6700000-0000-4000-8000-0000000000f3', m::date) g)
  + (select comprometido_futuro_centavos from app.gasto_cartao('e6700000-0000-4000-8000-0000000000f3', '2028-10-01')),
  100000::bigint, '24x: soma do gasto mês a mês + comprometido do último = total');
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000f3', '2026-11-01')$$,
  $$values (4182::bigint, 95818::bigint)$$, '24x: no primeiro mês, a parcela 1 e o resto comprometido');
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000f3', '2027-12-01')$$,
  $$values (4166::bigint, 41660::bigint)$$, '24x: na virada para o segundo ano');
select results_eq($$select gasto_mes_centavos, comprometido_futuro_centavos
                      from app.gasto_cartao('e6700000-0000-4000-8000-0000000000f3', '2028-11-01')$$,
  $$values (0::bigint, 0::bigint)$$, '24x: depois da última parcela, 0/0');

select testes.como_postgres();
select ok(not has_function_privilege('anon', 'app.gasto_cartao(uuid,date)', 'execute'), 'anon não executa app.gasto_cartao');

select * from finish();
rollback;
