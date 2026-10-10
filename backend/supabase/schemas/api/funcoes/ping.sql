-- Única função executável por anon: verificação de saúde sem acesso a tabela nem efeito colateral.
-- Não chama app.membro_atual(): anon não é membro e o ping não lê dado.
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
