create or replace function app.inicio_mes(p_data date)
returns date
language sql
immutable
security invoker
set search_path = ''
as $$
  select pg_catalog.date_trunc('month', p_data)::date;
$$;
