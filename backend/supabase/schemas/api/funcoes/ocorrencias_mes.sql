-- Despesas fixas do mês com situação: garante a ocorrência de cada fixa ativa (por isso é
-- `volatile`; o PostgREST a chama por POST) e devolve `{mes, pagas, total,
-- previsto_a_pagar_centavos, ocorrencias[]}`. `previsto_a_pagar_centavos` soma o previsto das
-- não pagas (atrasadas inclusas). `pagador` é nulo ou `{nome, sou_eu}`. A data de cada item é o
-- vencimento para os dois membros; forma, conta e data do pagamento nunca saem.
-- `p_mes` é normalizado para o início do mês. `p_mes` nulo: `valor_invalido`; sem membro:
-- `registro_invalido`.
create or replace function api.ocorrencias_mes(p_mes date)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_mes date;
  v_itens jsonb;
  v_pagas integer;
  v_total integer;
  v_previsto bigint;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;
  if p_mes is null then
    raise exception 'valor_invalido';
  end if;

  v_mes := app.inicio_mes(p_mes);
  perform app.garantir_ocorrencias(v_mes);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id,
           'despesa_fixa_id', o.despesa_fixa_id,
           'descricao', o.descricao,
           'categoria', o.categoria,
           'vencimento', o.vencimento,
           'valor_previsto_centavos', o.valor_previsto_centavos,
           'valor_pago_centavos', o.valor_pago_centavos,
           'situacao', o.situacao,
           'pagador', case when o.pagador_id is null then null
                           else jsonb_build_object('nome', m.nome, 'sou_eu', o.pagador_id = v_membro) end)
         order by o.ordem), '[]'::jsonb),
         (count(*) filter (where o.situacao = 'paga'))::integer,
         count(*)::integer,
         coalesce(sum(o.valor_previsto_centavos) filter (where o.situacao <> 'paga'), 0)::bigint
    into v_itens, v_pagas, v_total, v_previsto
  from app.ocorrencias_do_mes(v_mes) o
  left join app.membro m on m.id = o.pagador_id;

  return jsonb_build_object(
    'mes', v_mes,
    'pagas', v_pagas,
    'total', v_total,
    'previsto_a_pagar_centavos', v_previsto,
    'ocorrencias', v_itens);
end;
$$;

revoke execute on function api.ocorrencias_mes(date) from public, anon;
grant execute on function api.ocorrencias_mes(date) to authenticated;
