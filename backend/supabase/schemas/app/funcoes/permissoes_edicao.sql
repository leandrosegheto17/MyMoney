-- Módulo único de "quem pode mudar o quê" num lançamento (RN-06, RN-07; CA-08.2 a 08.4).
-- Quem lançou é o pagador (RN-05), então pagador, dono e "quem lançou" = lancamento.dono_id:
-- tudo liberado. Outro membro (só alcança conjunta) muda descrição, valor, data (não no
-- crédito) e categoria conjunta; nunca escopo, forma ou parcelas. Só devolve booleanos.
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
