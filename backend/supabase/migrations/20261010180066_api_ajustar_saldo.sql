begin;

-- Ajuste de saldo de uma conta: grava em movimento_conta a diferença entre o saldo real
-- informado e o saldo atual (app.saldo_conta) e devolve essa diferença com sinal, em centavos
-- (positivo = entrada). Ajuste não é receita nem despesa: não cria lançamento nem parcela e não
-- entra em nenhum total. Com p_simular = true devolve só a diferença, sem gravar (prévia).
-- Diferença 0 não grava: reenviar o mesmo saldo real devolve 0 sem duplicar. O `for update` na
-- conta serializa dois ajustes simultâneos. Conta de outro membro e id inexistente recebem o
-- mesmo `registro_invalido`, antes de qualquer cálculo, também na simulação. Conta arquivada
-- pode ser ajustada. Saldo real negativo é aceito (conta no vermelho).
create or replace function api.ajustar_saldo(
  p_conta_id uuid,
  p_saldo_real_centavos bigint,
  p_simular boolean default false
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_conta uuid;
  v_dif bigint;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  if p_conta_id is null or p_saldo_real_centavos is null then
    raise exception 'valor_invalido';
  end if;

  select c.id into v_conta from app.conta c where c.id = p_conta_id for update;
  if not found then
    raise exception 'registro_invalido';
  end if;

  v_dif := p_saldo_real_centavos - app.saldo_conta(p_conta_id);

  if coalesce(p_simular, false) or v_dif = 0 then
    return v_dif;
  end if;

  insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data)
  values (
    p_conta_id, 'ajuste',
    case when v_dif > 0 then 'entrada' else 'saida' end,
    abs(v_dif), app.hoje()
  );

  return v_dif;
end;
$$;

revoke execute on function api.ajustar_saldo(uuid, bigint, boolean) from public, anon;
grant execute on function api.ajustar_saldo(uuid, bigint, boolean) to authenticated;

commit;
