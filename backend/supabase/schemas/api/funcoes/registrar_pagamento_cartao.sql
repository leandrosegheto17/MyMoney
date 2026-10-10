-- Pagamento de cartão de crédito: grava um movimento_conta de saída (tipo pagamento_cartao) na
-- conta de origem do próprio membro, ligado à forma de Crédito paga. Debita o saldo da conta e
-- nada mais: não cria lançamento nem parcela, não entra em total, orçamento nem resultado e não
-- abate o gasto do cartão. Idempotente pelo id gerado no cliente: o mesmo id do mesmo membro
-- devolve o id sem gravar; id de outro membro recebe `registro_invalido`. Forma que não é de
-- Crédito, conta arquivada e dados de outro membro ou inexistentes recebem o mesmo
-- `registro_invalido`. Forma arquivada é aceita; data futura é aceita (pesa no saldo a partir do dia).
create or replace function api.registrar_pagamento_cartao(
  p_id uuid,
  p_forma_id uuid,
  p_conta_id uuid,
  p_valor_centavos bigint,
  p_data date default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_data date;
  v_dono uuid;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  if p_id is null or p_forma_id is null or p_conta_id is null
     or p_valor_centavos is null or p_valor_centavos <= 0 then
    raise exception 'valor_invalido';
  end if;

  v_data := coalesce(p_data, app.hoje());

  select m.dono_id into v_dono from app.movimento_conta m where m.id = p_id;
  if found then
    if v_dono = v_membro then
      return p_id;
    end if;
    raise exception 'registro_invalido';
  end if;

  if not exists (
    select 1 from app.forma_pagamento f
    where f.id = p_forma_id and f.dono_id = v_membro and f.tipo = 'credito'
  ) then
    raise exception 'registro_invalido';
  end if;

  if not exists (
    select 1 from app.conta c
    where c.id = p_conta_id and c.dono_id = v_membro and not c.arquivada
  ) then
    raise exception 'registro_invalido';
  end if;

  begin
    insert into app.movimento_conta (id, conta_id, tipo, sentido, valor_centavos, data, forma_credito_id)
    values (p_id, p_conta_id, 'pagamento_cartao', 'saida', p_valor_centavos, v_data, p_forma_id);
  exception when unique_violation then
    raise exception 'registro_invalido';
  end;

  return p_id;
end;
$$;

revoke execute on function api.registrar_pagamento_cartao(uuid, uuid, uuid, bigint, date) from public, anon;
grant execute on function api.registrar_pagamento_cartao(uuid, uuid, uuid, bigint, date) to authenticated;
