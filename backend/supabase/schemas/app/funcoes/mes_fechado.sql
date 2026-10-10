-- O mês terminou (RN-16d): o dia 1 do mês seguinte já passou ou é hoje. p_mes é normalizado
-- para o início do mês. Enquanto o mês está aberto (corrente ou futuro), os resultados são parciais.
create or replace function app.mes_fechado(p_mes date)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app.inicio_mes(p_mes) + interval '1 month' <= app.hoje();
$$;
