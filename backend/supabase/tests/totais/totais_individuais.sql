begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(25);

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

create function pg_temp.categoria(p_id uuid, p_total bigint) returns jsonb language sql as $$
  select jsonb_build_object('categoria_id', p_id, 'nome', c.nome, 'variavel', c.variavel, 'total_centavos', p_total)
  from app.categoria c where c.id = p_id
$$;
grant execute on function pg_temp.categoria(uuid, bigint) to authenticated;

delete from app.lancamento;

-- Categoria individual de B
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e8600000-0000-4000-8000-0000000000b1', (select id from app.lar), 'despesa', 'individual', testes.membro_b(),
   'Teste individual B', true),
  ('e8600000-0000-4000-8000-0000000000b2', (select id from app.lar), 'receita', 'individual', testes.membro_b(),
   'Teste receita B', null);

-- Novembro: A paga conjunta 100, B paga conjunta 50, A individual 30
select pg_temp.lancar('e8600000-0000-4000-8000-000000000101', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[10000]::bigint[], array['2026-11-03']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000102', testes.membro_b(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[5000]::bigint[], array['2026-11-04']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000103', testes.membro_a(), 'despesa', 'individual',
  '00000000-0000-4000-8000-000000000413', array[3000]::bigint[], array['2026-11-05']::date[]);

-- Crédito individual de A 3x (31/12, 31/01, 28/02) e individual em 01/01
select pg_temp.lancar('e8600000-0000-4000-8000-000000000201', testes.membro_a(), 'despesa', 'individual',
  '00000000-0000-4000-8000-000000000414', array[3000, 3000, 3000]::bigint[],
  array['2026-12-31', '2027-01-31', '2027-02-28']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000202', testes.membro_a(), 'despesa', 'individual',
  '00000000-0000-4000-8000-000000000414', array[1000]::bigint[], array['2027-01-01']::date[]);

-- Março: variáveis, por categoria e receita
select pg_temp.lancar('e8600000-0000-4000-8000-000000000301', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[20000]::bigint[], array['2027-03-02']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000302', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000403', array[50000]::bigint[], array['2027-03-03']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000303', testes.membro_b(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000402', array[7000]::bigint[], array['2027-03-04']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000304', testes.membro_a(), 'despesa', 'individual',
  '00000000-0000-4000-8000-000000000413', array[4000]::bigint[], array['2027-03-05']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000305', testes.membro_a(), 'despesa', 'individual',
  '00000000-0000-4000-8000-000000000415', array[1000]::bigint[], array['2027-03-06']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000306', testes.membro_a(), 'despesa', 'individual',
  '00000000-0000-4000-8000-000000000411', array[6000]::bigint[], array['2027-03-07']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000307', testes.membro_a(), 'receita', 'individual',
  '00000000-0000-4000-8000-000000000421', array[750000]::bigint[], array['2027-03-01']::date[]);

-- Abril: base da garantia contra lançamentos de B
select pg_temp.lancar('e8600000-0000-4000-8000-000000000401', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[10000]::bigint[], array['2027-04-02']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000402', testes.membro_a(), 'despesa', 'individual',
  '00000000-0000-4000-8000-000000000413', array[2000]::bigint[], array['2027-04-03']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000403', testes.membro_a(), 'receita', 'individual',
  '00000000-0000-4000-8000-000000000421', array[50000]::bigint[], array['2027-04-01']::date[]);

select testes.como_a();

-- Meu total = minha parte no conjunto + meu individual
select is((app.totais_individuais('2026-11-01')->>'minha_parte_conjunto_centavos')::bigint, 10000::bigint,
  'A: minha parte = só a conjunta que A pagou');
select is((app.totais_individuais('2026-11-01')->>'meu_individual_centavos')::bigint, 3000::bigint, 'A: individual');
select is((app.totais_individuais('2026-11-01')->>'meu_total_centavos')::bigint, 13000::bigint, 'A: meu total');
select is((app.totais_individuais('2026-11-01')->'resultado'->>'valor_centavos')::bigint, -13000::bigint,
  'sem receita, resultado negativo');

-- Crédito individual atravessando mês e ano; bordas de dia 1 e último dia
select is((app.totais_individuais('2026-12-01')->>'meu_individual_centavos')::bigint, 3000::bigint,
  'dezembro: parcela de 31/12 entra');
select is((app.totais_individuais('2027-01-01')->>'meu_individual_centavos')::bigint, 4000::bigint,
  'janeiro: parcela de 31/01 e compra de 01/01');
select is((app.totais_individuais('2027-02-01')->>'meu_individual_centavos')::bigint, 3000::bigint,
  'fevereiro: só a última parcela');

