begin;

-- Módulo único de "quem pode mudar o quê" num lançamento (RN-06, RN-07; CA-08.2 a 08.4).
-- Quem lançou é o pagador (RN-05), então pagador, dono e "quem lançou" = lancamento.dono_id:
-- tudo liberado. Outro membro (só alcança conjunta) muda descrição, valor, data (não no
-- crédito) e categoria conjunta; nunca escopo, forma ou parcelas. Lançamento ligado a uma
-- ocorrência de despesa fixa (o pagamento da fixa) é só do pagador: o outro membro não muda
-- nada (RN-06, I-20). Só devolve booleanos.
-- Lê a parte privada (forma de pagamento) e revela se a conjunta é no crédito: só o dono das
-- funções a executa, chamada por api.editar_lancamento. A visibilidade é checada de forma
-- explícita, pois ali a RLS não protege. Quem decide o erro sem_permissao é o chamador.
create or replace function app.permissoes_edicao(p_lancamento_id uuid)
returns table (descricao boolean, valor boolean, data boolean, categoria_mesmo_escopo boolean,
               troca_escopo boolean, forma boolean, parcelas boolean)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_membro uuid;
  v_dono uuid;
  v_credito boolean;
begin
  v_membro := app.membro_atual();
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  select l.dono_id
    into v_dono
    from app.lancamento l
   where l.id = p_lancamento_id
     and l.lar_id = app.lar_atual()
     and (l.escopo = 'conjunto' or l.dono_id = v_membro);
  if not found then
    raise exception 'registro_invalido';
  end if;

  if v_dono = v_membro then
    return query select true, true, true, true, true, true, true;
    return;
  end if;

  if exists (select 1
               from app.ocorrencia_fixa o
              where o.lancamento_id = p_lancamento_id
                and o.lar_id = app.lar_atual()) then
    return query select false, false, false, false, false, false, false;
    return;
  end if;

  select exists (
           select 1
             from app.lancamento_pagamento lp
             join app.forma_pagamento f on f.id = lp.forma_pagamento_id
            where lp.lancamento_id = p_lancamento_id
              and f.tipo = 'credito')
    into v_credito;

  return query select true, true, not v_credito, true, false, false, false;
end;
$$;

revoke execute on function app.permissoes_edicao(uuid) from public, anon, authenticated;

-- Exclui um lançamento do lar do chamador: conjunto (qualquer membro) ou individual (só o
-- dono); se é o pagamento de uma ocorrência de despesa fixa, só o pagador (RN-06, I-20; quem
-- desfaz é `api.desfazer_pagamento`). Parcelas e a parte privada (`app.lancamento_pagamento`)
-- somem pela FK em cascata, que ignora a RLS. Inexistente, já excluído, individual alheio ou
-- pagamento de fixa de outro membro: o mesmo `registro_invalido`. Não há função para excluir
-- parcela isolada (CA-08.5b); a confirmação (CA-08.6) é da tela.
create or replace function api.excluir_lancamento(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_linhas integer;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  delete from app.lancamento l
  where l.id = p_id
    and l.lar_id = app.lar_atual()
    and (l.escopo = 'conjunto' or l.dono_id = v_membro)
    and (l.dono_id = v_membro
         or not exists (select 1 from app.ocorrencia_fixa o where o.lancamento_id = l.id));

  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    raise exception 'registro_invalido';
  end if;
end;
$$;

revoke execute on function api.excluir_lancamento(uuid) from public, anon;
grant execute on function api.excluir_lancamento(uuid) to authenticated;

commit;
