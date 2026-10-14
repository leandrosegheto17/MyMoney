import type { CodigoErro } from '@mymoney/contrato/erros';

const GENERICO = 'Não foi possível concluir. Tente de novo.';

/** Texto pt-BR de cada código de erro do contrato; a tela nunca mostra o código nem a mensagem do servidor. */
export const ROTULO_ERRO = {
  valor_invalido: { texto: 'Confira o valor e as parcelas.' },
  registro_invalido: { texto: 'Esta categoria ou forma não está mais disponível. Escolha outra.' },
  sem_permissao: { texto: 'Você não tem permissão para fazer isso.' },
  confirmar_descarte_ajustes: { texto: 'Confirme o descarte dos ajustes para continuar.' },
  categoria_em_uso: { texto: 'Esta categoria está em uso e não pode ser removida.' },
  em_uso: { texto: 'Este item está em uso e não pode ser removido.' },
  nome_repetido: { texto: 'Já existe um item com esse nome.' },
  categoria_arquivada: { texto: 'Esta categoria foi arquivada. Escolha outra.' },
  forma_arquivada: { texto: 'Esta forma de pagamento foi arquivada. Escolha outra.' },
  conta_arquivada: { texto: 'Esta conta foi arquivada. Escolha outra.' },
  ocorrencia_paga: { texto: 'Esta ocorrência já foi paga.' },
  retirada_maior_que_guardado: { texto: 'A retirada é maior que o valor guardado.' },
  credenciais_invalidas: { texto: 'E-mail ou senha incorretos.' },
  senha_fraca: { texto: 'Escolha uma senha mais forte.' },
  link_expirado: { texto: 'Este link expirou. Peça um novo.' },
} as const satisfies Record<CodigoErro, { texto: string }>;

/** Texto para quando o código não é reconhecido ou o envio falhou sem código. */
export const TEXTO_ERRO_GENERICO = GENERICO;
