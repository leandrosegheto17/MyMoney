# @mymoney/keepalive

Worker da Cloudflare com gatilho `scheduled` (cron `0 9 * * *`, 06:00 em São Paulo) que chama
`POST {SUPABASE_URL}/rest/v1/rpc/ping` com a chave `anon`, para o projeto Supabase gratuito não
ser pausado por inatividade (ADR-009). Não tem rota HTTP (`workers_dev = false`, sem `fetch`).
Só status e número da tentativa vão para o log.

## Deploy

```sh
wrangler login
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY   # somente a chave anon, nunca a service_role
pnpm --filter @mymoney/keepalive deploy
```

## Verificação

- Painel da Cloudflare: Workers, `mymoney-keepalive`, Cron Events; ou `wrangler tail`.
- Local: crie `.dev.vars` (ignorado pelo git) com `SUPABASE_URL` e `SUPABASE_ANON_KEY` do Supabase
  local, rode `wrangler dev --test-scheduled` e chame `curl "http://localhost:8787/__scheduled"`.

## Plano B

Se o projeto for pausado: painel do Supabase, "Restore project". Os lançamentos continuam na fila
local do aplicativo até a retomada (ADR-007).
