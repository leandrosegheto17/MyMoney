-- Resposta do pagamento de uma ocorrência: {ocorrencia_id, lancamento_id, situacao,
-- valor_pago_centavos, vencimento, ja_existia}. O valor pago vem da parcela e a data mostrada
-- é o vencimento; forma, conta e data do pagamento nunca entram (RN-04).
create or replace function app.resposta_pagamento_ocorrencia(p_ocorrencia_id uuid, p_ja_existia boolean)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
           'ocorrencia_id', o.id,
           'lancamento_id', o.lancamento_id,
           'situacao', 'paga',
           'valor_pago_centavos', (select pg_catalog.sum(p.valor_centavos)::bigint
                                   from app.parcela p where p.lancamento_id = o.lancamento_id),
           'vencimento', o.vencimento,
           'ja_existia', p_ja_existia)
  from app.ocorrencia_fixa o
  where o.id = p_ocorrencia_id;
$$;
