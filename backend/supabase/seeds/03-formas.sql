-- Formas de pagamento de exemplo (ids do mockup); depende de seeds/02-contas.sql.
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento, preferida)
select v.id::uuid, m.lar_id, m.id, v.nome, v.tipo, v.conta::uuid, v.dia, v.preferida
from (values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'Pix Nubank', 'pix', '00000000-0000-4000-8000-000000000201', null::smallint, true),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101', 'Débito Itaú', 'debito', '00000000-0000-4000-8000-000000000202', null, false),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000101', 'Cartão de crédito XP', 'credito', '00000000-0000-4000-8000-000000000202', 10::smallint, false),
  ('00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-000000000102', 'Pix da Ana', 'pix', '00000000-0000-4000-8000-000000000211', null, true)
) as v(id, dono, nome, tipo, conta, dia, preferida)
join app.membro m on m.id = v.dono::uuid;
