-- Modelo da despesa fixa recorrente do lar (RF-10, RN-15): sem dono, sempre conjunta.
-- `tipo` e `escopo` existem só para o FK composto garantir categoria de despesa conjunta.
-- O FK da categoria é "no action": excluir categoria em uso falha com 23503.
create table app.despesa_fixa (
  id uuid primary key default gen_random_uuid(),
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  descricao text not null check (btrim(descricao) <> ''),
  categoria_id uuid not null,
  tipo text not null default 'despesa' check (tipo = 'despesa'),
  escopo text not null default 'conjunto' check (escopo = 'conjunto'),
  valor_previsto_centavos bigint not null check (valor_previsto_centavos > 0),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  inicio date not null default app.inicio_mes(app.hoje())
    check (inicio = date_trunc('month', inicio)::date),
  encerrada_em date,
  criado_em timestamptz not null default now(),
  constraint despesa_fixa_categoria_fk foreign key (categoria_id, tipo, escopo)
    references app.categoria (id, tipo, escopo)
);

alter table app.despesa_fixa enable row level security;
alter table app.despesa_fixa force row level security;

create policy despesa_fixa_select on app.despesa_fixa
  for select to authenticated
  using (lar_id = app.lar_atual());

create policy despesa_fixa_insert on app.despesa_fixa
  for insert to authenticated
  with check (lar_id = app.lar_atual());

create policy despesa_fixa_update on app.despesa_fixa
  for update to authenticated
  using (lar_id = app.lar_atual())
  with check (lar_id = app.lar_atual());

-- Sem delete: a fixa é encerrada (encerrada_em), não excluída.
grant select, insert, update on app.despesa_fixa to authenticated;
