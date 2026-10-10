begin;

-- Alvo do FK composto do orçamento individual (dono do orçamento = dono da categoria).
alter table app.categoria add constraint categoria_id_dono unique (id, dono_id);

-- Orçamento mensal por categoria de despesa (RF-15). Conjunto: visível e editável pelos
-- dois membros; individual: só pelo dono (RN-17). Sem percentual nem situação: é regra.
create table app.orcamento (
  id uuid primary key default gen_random_uuid(),
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  -- Sempre o 1º dia do mês; quem grava normaliza com app.inicio_mes.
  mes date not null check (extract(day from mes) = 1),
  categoria_id uuid not null,
  -- Fixo em 'despesa': existe só para o FK composto recusar categoria de receita.
  tipo text not null default 'despesa' check (tipo = 'despesa'),
  escopo text not null check (escopo in ('conjunto', 'individual')),
  dono_id uuid references app.membro (id),
  valor_centavos bigint not null check (valor_centavos > 0),
  criado_em timestamptz not null default now(),
  constraint orcamento_dono_so_individual check ((escopo = 'individual') = (dono_id is not null)),
  -- Sem on delete: excluir categoria orçada falha com foreign_key_violation.
  constraint orcamento_categoria_tipo_escopo_fk foreign key (categoria_id, tipo, escopo)
    references app.categoria (id, tipo, escopo),
  -- MATCH SIMPLE: só vale para a individual (dono_id nulo na conjunta não é verificado).
  constraint orcamento_categoria_dono_fk foreign key (categoria_id, dono_id)
    references app.categoria (id, dono_id),
  constraint orcamento_categoria_mes_unico unique (categoria_id, mes)
);

create index orcamento_lar_mes_idx on app.orcamento (lar_id, mes);

alter table app.orcamento enable row level security;
alter table app.orcamento force row level security;

-- Conjunto do lar, ou individual do próprio membro. Os parênteses do `or` impedem
-- que a individual do outro passe pelo ramo do lar.
create policy orcamento_select on app.orcamento
  for select to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

create policy orcamento_insert on app.orcamento
  for insert to authenticated
  with check (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

create policy orcamento_update on app.orcamento
  for update to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()))
  with check (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

create policy orcamento_delete on app.orcamento
  for delete to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

grant select, insert, update, delete on app.orcamento to authenticated;

commit;
