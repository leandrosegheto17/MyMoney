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
