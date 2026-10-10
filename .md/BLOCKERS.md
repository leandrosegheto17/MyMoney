# BLOCKERS

## Bloqueio 001 — 2026-10-10 (BK-0001)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0007
- Descrição: Decidir como o gitleaks no histórico (35 achados: JWTs de exemplo em commit antigo e .claude/skills) e o passo service_role (acusa frontend/web/src/configuracao/ambiente.ts e ambiente.test.ts) devem passar no CI; permitir push/branch de prova no GitHub
- Impacto se não resolvido: CI fica vermelho desde o primeiro push sem .gitleaks.toml/baseline, que o plano proíbe; G-15 só abre exceção para README
- Sugestão: Autorizar baseline/allowlist do gitleaks e ajustar a G-15 (exceção para os arquivos de ambiente do web)
- Status: Em aberto
