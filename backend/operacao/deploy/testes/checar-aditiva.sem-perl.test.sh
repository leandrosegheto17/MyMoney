#!/usr/bin/env bash
# Teste do checar-aditiva.sh: sem perl no PATH sai com código diferente de 0 e não aprova.
# Uso: bash backend/operacao/deploy/testes/checar-aditiva.sem-perl.test.sh
set -euo pipefail

# shellcheck source-path=SCRIPTDIR source=checar-aditiva.apoio.sh
source "$(dirname "${BASH_SOURCE[0]}")/checar-aditiva.apoio.sh"

# --- Sem perl no PATH: sai com código diferente de 0 e não aprova ---
SEM_PERL="$TMP_RAIZ/sem-perl"
mkdir -p "$SEM_PERL"
for ferramenta in git grep sort paste date awk sed cat dirname env bash; do
  ln -s "$(command -v "$ferramenta")" "$SEM_PERL/$ferramenta"
done

rodar_sem_perl() {
  set +e
  SAIDA="$(cd "$REPO" && env -u GITHUB_BASE_REF -u GITHUB_EVENT_BEFORE PATH="$SEM_PERL" "$SEM_PERL/bash" "$SCRIPT" main 2>&1)"
  CODIGO=$?
  set -e
}

caso_sem_perl() {
  total=$((total + 1))
  rodar_sem_perl
  if [ "$CODIGO" -ne 0 ] && ! printf '%s' "$SAIDA" | grep -q "é aditiva" \
    && printf '%s' "$SAIDA" | grep -qi "perl"; then
    ok "$1"
  else
    nok "$1 (esperava código != 0, mensagem sobre perl e nenhum 'é aditiva')"
  fi
}

novo_repo; abrir_pr
migration "$MIG" "drop table app.antiga;"
commit_pr
caso_sem_perl "sem perl, migration com drop reprova com mensagem clara"

novo_repo; abrir_pr
migration "$MIG" "create table app.nova (id uuid primary key);"
commit_pr
caso_sem_perl "sem perl, migration aditiva também não é aprovada"

resumo
