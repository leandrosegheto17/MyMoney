-- Até 2 membros por lar (RN-11). `posicao` (1 ou 2) é atribuída pelo gatilho e
-- a unicidade (lar_id, posicao) garante o limite mesmo sob concorrência.
create table app.membro (
  id uuid primary key,
  lar_id uuid not null references app.lar (id),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  nome text not null,
  posicao smallint not null check (posicao in (1, 2)),
  unique (lar_id, posicao)
);

create function app.membro_atribuir_posicao() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select min(p) into new.posicao
  from generate_series(1, 2) as p
  where not exists (
    select 1 from app.membro m where m.lar_id = new.lar_id and m.posicao = p
  );
  if new.posicao is null then
    raise exception 'um terceiro membro no mesmo lar é recusado' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger membro_atribuir_posicao
  before insert on app.membro
  for each row execute function app.membro_atribuir_posicao();

alter table app.membro enable row level security;
alter table app.membro force row level security;

-- user_id e posicao não saem.
grant select (id, lar_id, nome) on app.membro to authenticated;

-- Auxiliares de RLS (ADR-012): únicas funções security definer; leem só a linha
-- do auth.uid(), sem parâmetro. Ficam junto da tabela porque o corpo SQL exige
-- que app.membro já exista.
create function app.membro_atual() returns uuid
language sql stable security definer
set search_path = ''
as $$ select id from app.membro where user_id = auth.uid() $$;

create function app.lar_atual() returns uuid
language sql stable security definer
set search_path = ''
as $$ select lar_id from app.membro where user_id = auth.uid() $$;

revoke execute on function app.membro_atual(), app.lar_atual() from public, anon;
grant execute on function app.membro_atual(), app.lar_atual() to authenticated;

-- Políticas de leitura dos dois lados; só as auxiliares leem app.membro dentro
-- de política (evita recursão).
create policy lar_select on app.lar
  for select to authenticated
  using (id = app.lar_atual());

create policy membro_select on app.membro
  for select to authenticated
  using (lar_id = app.lar_atual());
