# TASKPLAN — ordem de execução e estado das tarefas

Gerado por `/organizar` (`python .claude/scripts/taskplan.py gerar`) e mantido pelo `/executar`,
que troca o estado da linha a cada etapa. O Status oficial continua no `TASK.md` (bloqueios `BK-`: no
arquivo do bloqueio); o detalhe de cada tarefa está em `.md/.taskplan/<ID>.md`. A ordem respeita as
dependências. Agente: `executor` (TP/RTP) ou `coordenador` (BK/SPK, com o usuário).

Atualizado: 2026-10-15 18:19

Resumo: Não executada 7 · Em execução 4 · Em teste 2 · Em validação de segurança 2 · Aprovada 350 · Dividida 1 · Despriorizada 2 · total 368

Estados: Não executada → Em execução → Executada (aguarda teste) → Em teste → Testada (aguarda segurança) → Em validação de segurança → Aprovada (e, à parte, Bloqueada, Dividida e Despriorizada — esta fica sempre no fim da lista e é ignorada por /executar, /testar e /validar). `Aprovada` = QA ✔ e Sec ✔ (tarefas antigas só `Concluída` aparecem como Aprovada).

| # | Tarefa | Agente | Plano | Título | Lote | Dep | Estado |
|---|---|---|---|---|---|---|---|
| 1 | TP-0001 | executor | ✔ | Workspace pnpm na raiz | Lote 1 | — | Aprovada |
| 2 | TP-0002 | executor | ✔ | Supabase CLI local em backend/supabase [BD] | Lote 1 | TP-0001 | Aprovada |
| 3 | TP-0003 | executor | ✔ | Schemas app e api e privilégios padrão [BD] | Lote 1 | TP-0002 | Aprovada |
| 4 | TP-0004 | executor | ✔ | Utilitários de data do banco: app.hoje(), app.dia_no_mes(), app.inicio_mes() [BD] | Lote 1 | TP-0003 | Aprovada |
| 5 | TP-0005 | executor | ✔ | Função api.ping() [BD] | Lote 1 | TP-0003 | Aprovada |
| 6 | TP-0006 | executor | ✔ | Worker de keep-alive (@mymoney/keepalive): código | Lote 1 | TP-0001 | Aprovada |
| 7 | BK-0001 | coordenador | ✔ | Decidir como o gitleaks no histórico (35 achados: JWTs de exemplo em commit antigo e .clau | — | — | Aprovada |
| 8 | TP-0007 | executor | ✔ | CI base no GitHub Actions | Lote 1 | BK-0001, TP-0001 | Aprovada |
| 9 | TP-0008 | executor | ✔ | Script backend/operacao/deploy/migrar.sh [BD] | Lote 2 | TP-0002, TP-0007 | Aprovada |
| 10 | TP-0009 | executor | ✔ | Limpeza do Supabase de produção com verificação de região [U] | Lote 2 | TP-0002 | Aprovada |
| 11 | BK-0030 | coordenador | ✔ | Tarefa [U]: aplicar/confirmar no painel de produção Supabase os itens de Auth/API e inform | — | — | Aprovada |
| 12 | TP-0010 | executor | ✔ | Configuração do Auth e da API em produção [U] | Lote 2 | BK-0030, TP-0009 | Aprovada |
| 13 | TP-0011 | executor | ✔ | Primeira migration em produção (todas as migrations do repositório) [U] | Lote 2 | TP-0004, TP-0005, TP-0008, TP-0010 | Aprovada |
| 14 | TP-0013 | executor | ✔ | Tabelas app.lar e app.membro, RLS e app.membro_atual()/app.lar_atual() [BD] | Lote 3 | TP-0003 | Aprovada |
| 15 | TP-0014 | executor | ✔ | Seeds locais de acesso [BD] | Lote 3 | TP-0013 | Aprovada |
| 16 | TP-0015 | executor | ✔ | api.contexto() [BD] | Lote 3 | TP-0004, TP-0013 | Aprovada |
| 17 | TP-0016 | executor | ✔ | Pacote @mymoney/testes-api (suíte de isolamento) [BD] | Lote 3 | TP-0014, TP-0015 | Aprovada |
| 18 | TP-0017 | executor | ✔ | Testes de catálogo da segurança do banco [BD] | Lote 3 | TP-0013 | Aprovada |
| 19 | TP-0018 | executor | ✔ | CI do banco | Lote 3 | TP-0007, TP-0016 | Aprovada |
| 20 | TP-0019 | executor | ✔ | Pacote @mymoney/contrato: tipos gerados e códigos de erro [BD] | Lote 4 | TP-0015, TP-0018 | Aprovada |
| 21 | TP-0020 | executor | ✔ | Tipos das respostas em JSON e das linhas das views | Lote 4 | TP-0019 | Aprovada |
| 22 | TP-0021 | executor | ✔ | Esqueleto @mymoney/web | Lote 4 | TP-0001 | Aprovada |
| 23 | TP-0022 | executor | ✔ | Regras de fronteira no lint do web | Lote 4 | TP-0021 | Aprovada |
| 24 | TP-0023 | executor | ✔ | Base visual e comparação visual | Lote 4 | TP-0021 | Aprovada |
| 25 | TP-0024 | executor | ✔ | formatacao/ | Lote 4 | TP-0021 | Aprovada |
| 26 | TP-0025 | executor | ✔ | dados/ núcleo: cliente, sessão, erros e contexto | Lote 5 | TP-0015, TP-0019, TP-0022 | Aprovada |
| 27 | TP-0026 | executor | ✔ | Modo de comparação visual (sessão falsa e sem sessão) | Lote 5 | TP-0023, TP-0025 | Aprovada |
| 28 | TP-0027 | executor | ✔ | PWA: manifest, ícones e service worker | Lote 5 | TP-0021 | Aprovada |
| 29 | TP-0028 | executor | ✔ | vercel.json: rotas e cabeçalhos de segurança | Lote 5 | TP-0009, TP-0021 | Aprovada |
| 30 | TP-0029 | executor | ✔ | Limpeza e reconfiguração do projeto Vercel mymoney [U] | Lote 5 | TP-0010, TP-0027, TP-0028 | Aprovada |
| 31 | TP-0030 | executor | ✔ | CI do frontend e isolamento como condição de deploy [U] | Lote 5 | TP-0018, TP-0026, TP-0029 | Aprovada |
| 32 | TP-0031 | executor | ✔ | Página de ensaio do teclado (descartável) | Lote 6 | TP-0027, TP-0029 | Aprovada |
| 33 | SPK-0001 | coordenador | — | Spike: teclado numérico no "+" no iPhone 17 e no Moto Edge 60 | Lote 6 | TP-0031 | Aprovada |
| 34 | TP-0032 | executor | ✔ | BarraNavegacao e TrilhoNavegacao | Lote 7 | TP-0023 | Aprovada |
| 35 | TP-0033 | executor | ✔ | Roteamento e layout autenticado | Lote 7 | TP-0025, TP-0032 | Aprovada |
| 36 | TP-0034 | executor | ✔ | Campos de formulário e botão | Lote 7 | TP-0023, TP-0024 | Aprovada |
| 37 | TP-0035 | executor | ✔ | CampoValor (centavos) | Lote 7 | TP-0023, TP-0024 | Aprovada |
| 38 | BK-0002 | coordenador | ✔ | Folha.test.tsx:199 (pré-escrito) exige queryByLabelText('Valor') nulo com o campo no DOM; | — | — | Aprovada |
| 39 | TP-0036 | executor | ✔ | Folha (bottom sheet e diálogo no PC) | Lote 7 | BK-0002, TP-0023 | Aprovada |
| 40 | TP-0037 | executor | ✔ | DialogoConfirmacao | Lote 7 | TP-0036 | Aprovada |
| 41 | TP-0038 | executor | ✔ | rotulos/ | Lote 8 | TP-0020, TP-0021 | Aprovada |
| 42 | TP-0039 | executor | ✔ | Aviso (toast) e Faixa | Lote 8 | TP-0023 | Aprovada |
| 43 | TP-0040 | executor | ✔ | EstadoVazio, EstadoErro, Esqueleto e leitura com cache | Lote 8 | TP-0023, TP-0039 | Aprovada |
| 44 | TP-0041 | executor | ✔ | SeletorMes | Lote 8 | TP-0024, TP-0033 | Aprovada |
| 45 | TP-0042 | executor | ✔ | SeloEscopo e SeloSituacao | Lote 8 | TP-0038 | Aprovada |
| 46 | TP-0043 | executor | ✔ | ChipOpcao e GrupoChips | Lote 8 | TP-0023 | Aprovada |
| 47 | TP-0044 | executor | ✔ | BarraProgresso, ValorDestaque e CartaoResumo | Lote 8 | TP-0038 | Aprovada |
| 48 | TP-0045 | executor | ✔ | T01 Entrar | Lote 9 | TP-0026, TP-0033, TP-0034, TP-0039 | Aprovada |
| 49 | TP-0046 | executor | ✔ | T01b Redefinir senha | Lote 9 | TP-0026, TP-0033, TP-0034, TP-0039 | Aprovada |
| 50 | TP-0160 | executor | ✔ | dados/sessao: "Sair de todos" revoga no servidor antes de remover a sessão local | Lote 9 | TP-0025 | Aprovada |
| 51 | TP-0047 | executor | ✔ | T14 Ajustes | Lote 9 | TP-0026, TP-0033, TP-0037, TP-0039, TP-0160 | Aprovada |
| 52 | TP-0048 | executor | ✔ | Tabelas app.conta e app.movimento_conta [BD] | Lote 10 | TP-0013 | Aprovada |
| 53 | TP-0049 | executor | ✔ | Tabela app.forma_pagamento [BD] | Lote 10 | TP-0048 | Aprovada |
| 54 | TP-0050 | executor | ✔ | Tabela app.categoria [BD] | Lote 10 | TP-0013 | Aprovada |
| 55 | TP-0051 | executor | ✔ | Tabelas app.lancamento, app.lancamento_pagamento e app.parcela [BD] | Lote 10 | TP-0048, TP-0049, TP-0050 | Aprovada |
| 56 | TP-0052 | executor | ✔ | api.inicializar_membro() [BD] | Lote 10 | TP-0050 | Aprovada |
| 57 | TP-0053 | executor | ✔ | View api.categorias [BD] | Lote 10 | TP-0016, TP-0050, TP-0051 | Aprovada |
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
| 73 | TP-0069 | executor | ✔ | Dados dos cadastros (consultas, comandos e primeiro uso) | Lote 14 | TP-0025, TP-0052, TP-0053, TP-0054, TP-0055, TP-0056, TP-0057, TP-0058, TP-0059, TP-0060, TP-0065, TP-0066, TP-0068 | Aprovada |
| 74 | TP-0070 | executor | ✔ | T15 Contas | Lote 14 | TP-0040, TP-0047, TP-0069 | Aprovada |
| 75 | TP-0071 | executor | ✔ | T16 Conta | Lote 14 | TP-0034, TP-0035, TP-0037, TP-0039, TP-0045, TP-0047, TP-0069 | Aprovada |
| 76 | TP-0072 | executor | ✔ | T17 Formas de pagamento | Lote 14 | TP-0040, TP-0047, TP-0069, TP-0070 | Aprovada |
| 77 | TP-0073 | executor | ✔ | T18 Forma de pagamento | Lote 14 | TP-0034, TP-0037, TP-0039, TP-0045, TP-0047, TP-0069, TP-0070 | Aprovada |
| 78 | TP-0074 | executor | ✔ | T19 Categorias | Lote 14 | TP-0040, TP-0042, TP-0047, TP-0069, TP-0070 | Aprovada |
| 79 | TP-0075 | executor | ✔ | T20 Categoria | Lote 14 | TP-0034, TP-0037, TP-0045, TP-0047, TP-0069, TP-0070 | Aprovada |
| 80 | TP-0076 | executor | ✔ | Dados do lançamento com cache no aparelho | Lote 15 | TP-0025, TP-0063 | Aprovada |
| 81 | TP-0077 | executor | ✔ | Fila offline: núcleo (dados/fila) | Lote 15 | TP-0025, TP-0062 | Aprovada |
| 82 | TP-0078 | executor | ✔ | Fila offline: gatilhos de envio e sessão | Lote 15 | TP-0077 | Aprovada |
| 83 | TP-0079 | executor | ✔ | Puxar para atualizar | Lote 15 | TP-0023 | Aprovada |
| 84 | TP-0080 | executor | ✔ | BotaoForma e ListaFormas | Lote 16 | TP-0023, TP-0038, TP-0043 | Aprovada |
| 85 | TP-0081 | executor | ✔ | T03a Folha de lançamento montada e o "+" | Lote 16 | SPK-0001, TP-0032, TP-0033, TP-0035, TP-0036, TP-0070, TP-0076 | Aprovada |
| 86 | TP-0082 | executor | ✔ | T03b Grade de categorias | Lote 16 | TP-0042, TP-0043, TP-0081 | Aprovada |
| 87 | TP-0083 | executor | ✔ | T03c Forma, parcelas e "Mais detalhes" | Lote 16 | TP-0034, TP-0043, TP-0080, TP-0081 | Aprovada |
| 88 | TP-0084 | executor | ✔ | T03d Confirmar, avisos, fila e estados | Lote 16 | TP-0039, TP-0077, TP-0078, TP-0082, TP-0083 | Aprovada |
| 89 | TP-0085 | executor | ✔ | Regra app.totais_conjunto(mes) [BD] | Lote 17 | TP-0051 | Aprovada |
| 90 | TP-0086 | executor | ✔ | Regra app.totais_individuais(mes) [BD] | Lote 17 | TP-0051 | Aprovada |
| 91 | TP-0087 | executor | ✔ | api.resumo_mes(mes) [BD] | Lote 17 | TP-0064, TP-0067, TP-0085, TP-0086 | Aprovada |
| 92 | TP-0088 | executor | ✔ | Seed de volume de 2 anos e medição do desempenho [BD] | Lote 17 | TP-0087 | Aprovada |
| 93 | TP-0089 | executor | ✔ | T02a Estrutura, estados, cabeçalho e faixas | Lote 18 | TP-0025, TP-0033, TP-0039, TP-0040, TP-0041, TP-0047, TP-0079, TP-0087 | Aprovada |
| 94 | TP-0090 | executor | ✔ | Componentes ResumoOrcamento e MetaCompacta | Lote 18 | TP-0044, TP-0045 | Aprovada |
| 95 | TP-0091 | executor | ✔ | T02b Casa: total, quem pagou, por categoria e resultado | Lote 18 | TP-0042, TP-0044, TP-0089 | Aprovada |
| 96 | TP-0092 | executor | ✔ | T02c Casa: fixas pendentes, orçamento e metas | Lote 18 | TP-0042, TP-0089, TP-0090 | Aprovada |
| 97 | TP-0093 | executor | ✔ | T02d Eu: meu total, receitas e resultado, por categoria | Lote 18 | TP-0044, TP-0089 | Aprovada |
| 98 | BK-0026 | coordenador | ✔ | T02 sucesso: mockup inicio--sucesso.html não mostra a faixa 'N lançamentos aguardando envi | — | — | Aprovada |
| 99 | BK-0031 | coordenador | ✔ | Visual T02 'sucesso' não fecha (9,91% PC / 17,54% celular): mockup sem a faixa '1 lançamen | — | — | Aprovada |
| 100 | TP-0094 | executor | ✔ | T02e Eu: orçamento, contas, cartões e metas; Início completo | Lote 18 | BK-0026, BK-0031, TP-0090, TP-0091, TP-0092, TP-0093 | Aprovada |
| 101 | TP-0095 | executor | ✔ | T02f Primeiros passos e mês vazio | Lote 18 | TP-0089 | Aprovada |
| 102 | TP-0096 | executor | ✔ | api.lancamentos_mes [BD] | Lote 19 | TP-0051 | Aprovada |
| 103 | TP-0097 | executor | ✔ | api.lancamento(id) [BD] | Lote 19 | TP-0051 | Aprovada |
| 104 | TP-0098 | executor | ✔ | Regra app.permissoes_edicao [BD] | Lote 19 | TP-0051 | Aprovada |
| 105 | TP-0099 | executor | ✔ | api.editar_lancamento (SECURITY DEFINER) [BD] | Lote 19 | TP-0061, TP-0098 | Aprovada |
| 106 | TP-0100 | executor | ✔ | api.excluir_lancamento [BD] | Lote 19 | TP-0051 | Aprovada |
| 107 | TP-0101 | executor | ✔ | LinhaLancamento | Lote 20 | TP-0024, TP-0042, TP-0047 | Aprovada |
| 108 | TP-0102 | executor | ✔ | Dados de lançamentos (lista, detalhe, editar e excluir) | Lote 20 | TP-0025, TP-0096, TP-0097, TP-0099, TP-0100 | Aprovada |
| 109 | TP-0103 | executor | ✔ | T04a Lista do mês | Lote 20 | TP-0040, TP-0041, TP-0079, TP-0101, TP-0102 | Aprovada |
| 110 | TP-0104 | executor | ✔ | T04b Filtros e lançamentos na fila | Lote 20 | TP-0043, TP-0077, TP-0103 | Aprovada |
| 111 | TP-0105 | executor | ✔ | T05a Detalhe e edição | Lote 20 | TP-0034, TP-0035, TP-0037, TP-0039, TP-0042, TP-0045, TP-0047, TP-0102 | Aprovada |
| 112 | TP-0106 | executor | ✔ | T05c Excluir e "não existe mais" | Lote 20 | TP-0037, TP-0105 | Aprovada |
| 113 | TP-0107 | executor | ✔ | T22 Instalar o app | Lote 21 | TP-0027, TP-0036, TP-0089 | Aprovada |
| 114 | TP-0108 | executor | ✔ | T23 Envios pendentes | Lote 21 | TP-0036, TP-0037, TP-0078, TP-0084 | Aprovada |
| 115 | TP-0109 | executor | ✔ | CI: ensaio de migration sobre dados e checagem aditiva [BD] | Lote 21 | TP-0018, TP-0088 | Aprovada |
| 116 | TP-0110 | executor | ✔ | E2E de integração: entrar, primeiro uso, lançar e fila [BD] | Lote 21 | TP-0045, TP-0069, TP-0084, TP-0094, TP-0095, TP-0103, TP-0108 | Aprovada |
| 117 | TP-0111 | executor | ✔ | E2E de integração: privacidade e edição com 2 membros [BD] | Lote 21 | TP-0105, TP-0106, TP-0110 | Aprovada |
| 118 | TP-0112 | executor | ✔ | Cadastro dos 2 usuários em produção [U] | Lote 22 | TP-0029, TP-0110 | Aprovada |
| 119 | TP-0114 | executor | ✔ | Roteiro de fricção e desempenho nos aparelhos reais [U] | Lote 22 | TP-0107, TP-0112 | Aprovada |
| 120 | TP-0115 | executor | ✔ | api.lancar_receita [BD] | Lote 23 | TP-0051 | Aprovada |
| 121 | TP-0116 | executor | ✔ | T03e Modo Receita | Lote 23 | TP-0076, TP-0084, TP-0115 | Aprovada |
| 122 | TP-0117 | executor | ✔ | api.alterar_data_parcela [BD] | Lote 24 | TP-0051 | Aprovada |
| 123 | TP-0118 | executor | ✔ | T05b Lista de parcelas e "Alterar data" | Lote 24 | TP-0042, TP-0105, TP-0117 | Aprovada |
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
| 134 | TP-0129 | executor | ✔ | Dados das fixas | Lote 27 | TP-0025, TP-0121, TP-0122, TP-0123, TP-0124, TP-0125, TP-0126 | Aprovada |
| 135 | TP-0130 | executor | ✔ | T06 Despesas fixas do mês | Lote 27 | TP-0037, TP-0040, TP-0041, TP-0042, TP-0047, TP-0129 | Aprovada |
| 136 | TP-0131 | executor | ✔ | T07 Modelo de despesa fixa | Lote 27 | TP-0034, TP-0035, TP-0037, TP-0047, TP-0129 | Aprovada |
| 137 | TP-0132 | executor | ✔ | T08 Marcar fixa como paga | Lote 27 | TP-0035, TP-0036, TP-0080, TP-0130 | Aprovada |
| 138 | BK-0027 | coordenador | ✔ | TP-0133 usa a infra de E2E @integracao criada pela TP-0110/TP-0111 (ainda não executadas) | — | — | Aprovada |
| 139 | TP-0133 | executor | ✔ | E2E de integração: ciclo da despesa fixa [BD] | Lote 27 | BK-0027, TP-0110, TP-0111, TP-0127, TP-0128, TP-0130, TP-0131, TP-0132 | Em execução |
| 140 | TP-0134 | executor | ✔ | Tabela app.orcamento [BD] | Lote 28 | TP-0050 | Aprovada |
| 141 | TP-0135 | executor | ✔ | Regra app.orcado_realizado e situação [BD] | Lote 28 | TP-0051, TP-0134 | Aprovada |
| 142 | TP-0136 | executor | ✔ | api.orcamento_mes(mes, escopo) [BD] | Lote 28 | TP-0135 | Aprovada |
| 143 | TP-0137 | executor | ✔ | api.definir_orcamento [BD] | Lote 28 | TP-0134 | Aprovada |
| 144 | TP-0138 | executor | ✔ | api.copiar_orcamento [BD] | Lote 28 | TP-0134, TP-0135, TP-0136 | Aprovada |
| 145 | TP-0139 | executor | ✔ | resumo_mes: seção de orçamento e resultado da casa [BD] | Lote 28 | TP-0087, TP-0135 | Aprovada |
| 146 | TP-0140 | executor | ✔ | Dados do orçamento | Lote 29 | TP-0025, TP-0136, TP-0137, TP-0138 | Aprovada |
| 147 | TP-0141 | executor | ✔ | T09a Orçamento do mês | Lote 29 | TP-0040, TP-0041, TP-0044, TP-0081, TP-0089, TP-0090, TP-0104, TP-0140 | Aprovada |
| 148 | TP-0142 | executor | ✔ | T09b Folha de valor do orçamento | Lote 29 | TP-0035, TP-0036, TP-0141 | Aprovada |
| 149 | TP-0143 | executor | ✔ | E2E de integração: orçamento [BD] | Lote 29 | TP-0110, TP-0139, TP-0141, TP-0142 | Aprovada |
| 150 | TP-0144 | executor | ✔ | Tabelas app.meta e app.movimento_meta [BD] | Lote 30 | TP-0013, TP-0048 | Aprovada |
| 151 | TP-0145 | executor | ✔ | Regra app.progresso_meta [BD] | Lote 30 | TP-0144 | Aprovada |
| 152 | TP-0146 | executor | ✔ | View api.metas [BD] | Lote 30 | TP-0145 | Aprovada |
| 153 | TP-0147 | executor | ✔ | api.movimentos_meta(meta_id) [BD] | Lote 30 | TP-0144 | Aprovada |
| 154 | TP-0148 | executor | ✔ | api.locais_guardados() [BD] | Lote 30 | TP-0144 | Aprovada |
| 155 | TP-0149 | executor | ✔ | api.salvar_meta [BD] | Lote 31 | TP-0144 | Aprovada |
| 156 | TP-0150 | executor | ✔ | api.movimentar_meta [BD] | Lote 31 | TP-0144, TP-0145 | Aprovada |
| 157 | TP-0151 | executor | ✔ | resumo_mes: seção de metas e guardado no mês [BD] | Lote 31 | TP-0087, TP-0145 | Aprovada |
| 158 | TP-0152 | executor | ✔ | Dados das metas | Lote 32 | TP-0025, TP-0146, TP-0147, TP-0148, TP-0149, TP-0150 | Aprovada |
| 159 | TP-0153 | executor | ✔ | T10 Metas | Lote 32 | TP-0040, TP-0044, TP-0089, TP-0090, TP-0152 | Aprovada |
| 160 | TP-0154 | executor | ✔ | T11 Detalhe da meta | Lote 32 | TP-0040, TP-0044, TP-0047, TP-0152 | Aprovada |
| 161 | TP-0155 | executor | ✔ | T12 Nova ou editar meta | Lote 32 | TP-0034, TP-0035, TP-0047, TP-0070, TP-0152 | Aprovada |
| 162 | TP-0156 | executor | ✔ | T13 Aporte ou retirada | Lote 32 | TP-0034, TP-0035, TP-0036, TP-0043, TP-0070, TP-0154 | Aprovada |
| 163 | BK-0028 | coordenador | ✔ | TP-0157 usa a infra de E2E @integracao criada pela TP-0110/TP-0111 (não executadas) e não | — | — | Aprovada |
| 164 | TP-0157 | executor | ✔ | E2E de integração: metas [BD] | Lote 32 | BK-0028, TP-0110, TP-0111, TP-0151, TP-0153, TP-0154, TP-0155, TP-0156 | Em validação de segurança |
| 165 | TP-0158 | executor | ✔ | api.registrar_pagamento_cartao [BD] | Lote 33 | TP-0048, TP-0049, TP-0064 | Aprovada |
| 166 | TP-0159 | executor | ✔ | T21 Registrar pagamento do cartão | Lote 33 | TP-0035, TP-0036, TP-0073, TP-0158 | Aprovada |
| 167 | RTP-0001 | executor | ✔ | Prettier passa a checar os testes (remover exclusão em .prettierignore) | Refatoração Lote-1 | TP-0001 | Aprovada |
| 168 | RTP-0002 | executor | ✔ | README do backend: --no-backup do local:parar | Refatoração Lote-1 | TP-0002 | Aprovada |
| 169 | RTP-0003 | executor | ✔ | Prova do Docker limpo de local:subir/local:resetar | Refatoração Lote-1 | TP-0003 | Aprovada |
| 170 | RTP-0004 | executor | ✔ | Keepalive: typecheck cobrir o arquivo de teste | Refatoração Lote-1 | TP-0006 | Aprovada |
| 171 | BK-0003 | coordenador | ✔ | Aguardar 2026-10-11 ~01:26Z (janela minimumReleaseAge de 1 dia de @cloudflare/workers-type | — | — | Aprovada |
| 172 | RTP-0006 | executor | ✔ | Remover exceção minimumReleaseAgeExclude de workers-types | Refatoração Lote-1 | BK-0003, TP-0006 | Aprovada |
| 173 | RTP-0053 | executor | ✔ | Tirar ID de tarefa dos nomes de pasta de prints em frontend/web/e2e | Refatoração Lote-1 | TP-0007 | Aprovada |
| 174 | RTP-0055 | executor | ✔ | Fixar por SHA as ações de terceiros do ci.yml | Refatoração Lote-1 | TP-0007 | Aprovada |
| 175 | RTP-0005 | executor | ✔ | Vitest: rotas.test.tsx lê arquivos de src/ sob jsdom (import.meta.url não é file:) | Refatoração Lote-4 | TP-0021 | Aprovada |
| 176 | RTP-0007 | executor | ✔ | formatacao/: cobrir os lançamentos de erro de centavos.ts e mes.ts (cobertura 100%) | Refatoração Lote-4 | TP-0024 | Aprovada |
| 177 | RTP-0008 | executor | ✔ | Lint de fronteira: cobrir import() dinâmico e escrita via variável | Refatoração Lote-4 | TP-0022 | Aprovada |
| 178 | RTP-0012 | executor | ✔ | Lint de fronteira: não sinalizar X.from() que não seja cliente supabase | Refatoração Lote-4 | RTP-0008 | Aprovada |
| 179 | RTP-0014 | executor | ✔ | Lint de fronteira: cobrir import() com template literal e .from() por colchetes | Refatoração Lote-4 | RTP-0008 | Aprovada |
| 180 | RTP-0025 | executor | ✔ | Lint global verde: EstadosDeLeitura importa ganchos/ e any em testes-api/sessoes.ts | Refatoração Lote-4 | RTP-0014 | Aprovada |
| 181 | RTP-0031 | executor | ✔ | Tipar ClienteApi de testes-api com tipos gerados do schema api (remover any de sessoes.ts) | Refatoração Lote-4 | RTP-0025 | Aprovada |
| 182 | RTP-0050 | executor | ✔ | Remover view api.categorias inexistente de tipos-api.ts e checar aderência do tipo ao s... | Refatoração Lote-4 | RTP-0031 | Aprovada |
| 183 | RTP-0052 | executor | ✔ | Tirar ID de tarefa do comentário de categorias-pendente.ts | Refatoração Lote-4 | RTP-0050 | Aprovada |
| 184 | RTP-0063 | executor | ✔ | gerar.mjs: não vazar senha de CONTRATO_DB_URL nem usar shell no Windows | Refatoração Lote-4 | TP-0019 | Aprovada |
| 185 | RTP-0071 | executor | ✔ | gerar.mjs: corrigir no-control-regex (lint) e mascarar senha com @ ou / crus em mascara... | Refatoração Lote-4 | RTP-0063 | Aprovada |
| 186 | RTP-0075 | executor | ✔ | gerar.mjs: não repassar ao supabase mais variáveis de ambiente que o necessário | Refatoração Lote-4 | RTP-0071 | Aprovada |
| 187 | RTP-0065 | executor | ✔ | Lancamento.pagamento.forma aceitar null (receita) | Refatoração Lote-4 | TP-0020 | Aprovada |
| 188 | RTP-0009 | executor | ✔ | GrupoChips: erro focável e CSS do campo sem duplicar | Refatoração Lote-8 | TP-0043 | Aprovada |
| 189 | RTP-0010 | executor | ✔ | Aviso/Faixa: spec Playwright com componentes reais e print | Refatoração Lote-8 | TP-0039 | Aprovada |
| 190 | RTP-0015 | executor | ✔ | Testes de Esqueleto, EstadoVazio, LinhaVazia e axe dos estados | Refatoração Lote-8 | TP-0040 | Aprovada |
| 191 | RTP-0079 | executor | ✔ | SeletorMes: spec Playwright (alvos 44 px, axe) e comparação visual | Refatoração Lote-8 | TP-0041 | Aprovada |
| 192 | RTP-0080 | executor | ✔ | Testes das variantes extras de SeloSituacao (orçamento, atingida, aguardando, variável) | Refatoração Lote-8 | TP-0042 | Aprovada |
| 193 | RTP-0082 | executor | ✔ | SeletorMes: título da vitrine e comparação visual do cabeçalho | Refatoração Lote-8 | RTP-0079 | Aprovada |
| 194 | RTP-0011 | executor | ✔ | Unificar @keyframes girar do PuxarParaAtualizar com o Botao | Refatoração Lote-15 | TP-0079 | Aprovada |
| 195 | RTP-0019 | executor | ✔ | Remover classe morta estilo.salvando do Botao | Refatoração Lote-15 | RTP-0011 | Aprovada |
| 196 | RTP-0076 | executor | ✔ | Fila: item com 401/JWT não vira falhou (fica aguardando) | Refatoração Lote-15 | TP-0077 | Aprovada |
| 197 | RTP-0077 | executor | ✔ | Fila: alinhar ItemFila ao fila-offline.json do mockup e teste satisfies | Refatoração Lote-15 | TP-0077 | Aprovada |
| 198 | RTP-0078 | executor | ✔ | Cache do aparelho: descartar registro de outro usuário | Refatoração Lote-15 | TP-0076 | Aprovada |
| 199 | RTP-0013 | executor | ✔ | Catálogo: lista fechada de security definer por assinatura | Refatoração Lote-3 | TP-0017 | Aprovada |
| 200 | RTP-0016 | executor | ✔ | testes-api: formatar com Prettier os arquivos de casos | Refatoração Lote-3 | TP-0016 | Aprovada |
| 201 | RTP-0020 | executor | ✔ | Catálogo: tirar a citação de lote do comentário de catalogo.sql | Refatoração Lote-3 | RTP-0013 | Aprovada |
| 202 | RTP-0017 | executor | ✔ | Seed de categorias: eliminar a lista duplicada de api.inicializar_membro() | Refatoração Lote-10 | TP-0052 | Aprovada |
| 203 | RTP-0026 | executor | ✔ | FK de lancamento.categoria_id sem checar dono nem lar da categoria individual | Refatoração Lote-10 | TP-0051 | Aprovada |
| 204 | RTP-0054 | executor | ✔ | Alinhar pode_excluir da categoria ...415 entre seed e categorias.json | Refatoração Lote-10 | TP-0053 | Aprovada |
| 205 | RTP-0057 | executor | ✔ | Atualizar cabeçalho de 07-orcamento.sql que ficou falso com o orçamento de setembro | Refatoração Lote-10 | RTP-0054 | Aprovada |
| 206 | RTP-0018 | executor | ✔ | Caso testes-api de salvar_categoria: mesmaForma e leitura pela view | Refatoração Lote-11 | TP-0053, TP-0059 | Aprovada |
| 207 | RTP-0022 | executor | ✔ | Caso testes-api de salvar_forma: usar os ids do seed | Refatoração Lote-11 | TP-0056 | Aprovada |
| 208 | RTP-0024 | executor | ✔ | Caso testes-api de definir_preferida: usar ids do seed | Refatoração Lote-11 | TP-0058 | Aprovada |
| 209 | RTP-0028 | executor | ✔ | Casos testes-api de arquivar/excluir forma: usar os ids do seed | Refatoração Lote-11 | TP-0057 | Aprovada |
| 210 | RTP-0029 | executor | ✔ | Casos testes-api de arquivar/excluir conta: usar os ids do seed | Refatoração Lote-11 | TP-0055 | Aprovada |
| 211 | RTP-0058 | executor | ✔ | Nome único no caso de reenvio de salvar_categoria | Refatoração Lote-11 | RTP-0018 | Aprovada |
| 212 | RTP-0021 | executor | ✔ | Meta conjunta: impedir que um membro a torne individual ou troque o dono | Refatoração Lote-30 | TP-0144 | Aprovada |
| 213 | RTP-0027 | executor | ✔ | Teste de API movimentos-meta: B não pode receber id nem nome da conta de A | Refatoração Lote-30 | TP-0147 | Aprovada |
| 214 | RTP-0038 | executor | ✔ | Formatar movimentos-meta.test.ts (prettier: espaço faltando em ALEATORIO) | Refatoração Lote-30 | RTP-0027 | Aprovada |
| 215 | RTP-0023 | executor | ✔ | Caso testes-api de definir_orcamento: conferir efeito via orcamento_mes | Refatoração Lote-28 | TP-0136 | Aprovada |
| 216 | RTP-0043 | executor | ✔ | Atualizar o pgTAP de resumo_mes que ainda espera orcamento nulo | Refatoração Lote-28 | TP-0139 | Aprovada |
| 217 | RTP-0030 | executor | ✔ | Extrair a agregação por categoria comum a totais_conjunto e totais_individuais | Refatoração Lote-17 | TP-0086 | Aprovada |
| 218 | RTP-0034 | executor | ✔ | Caso testes-api de resumo-mes: despesa de isolamento fica no seed compartilhado | Refatoração Lote-17 | TP-0087 | Aprovada |
| 219 | RTP-0041 | executor | ✔ | Volume de 2 anos: rodar ANALYZE ao fim da carga para medir com estatísticas | Refatoração Lote-17 | TP-0088 | Aprovada |
| 220 | RTP-0147 | executor | ✔ | Cobrir envios--sucesso e envios--erro na comparação visual por pixel (QA TP-0108) | Refatoração Lote-21 | TP-0108 | Aprovada |
| 221 | RTP-0150 | executor | ✔ | Atualizar index.html do mockup: envios--sucesso e envios--erro (e instalar--ios/android... | Refatoração Lote-17 | RTP-0147 | Aprovada |
| 222 | RTP-0032 | executor | ✔ | Casos testes-api que criam metas poluem o seed compartilhado e deixam metas.test.ts dep... | Refatoração Lote 31 | TP-0150 | Aprovada |
| 223 | RTP-0033 | executor | ✔ | Caso testes-api de ajustar_saldo: usar os ids do seed | Refatoração Lote-13 | TP-0066 | Aprovada |
| 224 | RTP-0035 | executor | ✔ | Caso testes-api de editar-lancamento: limpar o que cria e provar o editor | Refatoração Lote-19 | TP-0099 | Aprovada |
| 225 | RTP-0039 | executor | ✔ | Limitar o valor máximo de lançamento (editar e lançar) contra estouro de bigint | Refatoração Lote-19 | TP-0099 | Aprovada |
| 226 | RTP-0036 | executor | ✔ | Caso testes-api de salvar-despesa-fixa: limpar o que cria e provar a edição | Refatoração Lote-25 | TP-0122 | Aprovada |
| 227 | RTP-0040 | executor | ✔ | Caso testes-api de encerrar-despesa-fixa: apagar as fixas que cria | Refatoração Lote-25 | RTP-0036, TP-0123 | Aprovada |
| 228 | RTP-0042 | executor | ✔ | Caso testes-api de ocorrencias-mes: corrigir erro de tipo (typecheck) | Refatoração Lote-25 | TP-0124 | Aprovada |
| 229 | RTP-0037 | executor | ✔ | Caso testes-api de registrar_pagamento_cartao: corrigir erro de tipo (typecheck) | Refatoração Lote-33 | TP-0158 | Aprovada |
| 230 | RTP-0132 | executor | ✔ | T21/T19: CSS .formulario/.item-sub/.item-titulo duplicado entre FolhaPagamentoCartao e... | Refatoração Lote-33 | TP-0159 | Aprovada |
| 231 | RTP-0133 | executor | ✔ | T21: alinhar a UX-SPEC e o aceite ao texto da nota do mockup (decisão do Coordenador) | Refatoração Lote-33 | TP-0159 | Aprovada |
| 232 | RTP-0142 | executor | ✔ | TASK.md: linha do TP-0159 ainda cita a nota curta no aceite | Refatoração Lote-33 | RTP-0133 | Aprovada |
| 233 | RTP-0044 | executor | ✔ | Caso testes-api de pagar-ocorrencia: apagar as fixas e os lançamentos que cria | Refatoração Lote-26 | TP-0125 | Aprovada |
| 234 | RTP-0045 | executor | ✔ | garantir_ocorrencias: limitar o mês gerado por resumo_mes/ocorrencias_mes a uma janela... | Refatoração Lote-26 | TP-0127 | Aprovada |
| 235 | RTP-0046 | executor | ✔ | Lançamento ligado a ocorrência de fixa: só o pagador altera ou exclui (RN-06, I-20) | Refatoração Lote-26 | TP-0126 | Aprovada |
| 236 | RTP-0048 | executor | ✔ | pgTAP e Vitest de ocorrências: fixar app.hoje() ou datas relativas, para a janela de ±1... | Refatoração Lote-26 | RTP-0045 | Aprovada |
| 237 | RTP-0049 | executor | ✔ | Vitest resumo-mes e ocorrencias-mes: derivar os meses do mês corrente, sem datas literais | Refatoração Lote-26 | RTP-0048 | Aprovada |
| 238 | RTP-0051 | executor | ✔ | Vitest resumo-mes: derivar mesSemDado de api.contexto().hoje, não do relógio do Node | Refatoração Lote-26 | RTP-0049 | Aprovada |
| 239 | RTP-0047 | executor | ✔ | resumo_mes: extrair o item de meta repetido (e o prazo de api.metas) para uma função app.* | Refatoração Lote-31 | TP-0151 | Aprovada |
| 240 | RTP-0056 | executor | ✔ | shellcheck: variável SAIDA sem uso em migrar-job-migration.test.sh (SC2034) | Lote 2 | TP-0008 | Aprovada |
| 241 | RTP-0059 | executor | ✔ | shellcheck: SC1091 em ensaiar-migration.sh (host-local.sh não resolvido) | Refatoração Lote-2 | TP-0109 | Aprovada |
| 242 | RTP-0062 | executor | ✔ | migrar.sh: validação de host do --db-url contornável (@ na query/caminho) | Refatoração Lote-2 | TP-0008 | Aprovada |
| 243 | RTP-0067 | executor | ✔ | shellcheck: SC1091 em comum/testes/host-local.test.sh (simular.sh e host-local.sh não r... | Refatoração Lote-2 | RTP-0059 | Aprovada |
| 244 | RTP-0074 | executor | ✔ | migrar.sh: --db-url vazio cai silenciosamente em --linked (produção) | Refatoração Lote-2 | RTP-0062 | Aprovada |
| 245 | RTP-0138 | executor | ✔ | Fixar fim de linha LF nos scripts .sh com .gitattributes | Refatoração Lote-2 | TP-0009 | Aprovada |
| 246 | RTP-0154 | executor | ✔ | Expor só o schema api no painel de produção e corrigir a conferência (origem TP-0010) | Refatoração Lote-2 | TP-0011 | Aprovada |
| 247 | RTP-0156 | executor | ✔ | CI: e2e do PWA roda o vite build com VITE_MODO_COMPARACAO definida | Refatoração Lote-2 | — | Aprovada |
| 248 | BK-0034 | coordenador | ✔ | SDD §2 sem destino para dados/erros, dados/uuid e tipos de dados/ usados por paginas/compo | — | — | Em execução |
| 249 | RTP-0157 | executor | ✔ | Lint: violações das regras de fronteira do web (SDD §2) deixam o job base vermelho | Refatoração Lote-2 | BK-0034 | Dividida |
| 250 | RTP-0157a | executor | ✔ | Lint de fronteira do web: camada comum/ e ganchos/ → formatacao/ na matriz e no teste (... | Refatoração Lote-2 | — | Aprovada |
| 251 | RTP-0157b | executor | ✔ | Lint de fronteira: correções genuínas de código (sem comum/) | Refatoração Lote-2 | — | Aprovada |
| 252 | RTP-0157c | executor | ✔ | Lint de fronteira: criar comum/ com reexports em dados/ e trocar os imports | Refatoração Lote-2 | RTP-0157a | Aprovada |
| 253 | RTP-0158 | executor | ✔ | Testes de rotas: mock de usePendentes sem itens e IndexedDB ausente quebram 10 testes e... | Refatoração Lote-2 | — | Aprovada |
| 254 | RTP-0060 | executor | ✔ | checar-aditiva.sh: '--' dentro de literal esconde drop/rename na mesma linha | Refatoração Lote-21 | TP-0109 | Aprovada |
| 255 | RTP-0061 | executor | ✔ | shellcheck: SC1091 em volume/carregar.sh (host-local.sh não resolvido com -x) | Refatoração Lote-21 | TP-0109 | Aprovada |
| 256 | RTP-0064 | executor | ✔ | host-local.sh: validação de host contornável por query (@ e host=) | Refatoração Lote-21 | TP-0109 | Aprovada |
| 257 | RTP-0068 | executor | ✔ | CI: shellcheck não cobre backend/supabase/*.sh (carregar.sh e carregar.test.sh fora do... | Refatoração Lote-21 | RTP-0061 | Aprovada |
| 258 | RTP-0069 | executor | ✔ | checar-aditiva.sh: tag de dollar-quote com não-ASCII ($é$) não é reconhecida e '--' den... | 21 | RTP-0060 | Aprovada |
| 259 | RTP-0070 | executor | ✔ | checar-aditiva.sh: falha aberta quando perl falta (migration com drop passa como aditiv... | 21 | RTP-0060 | Aprovada |
| 260 | RTP-0072 | executor | ✔ | checar-aditiva.sh: falha aberta quando o perl existe mas falha em execução | Refatoração Lote-21 | RTP-0060 | Aprovada |
| 261 | RTP-0073 | executor | ✔ | checar-aditiva.test.sh: dividir o arquivo de teste (417 linhas) por comportamento | Refatoração Lote-21 | RTP-0060 | Aprovada |
| 262 | RTP-0124 | executor | ✔ | Mockup: página instalar--android-passos (passos manuais do Android sem prompt) | Refatoração Lote-21 | TP-0107 | Aprovada |
| 263 | RTP-0125 | executor | ✔ | Testes da T22: checar variante e alvo mínimo pelas classes reais dos módulos CSS | Refatoração Lote-21 | TP-0107 | Aprovada |
| 264 | RTP-0135 | executor | ✔ | e2e da T22: medir altura >= 44 px dos botões da faixa de instalar | Refatoração Lote-21 | RTP-0125 | Aprovada |
| 265 | RTP-0161 | executor | ✔ | Criar o job integracao no ci.yml (supabase start, local:ci, ensaio SQL, e2e:integracao) | Refatoração Lote-21 | TP-0110 | Em teste |
| 266 | RTP-0165 | executor | ✔ | e2e de privacidade: coletor de rede de B anexado só depois do login (respostas iniciais... | Refatoração Lote-21 | TP-0111 | Em teste |
| 267 | RTP-0066 | executor | ✔ | pedirRedefinicao: não engolir erro de limite de taxa | Lote 5 | TP-0025 | Aprovada |
| 268 | RTP-0083 | executor | ✔ | Trava do modo de comparação cobre qualquer modo de build | Refatoração Lote-5 | TP-0026 | Aprovada |
| 269 | RTP-0144 | executor | ✔ | Conferir a CSP do vercel.json no navegador e arrumar espaço em package.json | Refatoração Lote-5 | TP-0028 | Aprovada |
| 270 | BK-0035 | coordenador | ✔ | Conferir no painel da Vercel a expressão do Ignored Build Step e fazer a prova nos dois se | — | — | Aprovada |
| 271 | RTP-0159 | executor | ✔ | limpeza.md: registrar o Ignored Build Step da Vercel e a causa dos cancelamentos na main | Refatoração Lote-5 | BK-0035, TP-0029 | Aprovada |
| 272 | RTP-0160 | executor | ✔ | Reconferir as variáveis da Vercel com vercel env ls e registrar | Refatoração Lote-5 | TP-0029 | Aprovada |
| 273 | RTP-0163 | executor | ✔ | limpeza.md: corrigir byte inválido em 'Conferência' e a frase 'sem deploy criado' (RTP-... | Refatoração Lote-5 | RTP-0159 | Aprovada |
| 274 | RTP-0164 | executor | ✔ | Ignored Build Step só no painel: registrar Production Branch, avaliar proteção da main... | Refatoração Lote-5 | RTP-0163 | Não executada |
| 275 | RTP-0168 | executor | ✔ | roteiro-m3.md: tirar IDs de tarefa que quebram o guarda do job base | Refatoração Lote-5 | TP-0030 | Não executada |
| 276 | RTP-0169 | executor | ✔ | Confirmar a retenção do Deployment Checks no primeiro deploy de produção e registrar o... | Refatoração Lote-5 | TP-0030 | Não executada |
| 277 | RTP-0170 | executor | ✔ | verificar-hosts: limitar as exceções da G-20 a arquivos de biblioteca (ou checar connec... | Refatoração Lote-5 | TP-0030 | Não executada |
| 278 | RTP-0081 | executor | ✔ | vitrine botao-forma: botão 'Depois' sem estilo reprova o axe (color-contrast) no spec | Refatoração Lote-16 | TP-0080 | Aprovada |
| 279 | RTP-0116 | executor | ✔ | Página por trás da folha aberta não pode esticar a captura (altura de T03 celular) | Refatoração Lote-16 | TP-0081 | Aprovada |
| 280 | RTP-0139 | executor | ✔ | SecaoParcelas: o passo a passo do Outro some ao voltar para Crédito | Refatoração Lote-16 | TP-0083 | Aprovada |
| 281 | RTP-0145 | executor | ✔ | T03 inicial dentro de 1%: deslocamento vertical de ~3 px e foco no segmentado | Refatoração Lote-16 | TP-0084 | Aprovada |
| 282 | RTP-0084 | executor | ✔ | T01 Entrar: formatação e textos de erro duplicados | Refatoração Lote-9 | TP-0045 | Aprovada |
| 283 | RTP-0085 | executor | ✔ | FormularioNovaSenha usa focarPrimeiroErro em vez de foco próprio | Refatoração Lote-9 | TP-0046 | Aprovada |
| 284 | RTP-0086 | executor | ✔ | T14: seta ausente no item 'Instalar o app' | Refatoração Lote-9 | TP-0047 | Aprovada |
| 285 | RTP-0088 | executor | ✔ | T01 Entrar: mensagem uniforme para falhas de login que revelam a conta | Refatoração Lote-9 | TP-0045 | Aprovada |
| 286 | RTP-0089 | executor | ✔ | RedefinirSenha: usar textosConexao em vez de repetir os textos de conexão | Refatoração Lote-9 | RTP-0084 | Aprovada |
| 287 | RTP-0090 | executor | ✔ | T01 Entrar: uniformizar também user_sso_managed e phone_not_confirmed | Refatoração Lote-9 | RTP-0088 | Aprovada |
| 288 | RTP-0087 | executor | ✔ | Comparação visual do cabeçalho com SeletorMes (T02/T04/T06/T09) | Refatoração Lote-20 | TP-0103 | Aprovada |
| 289 | RTP-0093 | executor | ✔ | LinhaLancamento: nome acessível da parcelada lê 'parcela k de N' | Refatoração Lote-20 | TP-0101 | Aprovada |
| 290 | RTP-0094 | executor | ✔ | Diálogo I-21: texto não fala em 'valor total' quando a mudança é de outro campo | Refatoração Lote-20 | TP-0105 | Aprovada |
| 291 | RTP-0104 | executor | ✔ | UX-SPEC §5 e aceite da T04: lista acessível é um role=list por grupo de dia | Refatoração Lote-20 | TP-0103 | Aprovada |
| 292 | RTP-0105 | executor | ✔ | Diálogo de exclusão: botão Excluir desabilitado durante a chamada | Refatoração Lote-20 | TP-0106 | Aprovada |
| 293 | RTP-0106 | executor | ✔ | textoExclusao: testes dos casos 1 parcela, individual e receita | Refatoração Lote-20 | TP-0106 | Aprovada |
| 294 | RTP-0112 | executor | ✔ | excluirLancamento: validar o id como uuid antes da RPC | Refatoração Lote-20 | TP-0106 | Aprovada |
| 295 | RTP-0123 | executor | ✔ | Rodapé da fila: tipo ItemFila fora de dados/ e texto genérico do vazio filtrado testado | Refatoração Lote-20 | TP-0104 | Aprovada |
| 296 | BK-0032 | coordenador | ✔ | Confirmar se enable_signup=true local em backend/supabase/config.toml é intencional (rever | — | — | Em execução |
| 297 | RTP-0131 | executor | ✔ | Conferir enable_signup=true não commitado em backend/supabase/config.toml | Refatoração Lote-20 | BK-0032, RTP-0087 | Não executada |
| 298 | RTP-0155 | executor | ✔ | config.toml: provedor de e-mail ligado, cadastro fechado por [auth], prova do 422 e gua... | Refatoração Lote-20 | BK-0032 | Aprovada |
| 299 | RTP-0091 | executor | ✔ | BarraProgresso: ordem do texto secundário (meta: topo, barra, depois valores e faltam) | Refatoração Lote-18 | TP-0090 | Aprovada |
| 300 | RTP-0092 | executor | ✔ | LinkMais com ícone dir como no mockup (Ver orçamento / Nova meta) | Refatoração Lote-18 | TP-0090 | Aprovada |
| 301 | RTP-0101 | executor | ✔ | BarraProgresso: remover margem de 4px entre a barra e os valores da meta (mockup tem 0) | Refatoração Lote-18 | RTP-0091 | Aprovada |
| 302 | RTP-0117 | executor | ✔ | Estilo da fórmula compartilhado, sem CasaResultado importar o CSS de CartaoSaldo | Refatoração Lote-18 | TP-0091 | Aprovada |
| 303 | RTP-0118 | executor | ✔ | CasaOrcamento: mês do vazio vindo de mes (não fixo) e import sem uso | Refatoração Lote-18 | TP-0092 | Aprovada |
| 304 | RTP-0119 | executor | ✔ | Testes de CasaFixas: título 'N de total' e axe da T02 | Refatoração Lote-18 | TP-0092 | Aprovada |
| 305 | RTP-0120 | executor | ✔ | EuPorCategoria: vazio por lista, texto do vazio testado e axe do bloco Eu | Refatoração Lote-18 | TP-0093 | Aprovada |
| 306 | RTP-0121 | executor | ✔ | T02 vazio: fechar o visual do celular e registrar o axe após TP-0094 | Lote 18 | TP-0094 | Aprovada |
| 307 | RTP-0122 | executor | ✔ | Passo 'Instale o app' dos Primeiros passos: destino definitivo (T22) | Lote 18 | TP-0095 | Aprovada |
| 308 | RTP-0095 | executor | ✔ | T06: espaço do 'Previsto a pagar' no título do cartão difere do mockup em 3 px e pequen... | Lote 27 | TP-0130 | Aprovada |
| 309 | BK-0025 | coordenador | ✔ | Decidir se a ordem erro/ajuda do componente base Campo (todas as telas) e a ajuda do valor | — | — | Aprovada |
| 310 | RTP-0096 | executor | ✔ | T07 estado de erro: reconferir a comparação visual de fixa--erro após o mockup ser alin... | Refatoração Lote-27 | BK-0025, TP-0131 | Aprovada |
| 311 | RTP-0109 | executor | ✔ | T08 estado de erro: alinhar o mockup pagar-fixa--erro à UX-SPEC (ajuda da forma e nota... | Refatoração Lote-27 | TP-0132 | Aprovada |
| 312 | RTP-0110 | executor | ✔ | Comparador visual de folhas (T08, T09, T13, T21): comparar o recorte da folha, ignorand... | Refatoração Lote-27 | TP-0132 | Aprovada |
| 313 | RTP-0130 | executor | ✔ | pagar_ocorrencia: limitar a data do pagamento a uma faixa plausível | Refatoração Lote-27 | TP-0132 | Aprovada |
| 314 | RTP-0136 | executor | ✔ | Folha de pagar fixa: limitar o campo de data à faixa que o servidor aceita e mensagem p... | Refatoração Lote-27 | RTP-0130 | Aprovada |
| 315 | RTP-0143 | executor | ✔ | Formatar data.ts (prettier) e calcular max da data de pagamento fora do render | Refatoração Lote-27 | RTP-0136 | Aprovada |
| 316 | RTP-0097 | executor | ✔ | T11 vazio no PC: resumo da meta ocupa a largura toda, como no mockup | Refatoração Lote-32 | TP-0154 | Aprovada |
| 317 | RTP-0098 | executor | ✔ | Registrar T11 em e2e/telas-implementadas.json | Refatoração Lote-32 | TP-0154 | Aprovada |
| 318 | RTP-0099 | executor | ✔ | Teste da política de retry global do clienteConsulta | Refatoração Lote-32 | TP-0154 | Aprovada |
| 319 | RTP-0100 | executor | ✔ | Alinhar aceite e UX-SPEC §6 do histórico da T11 no PC ao mockup (lista) | Refatoração Lote-32 | TP-0154 | Aprovada |
| 320 | RTP-0102 | executor | ✔ | T11: não consultar movimentos_meta com id de meta malformado | Refatoração Lote-32 | TP-0154 | Aprovada |
| 321 | RTP-0113 | executor | ✔ | T11: useMeta não consulta metas com id malformado | Refatoração Lote-32 | RTP-0102 | Aprovada |
| 322 | RTP-0126 | executor | ✔ | Registrar T12 em telas-implementadas.json | Refatoração Lote-32 | TP-0155 | Aprovada |
| 323 | RTP-0127 | executor | ✔ | T13 retirada: estado auto do mockup sem valor/conta preenchidos | Refatoração Lote-32 | TP-0156 | Aprovada |
| 324 | RTP-0128 | executor | ✔ | Extrair o parâmetro de URL da folha (?movimentar=, ?pagar=) para um gancho comum | Refatoração Lote-32 | TP-0156 | Aprovada |
| 325 | RTP-0129 | executor | ✔ | Registrar T13 em telas-implementadas.json | Refatoração Lote-32 | TP-0156 | Aprovada |
| 326 | RTP-0137 | executor | ✔ | Registrar T08, T10, T19, T20, T21 e T22 em telas-implementadas.json | Refatoração Lote-32 | TP-0153 | Aprovada |
| 327 | RTP-0141 | executor | ✔ | Folha de instalar (T22) abre no comparador visual e fica registrada em telas-implementa... | Refatoração Lote-32 | RTP-0137 | Aprovada |
| 328 | RTP-0103 | executor | ✔ | ItemLink: teste que fixa o saldo como span.valor filho direto do link | Refatoração Lote-14 | TP-0070 | Aprovada |
| 329 | RTP-0111 | executor | ✔ | Limitar o tamanho do nome da conta (cliente e servidor) | Refatoração Lote-14 | TP-0071 | Aprovada |
| 330 | RTP-0114 | executor | ✔ | T18: legenda visível do tipo no formulário de nova forma | Refatoração Lote-14 | TP-0073 | Aprovada |
| 331 | RTP-0115 | executor | ✔ | T20 Categoria: Segmentado e Interruptor fiéis ao mockup categoria--erro | Refatoração Lote-14 | TP-0075 | Aprovada |
| 332 | RTP-0107 | executor | ✔ | E2E @integracao do ajuste de data da parcela (T05 → T04 e T02) | Refatoração Lote-24 | TP-0110 | Em validação de segurança |
| 333 | RTP-0108 | executor | ✔ | Alterar data da parcela: não salvar datas parciais digitadas no campo de fallback | Refatoração Lote-24 | TP-0118 | Aprovada |
| 334 | RTP-0140 | executor | ✔ | Remover paginas/EmConstrucao.tsx órfão | Refatoração Lote-29 | TP-0141 | Aprovada |
| 335 | RTP-0146 | executor | ✔ | Folha de valor do orçamento: erro registro_invalido some junto com a folha | Refatoração Lote-29 | TP-0142 | Aprovada |
| 336 | RTP-0162 | executor | ✔ | orcamento.spec: extrair a asserção de vazamento repetida 3 vezes | Refatoração Lote-29 | TP-0143 | Aprovada |
| 337 | RTP-0148 | executor | ✔ | E2E @integracao da receita deixa lançamentos no banco local | Refatoração Lote-23 | TP-0116 | Aprovada |
| 338 | RTP-0149 | executor | ✔ | E2E @integracao da receita sem trava de host local | 23 | TP-0116 | Aprovada |
| 339 | RTP-0151 | executor | ✔ | Tirar ID de tarefa (TP-nnnn) dos 8 specs e2e; o passo do CI reprova hoje | Refatoração Revisão 2026-10-14 | — | Aprovada |
| 340 | RTP-0152 | executor | ✔ | Extrair botões de edição e diálogo de exclusão repetidos em EdicaoConta/EdicaoForma/Edi... | Refatoração Revisão 2026-10-14 | — | Aprovada |
| 341 | RTP-0153 | executor | ✔ | Job de frontend no CI (build, Playwright com axe e comparação visual), exigido pelo G-18 | Refatoração Revisão 2026-10-14 | — | Aprovada |
| 342 | RTP-0166 | executor | ✔ | cadastro-membros.md: exigir conferência do ref no painel quando o SQL for rodado pelo S... | Refatoração Lote-22 | TP-0112 | Aprovada |
| 343 | RTP-0167 | executor | ✔ | Registrar medianas e fechar lacunas do roteiro-m3 (TP-0114) | Refatoração Lote-22 | TP-0114 | Não executada |
| 344 | BK-0004 | coordenador | ✔ | Código pronto, mas BotaoForma.test.tsx depende de src/rotulos/tipoForma.ts (TP-0038, inexi | — | — | Aprovada |
| 345 | BK-0005 | coordenador | ✔ | Decidir pode_excluir em api.categorias: o JSON do mockup traz o campo, mas o plano fixa 6 | — | — | Aprovada |
| 346 | BK-0006 | coordenador | ✔ | Faltam app.orcamentos_escopo (TP-0135) e api.orcamento_mes (TP-0136), origem da cópia; dep | — | — | Aprovada |
| 347 | BK-0007 | coordenador | ✔ | TP-0070 usa CabecalhoPagina, ItemLink e Lista.module.css que o TP-0047 (T14 Ajustes) cria, | — | — | Aprovada |
| 348 | BK-0008 | coordenador | ✔ | TP-0071 usa CabecalhoPagina (TP-0047) e AvisoErroTopo.tsx (TP-0045), que ainda não existem | — | — | Aprovada |
| 349 | BK-0009 | coordenador | ✔ | TP-0155 usa CabecalhoPagina (TP-0047), que ainda não existe e não está na Dep; mesma causa | — | — | Aprovada |
| 350 | BK-0010 | coordenador | ✔ | TP-0075 usa CabecalhoPagina (TP-0047) e AvisoErroTopo (TP-0045), que ainda não existe e nã | — | — | Aprovada |
| 351 | BK-0011 | coordenador | ✔ | TP-0073 usa CabecalhoPagina (TP-0047) e AvisoErroTopo (TP-0045), que ainda não existe e nã | — | — | Aprovada |
| 352 | BK-0012 | coordenador | ✔ | TP-0072 usa CabecalhoPagina e ItemLink (TP-0047), que ainda não existe e não está na Dep; | — | — | Aprovada |
| 353 | BK-0013 | coordenador | ✔ | TP-0131 usa CabecalhoPagina (TP-0047), que ainda não existe e não está na Dep; mesma causa | — | — | Aprovada |
| 354 | BK-0014 | coordenador | ✔ | TP-0081 move folgaTeclado.ts e remove a página EnsaioTeclado, criados pelo TP-0031 (Penden | — | — | Aprovada |
| 355 | BK-0015 | coordenador | ✔ | TP-0089 usa ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK- | — | — | Aprovada |
| 356 | BK-0016 | coordenador | ✔ | TP-0105 usa CabecalhoPagina (TP-0047) e AvisoErroTopo (TP-0045), que ainda não existe e nã | — | — | Aprovada |
| 357 | BK-0017 | coordenador | ✔ | TP-0101 usa ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK- | — | — | Aprovada |
| 358 | BK-0018 | coordenador | ✔ | TP-0154 usa CabecalhoPagina (TP-0047), que ainda não existe e não está na Dep; mesma causa | — | — | Aprovada |
| 359 | BK-0019 | coordenador | ✔ | TP-0074 usa CabecalhoPagina e ItemLink (TP-0047), que ainda não existe e não está na Dep; | — | — | Aprovada |
| 360 | BK-0020 | coordenador | ✔ | TP-0130 usa CabecalhoPagina e ItemLink (TP-0047), que ainda não existe e não está na Dep; | — | — | Aprovada |
| 361 | BK-0021 | coordenador | ✔ | TP-0090 usa LinkMais.tsx (TP-0045), que ainda não existe e não está na Dep; mesma causa do | — | — | Aprovada |
| 362 | BK-0022 | coordenador | ✔ | TP-0141 usa Segmentado.tsx (TP-0081), ResumoOrcamento.tsx (TP-0090), formatacao/links.ts + | — | — | Aprovada |
| 363 | BK-0023 | coordenador | ✔ | TP-0153 usa MetaCompacta.tsx e formatarMesCurto (TP-0090), BlocoInicio.tsx e formatacao/li | — | — | Aprovada |
| 364 | BK-0024 | coordenador | ✔ | 'Sair de todos' sem rede contraria o aceite e o RNF-06: supabase-js 2.117.3 (_signOut) rem | — | — | Aprovada |
| 365 | BK-0029 | coordenador | ✔ | Acrescentar a tela T22 (faixa/folha de instalar) em .md/mockup/telas.json para que o compa | — | — | Em execução |
| 366 | BK-0033 | coordenador | ✔ | Decidir se testes-api mantém tipos do schema escritos à mão (tipos-api.ts) e pg com SQL di | — | — | Não executada |
| 367 | TP-0012 | executor | ✔ | Deploy do Worker na Cloudflare [U] | Lote 2 | TP-0006, TP-0011 | Despriorizada |
| 368 | TP-0113 | executor | ✔ | Verificação do keep-alive antes do uso diário [U] | Lote 22 | TP-0012 | Despriorizada |
