# TASKPLAN — ordem de execução e estado das tarefas

Gerado por `/organizar` (`python .claude/scripts/taskplan.py gerar`) e mantido pelo `/executar`,
que troca o estado da linha a cada etapa. O Status oficial continua no `TASK.md` (bloqueios `BK-`: no
arquivo do bloqueio); o detalhe de cada tarefa está em `.md/.taskplan/<ID>.md`. A ordem respeita as
dependências. Agente: `executor` (TP/RTP) ou `coordenador` (BK/SPK, com o usuário).

Atualizado: 2026-10-10 15:47

Resumo: Não executada 82 · Em execução 1 · Testada (aguarda segurança) 1 · Aprovada 128 · Bloqueada 6 · total 218

Estados: Não executada → Em execução → Executada (aguarda teste) → Em teste → Testada (aguarda segurança) → Em validação de segurança → Aprovada (e, à parte, Bloqueada, Dividida e Despriorizada — esta fica sempre no fim da lista e é ignorada por /executar, /testar e /validar). `Aprovada` = QA ✔ e Sec ✔ (tarefas antigas só `Concluída` aparecem como Aprovada).

| # | Tarefa | Agente | Plano | Título | Lote | Dep | Estado |
|---|---|---|---|---|---|---|---|
| 1 | TP-0001 | executor | ✔ | Workspace pnpm na raiz | Lote 1 | — | Aprovada |
| 2 | TP-0002 | executor | ✔ | Supabase CLI local em backend/supabase [BD] | Lote 1 | TP-0001 | Aprovada |
| 3 | TP-0003 | executor | ✔ | Schemas app e api e privilégios padrão [BD] | Lote 1 | TP-0002 | Aprovada |
| 4 | TP-0004 | executor | ✔ | Utilitários de data do banco: app.hoje(), app.dia_no_mes(), app.inicio_mes() [BD] | Lote 1 | TP-0003 | Aprovada |
| 5 | TP-0005 | executor | ✔ | Função api.ping() [BD] | Lote 1 | TP-0003 | Aprovada |
| 6 | TP-0006 | executor | ✔ | Worker de keep-alive (@mymoney/keepalive): código | Lote 1 | TP-0001 | Aprovada |
| 7 | BK-0001 | coordenador | ✔ | Decidir como o gitleaks no histórico (35 achados: JWTs de exemplo em commit antigo e .clau | — | — | Não executada |
| 8 | TP-0007 | executor | ✔ | CI base no GitHub Actions | Lote 1 | BK-0001, TP-0001 | Bloqueada |
| 9 | TP-0008 | executor | ✔ | Script backend/operacao/deploy/migrar.sh [BD] | Lote 2 | TP-0002, TP-0007 | Não executada |
| 10 | TP-0009 | executor | ✔ | Limpeza do Supabase de produção com verificação de região [U] | Lote 2 | TP-0002 | Em execução |
| 11 | TP-0010 | executor | ✔ | Configuração do Auth e da API em produção [U] | Lote 2 | TP-0009 | Não executada |
| 12 | TP-0011 | executor | ✔ | Primeira migration em produção (schemas, utilitários e ping) [U] | Lote 2 | TP-0004, TP-0005, TP-0008, TP-0010 | Não executada |
| 13 | TP-0012 | executor | ✔ | Deploy do Worker na Cloudflare [U] | Lote 2 | TP-0006, TP-0011 | Não executada |
| 14 | TP-0013 | executor | ✔ | Tabelas app.lar e app.membro, RLS e app.membro_atual()/app.lar_atual() [BD] | Lote 3 | TP-0003 | Aprovada |
| 15 | TP-0014 | executor | ✔ | Seeds locais de acesso [BD] | Lote 3 | TP-0013 | Aprovada |
| 16 | TP-0015 | executor | ✔ | api.contexto() [BD] | Lote 3 | TP-0004, TP-0013 | Aprovada |
| 17 | TP-0016 | executor | ✔ | Pacote @mymoney/testes-api (suíte de isolamento) [BD] | Lote 3 | TP-0014, TP-0015 | Aprovada |
| 18 | TP-0017 | executor | ✔ | Testes de catálogo da segurança do banco [BD] | Lote 3 | TP-0013 | Aprovada |
| 19 | TP-0018 | executor | ✔ | CI do banco | Lote 3 | TP-0007, TP-0016 | Não executada |
| 20 | TP-0019 | executor | ✔ | Pacote @mymoney/contrato: tipos gerados e códigos de erro [BD] | Lote 4 | TP-0015, TP-0018 | Não executada |
| 21 | TP-0020 | executor | ✔ | Tipos das respostas em JSON e das linhas das views | Lote 4 | TP-0019 | Não executada |
| 22 | TP-0021 | executor | ✔ | Esqueleto @mymoney/web | Lote 4 | TP-0001 | Aprovada |
| 23 | TP-0022 | executor | ✔ | Regras de fronteira no lint do web | Lote 4 | TP-0021 | Aprovada |
| 24 | TP-0023 | executor | ✔ | Base visual e comparação visual | Lote 4 | TP-0021 | Aprovada |
| 25 | TP-0024 | executor | ✔ | formatacao/ | Lote 4 | TP-0021 | Aprovada |
| 26 | TP-0025 | executor | ✔ | dados/ núcleo: cliente, sessão, erros e contexto | Lote 5 | TP-0015, TP-0019, TP-0022 | Não executada |
| 27 | TP-0026 | executor | ✔ | Modo de comparação visual (sessão falsa e sem sessão) | Lote 5 | TP-0023, TP-0025 | Não executada |
| 28 | TP-0027 | executor | ✔ | PWA: manifest, ícones e service worker | Lote 5 | TP-0021 | Aprovada |
| 29 | TP-0028 | executor | ✔ | vercel.json: rotas e cabeçalhos de segurança | Lote 5 | TP-0009, TP-0021 | Não executada |
| 30 | TP-0029 | executor | ✔ | Limpeza e reconfiguração do projeto Vercel mymoney [U] | Lote 5 | TP-0010, TP-0027, TP-0028 | Não executada |
| 31 | TP-0030 | executor | ✔ | CI do frontend e isolamento como condição de deploy [U] | Lote 5 | TP-0018, TP-0026, TP-0029 | Não executada |
| 32 | TP-0031 | executor | ✔ | Página de ensaio do teclado (descartável) | Lote 6 | TP-0027, TP-0029 | Não executada |
| 33 | SPK-0001 | coordenador | — | Spike: teclado numérico no "+" no iPhone 17 e no Moto Edge 60 | Lote 6 | TP-0031 | Aprovada |
| 34 | TP-0032 | executor | ✔ | BarraNavegacao e TrilhoNavegacao | Lote 7 | TP-0023 | Aprovada |
| 35 | TP-0033 | executor | ✔ | Roteamento e layout autenticado | Lote 7 | TP-0025, TP-0032 | Não executada |
| 36 | TP-0034 | executor | ✔ | Campos de formulário e botão | Lote 7 | TP-0023, TP-0024 | Aprovada |
| 37 | TP-0035 | executor | ✔ | CampoValor (centavos) | Lote 7 | TP-0023, TP-0024 | Aprovada |
| 38 | BK-0002 | coordenador | ✔ | Folha.test.tsx:199 (pré-escrito) exige queryByLabelText('Valor') nulo com o campo no DOM; | — | — | Não executada |
| 39 | TP-0036 | executor | ✔ | Folha (bottom sheet e diálogo no PC) | Lote 7 | BK-0002, TP-0023 | Bloqueada |
| 40 | TP-0037 | executor | ✔ | DialogoConfirmacao | Lote 7 | TP-0036 | Não executada |
| 41 | TP-0038 | executor | ✔ | rotulos/ | Lote 8 | TP-0020, TP-0021 | Não executada |
| 42 | TP-0039 | executor | ✔ | Aviso (toast) e Faixa | Lote 8 | TP-0023 | Aprovada |
| 43 | TP-0040 | executor | ✔ | EstadoVazio, EstadoErro, Esqueleto e leitura com cache | Lote 8 | TP-0023, TP-0039 | Aprovada |
| 44 | TP-0041 | executor | ✔ | SeletorMes | Lote 8 | TP-0024, TP-0033 | Não executada |
| 45 | TP-0042 | executor | ✔ | SeloEscopo e SeloSituacao | Lote 8 | TP-0038 | Não executada |
| 46 | TP-0043 | executor | ✔ | ChipOpcao e GrupoChips | Lote 8 | TP-0023 | Aprovada |
| 47 | TP-0044 | executor | ✔ | BarraProgresso, ValorDestaque e CartaoResumo | Lote 8 | TP-0038 | Não executada |
| 48 | TP-0045 | executor | ✔ | T01 Entrar | Lote 9 | TP-0026, TP-0033, TP-0034, TP-0039 | Não executada |
| 49 | TP-0046 | executor | ✔ | T01b Redefinir senha | Lote 9 | TP-0026, TP-0033, TP-0034, TP-0039 | Não executada |
| 50 | TP-0047 | executor | ✔ | T14 Ajustes | Lote 9 | TP-0026, TP-0033, TP-0037, TP-0039 | Não executada |
| 51 | TP-0048 | executor | ✔ | Tabelas app.conta e app.movimento_conta [BD] | Lote 10 | TP-0013 | Aprovada |
| 52 | TP-0049 | executor | ✔ | Tabela app.forma_pagamento [BD] | Lote 10 | TP-0048 | Aprovada |
| 53 | TP-0050 | executor | ✔ | Tabela app.categoria [BD] | Lote 10 | TP-0013 | Aprovada |
| 54 | TP-0051 | executor | ✔ | Tabelas app.lancamento, app.lancamento_pagamento e app.parcela [BD] | Lote 10 | TP-0048, TP-0049, TP-0050 | Aprovada |
| 55 | TP-0052 | executor | ✔ | api.inicializar_membro() [BD] | Lote 10 | TP-0050 | Aprovada |
| 56 | BK-0005 | coordenador | ✔ | Decidir pode_excluir em api.categorias: o JSON do mockup traz o campo, mas o plano fixa 6 | — | — | Não executada |
| 57 | TP-0053 | executor | ✔ | View api.categorias [BD] | Lote 10 | BK-0005, TP-0016, TP-0050 | Bloqueada |
| 58 | TP-0054 | executor | ✔ | api.salvar_conta [BD] | Lote 11 | TP-0048 | Aprovada |
| 59 | TP-0055 | executor | ✔ | api.arquivar_conta e api.excluir_conta [BD] | Lote 11 | TP-0048, TP-0049, TP-0051 | Aprovada |
| 60 | TP-0056 | executor | ✔ | api.salvar_forma [BD] | Lote 11 | TP-0049 | Aprovada |
| 61 | TP-0057 | executor | ✔ | api.arquivar_forma e api.excluir_forma [BD] | Lote 11 | TP-0049, TP-0051 | Aprovada |
| 62 | TP-0058 | executor | ✔ | api.definir_preferida [BD] | Lote 11 | TP-0049 | Aprovada |
| 63 | TP-0059 | executor | ✔ | api.salvar_categoria [BD] | Lote 11 | TP-0050 | Aprovada |
| 64 | TP-0060 | executor | ✔ | api.arquivar_categoria e api.excluir_categoria [BD] | Lote 11 | TP-0050, TP-0051 | Aprovada |
| 65 | TP-0061 | executor | ✔ | Regra app.gerar_parcelas [BD] | Lote 12 | TP-0004 | Aprovada |
| 66 | TP-0062 | executor | ✔ | api.lancar_despesa [BD] | Lote 12 | TP-0051, TP-0061 | Aprovada |
| 67 | TP-0063 | executor | ✔ | api.dados_lancamento [BD] | Lote 12 | TP-0051 | Aprovada |
| 68 | TP-0064 | executor | ✔ | Regra app.saldo_conta [BD] | Lote 13 | TP-0048, TP-0049, TP-0051 | Aprovada |
| 69 | TP-0065 | executor | ✔ | View api.contas (com saldo) [BD] | Lote 13 | TP-0064 | Aprovada |
| 70 | TP-0066 | executor | ✔ | api.ajustar_saldo [BD] | Lote 13 | TP-0064 | Aprovada |
| 71 | TP-0067 | executor | ✔ | Regra app.gasto_cartao (compras) [BD] | Lote 13 | TP-0049, TP-0051 | Aprovada |
| 72 | TP-0068 | executor | ✔ | View api.formas_pagamento [BD] | Lote 13 | TP-0067 | Aprovada |
| 73 | TP-0069 | executor | ✔ | Dados dos cadastros (consultas, comandos e primeiro uso) | Lote 14 | TP-0025, TP-0052, TP-0053, TP-0054, TP-0055, TP-0056, TP-0057, TP-0058, TP-0059, TP-0060, TP-0065, TP-0066, TP-0068 | Não executada |
| 74 | TP-0070 | executor | ✔ | T15 Contas | Lote 14 | TP-0040, TP-0069 | Não executada |
| 75 | TP-0071 | executor | ✔ | T16 Conta | Lote 14 | TP-0034, TP-0035, TP-0037, TP-0039, TP-0069 | Não executada |
| 76 | TP-0072 | executor | ✔ | T17 Formas de pagamento | Lote 14 | TP-0040, TP-0069 | Não executada |
| 77 | TP-0073 | executor | ✔ | T18 Forma de pagamento | Lote 14 | TP-0034, TP-0037, TP-0039, TP-0069 | Não executada |
| 78 | TP-0074 | executor | ✔ | T19 Categorias | Lote 14 | TP-0040, TP-0042, TP-0069 | Não executada |
| 79 | TP-0075 | executor | ✔ | T20 Categoria | Lote 14 | TP-0034, TP-0037, TP-0069 | Não executada |
| 80 | TP-0076 | executor | ✔ | Dados do lançamento com cache no aparelho | Lote 15 | TP-0025, TP-0063 | Não executada |
| 81 | TP-0077 | executor | ✔ | Fila offline: núcleo (dados/fila) | Lote 15 | TP-0025, TP-0062 | Não executada |
| 82 | TP-0078 | executor | ✔ | Fila offline: gatilhos de envio e sessão | Lote 15 | TP-0077 | Não executada |
| 83 | TP-0079 | executor | ✔ | Puxar para atualizar | Lote 15 | TP-0023 | Aprovada |
| 84 | BK-0004 | coordenador | ✔ | Código pronto, mas BotaoForma.test.tsx depende de src/rotulos/tipoForma.ts (TP-0038, inexi | — | — | Não executada |
| 85 | TP-0080 | executor | ✔ | BotaoForma e ListaFormas | Lote 16 | BK-0004, TP-0023, TP-0043 | Bloqueada |
| 86 | TP-0081 | executor | ✔ | T03a Folha de lançamento montada e o "+" | Lote 16 | SPK-0001, TP-0032, TP-0033, TP-0035, TP-0036, TP-0076 | Não executada |
| 87 | TP-0082 | executor | ✔ | T03b Grade de categorias | Lote 16 | TP-0042, TP-0043, TP-0081 | Não executada |
| 88 | TP-0083 | executor | ✔ | T03c Forma, parcelas e "Mais detalhes" | Lote 16 | TP-0034, TP-0043, TP-0080, TP-0081 | Não executada |
| 89 | TP-0084 | executor | ✔ | T03d Confirmar, avisos, fila e estados | Lote 16 | TP-0039, TP-0077, TP-0078, TP-0082, TP-0083 | Não executada |
| 90 | TP-0085 | executor | ✔ | Regra app.totais_conjunto(mes) [BD] | Lote 17 | TP-0051 | Aprovada |
| 91 | TP-0086 | executor | ✔ | Regra app.totais_individuais(mes) [BD] | Lote 17 | TP-0051 | Aprovada |
| 92 | TP-0087 | executor | ✔ | api.resumo_mes(mes) [BD] | Lote 17 | TP-0064, TP-0067, TP-0085, TP-0086 | Aprovada |
| 93 | TP-0088 | executor | ✔ | Seed de volume de 2 anos e medição do desempenho [BD] | Lote 17 | TP-0087 | Aprovada |
| 94 | TP-0089 | executor | ✔ | T02a Estrutura, estados, cabeçalho e faixas | Lote 18 | TP-0025, TP-0033, TP-0039, TP-0040, TP-0041, TP-0079, TP-0087 | Não executada |
| 95 | TP-0090 | executor | ✔ | Componentes ResumoOrcamento e MetaCompacta | Lote 18 | TP-0044 | Não executada |
| 96 | TP-0091 | executor | ✔ | T02b Casa: total, quem pagou, por categoria e resultado | Lote 18 | TP-0042, TP-0044, TP-0089 | Não executada |
| 97 | TP-0092 | executor | ✔ | T02c Casa: fixas pendentes, orçamento e metas | Lote 18 | TP-0042, TP-0089, TP-0090 | Não executada |
| 98 | TP-0093 | executor | ✔ | T02d Eu: meu total, receitas e resultado, por categoria | Lote 18 | TP-0044, TP-0089 | Não executada |
| 99 | TP-0094 | executor | ✔ | T02e Eu: orçamento, contas, cartões e metas; Início completo | Lote 18 | TP-0090, TP-0091, TP-0092, TP-0093 | Não executada |
| 100 | TP-0095 | executor | ✔ | T02f Primeiros passos e mês vazio | Lote 18 | TP-0089 | Não executada |
| 101 | TP-0096 | executor | ✔ | api.lancamentos_mes [BD] | Lote 19 | TP-0051 | Aprovada |
| 102 | TP-0097 | executor | ✔ | api.lancamento(id) [BD] | Lote 19 | TP-0051 | Aprovada |
| 103 | TP-0098 | executor | ✔ | Regra app.permissoes_edicao [BD] | Lote 19 | TP-0051 | Aprovada |
| 104 | TP-0099 | executor | ✔ | api.editar_lancamento (SECURITY DEFINER) [BD] | Lote 19 | TP-0061, TP-0098 | Aprovada |
| 105 | TP-0100 | executor | ✔ | api.excluir_lancamento [BD] | Lote 19 | TP-0051 | Aprovada |
| 106 | TP-0101 | executor | ✔ | LinhaLancamento | Lote 20 | TP-0024, TP-0042 | Não executada |
| 107 | TP-0102 | executor | ✔ | Dados de lançamentos (lista, detalhe, editar e excluir) | Lote 20 | TP-0025, TP-0096, TP-0097, TP-0099, TP-0100 | Não executada |
| 108 | TP-0103 | executor | ✔ | T04a Lista do mês | Lote 20 | TP-0040, TP-0041, TP-0079, TP-0101, TP-0102 | Não executada |
| 109 | TP-0104 | executor | ✔ | T04b Filtros e lançamentos na fila | Lote 20 | TP-0043, TP-0077, TP-0103 | Não executada |
| 110 | TP-0105 | executor | ✔ | T05a Detalhe e edição | Lote 20 | TP-0034, TP-0035, TP-0037, TP-0039, TP-0042, TP-0102 | Não executada |
| 111 | TP-0106 | executor | ✔ | T05c Excluir e "não existe mais" | Lote 20 | TP-0037, TP-0105 | Não executada |
| 112 | TP-0107 | executor | ✔ | T22 Instalar o app | Lote 21 | TP-0027, TP-0036, TP-0089 | Não executada |
| 113 | TP-0108 | executor | ✔ | T23 Envios pendentes | Lote 21 | TP-0036, TP-0037, TP-0078, TP-0084 | Não executada |
| 114 | TP-0109 | executor | ✔ | CI: ensaio de migration sobre dados e checagem aditiva [BD] | Lote 21 | TP-0018, TP-0088 | Não executada |
| 115 | TP-0110 | executor | ✔ | E2E de integração: entrar, primeiro uso, lançar e fila [BD] | Lote 21 | TP-0045, TP-0069, TP-0084, TP-0094, TP-0095, TP-0103, TP-0108 | Não executada |
| 116 | TP-0111 | executor | ✔ | E2E de integração: privacidade e edição com 2 membros [BD] | Lote 21 | TP-0105, TP-0106, TP-0110 | Não executada |
| 117 | TP-0112 | executor | ✔ | Cadastro dos 2 usuários em produção [U] | Lote 22 | TP-0029, TP-0110 | Não executada |
| 118 | TP-0113 | executor | ✔ | Verificação do keep-alive antes do uso diário [U] | Lote 22 | TP-0012 | Não executada |
| 119 | TP-0114 | executor | ✔ | Roteiro de fricção e desempenho nos aparelhos reais [U] | Lote 22 | TP-0107, TP-0112 | Não executada |
| 120 | TP-0115 | executor | ✔ | api.lancar_receita [BD] | Lote 23 | TP-0051 | Aprovada |
| 121 | TP-0116 | executor | ✔ | T03e Modo Receita | Lote 23 | TP-0076, TP-0084, TP-0115 | Não executada |
| 122 | TP-0117 | executor | ✔ | api.alterar_data_parcela [BD] | Lote 24 | TP-0051 | Aprovada |
| 123 | TP-0118 | executor | ✔ | T05b Lista de parcelas e "Alterar data" | Lote 24 | TP-0042, TP-0105, TP-0117 | Não executada |
| 124 | TP-0119 | executor | ✔ | Tabelas app.despesa_fixa e app.ocorrencia_fixa [BD] | Lote 25 | TP-0050, TP-0051 | Aprovada |
| 125 | TP-0120 | executor | ✔ | Regra app.garantir_ocorrencias(mes) [BD] | Lote 25 | TP-0004, TP-0119 | Aprovada |
| 126 | TP-0121 | executor | ✔ | View api.despesas_fixas [BD] | Lote 25 | TP-0119 | Aprovada |
| 127 | TP-0122 | executor | ✔ | api.salvar_despesa_fixa [BD] | Lote 25 | TP-0119 | Aprovada |
| 128 | TP-0123 | executor | ✔ | api.encerrar_despesa_fixa [BD] | Lote 25 | TP-0119, TP-0120 | Aprovada |
| 129 | TP-0124 | executor | ✔ | api.ocorrencias_mes(mes) [BD] | Lote 25 | TP-0120 | Aprovada |
| 130 | TP-0125 | executor | ✔ | api.pagar_ocorrencia [BD] | Lote 26 | TP-0051, TP-0124 | Aprovada |
| 131 | TP-0126 | executor | ✔ | api.desfazer_pagamento [BD] | Lote 26 | TP-0125 | Aprovada |
| 132 | TP-0127 | executor | ✔ | resumo_mes: seção de fixas [BD] | Lote 26 | TP-0087, TP-0124 | Aprovada |
| 133 | TP-0128 | executor | ✔ | app.gasto_cartao: fixa paga no crédito [BD] | Lote 26 | TP-0067, TP-0125 | Aprovada |
| 134 | TP-0129 | executor | ✔ | Dados das fixas | Lote 27 | TP-0025, TP-0121, TP-0122, TP-0123, TP-0124, TP-0125, TP-0126 | Não executada |
| 135 | TP-0130 | executor | ✔ | T06 Despesas fixas do mês | Lote 27 | TP-0037, TP-0040, TP-0041, TP-0042, TP-0129 | Não executada |
| 136 | TP-0131 | executor | ✔ | T07 Modelo de despesa fixa | Lote 27 | TP-0034, TP-0035, TP-0037, TP-0129 | Não executada |
| 137 | TP-0132 | executor | ✔ | T08 Marcar fixa como paga | Lote 27 | TP-0035, TP-0036, TP-0080, TP-0130 | Não executada |
| 138 | TP-0133 | executor | ✔ | E2E de integração: ciclo da despesa fixa [BD] | Lote 27 | TP-0127, TP-0128, TP-0130, TP-0131, TP-0132 | Não executada |
| 139 | TP-0134 | executor | ✔ | Tabela app.orcamento [BD] | Lote 28 | TP-0050 | Aprovada |
| 140 | TP-0135 | executor | ✔ | Regra app.orcado_realizado e situação [BD] | Lote 28 | TP-0051, TP-0134 | Aprovada |
| 141 | TP-0136 | executor | ✔ | api.orcamento_mes(mes, escopo) [BD] | Lote 28 | TP-0135 | Aprovada |
| 142 | TP-0137 | executor | ✔ | api.definir_orcamento [BD] | Lote 28 | TP-0134 | Aprovada |
| 143 | BK-0006 | coordenador | ✔ | Faltam app.orcamentos_escopo (TP-0135) e api.orcamento_mes (TP-0136), origem da cópia; dep | — | — | Não executada |
| 144 | TP-0138 | executor | ✔ | api.copiar_orcamento [BD] | Lote 28 | BK-0006, TP-0134 | Bloqueada |
| 145 | TP-0139 | executor | ✔ | resumo_mes: seção de orçamento e resultado da casa [BD] | Lote 28 | TP-0087, TP-0135 | Aprovada |
| 146 | TP-0140 | executor | ✔ | Dados do orçamento | Lote 29 | TP-0025, TP-0136, TP-0137, TP-0138 | Não executada |
| 147 | TP-0141 | executor | ✔ | T09a Orçamento do mês | Lote 29 | TP-0040, TP-0041, TP-0044, TP-0140 | Não executada |
| 148 | TP-0142 | executor | ✔ | T09b Folha de valor do orçamento | Lote 29 | TP-0035, TP-0036, TP-0141 | Não executada |
| 149 | TP-0143 | executor | ✔ | E2E de integração: orçamento [BD] | Lote 29 | TP-0139, TP-0141, TP-0142 | Não executada |
| 150 | TP-0144 | executor | ✔ | Tabelas app.meta e app.movimento_meta [BD] | Lote 30 | TP-0013, TP-0048 | Aprovada |
| 151 | TP-0145 | executor | ✔ | Regra app.progresso_meta [BD] | Lote 30 | TP-0144 | Aprovada |
| 152 | TP-0146 | executor | ✔ | View api.metas [BD] | Lote 30 | TP-0145 | Aprovada |
| 153 | TP-0147 | executor | ✔ | api.movimentos_meta(meta_id) [BD] | Lote 30 | TP-0144 | Aprovada |
| 154 | TP-0148 | executor | ✔ | api.locais_guardados() [BD] | Lote 30 | TP-0144 | Aprovada |
| 155 | TP-0149 | executor | ✔ | api.salvar_meta [BD] | Lote 31 | TP-0144 | Aprovada |
| 156 | TP-0150 | executor | ✔ | api.movimentar_meta [BD] | Lote 31 | TP-0144, TP-0145 | Aprovada |
| 157 | TP-0151 | executor | ✔ | resumo_mes: seção de metas e guardado no mês [BD] | Lote 31 | TP-0087, TP-0145 | Aprovada |
| 158 | TP-0152 | executor | ✔ | Dados das metas | Lote 32 | TP-0025, TP-0146, TP-0147, TP-0148, TP-0149, TP-0150 | Não executada |
| 159 | TP-0153 | executor | ✔ | T10 Metas | Lote 32 | TP-0040, TP-0044, TP-0152 | Não executada |
| 160 | TP-0154 | executor | ✔ | T11 Detalhe da meta | Lote 32 | TP-0040, TP-0044, TP-0152 | Não executada |
| 161 | TP-0155 | executor | ✔ | T12 Nova ou editar meta | Lote 32 | TP-0034, TP-0035, TP-0152 | Não executada |
| 162 | TP-0156 | executor | ✔ | T13 Aporte ou retirada | Lote 32 | TP-0034, TP-0035, TP-0036, TP-0043, TP-0154 | Não executada |
| 163 | TP-0157 | executor | ✔ | E2E de integração: metas [BD] | Lote 32 | TP-0151, TP-0153, TP-0154, TP-0155, TP-0156 | Não executada |
| 164 | TP-0158 | executor | ✔ | api.registrar_pagamento_cartao [BD] | Lote 33 | TP-0048, TP-0049, TP-0064 | Aprovada |
| 165 | TP-0159 | executor | ✔ | T21 Registrar pagamento do cartão | Lote 33 | TP-0035, TP-0036, TP-0073, TP-0158 | Não executada |
| 166 | RTP-0001 | executor | ✔ | Prettier passa a checar os testes (remover exclusão em .prettierignore) | Refatoração Lote-1 | TP-0001 | Aprovada |
| 167 | RTP-0002 | executor | ✔ | README do backend: --no-backup do local:parar | Refatoração Lote-1 | TP-0002 | Aprovada |
| 168 | RTP-0003 | executor | ✔ | Prova do Docker limpo de local:subir/local:resetar | Refatoração Lote-1 | TP-0003 | Aprovada |
| 169 | RTP-0004 | executor | ✔ | Keepalive: typecheck cobrir o arquivo de teste | Refatoração Lote-1 | TP-0006 | Aprovada |
| 170 | RTP-0005 | executor | ✔ | Vitest: rotas.test.tsx lê arquivos de src/ sob jsdom (import.meta.url não é file:) | Refatoração Lote-4 | TP-0021 | Aprovada |
| 171 | RTP-0007 | executor | ✔ | formatacao/: cobrir os lançamentos de erro de centavos.ts e mes.ts (cobertura 100%) | Refatoração Lote-4 | TP-0024 | Aprovada |
| 172 | RTP-0008 | executor | ✔ | Lint de fronteira: cobrir import() dinâmico e escrita via variável | Refatoração Lote-4 | TP-0022 | Aprovada |
| 173 | RTP-0012 | executor | ✔ | Lint de fronteira: não sinalizar X.from() que não seja cliente supabase | Refatoração Lote-4 | RTP-0008 | Aprovada |
| 174 | RTP-0014 | executor | ✔ | Lint de fronteira: cobrir import() com template literal e .from() por colchetes | Refatoração Lote-4 | RTP-0008 | Aprovada |
| 175 | RTP-0025 | executor | ✔ | Lint global verde: EstadosDeLeitura importa ganchos/ e any em testes-api/sessoes.ts | Refatoração Lote-4 | RTP-0014 | Aprovada |
| 176 | RTP-0031 | executor | ✔ | Tipar ClienteApi de testes-api com tipos gerados do schema api (remover any de sessoes.ts) | Refatoração Lote-4 | RTP-0025 | Aprovada |
| 177 | RTP-0050 | executor | ✔ | Remover view api.categorias inexistente de tipos-api.ts e checar aderência do tipo ao s... | Refatoração Lote-4 | RTP-0031 | Aprovada |
| 178 | RTP-0052 | executor | ✔ | Tirar ID de tarefa do comentário de categorias-pendente.ts | Refatoração Lote-4 | RTP-0050 | Testada (aguarda segurança) |
| 179 | RTP-0009 | executor | ✔ | GrupoChips: erro focável e CSS do campo sem duplicar | Refatoração Lote-8 | TP-0043 | Aprovada |
| 180 | RTP-0010 | executor | ✔ | Aviso/Faixa: spec Playwright com componentes reais e print | Refatoração Lote-8 | TP-0039 | Aprovada |
| 181 | RTP-0015 | executor | ✔ | Testes de Esqueleto, EstadoVazio, LinhaVazia e axe dos estados | Refatoração Lote-8 | TP-0040 | Aprovada |
| 182 | RTP-0011 | executor | ✔ | Unificar @keyframes girar do PuxarParaAtualizar com o Botao | Refatoração Lote-15 | TP-0079 | Aprovada |
| 183 | RTP-0019 | executor | ✔ | Remover classe morta estilo.salvando do Botao | Refatoração Lote-15 | RTP-0011 | Aprovada |
| 184 | RTP-0013 | executor | ✔ | Catálogo: lista fechada de security definer por assinatura | Refatoração Lote-3 | TP-0017 | Aprovada |
| 185 | RTP-0016 | executor | ✔ | testes-api: formatar com Prettier os arquivos de casos | Refatoração Lote-3 | TP-0016 | Aprovada |
| 186 | RTP-0020 | executor | ✔ | Catálogo: tirar a citação de lote do comentário de catalogo.sql | Refatoração Lote-3 | RTP-0013 | Aprovada |
| 187 | RTP-0017 | executor | ✔ | Seed de categorias: eliminar a lista duplicada de api.inicializar_membro() | Refatoração Lote-10 | TP-0052 | Aprovada |
| 188 | RTP-0026 | executor | ✔ | FK de lancamento.categoria_id sem checar dono nem lar da categoria individual | Refatoração Lote-10 | TP-0051 | Aprovada |
| 189 | RTP-0018 | executor | ✔ | Caso testes-api de salvar_categoria: mesmaForma e leitura pela view | Refatoração Lote-11 | TP-0053, TP-0059 | Não executada |
| 190 | RTP-0022 | executor | ✔ | Caso testes-api de salvar_forma: usar os ids do seed | Refatoração Lote-11 | TP-0056 | Aprovada |
| 191 | RTP-0024 | executor | ✔ | Caso testes-api de definir_preferida: usar ids do seed | Refatoração Lote-11 | TP-0058 | Aprovada |
| 192 | RTP-0028 | executor | ✔ | Casos testes-api de arquivar/excluir forma: usar os ids do seed | Refatoração Lote-11 | TP-0057 | Aprovada |
| 193 | RTP-0029 | executor | ✔ | Casos testes-api de arquivar/excluir conta: usar os ids do seed | Refatoração Lote-11 | TP-0055 | Aprovada |
| 194 | RTP-0021 | executor | ✔ | Meta conjunta: impedir que um membro a torne individual ou troque o dono | Refatoração Lote-30 | TP-0144 | Aprovada |
| 195 | RTP-0027 | executor | ✔ | Teste de API movimentos-meta: B não pode receber id nem nome da conta de A | Refatoração Lote-30 | TP-0147 | Aprovada |
| 196 | RTP-0038 | executor | ✔ | Formatar movimentos-meta.test.ts (prettier: espaço faltando em ALEATORIO) | Refatoração Lote-30 | RTP-0027 | Aprovada |
| 197 | RTP-0023 | executor | ✔ | Caso testes-api de definir_orcamento: conferir efeito via orcamento_mes | Refatoração Lote-28 | TP-0136 | Aprovada |
| 198 | RTP-0043 | executor | ✔ | Atualizar o pgTAP de resumo_mes que ainda espera orcamento nulo | Refatoração Lote-28 | TP-0139 | Aprovada |
| 199 | RTP-0030 | executor | ✔ | Extrair a agregação por categoria comum a totais_conjunto e totais_individuais | Refatoração Lote-17 | TP-0086 | Aprovada |
| 200 | RTP-0034 | executor | ✔ | Caso testes-api de resumo-mes: despesa de isolamento fica no seed compartilhado | Refatoração Lote-17 | TP-0087 | Aprovada |
| 201 | RTP-0041 | executor | ✔ | Volume de 2 anos: rodar ANALYZE ao fim da carga para medir com estatísticas | Refatoração Lote-17 | TP-0088 | Aprovada |
| 202 | RTP-0032 | executor | ✔ | Casos testes-api que criam metas poluem o seed compartilhado e deixam metas.test.ts dep... | Refatoração Lote 31 | TP-0150 | Aprovada |
| 203 | RTP-0033 | executor | ✔ | Caso testes-api de ajustar_saldo: usar os ids do seed | Refatoração Lote-13 | TP-0066 | Aprovada |
| 204 | RTP-0035 | executor | ✔ | Caso testes-api de editar-lancamento: limpar o que cria e provar o editor | Refatoração Lote-19 | TP-0099 | Aprovada |
| 205 | RTP-0039 | executor | ✔ | Limitar o valor máximo de lançamento (editar e lançar) contra estouro de bigint | Refatoração Lote-19 | TP-0099 | Aprovada |
| 206 | RTP-0036 | executor | ✔ | Caso testes-api de salvar-despesa-fixa: limpar o que cria e provar a edição | Refatoração Lote-25 | TP-0122 | Aprovada |
| 207 | RTP-0040 | executor | ✔ | Caso testes-api de encerrar-despesa-fixa: apagar as fixas que cria | Refatoração Lote-25 | RTP-0036, TP-0123 | Aprovada |
| 208 | RTP-0042 | executor | ✔ | Caso testes-api de ocorrencias-mes: corrigir erro de tipo (typecheck) | Refatoração Lote-25 | TP-0124 | Aprovada |
| 209 | RTP-0037 | executor | ✔ | Caso testes-api de registrar_pagamento_cartao: corrigir erro de tipo (typecheck) | Refatoração Lote-33 | TP-0158 | Aprovada |
| 210 | RTP-0044 | executor | ✔ | Caso testes-api de pagar-ocorrencia: apagar as fixas e os lançamentos que cria | Refatoração Lote-26 | TP-0125 | Aprovada |
| 211 | RTP-0045 | executor | ✔ | garantir_ocorrencias: limitar o mês gerado por resumo_mes/ocorrencias_mes a uma janela... | Refatoração Lote-26 | TP-0127 | Aprovada |
| 212 | RTP-0046 | executor | ✔ | Lançamento ligado a ocorrência de fixa: só o pagador altera ou exclui (RN-06, I-20) | Refatoração Lote-26 | TP-0126 | Aprovada |
| 213 | RTP-0048 | executor | ✔ | pgTAP e Vitest de ocorrências: fixar app.hoje() ou datas relativas, para a janela de ±1... | Refatoração Lote-26 | RTP-0045 | Aprovada |
| 214 | RTP-0049 | executor | ✔ | Vitest resumo-mes e ocorrencias-mes: derivar os meses do mês corrente, sem datas literais | Refatoração Lote-26 | RTP-0048 | Aprovada |
| 215 | RTP-0051 | executor | ✔ | Vitest resumo-mes: derivar mesSemDado de api.contexto().hoje, não do relógio do Node | Refatoração Lote-26 | RTP-0049 | Aprovada |
| 216 | RTP-0047 | executor | ✔ | resumo_mes: extrair o item de meta repetido (e o prazo de api.metas) para uma função app.* | Refatoração Lote-31 | TP-0151 | Aprovada |
| 217 | BK-0003 | coordenador | ✔ | Aguardar 2026-10-11 ~01:26Z (janela minimumReleaseAge de 1 dia de @cloudflare/workers-type | — | — | Não executada |
| 218 | RTP-0006 | executor | ✔ | Remover exceção minimumReleaseAgeExclude de workers-types | Refatoração Lote-1 | BK-0003, TP-0006 | Bloqueada |
