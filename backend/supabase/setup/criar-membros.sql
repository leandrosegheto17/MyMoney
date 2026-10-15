-- Cria o lar e os 2 membros. Nenhum dado real aqui: os valores vêm de variáveis do psql.
--
-- psql "$MYMONEY_DB_URL" -v ON_ERROR_STOP=1 \
--   -v lar_nome=... -v uid_1=... -v nome_1=... -v uid_2=... -v nome_2=... \
--   -f backend/supabase/setup/criar-membros.sql
--
-- Sem on conflict: se já houver lar, a unicidade de app.lar aborta tudo; um user_id
-- inexistente em auth.users aborta pela chave estrangeira. Rodar 2 vezes não duplica.
begin;

with novo_lar as (
  insert into app.lar (nome) values (:'lar_nome') returning id
)
insert into app.membro (id, lar_id, user_id, nome)
select gen_random_uuid(), novo_lar.id, m.user_id, m.nome
from novo_lar
cross join (values (:'uid_1'::uuid, :'nome_1'), (:'uid_2'::uuid, :'nome_2')) as m (user_id, nome);

-- Conferência: esperado lares = 1, membros = 2, membros_com_usuario = 2.
select
  (select count(*) from app.lar) as lares,
  (select count(*) from app.membro) as membros,
  (select count(*) from app.membro m join auth.users u on u.id = m.user_id) as membros_com_usuario;

commit;
