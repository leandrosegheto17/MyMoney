# BLOCKERS

## Bloqueio 001 — 2026-10-10 (BK-0001)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0007
- Descrição: Decidir como o gitleaks no histórico (35 achados: JWTs de exemplo em commit antigo e .claude/skills) e o passo service_role (acusa frontend/web/src/configuracao/ambiente.ts e ambiente.test.ts) devem passar no CI; permitir push/branch de prova no GitHub
- Impacto se não resolvido: CI fica vermelho desde o primeiro push sem .gitleaks.toml/baseline, que o plano proíbe; G-15 só abre exceção para README
- Sugestão: Autorizar baseline/allowlist do gitleaks e ajustar a G-15 (exceção para os arquivos de ambiente do web)
- Status: Resolvido em 2026-10-10 — aprovado pelo usuário. Aplicado: `.gitleaksignore` com 35 fingerprints (sem allowlist de path), exceção da G-15 por caminho exato para `ambiente.ts` e `ambiente.test.ts` (GUARDRAILS e ci.yml). Os 35 achados foram verificados com o gitleaks: JWTs com `iss=supabase-demo` e placeholders de documentação. Detalhes em `.md/.taskplan/BK-0001.md`. Falta o Executor ajustar o aceite do TP-0007 e repetir as fixtures negativas.

## Bloqueio 002 — 2026-10-10 (BK-0002)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0036
- Descrição: Folha.test.tsx:199 (pré-escrito) exige queryByLabelText('Valor') nulo com o campo no DOM; só passa com o nó fora de document.body, o que quebra getByRole('dialog'). Decidir se o teste pode ser corrigido (ex.: queryByRole('textbox',{name:'Valor'}))
- Impacto se não resolvido: 26 de 27 testes passam; implementação completa e Playwright 8/8; sem a decisão o teste não fica verde
- Sugestão: Autorizar a alteração do teste pré-escrito na linha 199 e reexecutar
- Status: Em aberto
