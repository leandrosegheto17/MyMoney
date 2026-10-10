begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(9);

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

delete from app.lancamento;

-- A: conjunta com parcelas em 01/11, 30/11 e 01/12; individual; receita
select pg_temp.lancar('e8500000-0000-4000-8000-000000000001', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', array[500, 1000, 2000]::bigint[],
  array['2026-11-01', '2026-11-30', '2026-12-01']::date[]);
select pg_temp.lancar('e8500000-0000-4000-8000-000000000002', testes.membro_a(), 'despesa', 'individual',
  '00000000-0000-4000-8000-000000000413', array[3000]::bigint[], array['2026-11-15']::date[]);
select pg_temp.lancar('e8500000-0000-4000-8000-000000000003', testes.membro_a(), 'receita', 'individual',
  '00000000-0000-4000-8000-000000000421', array[50000]::bigint[], array['2026-11-05']::date[]);

select testes.como_a();
select set_eq(
  $$select lancamento_id, valor_centavos from app.parcelas_mes('2026-11-01')$$,
  $$values ('e8500000-0000-4000-8000-000000000001'::uuid, 500::bigint),
           ('e8500000-0000-4000-8000-000000000001'::uuid, 1000::bigint),
           ('e8500000-0000-4000-8000-000000000002'::uuid, 3000::bigint),
           ('e8500000-0000-4000-8000-000000000003'::uuid, 50000::bigint)$$,
  'novembro: dia 1 e último dia entram, 1º de dezembro fica de fora');
select set_eq(
  $$select lancamento_id, valor_centavos from app.parcelas_mes('2026-11-17')$$,
  $$select lancamento_id, valor_centavos from app.parcelas_mes('2026-11-01')$$,
  'data no meio do mês é normalizada');
select set_eq(
  $$select lancamento_id, valor_centavos from app.parcelas_mes('2026-12-01')$$,
  $$values ('e8500000-0000-4000-8000-000000000001'::uuid, 2000::bigint)$$,
  'dezembro: só a parcela do dia 1');
select results_eq(
  $$select tipo, escopo, dono_id, categoria_id, categoria_nome, variavel from app.parcelas_mes('2026-11-01')
     where lancamento_id = 'e8500000-0000-4000-8000-000000000003'$$,
  $$values ('receita'::text, 'individual'::text, testes.membro_a(), '00000000-0000-4000-8000-000000000421'::uuid,
            'Salário'::text, null::boolean)$$,
  'receita aparece com tipo receita');
select results_eq(
  $$select tipo, escopo, dono_id, categoria_nome, variavel from app.parcelas_mes('2026-11-01')
     where valor_centavos = 1000$$,
  $$values ('despesa'::text, 'conjunto'::text, testes.membro_a(), 'Mercado'::text, true)$$,
  'conjunta traz tipo, escopo, pagador, categoria e variável');
select ok(
  (select bool_and(parcela_id is not null) from app.parcelas_mes('2026-11-01')),
  'cada linha traz o id da parcela');

select testes.como_b();
select set_eq(
  $$select lancamento_id, valor_centavos from app.parcelas_mes('2026-11-01')$$,
  $$values ('e8500000-0000-4000-8000-000000000001'::uuid, 500::bigint),
           ('e8500000-0000-4000-8000-000000000001'::uuid, 1000::bigint)$$,
  'B vê só a conjunta de A; individual e receita de A não aparecem');

select testes.como_postgres();
select ok(not has_function_privilege('anon', 'app.parcelas_mes(date)', 'execute'), 'anon não executa app.parcelas_mes');
select is(
  (select proconfig from pg_proc where oid = 'app.parcelas_mes(date)'::regprocedure),
  array['search_path=""'], 'search_path vazio');

select * from finish();
rollback;
