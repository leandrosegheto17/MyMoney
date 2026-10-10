-- Ocorrência mensal de uma despesa fixa (RN-15): no máximo uma por fixa e mês. Pendente
-- enquanto `lancamento_id` é nulo; paga quando aponta o lançamento. Excluir o lançamento
-- volta a ocorrência a pendente (on delete set null; a ação de FK ignora a RLS).
create table app.ocorrencia_fixa (
  id uuid primary key default gen_random_uuid(),
  lar_id uuid not null default app.lar_atual() references app.lar (id),
  despesa_fixa_id uuid not null references app.despesa_fixa (id),
  mes date not null check (mes = date_trunc('month', mes)::date),
  vencimento date not null,
  -- Cópia do modelo na geração; editável no pagamento.
  valor_previsto_centavos bigint not null check (valor_previsto_centavos > 0),
  lancamento_id uuid unique references app.lancamento (id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint ocorrencia_fixa_vencimento_no_mes check (date_trunc('month', vencimento)::date = mes),
  unique (despesa_fixa_id, mes)
);

create index ocorrencia_fixa_lar_id_mes_idx on app.ocorrencia_fixa (lar_id, mes);

alter table app.ocorrencia_fixa enable row level security;
alter table app.ocorrencia_fixa force row level security;

create policy ocorrencia_fixa_select on app.ocorrencia_fixa
  for select to authenticated
  using (lar_id = app.lar_atual());

create policy ocorrencia_fixa_insert on app.ocorrencia_fixa
  for insert to authenticated
  with check (lar_id = app.lar_atual());

create policy ocorrencia_fixa_update on app.ocorrencia_fixa
  for update to authenticated
  using (lar_id = app.lar_atual())
  with check (lar_id = app.lar_atual());

-- O encerramento da fixa apaga as ocorrências pendentes.
create policy ocorrencia_fixa_delete on app.ocorrencia_fixa
  for delete to authenticated
  using (lar_id = app.lar_atual());

grant select, insert, update, delete on app.ocorrencia_fixa to authenticated;
