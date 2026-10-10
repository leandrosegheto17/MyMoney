-- Única fonte de data e valor de parcela do crédito (RN-14, ADR-005 §3): a 1ª parcela vence
-- no mês seguinte à compra; os centavos que não dividem igual ficam na 1ª parcela.
create or replace function app.gerar_parcelas(
  p_data_compra date,
  p_dia_vencimento integer,
  p_num_parcelas integer,
  p_total_centavos bigint
)
returns table (numero integer, valor_centavos bigint, data date)
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_base bigint;
begin
  if p_data_compra is null
     or p_num_parcelas is null or p_num_parcelas not between 1 and 24
     or p_total_centavos is null or p_total_centavos < p_num_parcelas then
    raise exception 'valor_invalido';
  end if;

  v_base := p_total_centavos / p_num_parcelas;

  return query
  select k,
         case when k = 1 then p_total_centavos - v_base * (p_num_parcelas - 1) else v_base end,
         app.dia_no_mes((app.inicio_mes(p_data_compra) + pg_catalog.make_interval(months => k))::date,
                        p_dia_vencimento)
  from pg_catalog.generate_series(1, p_num_parcelas) as k;
end;
$$;
