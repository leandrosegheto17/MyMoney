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
