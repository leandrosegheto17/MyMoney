-- Contas de exemplo (ids do mockup) e um ajuste por membro; depende de seeds/01-acesso.sql.
insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos)
select v.id::uuid, m.lar_id, m.id, v.nome, v.saldo
from (values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Nubank', 250000),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'Itaú', 80000),
  ('00000000-0000-4000-8000-000000000211', '00000000-0000-4000-8000-000000000102', 'Conta da Ana', 150000)
) as v(id, dono, nome, saldo)
join app.membro m on m.id = v.dono::uuid;

insert into app.movimento_conta (id, lar_id, dono_id, conta_id, tipo, sentido, valor_centavos, data)
select v.id::uuid, c.lar_id, c.dono_id, c.id, 'ajuste', 'entrada', v.valor, v.data::date
from (values
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000201', 5000, '2026-10-01'),
  ('00000000-0000-4000-8000-000000000711', '00000000-0000-4000-8000-000000000211', 3000, '2026-10-01')
) as v(id, conta, valor, data)
join app.conta c on c.id = v.conta::uuid;