-- Variáveis e listas
select is((app.totais_individuais('2027-03-01')->>'total_variaveis_centavos')::bigint, 30000::bigint,
  'variáveis = conjuntas variáveis pagas por A + individuais variáveis de A');
select is(app.totais_individuais('2027-03-01')->'por_categoria',
  jsonb_build_array(
    pg_temp.categoria('00000000-0000-4000-8000-000000000411', 6000),
    pg_temp.categoria('00000000-0000-4000-8000-000000000413', 4000),
    pg_temp.categoria('00000000-0000-4000-8000-000000000415', 1000)),
  'por_categoria: só individuais de A, por total');
select is(app.totais_individuais('2027-03-01')->'minha_parte_por_categoria',
  jsonb_build_array(
    pg_temp.categoria('00000000-0000-4000-8000-000000000403', 50000),
    pg_temp.categoria('00000000-0000-4000-8000-000000000401', 20000)),
  'minha_parte_por_categoria: só conjuntas pagas por A, por total');
select is((app.totais_individuais('2027-03-01')->>'meu_total_centavos')::bigint, 81000::bigint, 'março: meu total');

-- Receitas e resultado
select is((app.totais_individuais('2027-03-01')->>'receitas_centavos')::bigint, 750000::bigint, 'receitas de A');
select is((app.totais_individuais('2027-03-01')->'resultado'->>'valor_centavos')::bigint, 669000::bigint,
  'resultado = receitas − meu total');

-- Mês vazio
select is(app.totais_individuais('2027-08-01'),
  '{"minha_parte_conjunto_centavos": 0, "meu_individual_centavos": 0, "meu_total_centavos": 0,
    "total_variaveis_centavos": 0, "receitas_centavos": 0, "resultado": {"valor_centavos": 0},
    "por_categoria": [], "minha_parte_por_categoria": []}'::jsonb,
  'mês vazio: zeros e listas vazias');

-- B em novembro
select testes.como_b();
select is((app.totais_individuais('2026-11-01')->>'minha_parte_conjunto_centavos')::bigint, 5000::bigint,
  'B: minha parte = a conjunta que B pagou');
select is((app.totais_individuais('2026-11-01')->>'meu_individual_centavos')::bigint, 0::bigint,
  'B: o individual de A não entra');

-- Aceite: os números de A não mudam com lançamentos de B
select testes.como_a();
select ok(set_config('teste.abril_a', app.totais_individuais('2027-04-01')::text, true) is not null, 'abril calculado como A');

select testes.como_postgres();
select pg_temp.lancar('e8600000-0000-4000-8000-000000000411', testes.membro_b(), 'despesa', 'individual',
  'e8600000-0000-4000-8000-0000000000b1', array[4500]::bigint[], array['2027-04-05']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000412', testes.membro_b(), 'despesa', 'individual',
  'e8600000-0000-4000-8000-0000000000b1', array_fill(1000::bigint, array[12]),
  array(select (date '2027-04-10' + make_interval(months => k))::date from generate_series(0, 11) k));
select pg_temp.lancar('e8600000-0000-4000-8000-000000000413', testes.membro_b(), 'receita', 'individual',
  'e8600000-0000-4000-8000-0000000000b2', array[300000]::bigint[], array['2027-04-05']::date[]);
select pg_temp.lancar('e8600000-0000-4000-8000-000000000414', testes.membro_b(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[8000]::bigint[], array['2027-04-06']::date[]);

select testes.como_a();
select is(app.totais_individuais('2027-04-01'), current_setting('teste.abril_a')::jsonb,
  'depois de B lançar individual Pix, crédito 12x, receita e conjunta, o bloco de A é idêntico');
select is((app.totais_individuais('2027-04-01')->>'minha_parte_conjunto_centavos')::bigint, 10000::bigint,
  'a conjunta paga por B não entra na minha parte de A');
select is((app.totais_individuais('2027-04-01')->>'meu_individual_centavos')::bigint, 2000::bigint,
  'individual de A continua 2000');
select is((app.totais_individuais('2027-04-01')->>'receitas_centavos')::bigint, 50000::bigint,
  'receitas de A continuam 50000');
select is((app.totais_individuais('2027-04-01')->'resultado'->>'valor_centavos')::bigint, 38000::bigint,
  'resultado de A continua 38000');

-- Usuário sem membro
select testes.como_sem_membro();
select is((app.totais_individuais('2027-03-01')->>'meu_total_centavos')::bigint, 0::bigint,
  'sem membro: meu total 0');
select is(app.totais_individuais('2027-03-01')->'por_categoria', '[]'::jsonb, 'sem membro: lista vazia');

select testes.como_postgres();
select ok(not has_function_privilege('anon', 'app.totais_individuais(date)', 'execute'),
  'anon não executa app.totais_individuais');

select * from finish();
rollback;
