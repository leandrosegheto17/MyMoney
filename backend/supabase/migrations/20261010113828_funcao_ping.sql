begin;

create or replace function api.ping()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select 1;
$$;

grant usage on schema api to anon;
grant execute on function api.ping() to anon, authenticated;

commit;
