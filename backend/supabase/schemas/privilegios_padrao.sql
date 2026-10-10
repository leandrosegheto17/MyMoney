-- Vale para objetos criados pelo papel postgres, que aplica as migrations.
-- Sem esta linha, função nova nasce executável por PUBLIC (e portanto por anon).
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema app, api revoke execute on functions from anon;
-- Sem PUBLIC, authenticated precisa de grant explícito; evita repeti-lo em cada função.
alter default privileges for role postgres in schema app, api grant execute on functions to authenticated;
