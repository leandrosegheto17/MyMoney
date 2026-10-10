#!/usr/bin/env bash
# Teste do checar-aditiva.sh: comentários e literais na mesma linha não escondem drop/rename.
# Uso: bash backend/operacao/deploy/testes/checar-aditiva.literais.test.sh
set -euo pipefail

# shellcheck source-path=SCRIPTDIR source=checar-aditiva.apoio.sh
source "$(dirname "${BASH_SOURCE[0]}")/checar-aditiva.apoio.sh"

# --- Comentário e literal na mesma linha: '--' e '/*' dentro de literal não escondem drop ---

caso_falha_sql "'--' em literal simples não esconde drop" \
  "insert into app.antiga values ('--'); drop table app.antiga;"
caso_falha_sql "'--' em dollar-quoting \$\$ não esconde drop" \
  "select \$\$--\$\$; drop table app.antiga;"
caso_falha_sql "'--' em dollar-quoting com tag não esconde drop" \
  "select \$corpo\$--\$corpo\$; drop table app.antiga;"
caso_falha_sql "'--' em identificador entre aspas duplas não esconde drop" \
  "select 1 as \"a--b\"; drop table app.antiga;"
caso_falha_sql "'--' em comentário de bloco não esconde drop depois dele" \
  "/* -- */ drop table app.antiga;"
caso_falha_sql "drop depois de literal com aspas escapadas ('') falha" \
  "select 'it''s --'; drop table app.antiga;"
caso_falha_sql "drop depois de literal E'' com barra invertida falha" \
  "select E'it\\'s --'; drop table app.antiga;"
caso_falha_sql "'/*' em literal não esconde drop até um */ posterior" \
  "select '/*'; drop table app.antiga; /* fim */"
caso_falha_sql "rename depois de literal com '--' falha" \
  "select '--'; alter table app.antiga rename column apelido to nome_curto;"
caso_falha_sql "drop dentro de literal ainda é acusado (execute dinâmico)" \
  "do \$\$ begin execute 'drop table app.antiga'; end \$\$;"

novo_repo; abrir_pr
migration "$MIG" "create table app.nova (id uuid primary key); -- drop table app.antiga;
select 'texto', 1; -- rename column x to y"
commit_pr
espera_passar "comentário '--' real no fim da linha depois de literal não acusa"

novo_repo; abrir_pr
migration "$MIG" "select '--'; /* drop table app.antiga; */ create table app.nova (id uuid primary key);"
commit_pr
espera_passar "drop em comentário de bloco depois de literal com '--' não acusa"

novo_repo
commit_na_base_ha 31 "$PASTA_MIGRATIONS/$EXPAND" "alter table app.antiga add column apelido_novo text;"
abrir_pr
migration "$MIG" "insert into app.antiga values ('--'); drop table app.antiga;"
justificar "$MIG" "Fase expand: $EXPAND"
commit_pr
espera_passar "justificativa libera drop depois de literal com '--'"

resumo
