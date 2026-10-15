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
| Schemas expostos (`api.schemas`) | nenhum (ver pendência) | `["api"]` | **parcial** | 2026-10-14 |
| GraphQL (`pg_graphql`) | desligada | sem GraphQL exposto (`graphql_public` fora de `api.schemas`) | sim | 2026-10-14 |
| Site URL (`auth.site_url`) | `https://mymoney-ljs.vercel.app` | local: `http://127.0.0.1:5173` | divergência aceita (local × produção) | 2026-10-14 |
| Redirect URL (`auth.additional_redirect_urls`) | `https://mymoney-ljs.vercel.app/redefinir-senha` (única, sem curinga) | local: `http://127.0.0.1:5173` | divergência aceita (local × produção) | 2026-10-14 |

## Pendência: schema `api`

O schema `api` ainda não existe no banco de produção (a primeira migration em produção ainda não foi aplicada), então o painel não o oferece em "Exposed schemas". O estado atual é **nenhum schema exposto**: `public` e `graphql_public` estão fora e a Data API está desligada. Depois da primeira migration em produção, o usuário deve expor só `api` em Integrations > Data API > Settings > Exposed schemas e atualizar esta linha. Até lá o critério "só `api`" fica parcial.

O "Extra search path" do painel está com `public` e `extensions`; o `config.toml` não define esse campo, então não entra na conferência.

## Conferência por comando (chave `anon`, não registrada)

URL: `https://yrmvvronuxsaciratiwm.supabase.co`, 2026-10-14.

| Verificação | Resultado |
|---|---|
| `GET /auth/v1/settings` | `"disable_signup": true`; `anonymous_users: false`; só o provedor `email` ligado |
| `POST /auth/v1/signup` (e-mail fictício) | HTTP 422 `signup_disabled`: "Signups not allowed for this instance" |
| `POST /graphql/v1` (`{__typename}`) | HTTP 503 `PGRST002`; sem dados |
| `GET /rest/v1/tabela_inexistente` com `Accept-Profile: public` | HTTP 503 `PGRST002`; schema não exposto, sem dados |
| `GET /rest/v1/tabela_inexistente` com `Accept-Profile: api` | HTTP 503 `PGRST002`; Data API desligada até a primeira migration em produção |
| `GET /rest/v1/` com `anon` | HTTP 401: a raiz só aceita a chave de serviço |

Itens sem endpoint (senha 12, JWT 3600 s, rotação, URLs) foram aplicados e confirmados pelo usuário no painel.
