#!/usr/bin/env bash
# shellcheck source-path=SCRIPTDIR
# Testes de deploy/migrar.sh e de comum/confirmar.sh com git, gh e supabase simulados.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../comum/testes/simular.sh
source "$RAIZ/backend/operacao/comum/testes/simular.sh"

simular_iniciar
trap simular_encerrar EXIT

COPIAS="$SIM_DIR/copias"
MIGRAR="$SIM_REPO/backend/operacao/deploy/migrar.sh"

preparar() {
  simular_padroes
  simular_repositorio "$RAIZ"
  rm -rf "$COPIAS"
  export MYMONEY_COPIAS_DIR="$COPIAS"
  simular_limpar_log
}

# executar <entrada do stdin ou "-" para </dev/null> [argumentos...]
# Preenche SAIDA e CODIGO.
executar() {
  local entrada="$1"
  shift
  CODIGO=0
  if [ "$entrada" = "-" ]; then
    SAIDA="$(cd "$SIM_REPO" && bash "$MIGRAR" "$@" 2>&1 < /dev/null)" || CODIGO=$?
  else
    SAIDA="$(cd "$SIM_REPO" && bash "$MIGRAR" "$@" 2>&1 <<< "$entrada")" || CODIGO=$?
  fi
}

chamadas_supabase() { simular_chamadas | grep -E '^supabase .*db (dump|push)' || true; }

afirmar_sem_dump() {
  afirmar_nao_contem "$(chamadas_supabase)" 'db dump' "não devia chamar supabase db dump"
}

afirmar_sem_push_real() {
  local pushes
  pushes="$(chamadas_supabase | grep 'db push' | grep -v -- '--dry-run' || true)"
  [ -z "$pushes" ] || falhar "não devia chamar supabase db push sem --dry-run"
}

# ---------- comum/confirmar.sh ----------

testar_confirmar() {
  local entrada="$1"
  (
    # shellcheck source=../../comum/confirmar.sh
    source "$RAIZ/backend/operacao/comum/confirmar.sh"
    if [ "$entrada" = "-" ]; then
      confirmar_digitado refteste < /dev/null
    else
      confirmar_digitado refteste <<< "$entrada"
    fi
  ) > /dev/null 2>&1
}

caso "confirmar_digitado: entrada vazia retorna diferente de zero"
codigo=0; testar_confirmar "" || codigo=$?
afirmar_codigo_nao_zero "$codigo"

caso "confirmar_digitado: EOF retorna diferente de zero"
codigo=0; testar_confirmar "-" || codigo=$?
afirmar_codigo_nao_zero "$codigo"

caso "confirmar_digitado: texto errado retorna diferente de zero"
codigo=0; testar_confirmar "outro-ref" || codigo=$?
afirmar_codigo_nao_zero "$codigo"

caso "confirmar_digitado: texto parcial retorna diferente de zero"
codigo=0; testar_confirmar "reftest" || codigo=$?
afirmar_codigo_nao_zero "$codigo"

caso "confirmar_digitado: texto certo retorna zero"
codigo=0; testar_confirmar "refteste" || codigo=$?
afirmar_codigo_zero "$codigo"

# ---------- árvore e CI ----------

caso "árvore suja aborta sem chamar supabase"
preparar
export SIM_GIT_STATUS=' M backend/README.md'
executar "refteste"
afirmar_codigo_nao_zero "$CODIGO"
afirmar_nao_contem "$(simular_chamadas)" '^supabase ' "não devia chamar supabase"

caso "commit sem run de CI aborta antes do dump"
preparar
export SIM_GH_RUNS='[]'
executar "refteste"
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_dump

caso "run de CI com falha aborta antes do dump"
preparar
export SIM_GH_RUNS='[{"databaseId":42,"conclusion":"failure","status":"completed"}]'
executar "refteste"
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_dump

caso "run verde sem o job exigido aborta antes do dump"
preparar
export SIM_GH_JOBS='{"jobs":[{"name":"outro","conclusion":"success","status":"completed"}]}'
executar "refteste"
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_dump

caso "run verde com o job exigido falho aborta antes do dump"
preparar
export SIM_GH_JOBS='{"jobs":[{"name":"base","conclusion":"failure","status":"completed"}]}'
executar "refteste"
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_dump

exigir_tres_jobs() {
  local temp="$MIGRAR.tmp"
  if ! grep -qE '^JOBS_EXIGIDOS=\(' "$MIGRAR" 2>/dev/null; then
    falhar "migrar.sh devia declarar JOBS_EXIGIDOS no topo"
    return 0
  fi
  sed -E 's/^JOBS_EXIGIDOS=\(.*\)/JOBS_EXIGIDOS=(base banco isolamento)/' "$MIGRAR" > "$temp"
  mv "$temp" "$MIGRAR"
}

