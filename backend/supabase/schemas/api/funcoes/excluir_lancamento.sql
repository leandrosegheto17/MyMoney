-- Exclui um lançamento do lar do chamador: conjunto (qualquer membro) ou individual (só o
-- dono); se é o pagamento de uma ocorrência de despesa fixa, só o pagador (RN-06, I-20; quem
-- desfaz é `api.desfazer_pagamento`). Parcelas e a parte privada (`app.lancamento_pagamento`)
-- somem pela FK em cascata, que ignora a RLS. Inexistente, já excluído, individual alheio ou
-- pagamento de fixa de outro membro: o mesmo `registro_invalido`. Não há função para excluir
-- parcela isolada (CA-08.5b); a confirmação (CA-08.6) é da tela.
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

  delete from app.lancamento l
  where l.id = p_id
    and l.lar_id = app.lar_atual()
    and (l.escopo = 'conjunto' or l.dono_id = v_membro)
    and (l.dono_id = v_membro
         or not exists (select 1 from app.ocorrencia_fixa o where o.lancamento_id = l.id));

  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    raise exception 'registro_invalido';
  end if;
end;
$$;

revoke execute on function api.excluir_lancamento(uuid) from public, anon;
grant execute on function api.excluir_lancamento(uuid) to authenticated;
