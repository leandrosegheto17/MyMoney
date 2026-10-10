begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- Datas: mês seguinte à compra + k − 1, no dia de vencimento
select results_eq(
  $$select numero, valor_centavos, data from app.gerar_parcelas('2026-10-15', 10, 3, 60000) order by numero$$,
  $$values (1, 20000::bigint, '2026-11-10'::date), (2, 20000::bigint, '2026-12-10'::date),
           (3, 20000::bigint, '2027-01-10'::date)$$,
  'compra em 15/10, dia 10, 3x de R$ 600: 10/11, 10/12 e 10/01');
select results_eq(
  $$select numero, valor_centavos, data from app.gerar_parcelas('2026-10-15', 10, 1, 60000)$$,
  $$values (1, 60000::bigint, '2026-11-10'::date)$$,
  'à vista no crédito: 1 parcela no vencimento do mês seguinte');

-- Centavos na primeira parcela
select results_eq(
  $$select numero, valor_centavos from app.gerar_parcelas('2026-10-15', 10, 3, 10000) order by numero$$,
  $$values (1, 3334::bigint), (2, 3333::bigint), (3, 3333::bigint)$$,
  'R$ 100 em 3x: 33,34 + 33,33 + 33,33');

-- Dia 31 em meses mais curtos
select results_eq(
  $$select data from app.gerar_parcelas('2027-01-20', 31, 3, 300) order by numero$$,
  $$values ('2027-02-28'::date), ('2027-03-31'::date), ('2027-04-30'::date)$$,
  'dia 31: fevereiro vira 28 e abril vira 30');
select results_eq(
  $$select data from app.gerar_parcelas('2027-12-05', 31, 3, 300) order by numero$$,
  $$values ('2028-01-31'::date), ('2028-02-29'::date), ('2028-03-31'::date)$$,
  'dia 31 atravessando o ano, com fevereiro bissexto');

-- 24x atravessando 2 anos
select is((select count(*)::int from app.gerar_parcelas('2026-10-15', 5, 24, 100000)), 24,
  '24x gera 24 parcelas');
select is((select min(data) from app.gerar_parcelas('2026-10-15', 5, 24, 100000)), '2026-11-05'::date,
  '24x: primeira parcela em 05/11/2026');
select is((select max(data) from app.gerar_parcelas('2026-10-15', 5, 24, 100000)), '2028-10-05'::date,
  '24x: última parcela em 05/10/2028');
select is((select sum(valor_centavos)::bigint from app.gerar_parcelas('2026-10-15', 5, 24, 100000)), 100000::bigint,
  '24x: soma das parcelas = total');
select is((select valor_centavos from app.gerar_parcelas('2026-10-15', 5, 24, 100000) where numero = 1), 4182::bigint,
  '24x: parcela 1 = 100000 − 4166 × 23');

-- Sem data de fechamento: dia da compra em relação ao vencimento não muda o mês
select results_eq(
  $$select data from app.gerar_parcelas('2026-10-10', 10, 1, 5000)$$,
  $$values ('2026-11-10'::date)$$,
  'compra no próprio dia do vencimento cai no mês seguinte');
select results_eq(
  $$select data from app.gerar_parcelas('2026-10-25', 10, 1, 5000)$$,
  $$values ('2026-11-10'::date)$$,
  'compra depois do vencimento também cai no mês seguinte');
select results_eq(
  $$select data from app.gerar_parcelas('2026-12-31', 10, 1, 5000)$$,
  $$values ('2027-01-10'::date)$$,
  'compra em dezembro vira o ano');

-- Entradas inválidas
select throws_ok($$select * from app.gerar_parcelas('2026-10-15', 10, 0, 60000)$$,
  null, 'valor_invalido', '0 parcelas é recusado');
select throws_ok($$select * from app.gerar_parcelas('2026-10-15', 10, 25, 60000)$$,
  null, 'valor_invalido', '25 parcelas é recusado');
select throws_ok($$select * from app.gerar_parcelas('2026-10-15', 10, null, 60000)$$,
  null, 'valor_invalido', 'número de parcelas nulo é recusado');
select throws_ok($$select * from app.gerar_parcelas('2026-10-15', 10, 3, 0)$$,
  null, 'valor_invalido', 'total 0 é recusado');
select throws_ok($$select * from app.gerar_parcelas('2026-10-15', 10, 3, -1)$$,
  null, 'valor_invalido', 'total negativo é recusado');
select throws_ok($$select * from app.gerar_parcelas('2026-10-15', 10, 3, null)$$,
  null, 'valor_invalido', 'total nulo é recusado');
select throws_ok($$select * from app.gerar_parcelas('2026-10-15', 10, 3, 2)$$,
  null, 'valor_invalido', 'total menor que o número de parcelas daria parcela zero');
select throws_ok($$select * from app.gerar_parcelas(null, 10, 3, 60000)$$,
  null, 'valor_invalido', 'data da compra nula é recusada');
select throws_ok($$select * from app.gerar_parcelas('2026-10-15', 0, 3, 60000)$$,
  null, 'valor_invalido', 'dia de vencimento 0 é recusado');
select throws_ok($$select * from app.gerar_parcelas('2026-10-15', 32, 3, 60000)$$,
  null, 'valor_invalido', 'dia de vencimento 32 é recusado');

-- Propriedade: soma = total e a primeira parcela leva o resto
select ok(
  not exists (
    select 1
    from generate_series(1, 24) n,
         generate_series(n, n + 7) t,
         lateral (
           select count(*) as qtd,
                  sum(p.valor_centavos) as soma,
                  max(p.valor_centavos) filter (where p.numero = 1) as primeira,
                  max(p.valor_centavos) filter (where p.numero > 1) as maior_das_demais,
                  min(p.valor_centavos) as menor
           from app.gerar_parcelas('2026-10-15', 10, n, t) p
         ) r
    where r.qtd <> n
       or r.soma <> t
       or r.primeira < coalesce(r.maior_das_demais, 0)
       or r.menor <= 0
  ),
  'para N de 1 a 24 e totais de N a N+7: N parcelas positivas, soma = total e parcela 1 ≥ demais');

-- Privilégio
select ok(
  not has_function_privilege('anon', 'app.gerar_parcelas(date,integer,integer,bigint)', 'execute'),
  'anon não executa app.gerar_parcelas');

select * from finish();
rollback;
