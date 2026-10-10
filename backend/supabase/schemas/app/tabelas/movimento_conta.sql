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
  forma_credito_id uuid,
  -- Aporte/retirada de meta; o FK composto fica em movimento_meta.sql (ordem dos arquivos).
  movimento_meta_id uuid unique,
  criado_em timestamptz not null default now(),
  foreign key (conta_id, dono_id) references app.conta (id, dono_id),
  foreign key (forma_credito_id, dono_id) references app.forma_pagamento (id, dono_id),
  constraint movimento_conta_forma_credito_ck
    check ((tipo = 'pagamento_cartao') = (forma_credito_id is not null)),
  constraint movimento_conta_meta_ck
    check ((tipo in ('aporte', 'retirada')) = (movimento_meta_id is not null))
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
