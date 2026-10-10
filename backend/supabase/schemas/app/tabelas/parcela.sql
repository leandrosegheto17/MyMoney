-- Parcelas do lançamento (ADR-004). `escopo` e `dono_id` são desnormalizados do
-- lançamento para a RLS e os índices; o FK composto os mantém coerentes e propaga a
-- troca de escopo do lançamento (RN-07).
create table app.parcela (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null,
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  escopo text not null check (escopo in ('conjunto', 'individual')),
  dono_id uuid not null default app.membro_atual() references app.membro (id),
  numero smallint not null check (numero >= 1),
  valor_centavos bigint not null check (valor_centavos > 0),
  data date not null,
  data_ajustada boolean not null default false,
  unique (lancamento_id, numero),
  foreign key (lancamento_id, escopo, dono_id)
    references app.lancamento (id, escopo, dono_id) on delete cascade on update cascade
);

create index parcela_lar_id_data_idx on app.parcela (lar_id, data);
create index parcela_dono_id_data_idx on app.parcela (dono_id, data);

alter table app.parcela enable row level security;
alter table app.parcela force row level security;

create policy parcela_select on app.parcela
  for select to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

create policy parcela_insert on app.parcela
  for insert to authenticated
  with check (lar_id = app.lar_atual() and dono_id = app.membro_atual());

create policy parcela_update on app.parcela
  for update to authenticated
  using (lar_id = app.lar_atual() and dono_id = app.membro_atual())
  with check (lar_id = app.lar_atual() and dono_id = app.membro_atual());

create policy parcela_delete on app.parcela
  for delete to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

grant select, insert, update, delete on app.parcela to authenticated;
