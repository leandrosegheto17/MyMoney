-- Cabeçalho do lançamento (parte compartilhável do agregado, SDD §5, ADR-002 §1).
-- Conjunto: visível aos dois membros; individual: só ao dono. Forma, conta e data da
-- operação ficam na parte privada (lancamento_pagamento, RN-04); as parcelas, em parcela.
create table app.lancamento (
  id uuid primary key default gen_random_uuid(),
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  -- Quem pagou (conjunto) ou o autor (individual).
  dono_id uuid not null default app.membro_atual() references app.membro (id),
  tipo text not null check (tipo in ('despesa', 'receita')),
  escopo text not null check (escopo in ('conjunto', 'individual')),
  categoria_id uuid not null,
  descricao text,
  valor_total_centavos bigint not null check (valor_total_centavos > 0),
  -- Teto de R$ 1 bilhão: dois lançamentos no teto ainda somam sem estourar bigint.
  constraint lancamento_valor_maximo check (valor_total_centavos <= 100000000000),
  num_parcelas smallint not null check (num_parcelas between 1 and 24),
  alterado_por uuid references app.membro (id),
  alterado_em timestamptz,
  criado_em timestamptz not null default now(),
  -- Dono esperado da categoria: o do lançamento se individual; nulo se conjunto.
  categoria_dono_id uuid generated always as (case when escopo = 'individual' then dono_id end) stored,
  constraint lancamento_receita_individual check (tipo <> 'receita' or escopo = 'individual'),
  -- Sem on update cascade: o escopo da categoria é imutável; quem muda é o lançamento,
  -- trocando categoria e escopo no mesmo update.
  constraint lancamento_categoria_fk foreign key (categoria_id, tipo, escopo)
    references app.categoria (id, tipo, escopo),
  -- Individual: categoria do mesmo dono (nulo na conjunta, que não tem dono). E do mesmo lar.
  constraint lancamento_categoria_dono_fk foreign key (categoria_id, categoria_dono_id)
    references app.categoria (id, dono_id),
  constraint lancamento_categoria_lar_fk foreign key (categoria_id, lar_id)
    references app.categoria (id, lar_id),
  -- Alvos dos FKs compostos da parte privada e das parcelas.
  constraint lancamento_id_dono unique (id, dono_id),
  constraint lancamento_id_escopo_dono unique (id, escopo, dono_id)
);

create index lancamento_dono_id_idx on app.lancamento (dono_id);

alter table app.lancamento enable row level security;
alter table app.lancamento force row level security;

-- Conjunto do lar, ou individual do próprio membro. Qualquer membro exclui a conjunta;
-- a edição pelo outro membro passa pela função de api com DEFINER (ADR-003).
create policy lancamento_select on app.lancamento
  for select to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

create policy lancamento_insert on app.lancamento
  for insert to authenticated
  with check (lar_id = app.lar_atual() and dono_id = app.membro_atual());

create policy lancamento_update on app.lancamento
  for update to authenticated
  using (lar_id = app.lar_atual() and dono_id = app.membro_atual())
  with check (lar_id = app.lar_atual() and dono_id = app.membro_atual());

create policy lancamento_delete on app.lancamento
  for delete to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

grant select, insert, update, delete on app.lancamento to authenticated;
