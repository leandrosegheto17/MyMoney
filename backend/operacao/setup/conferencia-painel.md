# Conferência do painel de produção

Projeto de produção: ref `yrmvvronuxsaciratiwm` (ver `limpeza.md`). Domínio de produção do app (informado pelo usuário em 2026-10-14): `mymoney-ljs.vercel.app`. Nada aqui é segredo: só valores de configuração e o ref.

Valores esperados vêm de `backend/supabase/config.toml`. Os itens foram aplicados e confirmados pelo usuário no painel em 2026-10-14.

| Item | Valor no painel | Valor no `config.toml` | Igual? | Data |
|---|---|---|---|---|
| Cadastro de novos usuários (`auth.enable_signup`) | desligado | `false` | sim | 2026-10-14 |
| Provedor de e-mail (`auth.email.enable_signup`) | ligado (o cadastro segue fechado pela linha acima, ADR-014) | `true` | sim | 2026-10-14 |
| Senha mínima (`auth.minimum_password_length`) | 12 | `12` | sim | 2026-10-14 |
| JWT expiry (`auth.jwt_expiry`) | 3600 s | `3600` | sim | 2026-10-14 |
| Rotação de refresh token (`auth.enable_refresh_token_rotation`) | ligada | `true` | sim | 2026-10-14 |
| Schemas expostos (`api.schemas`) | só `api` (1 de 4: `app`, `graphql_public` e `public` fora) | `["api"]` | sim | 2026-10-15 |
| Extra search path (`api.extra_search_path`) | `extensions` (`public` removido em 2026-10-15) | `["extensions"]` | sim | 2026-10-15 |
| GraphQL (`pg_graphql`) | desligada | sem GraphQL exposto (`graphql_public` fora de `api.schemas`) | sim | 2026-10-14 |
| Site URL (`auth.site_url`) | `https://mymoney-ljs.vercel.app` | local: `http://127.0.0.1:5173` | divergência aceita (local × produção) | 2026-10-14 |
| Redirect URL (`auth.additional_redirect_urls`) | `https://mymoney-ljs.vercel.app/redefinir-senha` (única, sem curinga) | local: `http://127.0.0.1:5173` | divergência aceita (local × produção) | 2026-10-14 |

## Extra search path

O painel estava com `public, extensions` e o `config.toml` define `["extensions"]` (a fonte). O usuário removeu `public` do campo em 2026-10-15 e a linha da tabela passou a "sim". Não há pendência aberta.

## Conferência por comando (chave `anon`, não registrada)

URL: `https://yrmvvronuxsaciratiwm.supabase.co`, 2026-10-15 (as linhas de signup e `/rest/v1/` são de 2026-10-14).

| Verificação | Resultado |
|---|---|
| `GET /auth/v1/settings` | `"disable_signup": true` (2026-10-15); `anonymous_users: false`; só o provedor `email` ligado |
| `POST /auth/v1/signup` (e-mail fictício) | HTTP 422 `signup_disabled`: "Signups not allowed for this instance" |
| `POST /graphql/v1` (`{__typename}`) | HTTP 406 `PGRST106`: "Only the following schemas are exposed: api"; sem dados |
| `GET /rest/v1/x` com `Accept-Profile: public` | HTTP 406 `PGRST106` "Invalid schema: public"; sem dados |
| `GET /rest/v1/x` com `Accept-Profile: graphql_public` | HTTP 406 `PGRST106` "Invalid schema: graphql_public"; sem dados |
| `GET /rest/v1/x` com `Accept-Profile: api` | HTTP 404 `PGRST205` (tabela inexistente): o schema `api` é aceito |
| `POST /rest/v1/rpc/ping` com `Accept-Profile: api` | HTTP 200, devolve `1` |
| `GET /rest/v1/` com `anon` | HTTP 401: a raiz só aceita a chave de serviço |

Itens sem endpoint (senha 12, JWT 3600 s, rotação, URLs) foram aplicados e confirmados pelo usuário no painel.
