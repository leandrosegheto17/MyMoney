-- Única fonte de "dia X do mês" (RN-14): dia maior que o mês cai no último dia.
-- p_mes é qualquer data do mês desejado.
create or replace function app.dia_no_mes(p_mes date, p_dia integer)
returns date
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_inicio date := app.inicio_mes(p_mes);
  v_ultimo integer := extract(day from (v_inicio + interval '1 month - 1 day'))::integer;
begin
  if p_dia is null or p_dia not between 1 and 31 then
    raise exception 'valor_invalido';
  end if;
  return v_inicio + (least(p_dia, v_ultimo) - 1);
end;
$$;
