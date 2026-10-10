#!/usr/bin/env bash
# Teste do checar-aditiva.sh: justificativa por fase expand (a) e por exceção no Log da base (b).
# Uso: bash backend/operacao/deploy/testes/checar-aditiva.justificativa.test.sh
set -euo pipefail

# shellcheck source-path=SCRIPTDIR source=checar-aditiva.apoio.sh
source "$(dirname "${BASH_SOURCE[0]}")/checar-aditiva.apoio.sh"

# --- Justificativa (a): fase expand ---
novo_repo
commit_na_base_ha 31 "$PASTA_MIGRATIONS/$EXPAND" "alter table app.antiga add column apelido_novo text;"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Contract do apelido.
Fase expand: $EXPAND"
commit_pr
espera_passar "justificativa com expand de 31 dias passa"

novo_repo
commit_na_base_ha 10 "$PASTA_MIGRATIONS/$EXPAND" "alter table app.antiga add column apelido_novo text;"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Fase expand: $EXPAND"
commit_pr
espera_falhar "justificativa com expand de 10 dias falha"
espera_saida_contem "mensagem do expand recente cita a regra" "G-12"

novo_repo; abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Fase expand: 20260801000000_nao_existe.sql"
commit_pr
espera_falhar "justificativa com expand inexistente na base falha"

novo_repo; abrir_pr
migration "$EXPAND" "alter table app.antiga add column apelido_novo text;"
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Fase expand: $EXPAND"
commit_pr
espera_falhar "justificativa com expand acrescentado no próprio PR falha"

# --- Justificativa (b): exceção no Log da base ---
LINHA_EXCECAO="| 2026-09-15 | coordenador | gestor | Exceção à G-12 para \`$MIG\`: remove coluna sem uso | Coluna nunca lida | permanente |"

novo_repo
acrescentar_log_na_base "$LINHA_EXCECAO"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_passar "exceção no Log da base citando G-12 e o arquivo passa"

novo_repo
acrescentar_log_na_base "| 2026-09-15 | coordenador | gestor | Exceção à G-12 para \`$MIG\` | Motivo | $(data_relativa +30) |"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_passar "exceção com validade ainda não vencida passa"

novo_repo; abrir_pr
printf '%s\n' "$LINHA_EXCECAO" >>"$REPO/.md/GUARDRAILS.md"
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_falhar "linha de exceção só no PR falha"

novo_repo
acrescentar_log_na_base "| 2026-09-15 | coordenador | gestor | Exceção à G-12 para \`$MIG\` | Motivo | $(data_relativa -5) |"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_falhar "exceção com validade vencida falha"

novo_repo
acrescentar_log_na_base "| 2026-09-15 | coordenador | gestor | Exceção à G-12 para \`20260915000000_outra.sql\` | Motivo | permanente |"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_falhar "exceção que cita outra migration falha"

novo_repo
acrescentar_log_na_base "| 2026-09-15 | coordenador | gestor | Exceção à G-13 para \`$MIG\` | Motivo | permanente |"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_falhar "exceção que não cita G-12 falha"

# --- Justificativa sem (a) nem (b) ---
novo_repo; abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "A coluna não é usada por ninguém, pode remover."
commit_pr
espera_falhar "justificativa livre, sem (a) nem (b), falha"
espera_saida_contem "mensagem da justificativa livre cita a regra" "G-12"

resumo
