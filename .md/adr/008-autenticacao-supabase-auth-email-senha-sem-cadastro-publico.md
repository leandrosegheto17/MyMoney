# ADR-008: O login usa Supabase Auth com e-mail e senha, sem cadastro público, e o vínculo com o lar fica na tabela `membro`

- **Status:** Aceito em 2026-10-09 (Loop B aprovado pelo stakeholder; antes: Proposto, Loop B, rodada 1)
- **Data:** 2026-10-09
- **Decisores:** Coordenador

## Contexto

O RF-01 tem 4 critérios:

- só os 2 membros entram (CA-01.1, CA-01.2), sem cadastro público;
- o membro continua logado no app instalado (CA-01.3);
- ao sair, a sessão daquele aparelho termina (CA-01.4);
- a sessão é revogável (RNF-06).

Link mágico por e-mail não serve no iOS: o link abre no Safari, não no PWA instalado, e o PWA tem armazenamento
separado do Safari. O membro ficaria preso fora do app.

## Decisão

1. **Usuários.** Supabase Auth com **e-mail e senha**. A opção "Allow new users to sign up" fica **desligada**.
   Os 2 usuários são criados à mão no painel do Supabase, por uma tarefa de configuração com o usuário presente.
2. **Vínculo com o lar.** A tabela `app.membro` liga `auth.users.id` ao único lar (RN-11), e uma restrição
   garante no máximo 2 membros por lar. Toda política de RLS passa por `app.membro_atual()`, que devolve o
   membro do `auth.uid()`. Um usuário autenticado sem linha em `membro` não vê nem escreve nada. Essa é a
   segunda barreira do CA-01.2.
3. **Sessão:**
   - o `supabase-js` guarda a sessão no armazenamento local do PWA, com `persistSession` e renovação
     automática;
   - o JWT de acesso tem a validade padrão de 1 h, e o refresh token gira a cada uso;
   - "Sair" chama `signOut({ scope: 'local' })` (CA-01.4);
   - em Ajustes, "Sair de todos os aparelhos" chama `signOut({ scope: 'global' })` (RNF-06).
4. **Senha.** Mínimo de 12 caracteres, configurado no Auth. A recuperação de senha por e-mail usa o SMTP padrão
   do Supabase, que tem limite baixo de envios mas atende 2 usuários.
5. **MFA (TOTP):** fora do MVP. O Supabase oferece de graça, e fica como melhoria se o stakeholder quiser.

## Consequências

**Positivas**
- Nenhum código de autenticação próprio.
- Um terceiro usuário criado por engano não acessa nada, porque não tem linha em `membro`.

**Negativas**
- Senha digitada no celular é atrito, mas acontece uma vez por aparelho (CA-01.3).
- O token de sessão fica no armazenamento do navegador, e um XSS o exporia. Mitigação: CSP restritiva, sem
  script de terceiros e sem `dangerouslySetInnerHTML` (SDD §7).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Link mágico ou OTP por e-mail | No iOS, o link abre fora do PWA instalado. O OTP de 6 dígitos funcionaria, mas cada novo login depende do e-mail chegar |
| Login com Google | Depende de os 2 terem conta Google e de configurar OAuth. Ganho pequeno |
| Lista de e-mails permitidos num hook de Auth | Com o cadastro desligado e o vínculo pela tabela `membro`, é redundante |
