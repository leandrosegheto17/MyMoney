# Limpeza do Supabase de produção

Registro da limpeza feita com `backend/operacao/setup/limpar-supabase.sh`. Nada aqui é segredo: só ref, região e hash. Os campos abaixo são preenchidos pelo usuário depois de executar a limpeza; enquanto estiverem vazios, a limpeza **não foi feita**.

| Campo | Valor |
|---|---|
| Data | 2026-10-14 |
| Região conferida (`regiao`) | projeto antigo: `us-west-2` (Oregon), conferida no painel; projeto novo: `sa-east-1`, confirmada pelo usuário no painel |
| Ref do projeto (antigo ou novo, se recriado) | novo: `yrmvvronuxsaciratiwm` (antigo `xrcxbzrglndetrrhavhc`, excluído) |
| Caminho/nome do dump (fora do repositório) | não há: backup dispensado pelo usuário (projeto antigo só tinha dados descartáveis, 29,5 MB) |
| SHA-256 do dump | não se aplica |
| Itens em `pg_restore --list` | não se aplica |
| Caminho seguido | projeto excluído e recriado (região antiga era `us-west-2`, diferente de `sa-east-1`) |

## Roteiro

Com `supabase link` feito em `backend/supabase` e `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` no ambiente da sessão:

1. `bash backend/operacao/setup/limpar-supabase.sh regiao`
2. `bash backend/operacao/setup/limpar-supabase.sh copia` (guarde o hash acima)
3. `bash backend/operacao/setup/limpar-supabase.sh inventario`
4. `bash backend/operacao/setup/limpar-supabase.sh limpar` (pede o ref digitado; se a região não for `sa-east-1`, imprime o roteiro de exclusão e recriação do projeto)

## Verificação no painel

- [x] `public` sem tabelas
- [x] Auth sem usuários
- [x] Storage sem bucket
- [x] Sem Edge Function

Observação: a URL e as chaves de um projeto recriado vão para o gerenciador de senhas e o `.env` local, nunca para este arquivo. Os ref e a região registrados aqui são usados pelas tarefas de migrations e de deploy.

# Limpeza e reconfiguração do projeto Vercel `mymoney`

Registrado em 2026-10-15. Sem valores de variáveis.

- **Removido em 2026-10-14:** 164 deploys e todas as variáveis antigas (3 variáveis em 5 entradas); 0 domínios próprios. Outros projetos da conta não foram tocados.
- **Configuração final:** Root Directory `frontend/web` com "Include files outside the root directory" ligado; framework Vite; install `pnpm install --frozen-lockfile`; build `pnpm --filter @mymoney/web build`; output `dist`; Node 24.x; Git ligado ao repositório, branch de produção `main`; Ignored Build Step para pular o que não for produção.
- **Variáveis (só Production):** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Nenhuma outra.
- **Reconferência (2026-10-15):** `vercel env ls` no projeto `mymoney` listou exatamente 2 variáveis, ambas só em Production: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Nenhuma chave de serviço (`sb_secret_`); só nomes e ambientes registrados (sem `env pull`).
- **Domínio de produção:** `mymoney-ljs.vercel.app` (sem domínio próprio). É o mesmo do Site URL e do Redirect URL em `conferencia-painel.md`, então nada mudou lá.
- **Primeiro deploy de produção:** 2026-10-15, pela integração Git (push na `main`, commit `91c8ad5`).
- **`curl -sI https://mymoney-ljs.vercel.app/`:** `HTTP/1.1 200`; `Strict-Transport-Security: max-age=63072000; includeSubDomains`; `Content-Security-Policy` igual ao de `frontend/web/vercel.json` (`connect-src` só `'self'` e o host do Supabase de produção); `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`; `Permissions-Policy` com câmera, microfone, geolocalização, pagamento, USB e Bluetooth desligados.
- **Rota inventada** (`/qualquer/rota`): `200`, `text/html`, 1785 bytes, igual à raiz (rewrite para `index.html`).
- **`http://`:** `308` para `https://mymoney-ljs.vercel.app/`.
- **PWA:** `/manifest.webmanifest` `200` (`application/manifest+json`) e `/sw.js` `200` (`application/javascript`).

## Ignored Build Step (expressão registrada e provada nos dois sentidos)

- **Expressão em uso (painel, Settings > Git > Ignored Build Step, Behavior `Custom`, conferida em 2026-10-15):** `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]`. Sai com 0 (pula o build) em qualquer branch que não seja a `main` e com 1 (faz o build) na `main`. `frontend/web/vercel.json` não define `ignoreCommand` (só `rewrites` e `headers`), então a expressão vive só no painel.
- **Cancelamentos de 2026-10-15** (`7d9a0ca`, `3891687`, `fcbc910`, "Canceled by Ignored Build Step", antes do deploy de `91c8ad5`): a causa **não foi confirmada**. O passo passou a deixar a `main` construir sem mudança documentada.
- **Conferência nos dois sentidos:**
  1. `main` faz build — **conferido em 2026-10-15** na lista de Deployments: `91c8ad5`, `ba345e4` e `3197490` (todos na `main`) estão `Ready` em Production; `a38fdd8`, `274fda3`, `7be8ce2`, `b114cc7` e `8be5c89` (também `main`) rodaram o build e terminaram `Checks Failed`, não `Canceled by Ignored Build Step`. O `Checks Failed` é outro mecanismo (verificações do deploy) e não foi investigado aqui.
  2. Branch qualquer não faz build — **conferido em 2026-10-15**: branch `prova/rtp-0159-ignored-build` com commit próprio (`1705dbf`) enviado ao remoto; o status do commit na Vercel ficou `Canceled by Ignored Build Step`, deploy cancelado antes do build. Branch apagado do remoto e do local depois da prova. **Nota:** a Vercel reporta esse build cancelado ao GitHub com state `success` (não `failure`/`error`); um gate de CI que leia o status do deploy como "verde" aceitaria um build que não rodou. Qualquer gate deve olhar o resultado do CI do repositório, não o status do deploy da Vercel.
  3. Se a `main` cancelar ou o branch construir, a expressão regrediu: corrigir no painel antes de seguir.

### Production Branch e proteção da `main`

- **Production Branch (Vercel):** `main`, **lido pelo usuário no painel (Settings > Git > Production Branch) em 2026-10-15**; confere com a configuração final de 2026-10-14.
- **Proteção da `main` (GitHub):** hoje não há proteção (a API de proteção de branch devolveu 404). **Decisão do usuário em 2026-10-15: não proteger por ora.** Reavaliar se entrar mais gente no repositório ou se um deploy ruim chegar à produção.
- **Versionar `ignoreCommand` em `frontend/web/vercel.json`:** a regra segue só no painel (risco: mudança no painel não passa por revisão). **Decisão do usuário em 2026-10-15: não versionar por ora.** Reavaliar junto com a proteção da `main`.
