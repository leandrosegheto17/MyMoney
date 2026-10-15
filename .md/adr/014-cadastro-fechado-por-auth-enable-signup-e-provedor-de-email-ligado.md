# ADR-014: O cadastro fica fechado por `[auth] enable_signup = false`; `[auth.email] enable_signup = true` só mantém o provedor de e-mail (login) ligado

- **Status:** Aceito em 2026-10-14 (decisão do usuário sobre o BK-0032, alternativa A)
- **Data:** 2026-10-14
- **Decisores:** Usuário (aprovou), Coordenador
- **Complementa:** ADR-008 §1 (nota sobre as chaves do `config.toml`). Não substitui nenhum ADR: o comportamento
  prometido (cadastro público desligado, CA-01.2) é o mesmo; muda só em qual chave do `config.toml` ele é garantido e
  como se prova.

## Contexto

O ADR-008 §1, o TP-0002 e o G-16 foram lidos como "`enable_signup = false` em `[auth]` **e** em `[auth.email]`". No
Supabase CLI, porém, as duas chaves têm papéis diferentes:

- `[auth] enable_signup` vira `GOTRUE_DISABLE_SIGNUP` (invertido): é ela que recusa o cadastro (`POST /auth/v1/signup` → 422
  `signup_disabled`).
- `[auth.email] enable_signup` vira `GOTRUE_EXTERNAL_EMAIL_ENABLED`: liga ou desliga o **provedor de e-mail inteiro**, login
  incluso.

Com `false` nas duas, o login por e-mail some no ambiente local e no CI ("Email logins are disabled"): a suíte de
isolamento (job `isolamento`) e o `pnpm local:resetar` quebram. A produção (painel) já está no estado certo, verificado no
TP-0010: `disable_signup: true`, signup recusado com 422, provedor `email` habilitado. O `config.toml` é só espelho local;
nenhum script nem o CI usa `supabase config push`.

## Decisão

1. `[auth] enable_signup = false` (cadastro fechado) e `[auth.email] enable_signup = true` (provedor de e-mail ligado, para o
   login), cada um com o comentário "espelha o painel" explicando o papel da chave. Isso espelha a produção.
2. O teste `verificacoes/config.test.mjs` passa a exigir `auth.enable_signup = false` e `auth.email.enable_signup = true`.
3. **Prova de cadastro fechado:** além da leitura do TOML, o CI sobe o Supabase local e confere que `POST /auth/v1/signup`
   com a anon devolve 422 (o mesmo que o TP-0010 provou em produção).
4. **Guarda:** um teste falha se algum script, workflow ou `package.json` chamar `supabase config push`, para o
   `config.toml` nunca ser empurrado à produção.
5. A segunda barreira do CA-01.2 não muda: usuário sem linha em `app.membro` não acessa nada (ADR-008 §2).

## Consequências

**Positivas**
- O CI e o `local:resetar` voltam a funcionar sem contorno nem segundo arquivo de config.
- O cadastro fechado passa a ser provado por comportamento (422), não só por texto no TOML.

**Negativas**
- Depende da semântica do CLI; mitigada pelo teste do 422 local, que falha se uma versão futura mudar o mapeamento.
- `config push` acidental levaria o mesmo estado da produção atual; mesmo assim o guarda o impede.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| `false` nas duas chaves e config alternativo só para CI/local | O CLI 2.x não tem flag estável de config alternativo; dois arquivos divergem; não resolve o `local:resetar`; mantém a leitura errada da chave |
| Manter `false` nas duas e criar sessões de teste forjando JWT ou service role | Perde o login real na suíte de isolamento (`auth.uid()` autêntico); muito mais trabalho |
