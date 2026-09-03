# migrations_down/

Companion rollback ("down") scripts para as migrations aditivas de
`supabase/migrations/`, exigidos por `DIR-04` ("Toda migration tem rollback/down
migration correspondente no mesmo arquivo ou par de arquivos").

**Por que uma pasta separada, e não `<versão>.down.sql` dentro de
`supabase/migrations/`**: o Supabase CLI (`supabase db push`/`migration list`)
varre `supabase/migrations/` inteira e trata todo arquivo `<timestamp>_*.sql`
como uma migration a aplicar, na ordem do timestamp. Um arquivo
`<mesmo-timestamp>_nome.down.sql` colidiria de versão com o `.sql` "up"
correspondente (mesmo prefixo numérico) e seria potencialmente aplicado como se
fosse outra migration. Para não arriscar uma down-migration sendo executada por
engano em produção (violando DIR-03/G-02 — muitas delas são destrutivas por
natureza, é o próprio propósito de um rollback), os scripts de rollback ficam
aqui, fora do escopo de varredura do CLI, aplicados **somente manualmente** via
`supabase db query --linked --file supabase/migrations_down/<arquivo>` sob
decisão explícita (nunca automatizado em CI/CD).

Convenção: `<mesmo-timestamp-da-migration-up>_<mesma-descrição>.down.sql`.
