begin;

-- Garante 1 ocorrência por despesa fixa ativa no mês (CA-11.1), com vencimento por
-- `app.dia_no_mes` (CA-11.2). Idempotente também sob concorrência: o `on conflict` resolve.
-- Roda como o membro: a RLS do lar limita as fixas lidas e as inserções. Não corrige
-- ocorrência já gerada. Só gera dentro da janela de 12 meses antes a 12 meses depois de
-- `app.hoje()`: o resumo permite navegar no futuro, e sem limite um membro inflaria a tabela do
-- próprio lar pedindo meses distantes. Fora da janela retorna sem gravar (a leitura vem vazia).
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
  if v_mes < app.inicio_mes(app.hoje()) - interval '12 months'
     or v_mes > app.inicio_mes(app.hoje()) + interval '12 months' then
    return;
  end if;

  insert into app.ocorrencia_fixa (lar_id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos)
  select f.lar_id, f.id, v_mes, app.dia_no_mes(v_mes, f.dia_vencimento), f.valor_previsto_centavos
  from app.despesa_fixa f
  where app.fixa_gera_no_mes(f.inicio, f.encerrada_em, v_mes)
  on conflict (despesa_fixa_id, mes) do nothing;
end;
$$;

commit;
