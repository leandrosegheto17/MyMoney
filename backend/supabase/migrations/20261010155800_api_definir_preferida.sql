begin;

-- Define (ou, com p_preferida = false, desliga) a forma preferida do chamador. Uma só preferida
-- por dono: ao ligar, a anterior deixa de ser. Idempotente nos dois sentidos. Forma inexistente
-- ou de outro membro recebe `registro_invalido`; forma arquivada não vira preferida
-- (`valor_invalido`, checado só depois de confirmar que a forma é do chamador).
create or replace function api.definir_preferida(
  p_id uuid,
  p_preferida boolean default true
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_arquivada boolean;
begin
  if v_membro is null or p_id is null then
    raise exception 'registro_invalido';
  end if;

  select f.arquivada into v_arquivada
  from app.forma_pagamento f
  where f.id = p_id and f.dono_id = v_membro
  for update;

  if not found then
    raise exception 'registro_invalido';
  end if;

  if coalesce(p_preferida, true) then
    if v_arquivada then
      raise exception 'valor_invalido';
    end if;
    update app.forma_pagamento
    set preferida = false
    where dono_id = v_membro and preferida and id <> p_id;
    update app.forma_pagamento
    set preferida = true
    where id = p_id and dono_id = v_membro and not preferida;
  else
    update app.forma_pagamento
    set preferida = false
    where id = p_id and dono_id = v_membro and preferida;
  end if;
end;
$$;

revoke execute on function api.definir_preferida(uuid, boolean) from public, anon;
grant execute on function api.definir_preferida(uuid, boolean) to authenticated;

commit;
