-- Categorias de despesa e receita (RF-04). Conjunta: visível e editável pelos dois
-- membros; individual: só pelo dono (RN-17). Receita é sempre individual.
create table app.categoria (
  id uuid primary key default gen_random_uuid(),
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  tipo text not null check (tipo in ('despesa', 'receita')),
  escopo text not null check (escopo in ('conjunto', 'individual')),
  dono_id uuid references app.membro (id),
  nome text not null check (btrim(nome) <> ''),
  -- Só despesa distingue fixa/variável; receita fica nula.
  variavel boolean,
  arquivada boolean not null default false,
  criado_em timestamptz not null default now(),
  constraint categoria_dono_so_individual check ((escopo = 'individual') = (dono_id is not null)),
  constraint categoria_variavel_so_despesa check ((tipo = 'despesa') = (variavel is not null)),
  constraint categoria_receita_individual check (tipo <> 'receita' or escopo = 'individual'),
  -- nulls not distinct: conjuntas têm dono_id nulo e, sem isso, nunca colidiriam.
  constraint categoria_unica unique nulls not distinct (lar_id, tipo, escopo, dono_id, nome),
  -- Alvo do FK composto do lançamento: garante tipo e escopo da categoria (RN-01).
  constraint categoria_id_tipo_escopo unique (id, tipo, escopo)
);

alter table app.categoria enable row level security;
alter table app.categoria force row level security;

-- Conjunta do lar, ou individual do próprio membro. Os parênteses do `or` impedem
-- que a individual do outro passe pelo ramo do lar.
create policy categoria_select on app.categoria
  for select to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

create policy categoria_insert on app.categoria
  for insert to authenticated
  with check (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

create policy categoria_update on app.categoria
  for update to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()))
  with check (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

create policy categoria_delete on app.categoria
  for delete to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

grant select, insert, update, delete on app.categoria to authenticated;
