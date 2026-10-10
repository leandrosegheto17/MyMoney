-- Resposta comum dos lançamentos (despesa e receita), montada a partir do gravado:
-- {id, escopo, categoria (nome), valor_total_centavos, num_parcelas, primeira_parcela_data,
-- ja_existia}. security invoker: a RLS decide o que o membro enxerga.
create or replace function app.resposta_lancamento(p_id uuid, p_ja_existia boolean)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
           'id', l.id,
           'escopo', l.escopo,
           'categoria', c.nome,
           'valor_total_centavos', l.valor_total_centavos,
           'num_parcelas', l.num_parcelas,
           'primeira_parcela_data', p.data,
           'ja_existia', p_ja_existia)
  from app.lancamento l
  join app.categoria c on c.id = l.categoria_id
  join app.parcela p on p.lancamento_id = l.id and p.numero = 1
  where l.id = p_id;
$$;

-- Idempotência pelo id (G-17): nulo se o lançamento não existe ou é invisível ao membro;
-- a resposta gravada com `ja_existia: true` se é do próprio membro; `registro_invalido`
-- se é visível e de outro dono (G-05). Não compara parâmetros do reenvio.
create or replace function app.lancamento_repetido(p_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_dono uuid;
begin
  select l.dono_id into v_dono from app.lancamento l where l.id = p_id;
  if not found then
    return null;
  end if;
  if v_dono is distinct from app.membro_atual() then
    raise exception 'registro_invalido';
  end if;
  return app.resposta_lancamento(p_id, true);
end;
$$;
