#!/usr/bin/env bash
# Teste do checar-aditiva.sh: tags de dollar-quoting e falha fechada em construções não terminadas.
# Uso: bash backend/operacao/deploy/testes/checar-aditiva.dollar-quote.test.sh
set -euo pipefail

# shellcheck source-path=SCRIPTDIR source=checar-aditiva.apoio.sh
source "$(dirname "${BASH_SOURCE[0]}")/checar-aditiva.apoio.sh"

# --- Tags de dollar-quoting: qualquer tag válida (inclusive não-ASCII) esconde o '--' interno ---
caso_falha_sql "tag com letra acentuada (\$é\$) não esconde drop" \
  "select \$é\$ -- \$é\$; drop table app.antiga;"
caso_falha_sql "tag CJK não esconde drop" \
  "select \$日本語\$ -- \$日本語\$; drop table app.antiga;"
caso_falha_sql "tag com emoji reprova por precaução" \
  "select \$😀\$ -- \$😀\$; drop table app.antiga;"
caso_falha_sql "tag com dígito no meio não esconde drop" \
  "select \$a1b\$ -- \$a1b\$; drop table app.antiga;"
caso_falha_sql "tag iniciada por sublinhado não esconde drop" \
  "select \$_x\$ -- \$_x\$; drop table app.antiga;"
caso_falha_sql "tag vazia (\$\$) não esconde drop" \
  "select \$\$ -- \$\$; drop table app.antiga;"
caso_falha_sql "tags aninhadas não escondem drop" \
  "select \$a\$ x \$é\$ -- \$é\$ y \$a\$; drop table app.antiga;"
caso_falha_sql "rename depois de tag não-ASCII falha" \
  "select \$é\$ -- \$é\$; alter table app.antiga rename to outra;"

# Falha fechada: construção não terminada ou tag mal formada reprova, mesmo sem drop visível.
caso_falha_sql "literal não terminado reprova" "select 'abc;"
caso_falha_sql "identificador entre aspas não terminado reprova" "select 1 as \"abc;"
caso_falha_sql "comentário de bloco não terminado reprova" "select 1; /* sem fim"
caso_falha_sql "dollar-quoting não terminado reprova" "select \$é\$ abc;"
caso_falha_sql "tag mal formada (sem \$ de fechamento) reprova" "select \$abc def;"
caso_falha_sql "tag mal formada com hífen reprova" "select \$a-b\$ x \$a-b\$;"

novo_repo; abrir_pr
migration "$MIG" "select \$é\$ -- texto \$é\$, \$日本\$ /* x \$日本\$, \$a1\$ y \$a1\$, \$1, a\$b;"
commit_pr
espera_passar "tags válidas com conteúdo inofensivo e parâmetro \$1 passam"

novo_repo
commit_na_base_ha 31 "$PASTA_MIGRATIONS/$EXPAND" "alter table app.antiga add column apelido_novo text;"
abrir_pr
migration "$MIG" "select 'aberto;"
justificar "$MIG" "Fase expand: $EXPAND"
commit_pr
espera_passar "justificativa libera construção não terminada"

resumo
