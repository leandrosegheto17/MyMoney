begin;

create or replace function app.inicio_mes(p_data date)
returns date
language sql
immutable
security invoker
set search_path = ''
as $$
  select pg_catalog.date_trunc('month', p_data)::date;
$$;

-- Única fonte de "hoje" do negócio (ADR-004): data em America/Sao_Paulo, independente do
-- TimeZone da sessão (UTC no Supabase). O parâmetro existe para tornar a virada testável.
create or replace function app.hoje(p_instante timestamptz default now())
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select (p_instante at time zone 'America/Sao_Paulo')::date;
$$;

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

commit;
