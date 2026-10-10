#!/usr/bin/env bash
# shellcheck source-path=SCRIPTDIR
# deploy/migrar.sh exige o job `migration` (ensaio de migration e checagem aditiva) verde antes do dump.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../comum/testes/simular.sh
source "$RAIZ/backend/operacao/comum/testes/simular.sh"

simular_iniciar
trap simular_encerrar EXIT

MIGRAR="$SIM_REPO/backend/operacao/deploy/migrar.sh"

preparar() {
  simular_padroes
  simular_repositorio "$RAIZ"
  export MYMONEY_COPIAS_DIR="$SIM_DIR/copias"
  rm -rf "$MYMONEY_COPIAS_DIR"
  simular_limpar_log
}

executar() {
  CODIGO=0
  (cd "$SIM_REPO" && bash "$MIGRAR" <<< "refteste") > /dev/null 2>&1 || CODIGO=$?
}

jobs_exigidos() {
  sed -nE 's/^JOBS_EXIGIDOS=\((.*)\)/\1/p' "$MIGRAR" | tr -d "\"'"
}

# Monta o JSON da API de jobs com cada nome dado como verde.
jobs_verdes() {
  local nomes=("$@") itens=() nome
  for nome in "${nomes[@]}"; do
    itens+=("{\"name\":\"$nome\",\"conclusion\":\"success\",\"status\":\"completed\"}")
  done
  local IFS=,
  echo "{\"jobs\":[${itens[*]}]}"
}

caso "a lista de jobs exigidos inclui migration"
preparar
lista="$(jobs_exigidos)"
[ -n "$lista" ] || falhar "migrar.sh devia declarar JOBS_EXIGIDOS no topo"
grep -qw 'migration' <<< "$lista" || falhar "JOBS_EXIGIDOS devia incluir migration: '$lista'"

caso "run verde sem o job migration aborta antes do dump"
preparar
outros=()
for job in $(jobs_exigidos); do
  [ "$job" = "migration" ] || outros+=("$job")
done
SIM_GH_JOBS="$(jobs_verdes "${outros[@]}")"
export SIM_GH_JOBS
executar
afirmar_codigo_nao_zero "$CODIGO"
afirmar_nao_contem "$(simular_chamadas | grep -E '^supabase .*db (dump|push)' || true)" 'db dump' \
  "não devia chamar supabase db dump sem o job migration"

resumo_testes
