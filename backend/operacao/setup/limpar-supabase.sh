#!/usr/bin/env bash
# Limpeza do projeto Supabase de produção, em etapas. Uso:
#   limpar-supabase.sh regiao      região do projeto vinculado
#   limpar-supabase.sh copia       pg_dump completo fora do repositório + SHA-256
#   limpar-supabase.sh inventario  o que existe hoje e será apagado
#   limpar-supabase.sh limpar      confirmação digitada do ref, depois db reset --linked
# Conexão do pg_dump/psql: variáveis PGHOST, PGUSER, PGPASSWORD, PGDATABASE do ambiente
# da sessão (nunca em argumento). Cópias em MYMONEY_COPIAS_DIR (padrão $HOME/mymoney-copias).
# shellcheck source-path=SCRIPTDIR
set -euo pipefail

RAIZ_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
# shellcheck source=../comum/confirmar.sh
source "$RAIZ_SCRIPT/backend/operacao/comum/confirmar.sh"

REGIAO_ALVO='sa-east-1'
ARQ_REF="$RAIZ_SCRIPT/backend/supabase/.temp/project-ref"
DIR_PROJETO="$RAIZ_SCRIPT/backend/supabase"

abortar() { echo "ERRO: $*" >&2; exit 1; }

ler_ref() {
  [ -s "$ARQ_REF" ] || abortar "projeto não vinculado ($ARQ_REF ausente); rode supabase link em backend/supabase"
  tr -d '[:space:]' < "$ARQ_REF"
}

# Região do projeto de ref $1, extraída do JSON de "supabase projects list".
regiao_do_projeto() {
  local ref="$1" json
  json="$(supabase projects list -o json)" || abortar "falha em supabase projects list"
  printf '%s' "$json" | tr -d '\n' | sed 's/},/}\n/g' \
    | grep -E "\"ref\" *: *\"$ref\"" \
    | sed -n 's/.*"region" *: *"\([^"]*\)".*/\1/p' | head -n 1
}

comando_regiao() {
  local ref regiao
  ref="$(ler_ref)"
  regiao="$(regiao_do_projeto "$ref")"
  [ -n "$regiao" ] || abortar "região do projeto $ref não encontrada"
  echo "ref=$ref região=$regiao"
  printf '%s\n' "$regiao"
}

dir_copias() {
  local dir="${MYMONEY_COPIAS_DIR:-$HOME/mymoney-copias}" topo
  topo="$(git rev-parse --show-toplevel)"
  case "$dir/" in
    "$topo"/*) abortar "MYMONEY_COPIAS_DIR ($dir) está dentro do repositório" ;;
  esac
  printf '%s\n' "$dir"
}

comando_copia() {
  local dir arquivo itens hash
  dir="$(dir_copias)"
  mkdir -p "$dir"
  arquivo="$dir/$(date +%Y%m%d-%H%M%S)-completo.dump"
  pg_dump -Fc --file="$arquivo" || abortar "pg_dump falhou"
  itens="$(pg_restore --list "$arquivo" | grep -vc '^;' || true)"
  [ "${itens:-0}" -gt 0 ] || abortar "pg_restore --list não listou itens; cópia inválida"
  hash="$(sha256sum "$arquivo" | cut -d' ' -f1)"
  echo "cópia: $arquivo"
  echo "itens no dump: $itens"
  echo "sha256: $hash"
}

consulta() { psql -X -A -t -c "$1"; }

comando_inventario() {
  echo "== schemas não padrão =="
  consulta "select nspname from pg_namespace where nspname not like 'pg\_%' and nspname <> 'information_schema' order by 1"
  echo "== tabelas =="
  consulta "select schemaname || '.' || tablename from pg_tables where schemaname not in ('pg_catalog','information_schema') order by 1"
  echo "== funções =="
  consulta "select n.nspname || '.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname not in ('pg_catalog','information_schema') order by 1"
  echo "== usuários do Auth =="
  consulta "select count(*) from auth.users"
  echo "== buckets =="
  consulta "select id from storage.buckets order by 1"
  echo "== cron =="
  consulta "select jobname from cron.job" 2>/dev/null || echo "(cron.job inexistente)"
  echo "== Edge Functions =="
  (cd "$DIR_PROJETO" && supabase functions list)
}

roteiro_recriacao() {
  cat <<TXT
A região do projeto não é $REGIAO_ALVO; o reset não resolve. Roteiro manual:
  1. No painel do Supabase, exclua o projeto atual (depois de conferir a cópia).
  2. Crie um novo projeto Free em $REGIAO_ALVO.
  3. Guarde URL e chaves novas no gerenciador de senhas e no .env local (nunca no repositório).
  4. Rode supabase link em backend/supabase com o novo ref e registre-o em setup/limpeza.md.
TXT
}

remover_edge_functions() {
  local nomes nome
  nomes="$(cd "$DIR_PROJETO" && supabase functions list -o json \
    | tr -d '\n' | grep -oE '"slug" *: *"[^"]+"' | sed 's/.*: *"\(.*\)"/\1/')" || true
  for nome in $nomes; do
    (cd "$DIR_PROJETO" && supabase functions delete "$nome" --project-ref "$1")
  done
}

comando_limpar() {
  local ref regiao
  ref="$(ler_ref)"
  regiao="$(regiao_do_projeto "$ref")"
  if [ "$regiao" != "$REGIAO_ALVO" ]; then
    echo "Região atual: ${regiao:-desconhecida}."
    roteiro_recriacao
    return 0
  fi
  comando_inventario
  echo
  echo "Tudo acima será apagado do projeto $ref. Digite o ref para confirmar:"
  confirmar_digitado "$ref" || abortar "confirmação ausente ou incorreta; nada foi apagado"
  (cd "$DIR_PROJETO" && supabase db reset --linked)
  remover_edge_functions "$ref"
  echo "Limpeza concluída. Confira no painel: public sem tabelas, Auth vazio, sem bucket nem Edge Function."
}

case "${1:-}" in
  regiao) comando_regiao ;;
  copia) comando_copia ;;
  inventario) comando_inventario ;;
  limpar) comando_limpar ;;
  *) abortar "uso: limpar-supabase.sh regiao|copia|inventario|limpar" ;;
esac
