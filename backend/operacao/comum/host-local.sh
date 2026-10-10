#!/usr/bin/env bash
# Trava de host (G-06): só deixa seguir quando o banco está em localhost ou 127.0.0.1.
# Uso: "source" deste arquivo e chamar exigir_host_local "<url de conexão>".

# exigir_host_local <url> <ação>: retorna 1 (com mensagem) para host diferente de localhost/127.0.0.1
# ou URL vazia; a senha da URL nunca é impressa.
exigir_host_local() {
  local url="${1:-}" acao="${2:-operação}" sem_esquema autoridade host
  if [ -z "$url" ]; then
    echo "Recusado: banco sem URL de conexão (${acao})." >&2
    return 1
  fi
  # postgresql://usuario:senha@host:porta/banco -> host
  sem_esquema="${url#*://}"
  autoridade="${sem_esquema%%/*}"
  host="${autoridade##*@}"
  host="${host%%:*}"
  if [ "$host" != "localhost" ] && [ "$host" != "127.0.0.1" ]; then
    echo "Recusado: ${acao} só roda no Supabase local (host '$host')." >&2
    return 1
  fi
}
