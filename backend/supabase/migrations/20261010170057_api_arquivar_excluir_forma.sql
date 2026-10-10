begin;

-- Arquiva uma forma de pagamento do chamador: sai das opções de novos lançamentos e deixa de ser
-- a preferida (para o `forma_padrao_id` não apontar para uma forma fora das opções). Idempotente.
-- Lançamentos e parcelas que a usam ficam intactos. Forma inexistente ou de outro membro recebe
-- `registro_invalido`.
create or replace function api.arquivar_forma(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
begin
  if v_membro is null or p_id is null then
    raise exception 'registro_invalido';
  end if;

  update app.forma_pagamento
  set arquivada = true, preferida = false
  where id = p_id and dono_id = v_membro;

  if not found then
    raise exception 'registro_invalido';
  end if;
end;
$$;

revoke execute on function api.arquivar_forma(uuid) from public, anon;
grant execute on function api.arquivar_forma(uuid) to authenticated;

-- Exclui uma forma de pagamento do chamador. Forma ligada a lançamento ou a pagamento de cartão
-- recebe `em_uso` (os FKs não têm `on delete`; para preservar o histórico, use arquivar_forma).
-- Forma inexistente ou de outro membro recebe `registro_invalido`, antes de qualquer FK: o filtro
-- por dono impede que um membro descubra se a forma de outro está em uso.
create or replace function api.excluir_forma(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
begin
  if v_membro is null or p_id is null then
    raise exception 'registro_invalido';
  end if;

  delete from app.forma_pagamento
  where id = p_id and dono_id = v_membro;

  if not found then
    raise exception 'registro_invalido';
  end if;
exception
  when foreign_key_violation then
    raise exception 'em_uso';
end;
$$;

revoke execute on function api.excluir_forma(uuid) from public, anon;
grant execute on function api.excluir_forma(uuid) to authenticated;

commit;
