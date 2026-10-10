begin;

-- Encerra uma despesa fixa: grava `encerrada_em` com a data de hoje e apaga as ocorrências
-- pendentes dos meses em que ela deixa de gerar (a do mês do encerramento fica). Ocorrências
-- pagas nunca são apagadas. Chamar de novo não move a data do primeiro encerramento.
-- Qualquer membro do lar encerra (a RLS do lar); id inexistente ou de outro lar dá `registro_invalido`.
create or replace function api.encerrar_despesa_fixa(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_inicio date;
  v_encerrada_em date;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  if p_id is null then
    raise exception 'valor_invalido';
  end if;

  update app.despesa_fixa
  set encerrada_em = coalesce(encerrada_em, app.hoje())
  where id = p_id
  returning inicio, encerrada_em into v_inicio, v_encerrada_em;

  if not found then
    raise exception 'registro_invalido';
  end if;

  delete from app.ocorrencia_fixa o
  where o.despesa_fixa_id = p_id
    and o.lancamento_id is null
    and not app.fixa_gera_no_mes(v_inicio, v_encerrada_em, o.mes);
end;
$$;

revoke execute on function api.encerrar_despesa_fixa(uuid) from public, anon;
grant execute on function api.encerrar_despesa_fixa(uuid) to authenticated;

commit;
