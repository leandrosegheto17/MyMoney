begin;

-- Meta de guardar dinheiro (RF-17). Conjunto: visível e editável pelos dois membros;
-- individual: só pelo dono (RN-17). Sem guardado nem percentual: são derivados dos movimentos.
create table app.meta (
  id uuid primary key default gen_random_uuid(),
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  -- Na conjunta é quem criou; na individual, o dono.
  dono_id uuid not null default app.membro_atual() references app.membro (id),
  nome text not null check (btrim(nome) <> ''),
  alvo_centavos bigint not null check (alvo_centavos > 0),
  -- Sempre o 1º dia do mês do prazo.
  prazo date check (prazo = date_trunc('month', prazo)::date),
  escopo text not null check (escopo in ('conjunto', 'individual')),
  atingida_em date,
  criado_em timestamptz not null default now()
);

create index meta_lar_id_idx on app.meta (lar_id);

alter table app.meta enable row level security;
alter table app.meta force row level security;

-- Conjunta do lar, ou individual do próprio membro. Os parênteses do `or` impedem
-- que a individual do outro passe pelo ramo do lar. Sem política de delete.
create policy meta_select on app.meta
  for select to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

create policy meta_insert on app.meta
  for insert to authenticated
  with check (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

create policy meta_update on app.meta
  for update to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()))
  with check (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

grant select, insert, update on app.meta to authenticated;
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

-- Aporte/retirada de meta: a conta de origem fica só aqui (privada do autor, RN-08).
alter table app.movimento_conta add column movimento_meta_id uuid unique;
alter table app.movimento_conta add constraint movimento_conta_movimento_meta_fk
  foreign key (movimento_meta_id, dono_id) references app.movimento_meta (id, autor_id);
alter table app.movimento_conta add constraint movimento_conta_meta_ck
  check ((tipo in ('aporte', 'retirada')) = (movimento_meta_id is not null));

commit;
