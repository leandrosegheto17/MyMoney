# BLOCKERS

## Bloqueio 001 — 2026-10-10 (BK-0001)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0007
- Descrição: Decidir como o gitleaks no histórico (35 achados: JWTs de exemplo em commit antigo e .claude/skills) e o passo service_role (acusa frontend/web/src/configuracao/ambiente.ts e ambiente.test.ts) devem passar no CI; permitir push/branch de prova no GitHub
- Impacto se não resolvido: CI fica vermelho desde o primeiro push sem .gitleaks.toml/baseline, que o plano proíbe; G-15 só abre exceção para README
- Sugestão: Autorizar baseline/allowlist do gitleaks e ajustar a G-15 (exceção para os arquivos de ambiente do web)
- Status: Resolvido (2026-10-10): Aprovado pelo usuário em 2026-10-10 e aplicado (.gitleaksignore com 35 falsos positivos, ci.yml, exceção G-15); desbloqueio confirmado pelo usuário em /desenvolver

## Bloqueio 002 — 2026-10-10 (BK-0002)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0036
- Descrição: Folha.test.tsx:199 (pré-escrito) exige queryByLabelText('Valor') nulo com o campo no DOM; só passa com o nó fora de document.body, o que quebra getByRole('dialog'). Decidir se o teste pode ser corrigido (ex.: queryByRole('textbox',{name:'Valor'}))
- Impacto se não resolvido: 26 de 27 testes passam; implementação completa e Playwright 8/8; sem a decisão o teste não fica verde
- Sugestão: Autorizar a alteração do teste pré-escrito na linha 199 e reexecutar
- Status: Resolvido (2026-10-10): Usuário autorizou alterar Folha.test.tsx:199 para queryByRole (opção 1); teste da Folha passa

## Bloqueio 003 — 2026-10-10 (BK-0003)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: RTP-0006
- Descrição: Aguardar 2026-10-11 ~01:26Z (janela minimumReleaseAge de 1 dia de @cloudflare/workers-types@5.20261010.1) e reexecutar /executar --tarefa RTP-0006
- Impacto se não resolvido: —
- Sugestão: Reexecutar após a janela, sem mudar nada
- Status: Em aberto

## Bloqueio 004 — 2026-10-10 (BK-0004)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0080
- Descrição: Código pronto, mas BotaoForma.test.tsx depende de src/rotulos/tipoForma.ts (TP-0038, inexistente); Playwright não rodou (sem Chromium) e a lista aberta de formas (PENDENTE do plano) precisa de decisão de UX
- Impacto se não resolvido: —
- Sugestão: Executar TP-0038 antes e confirmar o desenho da lista aberta com o UX
- Status: Resolvido (2026-10-10): Usuário aprovou o desenho A (lista inline com GrupoChips); mockup e UX-SPEC atualizados; TP-0038 entra na Dep da TP-0080

## Bloqueio 005 — 2026-10-10 (BK-0005)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0053
- Descrição: Decidir pode_excluir em api.categorias: o JSON do mockup traz o campo, mas o plano fixa 6 colunas sem calculadas e o cálculo exigiria a tabela de lançamentos
- Impacto se não resolvido: —
- Sugestão: Incluir pode_excluir na view (após app.lancamento, TP-0051) ou retirá-lo do JSON/contrato
- Status: Resolvido (2026-10-10): Usuário aprovou a alternativa A (pode_excluir na view, 7 colunas); plano, aceite e pgTAP do TP-0053 ajustados

## Bloqueio 006 — 2026-10-10 (BK-0006)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0138
- Descrição: Faltam app.orcamentos_escopo (TP-0135) e api.orcamento_mes (TP-0136), origem da cópia; dependência não declarada na Dep
- Impacto se não resolvido: —
- Sugestão: Executar TP-0135 e TP-0136 e acrescentá-las à Dep de TP-0138
- Status: Resolvido (2026-10-10): Lacuna de dependência: TP-0135 e TP-0136 já aprovadas; Dep da TP-0138 ajustada (confirmado pelo usuário)
