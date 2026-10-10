begin;

-- Única fonte de "a despesa fixa gera ocorrência neste mês?": do mês do início até o mês do
-- encerramento (inclusive); encerrada em outubro ainda gera outubro e para em novembro.
create or replace function app.fixa_gera_no_mes(p_inicio date, p_encerrada_em date, p_mes date)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select app.inicio_mes(p_mes) >= p_inicio
    and (p_encerrada_em is null or app.inicio_mes(p_mes) <= app.inicio_mes(p_encerrada_em));
$$;

-- Garante 1 ocorrência por despesa fixa ativa no mês (CA-11.1), com vencimento por
-- `app.dia_no_mes` (CA-11.2). Idempotente também sob concorrência: o `on conflict` resolve.
-- Roda como o membro: a RLS do lar limita as fixas lidas e as inserções. Não corrige
-- ocorrência já gerada.
create or replace function app.garantir_ocorrencias(p_mes date)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_mes date;
begin
  if p_mes is null then
    raise exception 'valor_invalido';
  end if;
  v_mes := app.inicio_mes(p_mes);

  insert into app.ocorrencia_fixa (lar_id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos)
  select f.lar_id, f.id, v_mes, app.dia_no_mes(v_mes, f.dia_vencimento), f.valor_previsto_centavos
  from app.despesa_fixa f
  where app.fixa_gera_no_mes(f.inicio, f.encerrada_em, v_mes)
  on conflict (despesa_fixa_id, mes) do nothing;
end;
$$;

commit;