caso "lista com base, banco e isolamento: sem isolamento aborta antes do dump"
preparar
exigir_tres_jobs
export SIM_GH_JOBS='{"jobs":[{"name":"base","conclusion":"success","status":"completed"},{"name":"banco","conclusion":"success","status":"completed"}]}'
executar "refteste"
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_dump

caso "lista com base, banco e isolamento: isolamento falho aborta antes do dump"
preparar
exigir_tres_jobs
export SIM_GH_JOBS='{"jobs":[{"name":"base","conclusion":"success","status":"completed"},{"name":"banco","conclusion":"success","status":"completed"},{"name":"isolamento","conclusion":"failure","status":"completed"}]}'
executar "refteste"
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_dump

caso "lista com base, banco e isolamento: os três verdes seguem para o dump"
preparar
exigir_tres_jobs
export SIM_GH_JOBS='{"jobs":[{"name":"base","conclusion":"success","status":"completed"},{"name":"banco","conclusion":"success","status":"completed"},{"name":"isolamento","conclusion":"success","status":"completed"}]}'
executar "refteste"
afirmar_codigo_zero "$CODIGO"
afirmar_contem "$(chamadas_supabase)" 'db dump' "devia chamar supabase db dump"

# ---------- cópia pontual ----------

caso "pasta das cópias dentro do repositório aborta antes do dump"
preparar
export MYMONEY_COPIAS_DIR="$SIM_REPO/copias"
executar "refteste"
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_dump

caso "dump com falha aborta sem db push"
preparar
export SIM_DUMP_FALHA=1
executar "refteste"
afirmar_codigo_nao_zero "$CODIGO"
afirmar_nao_contem "$(chamadas_supabase)" 'db push' "não devia chamar supabase db push"

# ---------- confirmação digitada ----------

caso "stdin vazio (/dev/null) aborta sem db push"
preparar
executar "-"
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_push_real

caso "texto diferente do ref aborta sem db push"
preparar
executar "outro-ref"
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_push_real

# ---------- --db-url ----------

caso "--db-url com host remoto é recusado antes do dump"
preparar
executar "refteste" --db-url 'postgresql://postgres:segredo@db.exemplo.com:5432/postgres'
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_dump
afirmar_nao_contem "$SAIDA" 'segredo' "a saída não deve mostrar a senha da URL"

recusar_db_url() {
  preparar
  executar "refteste" --db-url "$1"
  afirmar_codigo_nao_zero "$CODIGO"
  afirmar_sem_dump
  afirmar_nao_contem "$SAIDA" 'segredo' "a saída não deve mostrar a senha da URL"
}

caso "--db-url com '@' na query e host remoto é recusado antes do dump"
recusar_db_url 'postgresql://evil.example?x=@localhost'

caso "--db-url com '@' na query depois do caminho é recusado antes do dump"
recusar_db_url 'postgresql://evil.example/db?x=@127.0.0.1'

caso "--db-url com '@' no caminho é recusado antes do dump"
recusar_db_url 'postgresql://evil.example/@localhost'

caso "--db-url com host= na query é recusado antes do dump"
recusar_db_url 'postgresql://postgres:segredo@127.0.0.1:54322/postgres?host=evil.example'

caso "--db-url local legítima com usuário e senha segue para o dump"
preparar
executar "local" --db-url 'postgresql://postgres:segredo@127.0.0.1:54322/postgres'
afirmar_codigo_zero "$CODIGO"
afirmar_contem "$(chamadas_supabase)" 'db dump' "devia chamar supabase db dump"
afirmar_nao_contem "$SAIDA" 'segredo' "a saída não deve mostrar a senha da URL"

# ---------- caminho feliz ----------

caso "caminho feliz: dump de schema, dump de dados, dry-run, push e instruções de restauração"
preparar
executar "refteste"
afirmar_codigo_zero "$CODIGO"
ordem="$(chamadas_supabase | while read -r linha; do
  case "$linha" in
    *"db dump"*"--data-only"*) echo "dump-dados" ;;
    *"db dump"*) echo "dump-schema" ;;
    *"db push"*"--dry-run"*) echo "push-dry-run" ;;
    *"db push"*) echo "push" ;;
  esac
done | tr '\n' ' ')"
[ "$ordem" = "dump-schema dump-dados push-dry-run push " ] \
  || falhar "ordem das chamadas inesperada: '$ordem'"
afirmar_contem "$(chamadas_supabase | grep 'db push' | head -n 1)" '--linked' "push devia usar --linked"
afirmar_contem "$SAIDA" 'create table exemplo' "devia mostrar o SQL do dry-run"
afirmar_contem "$SAIDA" 'psql' "devia imprimir como restaurar com psql"
grep -qF -- "$COPIAS" <<< "$SAIDA" || falhar "devia imprimir o caminho da cópia"
copias_geradas="$( (find "$COPIAS" -type f 2>/dev/null || true) | wc -l)"
[ "$copias_geradas" -ge 2 ] || falhar "devia gravar as cópias de schema e dados em $COPIAS"

resumo_testes
