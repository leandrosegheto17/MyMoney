#!/usr/bin/env bash
# Trava de host (G-06): só deixa seguir quando o banco está em localhost, 127.0.0.1 ou ::1.
# Uso: "source" deste arquivo e chamar exigir_host_local "<url de conexão>".

# host_da_url <url>: imprime o host da URL de conexão (IPv6 sem colchetes) ou retorna 1 se a
# URL não for estritamente "postgres(ql)://[userinfo@]host[:porta][/banco][?parâmetros]".
# Estrita de propósito, para o host validado ser o mesmo que o libpq vai usar:
#   - recusa espaço, caractere de controle, '\' e '#';
#   - o host vem da autoridade (até o primeiro '/' ou '?'), depois do ÚLTIMO '@';
#   - a query não pode trazer host, hostaddr, service ou options (mudam o destino ou
#     a configuração da conexão), nem nome de parâmetro codificado com '%' ou separado por ';'.
# Não imprime nada de userinfo, então a senha nunca vaza em mensagem.
host_da_url() {
  local url="${1:-}" resto autoridade query host porta nome parametro
  local -a parametros
  [ -n "$url" ] || return 1
  case "$url" in
    *[[:space:][:cntrl:]\\#]*) return 1 ;;
  esac
  case "$url" in
    postgresql://*) resto="${url#postgresql://}" ;;
    postgres://*) resto="${url#postgres://}" ;;
    *) return 1 ;;
  esac

  autoridade="${resto%%[/?]*}"
  query=''
  case "$resto" in
    *\?*) query="${resto#*\?}" ;;
  esac

  if [ -n "$query" ]; then
    case "$query" in *\;*) return 1 ;; esac
    IFS='&' read -r -a parametros <<< "$query"
    for parametro in "${parametros[@]}"; do
      nome="${parametro%%=*}"
      case "$nome" in *%*) return 1 ;; esac
      case "${nome,,}" in
        host | hostaddr | service | options) return 1 ;;
      esac
    done
  fi

  autoridade="${autoridade##*@}"
  case "$autoridade" in
    \[*\]*)
      host="${autoridade#\[}"
      host="${host%%\]*}"
      porta="${autoridade#*\]}"
      case "$porta" in
        '' ) ;;
        :*) porta="${porta#:}" ;;
        *) return 1 ;;
      esac
      ;;
    *)
      host="${autoridade%%:*}"
      porta=''
      case "$autoridade" in *:*) porta="${autoridade#*:}" ;; esac
      ;;
  esac
  case "$porta" in *[!0-9]*) return 1 ;; esac
  [ -n "$host" ] || return 1
  printf '%s\n' "$host"
}

# exigir_host_local <url> <ação>: retorna 1 (com mensagem) para host diferente de
# localhost/127.0.0.1/::1, URL vazia ou URL fora do formato aceito por host_da_url.
# A senha da URL nunca é impressa.
exigir_host_local() {
  local url="${1:-}" acao="${2:-operação}" host
  if [ -z "$url" ]; then
    echo "Recusado: banco sem URL de conexão (${acao})." >&2
    return 1
  fi
  if ! host="$(host_da_url "$url")"; then
    echo "Recusado: ${acao} só roda no Supabase local (URL de conexão fora do formato aceito)." >&2
    return 1
  fi
  case "$host" in
    localhost | 127.0.0.1 | ::1) ;;
    *)
      echo "Recusado: ${acao} só roda no Supabase local (host '$host')." >&2
      return 1
      ;;
  esac
}
