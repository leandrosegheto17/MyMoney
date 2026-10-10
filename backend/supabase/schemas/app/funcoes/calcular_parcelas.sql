-- Única fonte das parcelas de uma despesa pela forma de pagamento: Pix e Débito são 1 parcela
-- do total na data da operação; Crédito segue `app.gerar_parcelas` (RN-14). Usada ao lançar
-- e ao editar, para as duas nunca divergirem. Número de parcelas fora da regra da forma dá
-- `valor_invalido`.
create or replace function app.calcular_parcelas(
  p_tipo_forma text,
  p_data date,
  p_dia integer,
  p_num_parcelas integer,
  p_total_centavos bigint
)
returns table (numero integer, valor_centavos bigint, data date)
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if p_tipo_forma = 'credito' then
    return query
    select g.numero, g.valor_centavos, g.data
    from app.gerar_parcelas(p_data, p_dia, p_num_parcelas, p_total_centavos) g;
    return;
  end if;

  if p_data is null or p_num_parcelas is distinct from 1
     or p_total_centavos is null or p_total_centavos <= 0 then
    raise exception 'valor_invalido';
  end if;

  return query select 1, p_total_centavos, p_data;
end;
$$;
