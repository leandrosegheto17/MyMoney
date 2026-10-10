begin;

-- Forma de pagamento do membro (RN-03, RN-12): visível só ao dono.
-- O FK composto (conta_id, dono_id) garante "conta do mesmo dono"; conta_id nulo passa (MATCH SIMPLE).
-- unique (id, dono_id) é o alvo dos FKs compostos das tabelas que referenciam a forma.
create table app.forma_pagamento (
  id uuid primary key default gen_random_uuid(),
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  dono_id uuid not null default app.membro_atual() references app.membro (id),
  nome text not null check (btrim(nome) <> ''),
  tipo text not null check (tipo in ('pix', 'debito', 'credito')),
  conta_id uuid,
  dia_vencimento smallint,
  preferida boolean not null default false,
  arquivada boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (id, dono_id),
  foreign key (conta_id, dono_id) references app.conta (id, dono_id),
  constraint forma_pagamento_pix_debito_ck
    check (tipo not in ('pix', 'debito') or (conta_id is not null and dia_vencimento is null)),
  constraint forma_pagamento_credito_ck
    check (tipo <> 'credito' or coalesce(dia_vencimento between 1 and 31, false))
);

create index forma_pagamento_dono_id_idx on app.forma_pagamento (dono_id);
create unique index forma_pagamento_preferida_uq on app.forma_pagamento (dono_id) where preferida;

alter table app.forma_pagamento enable row level security;
alter table app.forma_pagamento force row level security;

create policy forma_pagamento_select on app.forma_pagamento
  for select to authenticated
  using (dono_id = app.membro_atual());

create policy forma_pagamento_insert on app.forma_pagamento
  for insert to authenticated
  with check (dono_id = app.membro_atual() and lar_id = app.lar_atual());

create policy forma_pagamento_update on app.forma_pagamento
  for update to authenticated
  using (dono_id = app.membro_atual())
  with check (dono_id = app.membro_atual() and lar_id = app.lar_atual());

create policy forma_pagamento_delete on app.forma_pagamento
  for delete to authenticated
  using (dono_id = app.membro_atual());

grant select, insert, update, delete on app.forma_pagamento to authenticated;

alter table app.movimento_conta
  add column forma_credito_id uuid,
  add foreign key (forma_credito_id, dono_id) references app.forma_pagamento (id, dono_id),
  add constraint movimento_conta_forma_credito_ck
    check ((tipo = 'pagamento_cartao') = (forma_credito_id is not null));

commit;
