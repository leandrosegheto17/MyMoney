-- Schema exposto pela API (config.toml: api.schemas). O usage de anon entra junto com api.ping.
create schema if not exists api;

revoke all on schema api from public;
grant usage on schema api to authenticated;
