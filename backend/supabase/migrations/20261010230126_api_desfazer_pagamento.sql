begin;

-- Desfaz o pagamento de uma ocorrência de despesa fixa (CA-12.3): só o pagador. Exclui o
-- lançamento ligado (parcela e parte privada saem pela cascata) e a ocorrência volta a
-- pendente. Saldo, cartão e totais são derivados das linhas apagadas: não há estorno próprio.
-- Ocorrência já pendente retorna sem erro (reenvio idempotente). Inexistente e "não é seu"
-- dão o mesmo `registro_invalido` (G-05); o filtro por dono é explícito, não depende da RLS.
create or replace function api.desfazer_pagamento(p_ocorrencia_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid;
  v_lancamento uuid;
begin
  v_membro := app.membro_atual();
  if v_membro is null or p_ocorrencia_id is null then
    raise exception 'registro_invalido';
  end if;

  select o.lancamento_id into v_lancamento
  from app.ocorrencia_fixa o
  where o.id = p_ocorrencia_id
  for update;
  if not found then
    raise exception 'registro_invalido';
  end if;
  if v_lancamento is null then
    return;
  end if;

  if not exists (select 1 from app.lancamento l
                 where l.id = v_lancamento and l.dono_id = v_membro) then
    raise exception 'registro_invalido';
  end if;

  update app.ocorrencia_fixa set lancamento_id = null where id = p_ocorrencia_id;
  delete from app.lancamento where id = v_lancamento and dono_id = v_membro;
end;
$$;

revoke execute on function api.desfazer_pagamento(uuid) from public, anon;
grant execute on function api.desfazer_pagamento(uuid) to authenticated;

commit;
