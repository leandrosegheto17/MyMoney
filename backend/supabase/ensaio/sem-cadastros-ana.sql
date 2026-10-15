-- Ensaio do "primeiro uso": deixa Ana (membro ...0102) sem contas, formas de pagamento e
-- lançamentos, como um membro recém-chegado. Só para o Supabase local, depois do reset:
--   bash backend/supabase/volume/carregar.sh ../ensaio/sem-cadastros-ana.sql
-- As categorias dela ficam, pois o cadastro inicial as cria. Reaplicável: sem nada a remover, não faz nada.
begin;

update app.lancamento set alterado_por = null where alterado_por = '00000000-0000-4000-8000-000000000102';
update app.ocorrencia_fixa set lancamento_id = null
where lancamento_id in (select id from app.lancamento where dono_id = '00000000-0000-4000-8000-000000000102');

delete from app.movimento_conta where dono_id = '00000000-0000-4000-8000-000000000102';
delete from app.movimento_meta where autor_id = '00000000-0000-4000-8000-000000000102';
delete from app.lancamento_pagamento where dono_id = '00000000-0000-4000-8000-000000000102';
delete from app.parcela where dono_id = '00000000-0000-4000-8000-000000000102';
delete from app.lancamento where dono_id = '00000000-0000-4000-8000-000000000102';
delete from app.forma_pagamento where dono_id = '00000000-0000-4000-8000-000000000102';
delete from app.conta where dono_id = '00000000-0000-4000-8000-000000000102';

commit;
