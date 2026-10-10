begin;

-- Cria ou edita uma conta do chamador, idempotente pelo id gerado no cliente.
-- Saldo inicial nulo vira 0; negativo é aceito (conta no vermelho). Não mexe em `arquivada`.
-- Dono e lar vêm das auxiliares (defaults da tabela), nunca de parâmetro. Id que já existe
-- mas pertence a outro membro (a RLS esconde) recebe o mesmo erro de "não existe".
create or replace function api.salvar_conta(
  p_id uuid,
  p_nome text,
  p_saldo_inicial_centavos bigint default 0
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_nome text := btrim(p_nome);
  v_saldo bigint := coalesce(p_saldo_inicial_centavos, 0);
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  if p_id is null or v_nome is null or v_nome = '' then
    raise exception 'valor_invalido';
  end if;

  update app.conta
  set nome = v_nome, saldo_inicial_centavos = v_saldo
  where id = p_id and dono_id = v_membro;

  if not found then
    begin
      insert into app.conta (id, nome, saldo_inicial_centavos)
      values (p_id, v_nome, v_saldo);
    exception when unique_violation then
      raise exception 'registro_invalido';
    end;
  end if;

  return p_id;
end;
$$;

revoke execute on function api.salvar_conta(uuid, text, bigint) from public, anon;
grant execute on function api.salvar_conta(uuid, text, bigint) to authenticated;

commit;
