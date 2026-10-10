-- Exclui um lançamento do lar do chamador: conjunto (qualquer membro) ou individual (só o
-- dono). Parcelas e a parte privada (`app.lancamento_pagamento`) somem pela FK em cascata, que
-- ignora a RLS. Inexistente, já excluído ou individual alheio: o mesmo `registro_invalido`.
-- Não há função para excluir parcela isolada (CA-08.5b); a confirmação (CA-08.6) é da tela.
create or replace function api.excluir_lancamento(p_id uuid)
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

  delete from app.lancamento
  where id = p_id
    and lar_id = app.lar_atual()
    and (escopo = 'conjunto' or dono_id = v_membro);

  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    raise exception 'registro_invalido';
  end if;
end;
$$;

revoke execute on function api.excluir_lancamento(uuid) from public, anon;
grant execute on function api.excluir_lancamento(uuid) to authenticated;
