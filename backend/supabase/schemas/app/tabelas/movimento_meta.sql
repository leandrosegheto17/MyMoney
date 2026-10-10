-- Aporte ou retirada de uma meta (RF-18). O local é texto livre (RN-09) e a conta de
-- origem não fica aqui: fica só em movimento_conta, privada do autor (RN-08).
create table app.movimento_meta (
  id uuid primary key default gen_random_uuid(),
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  meta_id uuid not null references app.meta (id),
  tipo text not null check (tipo in ('aporte', 'retirada')),
  valor_centavos bigint not null check (valor_centavos > 0),
  data date not null,
  local text not null check (local = btrim(local) and local <> '' and char_length(local) <= 60),
  autor_id uuid not null default app.membro_atual() references app.membro (id),
  criado_em timestamptz not null default now(),
  -- Alvo do FK composto de movimento_conta (a conta só pode ser do autor).
  unique (id, autor_id)
);

create index movimento_meta_meta_id_data_idx on app.movimento_meta (meta_id, data);

alter table app.movimento_meta enable row level security;
alter table app.movimento_meta force row level security;

-- Visível se a meta é: a RLS de app.meta vale dentro da subconsulta.
create policy movimento_meta_select on app.movimento_meta
  for select to authenticated
  using (lar_id = app.lar_atual() and exists (select 1 from app.meta m where m.id = meta_id));

create policy movimento_meta_insert on app.movimento_meta
  for insert to authenticated
  with check (
    lar_id = app.lar_atual()
    and autor_id = app.membro_atual()
    and exists (select 1 from app.meta m where m.id = meta_id)
  );

-- Sem update nem delete: o movimento é imutável.
grant select, insert on app.movimento_meta to authenticated;

-- A conta de um aporte/retirada só pode ser do autor do movimento da meta.
alter table app.movimento_conta
  add constraint movimento_conta_movimento_meta_fk
  foreign key (movimento_meta_id, dono_id) references app.movimento_meta (id, autor_id);
