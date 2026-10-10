-- Forma de pagamento do membro atual: tipo, conta (Pix/Débito) e dia de vencimento (Crédito),
-- mais `arquivada` para quem decide a recusa. Forma inexistente, invisível ou de outro membro
-- dá o mesmo `registro_invalido` (G-05). Serve também às funções DEFINER: o filtro por dono
-- é explícito e não depende da RLS.
create or replace function app.forma_do_membro(p_forma_id uuid)
returns table (tipo text, conta_id uuid, dia_vencimento smallint, arquivada boolean)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return query
  select f.tipo, f.conta_id, f.dia_vencimento, f.arquivada
  from app.forma_pagamento f
  where f.id = p_forma_id and f.dono_id = app.membro_atual();
  if not found then
    raise exception 'registro_invalido';
  end if;
end;
$$;
