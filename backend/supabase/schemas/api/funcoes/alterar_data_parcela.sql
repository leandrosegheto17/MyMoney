-- Muda a data de uma parcela de compra no crédito e marca `data_ajustada` (ajuste só de data;
-- valor, número e categoria não mudam). Só o pagador (dono da parcela) ajusta. Inexistente,
-- parcela alheia (conjunta ou individual) ou compra que não é de crédito: o mesmo
-- `registro_invalido`, que não revela nada. Data nula: `valor_invalido`. Repetir a data é aceito.
create or replace function api.alterar_data_parcela(p_parcela_id uuid, p_data date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_linhas integer;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;
  if p_data is null then
    raise exception 'valor_invalido';
  end if;

  update app.parcela p
  set data = p_data, data_ajustada = true
  where p.id = p_parcela_id
    and p.dono_id = v_membro
    and p.lar_id = app.lar_atual()
    and exists (
      select 1
      from app.lancamento_pagamento lp
      join app.forma_pagamento f on f.id = lp.forma_pagamento_id
      where lp.lancamento_id = p.lancamento_id and f.tipo = 'credito'
    );

  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    raise exception 'registro_invalido';
  end if;
end;
$$;

revoke execute on function api.alterar_data_parcela(uuid, date) from public, anon;
grant execute on function api.alterar_data_parcela(uuid, date) to authenticated;
