-- Paga uma ocorrência de despesa fixa à vista (CA-12.1, 12.2, 12.2a): cria o lançamento
-- conjunto do pagador ligado à ocorrência, com 1 parcela no vencimento da ocorrência (I-20,
-- ADR-005 §3) e a parte privada (forma, conta, data do pagamento) só do pagador. Valor padrão
-- é o previsto e data padrão é hoje; data fora de 2000-01-01..hoje+30 dias é valor_invalido. Pix/Débito afetam o saldo pela data da operação; Crédito
-- guarda o dia de vencimento da forma e não toca nenhuma conta. Idempotente pelo id (G-17).
-- A resposta não carrega forma, conta nem data do pagamento (RN-04).
create or replace function api.pagar_ocorrencia(
  p_id uuid,
  p_ocorrencia_id uuid,
  p_forma_id uuid,
  p_valor_centavos bigint default null,
  p_data date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid;
  v_repetido app.lancamento%rowtype;
  v_ocorrencia record;
  v_forma record;
  v_valor bigint;
  v_data date;
begin
  v_membro := app.membro_atual();
  if v_membro is null or p_id is null or p_ocorrencia_id is null then
    raise exception 'registro_invalido';
  end if;

  -- Mesmo id já gravado: do próprio membro e ligado a esta ocorrência é reenvio;
  -- de outro dono ou invisível a ele é recusa (G-05).
  if app.lancamento_repetido(p_id) is not null then
    if exists (select 1 from app.ocorrencia_fixa o
               where o.id = p_ocorrencia_id and o.lancamento_id = p_id) then
      return app.resposta_pagamento_ocorrencia(p_ocorrencia_id, true);
    end if;
    raise exception 'registro_invalido';
  end if;

  select o.id, o.lancamento_id, o.vencimento, o.valor_previsto_centavos,
         d.categoria_id, d.descricao
    into v_ocorrencia
  from app.ocorrencia_fixa o
  join app.despesa_fixa d on d.id = o.despesa_fixa_id
  where o.id = p_ocorrencia_id
  for update of o;
  if not found then
    raise exception 'registro_invalido';
  end if;
  if v_ocorrencia.lancamento_id is not null then
    raise exception 'ocorrencia_paga';
  end if;

  select * into v_forma from app.forma_do_membro(p_forma_id);
  if v_forma.arquivada then
    raise exception 'forma_arquivada';
  end if;

  v_valor := coalesce(p_valor_centavos, v_ocorrencia.valor_previsto_centavos);
  if v_valor <= 0 or v_valor > 100000000000 then
    raise exception 'valor_invalido';
  end if;
  v_data := coalesce(p_data, app.hoje());
  if v_data < date '2000-01-01' or v_data > app.hoje() + 30 then
    raise exception 'valor_invalido';
  end if;

  begin
    insert into app.lancamento (id, lar_id, tipo, escopo, dono_id, categoria_id, descricao,
                                valor_total_centavos, num_parcelas)
    values (p_id, app.lar_atual(), 'despesa', 'conjunto', v_membro, v_ocorrencia.categoria_id,
            v_ocorrencia.descricao, v_valor, 1);

    insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id,
                                          conta_id, data_operacao, dia_vencimento_aplicado)
    values (p_id, app.lar_atual(), v_membro, p_forma_id,
            case when v_forma.tipo = 'credito' then null else v_forma.conta_id end,
            v_data,
            case when v_forma.tipo = 'credito' then v_forma.dia_vencimento else null end);

    insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values (p_id, app.lar_atual(), 'conjunto', v_membro, 1, v_valor, v_ocorrencia.vencimento);
  exception when unique_violation then
    -- Corrida com o mesmo id: só o próprio membro lendo o gravado é reenvio (G-17).
    if app.lancamento_repetido(p_id) is null
       or not exists (select 1 from app.ocorrencia_fixa o
                      where o.id = p_ocorrencia_id and o.lancamento_id = p_id) then
      raise exception 'registro_invalido';
    end if;
    return app.resposta_pagamento_ocorrencia(p_ocorrencia_id, true);
  end;

  update app.ocorrencia_fixa set lancamento_id = p_id where id = p_ocorrencia_id;

  return app.resposta_pagamento_ocorrencia(p_ocorrencia_id, false);
end;
$$;

revoke execute on function api.pagar_ocorrencia(uuid, uuid, uuid, bigint, date) from public, anon;
grant execute on function api.pagar_ocorrencia(uuid, uuid, uuid, bigint, date) to authenticated;
