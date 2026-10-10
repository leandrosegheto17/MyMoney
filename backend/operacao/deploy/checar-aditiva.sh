#!/usr/bin/env bash
# Checagem aditiva (G-12): migration nova com drop, rename ou troca de tipo de coluna só passa
# com um arquivo de justificativa ao lado que cite a fase expand (G-13) ou uma exceção do Log
# de Alterações do GUARDRAILS lido da base.
#
# Uso (na raiz do repositório): backend/operacao/deploy/checar-aditiva.sh [<base>]
# Sem <base>: origin/$GITHUB_BASE_REF (PR) ou $GITHUB_EVENT_BEFORE (push); push de branch novo usa origin/main.
#
# Justificativa: backend/supabase/migrations/<nome sem .sql>.justificativa.md, com uma das linhas
#   Fase expand: <arquivo>   migration que existe na base e entrou na main há 30 dias ou mais
#   Exceção: <data>          linha do Log de Alterações da base que cita G-12 e a migration,
#                            com validade "permanente" ou data ainda não vencida
# Nomes de migration vêm do PR (entrada não confiável): nunca são avaliados como código.
set -euo pipefail

PASTA="backend/supabase/migrations"
GUARDRAILS=".md/GUARDRAILS.md"
DIAS_EXPAND=30

falhou=0

reprovar() {
  echo "::error::G-12: $*" >&2
  falhou=1
}

resolver_base() {
  local base="${1:-}"
  if [ -z "$base" ] && [ -n "${GITHUB_BASE_REF:-}" ]; then
    base="origin/$GITHUB_BASE_REF"
  fi
  if [ -z "$base" ]; then
    base="${GITHUB_EVENT_BEFORE:-}"
    case "$base" in *[!0]*) ;; *) base="" ;; esac
  fi
  if [ -z "$base" ] && git rev-parse --verify --quiet origin/main > /dev/null; then
    base="origin/main"
  fi
  [ -n "$base" ] || { echo "ERRO: base de comparação indefinida; passe <base>" >&2; exit 2; }
  git rev-parse --verify --quiet "$base^{commit}" > /dev/null || { echo "ERRO: base '$base' não existe no repositório" >&2; exit 2; }
  printf '%s' "$base"
}

# SQL sem comentários (-- até o fim da linha e /* */), em minúsculas, uma linha por instrução.
sql_sem_comentarios() {
  perl -0777 -ne 's{/\*.*?\*/}{ }gs; s{--[^\n]*}{ }g; $_ = lc; s/\s+/ /g; s/;/;\n/g; print' -- "$1"
}

# Imprime o motivo (uma linha por achado) de cada instrução não aditiva do arquivo.
achados_nao_aditivos() {
  local sql instrucao
  sql="$(sql_sem_comentarios "$1")"
  while IFS= read -r instrucao; do
    if grep -Eq '(^|[^a-z0-9_])drop([^a-z0-9_]|$)' <<< "$instrucao"; then
      echo "drop"
    fi
    if grep -Eq '(^|[^a-z0-9_])rename([^a-z0-9_]|$)' <<< "$instrucao"; then
      echo "rename"
    fi
    if grep -Eq '^ *alter table .*[^a-z0-9_]alter ((column )?("[^"]+"|[a-z0-9_]+)) ((set data )?type)([^a-z0-9_]|$)' <<< "$instrucao"; then
      echo "alter column type"
    fi
  done <<< "$sql"
}

# Data (AAAA-MM-DD) em que o arquivo entrou na base; vazio se não existe lá.
data_na_base() {
  local base="$1" arquivo="$2"
  git cat-file -e "$base:$PASTA/$arquivo" 2> /dev/null || return 0
  git log "$base" --diff-filter=A --format=%cs -1 -- "$PASTA/$arquivo"
}

expand_vale() {
  local base="$1" arquivo="$2" data corte
  [[ "$arquivo" =~ ^[A-Za-z0-9_.-]+\.sql$ ]] || return 1
  data="$(data_na_base "$base" "$arquivo")"
  [ -n "$data" ] || return 1
  corte="$(date -u -d "-$DIAS_EXPAND days" +%Y-%m-%d)"
  [[ ! "$data" > "$corte" ]]
}

# Exceção vale se, no Log da base, a linha da data cita G-12 e a migration e está dentro da validade.
excecao_vale() {
  local base="$1" data="$2" migration="$3" log hoje linha validade
  [[ "$data" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || return 1
  log="$(git show "$base:$GUARDRAILS" 2> /dev/null)" || return 1
  hoje="$(date -u +%Y-%m-%d)"
  while IFS= read -r linha; do
    case "$linha" in *"G-12"*) ;; *) continue ;; esac
    case "$linha" in *"$migration"*) ;; *) continue ;; esac
    validade="$(awk -F'|' '{ v = $(NF - 1); gsub(/^ +| +$/, "", v); print v }' <<< "$linha")"
    if [ "${validade,,}" = "permanente" ]; then
      return 0
    fi
    if [[ "$validade" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && [[ ! "$validade" < "$hoje" ]]; then
      return 0
    fi
  done < <(grep -F -- "| $data |" <<< "$log" || true)
  return 1
}

justificativa_vale() {
  local base="$1" migration="$2" arquivo="$3" linha valor
  [ -f "$arquivo" ] || return 1
  while IFS= read -r linha; do
    case "$linha" in
      "Fase expand:"*)
        valor="${linha#Fase expand:}"; valor="${valor# }"; valor="${valor%% *}"
        expand_vale "$base" "$valor" && return 0
        ;;
      "Exce"*":"*)
        valor="${linha#*:}"; valor="${valor# }"; valor="${valor%% *}"
        excecao_vale "$base" "$valor" "$migration" && return 0
        ;;
    esac
  done < "$arquivo"
  return 1
}

main() {
  local base nome arquivo achados justificativa
  base="$(resolver_base "${1:-}")"
  echo "Checagem aditiva contra $base"

  local novas=()
  while IFS= read -r -d '' arquivo; do
    novas+=("$arquivo")
  done < <(git diff --name-only -z --diff-filter=A "$base...HEAD" -- "$PASTA/*.sql")

  if [ "${#novas[@]}" -eq 0 ]; then
    echo "Nenhuma migration nova: nada a checar."
    return 0
  fi

  for arquivo in "${novas[@]}"; do
    nome="${arquivo##*/}"
    achados="$(achados_nao_aditivos "$arquivo" | sort -u | paste -sd, -)"
    if [ -z "$achados" ]; then
      echo "ok: $nome é aditiva"
      continue
    fi
    justificativa="${arquivo%.sql}.justificativa.md"
    if justificativa_vale "$base" "$nome" "$justificativa"; then
      echo "ok: $nome tem $achados, justificada em ${justificativa##*/}"
    else
      reprovar "$nome tem $achados e não tem justificativa válida. Crie ${justificativa##*/} ao lado com 'Fase expand: <migration publicada há $DIAS_EXPAND dias ou mais>' ou 'Exceção: <data>' de uma linha do Log de Alterações do GUARDRAILS (na base, citando G-12 e $nome)."
    fi
  done
  return "$falhou"
}

main "$@"
