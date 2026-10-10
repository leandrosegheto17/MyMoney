// Códigos estáveis de erro: são o `message` do `raise exception` no banco (regra de negócio)
// ou o erro do Auth já normalizado. A lista só cresce, sempre de forma aditiva; a tradução
// para pt-BR fica na camada de dados do web.

export const CODIGOS_ERRO_REGRA = [
  'valor_invalido',
  'registro_invalido',
  'sem_permissao',
  'confirmar_descarte_ajustes',
  'categoria_em_uso',
  'em_uso',
  'nome_repetido',
  'categoria_arquivada',
  'forma_arquivada',
  'conta_arquivada',
  'ocorrencia_paga',
  'retirada_maior_que_guardado',
] as const;

export const CODIGOS_ERRO_AUTH = ['credenciais_invalidas', 'senha_fraca', 'link_expirado'] as const;

export const CODIGOS_ERRO = [...CODIGOS_ERRO_REGRA, ...CODIGOS_ERRO_AUTH] as const;

export type CodigoErroRegra = (typeof CODIGOS_ERRO_REGRA)[number];
export type CodigoErroAuth = (typeof CODIGOS_ERRO_AUTH)[number];
export type CodigoErro = CodigoErroRegra | CodigoErroAuth;
