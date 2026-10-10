-- Mede api.resumo_mes e api.lancamentos_mes com o volume de 2 anos já carregado
-- (`pnpm local:volume`). Só leitura. Roda como Leandro (RLS valendo): 1 aquecimento + 5
-- execuções por consulta, mediana em ms (meta: < 500 ms), e os planos de dentro das funções
-- com auto_explain para conferir o uso de parcela_lar_id_data_idx / parcela_dono_id_data_idx.
\set ON_ERROR_STOP on
\timing on

select count(*) as parcelas from app.parcela \gset
\echo Parcelas no banco: :parcelas

begin;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_hoje date := app.hoje();
  v_casos jsonb := jsonb_build_array(
    jsonb_build_object('nome', 'resumo_mes (mês corrente)', 'chamada', 'select api.resumo_mes(%L)', 'mes', v_hoje),
    jsonb_build_object('nome', 'resumo_mes (mês com crédito futuro, +3 meses)', 'chamada', 'select api.resumo_mes(%L)', 'mes', app.inicio_mes(v_hoje) + interval '3 months'),
    jsonb_build_object('nome', 'lancamentos_mes (mês corrente)', 'chamada', 'select api.lancamentos_mes(%L)', 'mes', v_hoje),
    jsonb_build_object('nome', 'lancamentos_mes (mês com crédito futuro, +3 meses)', 'chamada', 'select api.lancamentos_mes(%L)', 'mes', app.inicio_mes(v_hoje) + interval '3 months'));
  v_caso jsonb;
  v_tempos numeric[];
  v_ini timestamptz;
begin
  for v_caso in select * from jsonb_array_elements(v_casos) loop
    v_tempos := '{}';
    for k in 0..5 loop
      v_ini := clock_timestamp();
      execute format(v_caso->>'chamada', v_caso->>'mes');
      -- k = 0 é o aquecimento e não entra na mediana.
      if k > 0 then
        v_tempos := v_tempos || round(extract(epoch from clock_timestamp() - v_ini) * 1000, 1);
      end if;
    end loop;
    raise notice '% : mediana % ms (execuções: %) -> %', v_caso->>'nome',
      (select percentile_cont(0.5) within group (order by t) from unnest(v_tempos) t),
      v_tempos,
      case when (select percentile_cont(0.5) within group (order by t) from unnest(v_tempos) t) < 500
           then 'OK (< 500 ms)' else 'ACIMA DE 500 ms' end;
  end loop;
end
$$;
rollback;

-- Planos de dentro das funções. LOAD pode ser negado ao usuário local; nesse caso o fallback
-- mostra o plano da seleção de app.parcelas_mes.
\set ON_ERROR_STOP off
load 'auto_explain';
\set ON_ERROR_STOP on
select exists (select 1 from pg_settings where name = 'auto_explain.log_min_duration') as com_auto_explain \gset

begin;
\if :com_auto_explain
  set local auto_explain.log_min_duration = 5;
  set local auto_explain.log_analyze = on;
  set local auto_explain.log_buffers = on;
  set local auto_explain.log_nested_statements = on;
  set local client_min_messages = log;
\endif
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
\if :com_auto_explain
  select api.resumo_mes(null) is not null as ok;
  select api.lancamentos_mes(app.hoje()) is not null as ok;
\else
  \echo auto_explain indisponível: plano da consulta de app.parcelas_mes
  explain (analyze, buffers)
  select p.id, p.lancamento_id, l.tipo, p.escopo, p.dono_id, l.categoria_id, c.nome, c.variavel, p.valor_centavos
    from app.parcela p
    join app.lancamento l on l.id = p.lancamento_id
    join app.categoria c on c.id = l.categoria_id
   where p.data >= app.inicio_mes(app.hoje())
     and p.data < app.inicio_mes(app.hoje()) + interval '1 month';
\endif
rollback;
