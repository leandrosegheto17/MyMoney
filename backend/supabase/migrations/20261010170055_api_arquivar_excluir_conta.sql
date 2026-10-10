begin;

-- Arquiva a conta do chamador (só o estado: lançamentos, movimentos e formas ficam como estão).
-- Idempotente. Inexistente ou de outro membro recebe `registro_invalido`.
create or replace function api.arquivar_conta(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
begin
  update app.conta set arquivada = true where id = p_id and dono_id = v_membro;
  if not found then
    raise exception 'registro_invalido';
  end if;
end;
$$;

revoke execute on function api.arquivar_conta(uuid) from public, anon;
grant execute on function api.arquivar_conta(uuid) to authenticated;

-- Exclui a conta do chamador. Conta com lançamento, movimento ou forma ligada (qualquer FK para
-- app.conta) recebe `em_uso`, sem detalhe. Inexistente ou de outro membro recebe
-- `registro_invalido` antes de qualquer outra resposta.
create or replace function api.excluir_conta(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
begin
  begin
    delete from app.conta where id = p_id and dono_id = v_membro;
  exception when foreign_key_violation then
    raise exception 'em_uso';
  end;
  if not found then
    raise exception 'registro_invalido';
  end if;
end;
$$;

revoke execute on function api.excluir_conta(uuid) from public, anon;
grant execute on function api.excluir_conta(uuid) to authenticated;

commit;
