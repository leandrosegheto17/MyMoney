-- Movimento de conta (RN-12). O valor é sempre positivo e o sinal vem do sentido (ADR-004).
-- O FK composto impede movimento sobre conta de outro membro.
create table app.movimento_conta (
  id uuid primary key default gen_random_uuid(),
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  dono_id uuid not null default app.membro_atual() references app.membro (id),
  conta_id uuid not null,
  tipo text not null check (tipo in ('ajuste', 'aporte', 'retirada', 'pagamento_cartao')),
  sentido text not null check (sentido in ('entrada', 'saida')),
  valor_centavos bigint not null check (valor_centavos > 0),
  data date not null,
  criado_em timestamptz not null default now(),
  foreign key (conta_id, dono_id) references app.conta (id, dono_id)
);

create index movimento_conta_conta_id_data_idx on app.movimento_conta (conta_id, data);

alter table app.movimento_conta enable row level security;
alter table app.movimento_conta force row level security;

create policy movimento_conta_select on app.movimento_conta
  for select to authenticated
  using (dono_id = app.membro_atual());

create policy movimento_conta_insert on app.movimento_conta
  for insert to authenticated
  with check (dono_id = app.membro_atual() and lar_id = app.lar_atual());

create policy movimento_conta_update on app.movimento_conta
  for update to authenticated
  using (dono_id = app.membro_atual())
  with check (dono_id = app.membro_atual() and lar_id = app.lar_atual());

create policy movimento_conta_delete on app.movimento_conta
  for delete to authenticated
  using (dono_id = app.membro_atual());

grant select, insert, update, delete on app.movimento_conta to authenticated;
