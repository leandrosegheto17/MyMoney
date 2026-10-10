#!/usr/bin/env bash
# Aplica as migrations no projeto Supabase de produção, com cópia pontual antes.
#
# Uso: backend/operacao/deploy/migrar.sh [--db-url <url local>]
#
# Ordem: árvore limpa, commit com CI verde, cópia (schema e dados) fora do repositório,
# SQL do dry-run, confirmação digitada do ref do projeto, aplicação, como restaurar.
# O alvo é sempre o projeto vinculado (--linked); --db-url existe só para o ensaio
# contra o Supabase local e recusa qualquer host que não seja 127.0.0.1/localhost.
# Nenhuma senha ou token é lido ou gravado aqui: a CLI usa o login e o link já feitos.
set -euo pipefail

# Jobs do workflow ci que precisam estar verdes no commit a aplicar.
JOBS_EXIGIDOS=(base)
WORKFLOW_CI="ci.yml"

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../comum/confirmar.sh
source "$AQUI/../comum/confirmar.sh"

abortar() {
  echo "ERRO: $*" >&2
  exit 1
}

DB_URL=''
while [ $# -gt 0 ]; do
  case "$1" in
    --db-url)
      [ $# -ge 2 ] || abortar "--db-url pede um valor"
      DB_URL="$2"
      shift 2
      ;;
    *) abortar "argumento desconhecido: $1" ;;
  esac
done

# Aceita só host local; a senha da URL nunca é impressa.
if [ -n "$DB_URL" ]; then
  host="${DB_URL#*://}"
  host="${host#*@}"
  host="${host%%[:/?]*}"
  case "$host" in
    127.0.0.1 | localhost) ;;
    *) abortar "--db-url só aceita host 127.0.0.1 ou localhost (o alvo de produção é --linked)" ;;
  esac
  ALVO=(--db-url "$DB_URL")
else
  ALVO=(--linked)
fi

supabase_cli() {
  if command -v supabase > /dev/null 2>&1; then
    supabase --workdir backend "$@"
  else
    pnpm exec supabase --workdir backend "$@"
  fi
}

RAIZ="$(git rev-parse --show-toplevel)"
cd "$RAIZ"

# (a) árvore limpa
[ -z "$(git status --porcelain)" ] || abortar "há alterações não commitadas; commite ou descarte antes de migrar"

# (b) commit publicado, com o run do CI verde e cada job exigido verde
SHA="$(git rev-parse HEAD)"
[ -n "$(git branch -r --contains "$SHA")" ] || abortar "o commit ${SHA:0:12} não está no remoto; faça push antes"

RUN_ID="$(gh run list --commit "$SHA" --workflow "$WORKFLOW_CI" --json databaseId,conclusion \
  --jq '[.[] | select(.conclusion == "success")][0].databaseId // empty')"
[ -n "$RUN_ID" ] || abortar "o commit ${SHA:0:12} não tem run do CI concluído com sucesso"

JOBS_OK="$(gh run view "$RUN_ID" --json jobs \
  --jq '.jobs[] | select(.conclusion == "success") | .name')"
for job in "${JOBS_EXIGIDOS[@]}"; do
  grep -qFx -- "$job" <<< "$JOBS_OK" || abortar "o job '$job' do CI não está verde no commit ${SHA:0:12}"
done

# (c) pasta das cópias fora do repositório
COPIAS_DIR="${MYMONEY_COPIAS_DIR:-$HOME/mymoney-copias}"
COPIAS_ABS="$(realpath -m -- "$COPIAS_DIR")"
case "$COPIAS_ABS/" in
  "$RAIZ"/*) abortar "a pasta das cópias ($COPIAS_ABS) está dentro do repositório; use MYMONEY_COPIAS_DIR fora dele" ;;
esac
mkdir -p -- "$COPIAS_ABS"
chmod 700 -- "$COPIAS_ABS"

# (d) cópia pontual de schema e dados
CARIMBO="$(date +%Y%m%d-%H%M%S)"
COPIA_SCHEMA="$COPIAS_ABS/$CARIMBO-schema.sql"
COPIA_DADOS="$COPIAS_ABS/$CARIMBO-dados.sql"
echo "Gravando a cópia pré-migração em $COPIAS_ABS"
supabase_cli db dump "${ALVO[@]}" -f "$COPIA_SCHEMA" || abortar "falha ao copiar o schema; nada foi aplicado"
supabase_cli db dump "${ALVO[@]}" --data-only -f "$COPIA_DADOS" || abortar "falha ao copiar os dados; nada foi aplicado"
chmod 600 -- "$COPIA_SCHEMA" "$COPIA_DADOS"

# (e) SQL que será aplicado
echo "SQL que será aplicado (supabase db push --dry-run):"
supabase_cli db push "${ALVO[@]}" --dry-run || abortar "falha no dry-run; nada foi aplicado"

# (f) confirmação digitada
if [ -n "$DB_URL" ]; then
  REF="local"
else
  [ -s backend/supabase/.temp/project-ref ] || abortar "projeto não vinculado; rode supabase link"
  REF="$(cat backend/supabase/.temp/project-ref)"
fi
echo
echo "Digite o ref do projeto ($REF) para aplicar:"
confirmar_digitado "$REF" || abortar "confirmação ausente ou diferente; nada foi aplicado"

# (g) aplica
supabase_cli db push "${ALVO[@]}"

# (h) como restaurar
cat <<MSG

Migrations aplicadas. A cópia anterior está em:
  $COPIA_SCHEMA
  $COPIA_DADOS

Para restaurar (banco vazio ou recriado; use a string de conexão do painel, sem colar a senha no histórico):
  psql "\$DATABASE_URL" -f "$COPIA_SCHEMA"
  psql "\$DATABASE_URL" -f "$COPIA_DADOS"

Depois de confirmar que tudo está certo, apague a cópia: ela contém dados reais.
MSG
