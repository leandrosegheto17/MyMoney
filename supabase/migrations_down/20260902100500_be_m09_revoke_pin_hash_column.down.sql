-- Rollback manual de 20260902100500_be_m09_revoke_pin_hash_column.sql
--
-- Revoga primeiro os GRANTs de coluna específicos criados pela migration "up"
-- (achado de code review: um `REVOKE SELECT ON public.profiles ...` de tabela,
-- sem qualificar coluna, não desfaz um `GRANT SELECT (col1, col2, ...)` de
-- coluna — são ACLs distintas em Postgres, `pg_class.relacl` vs.
-- `pg_attribute.attacl`. Sem este passo, o GRANT de coluna da migration "up"
-- ficaria como resíduo órfão depois do rollback — inofensivo em termos de
-- acesso final, já que o GRANT de tabela abaixo já cobre tudo, mas deixa o
-- estado de ACL inconsistente com o que existia antes da migration "up").

revoke select (
  id, full_name, avatar_url, base_currency, locale, created_at, updated_at
) on public.profiles from authenticated, anon;

revoke update (
  full_name, avatar_url, base_currency, locale
) on public.profiles from authenticated;

revoke select on public.profiles from authenticated, anon;
revoke update on public.profiles from authenticated;

grant select on public.profiles to authenticated, anon;
grant update on public.profiles to authenticated;

alter function public.set_pin(text) security invoker;
alter function public.verify_pin(text) security invoker;
