begin;

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
  num_parcelas smallint not null check (num_parcelas between 1 and 24),
  alterado_por uuid references app.membro (id),
  alterado_em timestamptz,
  criado_em timestamptz not null default now(),
  constraint lancamento_receita_individual check (tipo <> 'receita' or escopo = 'individual'),
  -- Sem on update cascade: o escopo da categoria é imutável; quem muda é o lançamento,
  -- trocando categoria e escopo no mesmo update.
  constraint lancamento_categoria_fk foreign key (categoria_id, tipo, escopo)
    references app.categoria (id, tipo, escopo),
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

-- Parte privada do lançamento (ADR-002 §1, RN-04): como, de onde e quando o pagador
-- pagou. Visível e editável só pelo pagador, mesmo na despesa conjunta.
-- Os FKs compostos garantem parte privada, forma e conta do mesmo dono do lançamento.
create table app.lancamento_pagamento (
  lancamento_id uuid primary key,
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  dono_id uuid not null default app.membro_atual() references app.membro (id),
  forma_pagamento_id uuid,
  -- Nulo no crédito: a conta só é debitada no pagamento da fatura.
  conta_id uuid,
  data_operacao date not null,
  dia_vencimento_aplicado smallint check (dia_vencimento_aplicado between 1 and 31),
  foreign key (lancamento_id, dono_id) references app.lancamento (id, dono_id) on delete cascade,
  foreign key (forma_pagamento_id, dono_id) references app.forma_pagamento (id, dono_id),
  foreign key (conta_id, dono_id) references app.conta (id, dono_id)
);

alter table app.lancamento_pagamento enable row level security;
alter table app.lancamento_pagamento force row level security;

create policy lancamento_pagamento_select on app.lancamento_pagamento
  for select to authenticated
  using (dono_id = app.membro_atual());

create policy lancamento_pagamento_insert on app.lancamento_pagamento
  for insert to authenticated
  with check (dono_id = app.membro_atual() and lar_id = app.lar_atual());

create policy lancamento_pagamento_update on app.lancamento_pagamento
  for update to authenticated
  using (dono_id = app.membro_atual())
  with check (dono_id = app.membro_atual() and lar_id = app.lar_atual());

create policy lancamento_pagamento_delete on app.lancamento_pagamento
  for delete to authenticated
  using (dono_id = app.membro_atual());

grant select, insert, update, delete on app.lancamento_pagamento to authenticated;

-- Parcelas do lançamento (ADR-004). `escopo` e `dono_id` são desnormalizados do
-- lançamento para a RLS e os índices; o FK composto os mantém coerentes e propaga a
-- troca de escopo do lançamento (RN-07).
create table app.parcela (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null,
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  escopo text not null check (escopo in ('conjunto', 'individual')),
  dono_id uuid not null default app.membro_atual() references app.membro (id),
  numero smallint not null check (numero >= 1),
  valor_centavos bigint not null check (valor_centavos > 0),
  data date not null,
  data_ajustada boolean not null default false,
  unique (lancamento_id, numero),
  foreign key (lancamento_id, escopo, dono_id)
    references app.lancamento (id, escopo, dono_id) on delete cascade on update cascade
);

create index parcela_lar_id_data_idx on app.parcela (lar_id, data);
create index parcela_dono_id_data_idx on app.parcela (dono_id, data);

alter table app.parcela enable row level security;
alter table app.parcela force row level security;

create policy parcela_select on app.parcela
  for select to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

create policy parcela_insert on app.parcela
  for insert to authenticated
  with check (lar_id = app.lar_atual() and dono_id = app.membro_atual());

create policy parcela_update on app.parcela
  for update to authenticated
  using (lar_id = app.lar_atual() and dono_id = app.membro_atual())
  with check (lar_id = app.lar_atual() and dono_id = app.membro_atual());

create policy parcela_delete on app.parcela
  for delete to authenticated
  using (lar_id = app.lar_atual() and (escopo = 'conjunto' or dono_id = app.membro_atual()));

grant select, insert, update, delete on app.parcela to authenticated;

commit;
