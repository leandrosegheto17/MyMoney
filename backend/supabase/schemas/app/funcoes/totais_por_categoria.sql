-- Agregação "por categoria" comum aos blocos do resumo do mês: recebe as parcelas já filtradas
-- pelo chamador (tipo, escopo e dono ficam explícitos em quem chama; esta função não filtra
-- nem lê tabela) como jsonb [{categoria_id, categoria_nome, variavel, valor_centavos}] e devolve
-- o jsonb_agg de {categoria_id, nome, variavel, total_centavos}, só total > 0, ordenado por
-- total desc e nome. Sem linhas, devolve [].
create or replace function app.totais_por_categoria(p_parcelas jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'categoria_id', t.categoria_id, 'nome', t.categoria_nome,
           'variavel', t.variavel, 'total_centavos', t.total)
         order by t.total desc, t.categoria_nome), '[]'::jsonb)
    from (
      select r.categoria_id, r.categoria_nome, r.variavel, sum(r.valor_centavos)::bigint as total
        from jsonb_to_recordset(coalesce(p_parcelas, '[]'::jsonb)) as r(
               categoria_id uuid, categoria_nome text, variavel boolean, valor_centavos bigint)
       group by r.categoria_id, r.categoria_nome, r.variavel
      having sum(r.valor_centavos) > 0
    ) t;
$$;
