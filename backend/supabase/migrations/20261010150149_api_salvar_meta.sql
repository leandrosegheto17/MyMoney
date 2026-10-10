begin;

-- Reavalia `atingida_em` de uma meta a partir do progresso derivado: marca com a data de hoje
-- quando o guardado alcança o alvo (mantém a data original se já marcada) e desmarca quando
-- deixa de alcançar. Não soma nada: a conta é de app.progresso_meta. security invoker: meta
-- invisível ao chamador não é tocada.
create or replace function app.sincronizar_atingida_meta(p_meta_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update app.meta m
     set atingida_em = case
       when (select p.atingida from app.progresso_meta(m.id) p) then coalesce(m.atingida_em, app.hoje())
       else null
     end
   where m.id = p_meta_id;
$$;

revoke execute on function app.sincronizar_atingida_meta(uuid) from public, anon;
grant execute on function app.sincronizar_atingida_meta(uuid) to authenticated;

-- Cria ou edita uma meta, idempotente pelo id gerado no cliente. Criar não grava movimento:
-- a meta nasce com guardado zero. O escopo só vale na criação e nunca muda (mudar exporia o
-- histórico de aportes); dono e lar vêm das auxiliares, nunca de parâmetro. O prazo é gravado
-- como primeiro dia do mês. Id de meta individual alheia (a RLS esconde) recebe o mesmo
-- `registro_invalido` de "não existe" ao tentar criar com ele. Editar o alvo reavalia `atingida_em`.
create or replace function api.salvar_meta(
  p_id uuid,
  p_nome text,
  p_alvo_centavos bigint,
  p_prazo date default null,
  p_escopo text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_nome text := btrim(p_nome);
  v_prazo date := app.inicio_mes(p_prazo);
  v_escopo text;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  if p_id is null or v_nome is null or v_nome = ''
     or p_alvo_centavos is null or p_alvo_centavos <= 0 then
    raise exception 'valor_invalido';
  end if;

  select m.escopo into v_escopo
  from app.meta m
  where m.id = p_id and (m.escopo = 'conjunto' or m.dono_id = v_membro);

  if found then
    if p_escopo is not null and p_escopo is distinct from v_escopo then
      raise exception 'valor_invalido';
    end if;
    update app.meta
    set nome = v_nome, alvo_centavos = p_alvo_centavos, prazo = v_prazo
    where id = p_id and (escopo = 'conjunto' or dono_id = v_membro);
    perform app.sincronizar_atingida_meta(p_id);
  else
    if p_escopo is null or p_escopo not in ('conjunto', 'individual') then
      raise exception 'valor_invalido';
    end if;
    begin
      insert into app.meta (id, nome, alvo_centavos, prazo, escopo, dono_id)
      values (p_id, v_nome, p_alvo_centavos, v_prazo, p_escopo, v_membro);
    exception when unique_violation then
      raise exception 'registro_invalido';
    end;
  end if;

  return p_id;
end;
$$;

revoke execute on function api.salvar_meta(uuid, text, bigint, date, text) from public, anon;
grant execute on function api.salvar_meta(uuid, text, bigint, date, text) to authenticated;

commit;
