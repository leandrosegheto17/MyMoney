-- Schema interno: tabelas e funções de apoio. Nunca exposto pela API.
create schema if not exists app;

revoke all on schema app from public, anon;
-- necessário às funções SECURITY INVOKER chamadas por authenticated
grant usage on schema app to authenticated;
