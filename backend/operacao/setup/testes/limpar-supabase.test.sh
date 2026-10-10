#!/usr/bin/env bash
# shellcheck source-path=SCRIPTDIR
# Testes de setup/limpar-supabase.sh com supabase, pg_dump, pg_restore e psql simulados.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../comum/testes/simular.sh
source "$RAIZ/backend/operacao/comum/testes/simular.sh"

simular_iniciar
trap simular_encerrar EXIT

COPIAS="$SIM_DIR/copias"
LIMPAR="$SIM_REPO/backend/operacao/setup/limpar-supabase.sh"

preparar() {
  simular_padroes
  simular_repositorio "$RAIZ"
  rm -rf "$COPIAS"
  export MYMONEY_COPIAS_DIR="$COPIAS"
  simular_limpar_log
}

# executar <entrada do stdin ou "-" para </dev/null> <subcomando> [argumentos...]
# Preenche SAIDA e CODIGO.
executar() {
  local entrada="$1"
  shift
  CODIGO=0
  if [ "$entrada" = "-" ]; then
    SAIDA="$(cd "$SIM_REPO" && bash "$LIMPAR" "$@" 2>&1 < /dev/null)" || CODIGO=$?
  else
    SAIDA="$(cd "$SIM_REPO" && bash "$LIMPAR" "$@" 2>&1 <<< "$entrada")" || CODIGO=$?
  fi
}

chamadas_reset() { simular_chamadas | grep -E '^supabase .*db reset' || true; }

afirmar_sem_reset() {
  [ -z "$(chamadas_reset)" ] || falhar "não devia chamar supabase db reset"
}

# ---------- limpar ----------

caso "limpar com stdin vazio (/dev/null) aborta sem db reset"
preparar
executar "-" limpar
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_reset

caso "limpar com linha vazia aborta sem db reset"
preparar
executar "" limpar
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_reset

caso "limpar com texto diferente do ref aborta sem db reset"
preparar
executar "outro-ref" limpar
afirmar_codigo_nao_zero "$CODIGO"
afirmar_sem_reset

caso "limpar com região diferente de sa-east-1 não chama db reset e imprime o roteiro de recriação"
preparar
export SIM_REGIAO='us-east-1'
executar "refteste" limpar
afirmar_sem_reset
afirmar_contem "$SAIDA" 'sa-east-1' "o roteiro devia indicar a região sa-east-1"
afirmar_contem "$SAIDA" '[Cc]ri(ar|e)|[Rr]ecri' "o roteiro devia orientar a criar o projeto de novo"

caso "caminho feliz: db reset --linked só depois da confirmação correta"
preparar
executar "refteste" limpar
afirmar_codigo_zero "$CODIGO"
resets="$(chamadas_reset)"
afirmar_contem "$resets" 'db reset' "devia chamar supabase db reset"
afirmar_contem "$resets" '--linked' "db reset devia usar --linked"

# ---------- copia ----------

caso "copia com MYMONEY_COPIAS_DIR dentro do repositório aborta sem pg_dump"
preparar
export MYMONEY_COPIAS_DIR="$SIM_REPO/copias"
executar "-" copia
afirmar_codigo_nao_zero "$CODIGO"
afirmar_nao_contem "$(simular_chamadas)" '^pg_dump ' "não devia chamar pg_dump"
[ ! -d "$SIM_REPO/copias" ] || [ -z "$(ls -A "$SIM_REPO/copias")" ] \
  || falhar "não devia gravar nada dentro do repositório"

caso "copia com pg_restore --list vazio aborta"
preparar
export SIM_PG_RESTORE_LISTA=''
executar "-" copia
afirmar_codigo_nao_zero "$CODIGO"
afirmar_contem "$(simular_chamadas)" '^pg_dump ' "devia ter gerado o dump"
afirmar_contem "$(simular_chamadas)" '^pg_restore .*(--list|-l)' "devia conferir o dump com pg_restore --list"

caso "copia com dump válido grava fora do repositório e imprime o SHA-256"
preparar
executar "-" copia
afirmar_codigo_zero "$CODIGO"
copias_geradas="$( (find "$COPIAS" -type f 2>/dev/null || true) | wc -l)"
[ "$copias_geradas" -ge 1 ] || falhar "devia gravar o dump em $COPIAS"
afirmar_contem "$SAIDA" '[0-9a-f]{64}' "devia imprimir o SHA-256 do dump"

resumo_testes
