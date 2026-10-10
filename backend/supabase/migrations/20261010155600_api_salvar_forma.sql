begin;

-- Cria ou edita uma forma de pagamento do chamador, idempotente pelo id gerado no cliente.
-- Pix/Débito exigem conta própria (o dia é ignorado); Crédito exige dia de 1 a 31 e aceita conta
-- opcional. O tipo não muda depois de criado. Mudar o dia só altera a forma: parcelas e
-- `dia_vencimento_aplicado` já gravados não são tocados. Conta inexistente ou de outro membro
-- recebe `registro_invalido`; conta arquivada só é recusada quando a conta da forma muda.
-- Não mexe em `preferida` nem em `arquivada`.
create or replace function api.salvar_forma(
  p_id uuid,
  p_nome text,
  p_tipo text,
  p_conta_id uuid default null,
  p_dia_vencimento smallint default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_nome text := btrim(p_nome);
  v_dia smallint;
  v_arquivada boolean;
  v_existe boolean;
  v_tipo_atual text;
  v_conta_atual uuid;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  if p_id is null or v_nome is null or v_nome = ''
     or p_tipo is null or p_tipo not in ('pix', 'debito', 'credito') then
    raise exception 'valor_invalido';
  end if;

  if p_tipo = 'credito' then
    if p_dia_vencimento is null or p_dia_vencimento not between 1 and 31 then
      raise exception 'valor_invalido';
    end if;
    v_dia := p_dia_vencimento;
  else
    if p_conta_id is null then
      raise exception 'valor_invalido';
    end if;
    v_dia := null;
  end if;

  select true, f.tipo, f.conta_id
  into v_existe, v_tipo_atual, v_conta_atual
  from app.forma_pagamento f
  where f.id = p_id and f.dono_id = v_membro;

  if p_conta_id is not null then
    select c.arquivada into v_arquivada from app.conta c where c.id = p_conta_id;
    if not found then
      raise exception 'registro_invalido';
    end if;
    if v_arquivada and p_conta_id is distinct from v_conta_atual then
      raise exception 'valor_invalido';
    end if;
  end if;

  if coalesce(v_existe, false) then
    if v_tipo_atual <> p_tipo then
      raise exception 'valor_invalido';
    end if;
    update app.forma_pagamento
    set nome = v_nome, conta_id = p_conta_id, dia_vencimento = v_dia
    where id = p_id and dono_id = v_membro;
  else
    begin
      insert into app.forma_pagamento (id, nome, tipo, conta_id, dia_vencimento)
      values (p_id, v_nome, p_tipo, p_conta_id, v_dia);
    exception when unique_violation then
      raise exception 'registro_invalido';
    end;
  end if;

  return p_id;
end;
$$;

revoke execute on function api.salvar_forma(uuid, text, text, uuid, smallint) from public, anon;
grant execute on function api.salvar_forma(uuid, text, text, uuid, smallint) to authenticated;

commit;
