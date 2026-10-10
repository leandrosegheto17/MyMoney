-- Única fonte do percentual e da situação de um orçamento (por categoria e no total do escopo).
-- percentual = round(100 * realizado / orcado), só para exibir. A situação usa a razão exata em
-- inteiros, nunca o percentual arredondado: abaixo de 80% dentro; de 80% a 100% atenção;
-- acima de 100% estourado. 79,99% aparece como 80% e continua dentro.
create or replace function app.situacao_orcamento(p_orcado bigint, p_realizado bigint)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'percentual', round(100.0 * p_realizado / nullif(p_orcado, 0))::int,
    'situacao', case
      when p_realizado * 100 < p_orcado * 80 then 'dentro'
      when p_realizado <= p_orcado then 'atencao'
      else 'estourado'
    end
  );
$$;
