-- Conta do membro (RN-03): visível só ao dono. O saldo é derivado, não há coluna.
-- unique (id, dono_id) é o alvo dos FKs compostos que garantem "conta do mesmo dono"
-- nas tabelas que a referenciam.
create table app.conta (
  id uuid primary key default gen_random_uuid(),
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  dono_id uuid not null default app.membro_atual() references app.membro (id),
  nome text not null check (btrim(nome) <> ''),
  saldo_inicial_centavos bigint not null default 0,
  arquivada boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (id, dono_id)
);

create index conta_dono_id_idx on app.conta (dono_id);

alter table app.conta enable row level security;
alter table app.conta force row level security;

create policy conta_select on app.conta
  for select to authenticated
  using (dono_id = app.membro_atual());

create policy conta_insert on app.conta
  for insert to authenticated
  with check (dono_id = app.membro_atual() and lar_id = app.lar_atual());

create policy conta_update on app.conta
  for update to authenticated
  using (dono_id = app.membro_atual())
  with check (dono_id = app.membro_atual() and lar_id = app.lar_atual());

create policy conta_delete on app.conta
  for delete to authenticated
  using (dono_id = app.membro_atual());

grant select, insert, update, delete on app.conta to authenticated;
