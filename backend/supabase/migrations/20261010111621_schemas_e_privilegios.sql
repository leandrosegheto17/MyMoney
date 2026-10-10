begin;

create schema if not exists app;
create schema if not exists api;

revoke all on schema app from public, anon;
grant usage on schema app to authenticated;

revoke all on schema api from public;
grant usage on schema api to authenticated;

alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema app, api revoke execute on functions from anon;
alter default privileges for role postgres in schema app, api grant execute on functions to authenticated;

commit;
