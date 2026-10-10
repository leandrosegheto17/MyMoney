import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ErroDados } from '../dados/erros';

type Chaves = readonly (readonly unknown[])[];

/**
 * Fábrica dos comandos de cadastro: chama, expõe o `ErroDados` e só em sucesso invalida as chaves dadas
 * (ou as que a função devolver para as variáveis enviadas).
 */
export function useComandoCadastro<V, R>(
  comando: (variaveis: V) => Promise<R>,
  chavesInvalidadas: Chaves | ((variaveis: V) => Chaves),
) {
  const cliente = useQueryClient();
  return useMutation<R, ErroDados, V>({
    mutationFn: (variaveis) => comando(variaveis),
    onSuccess: async (_, variaveis) => {
      const chaves = typeof chavesInvalidadas === 'function' ? chavesInvalidadas(variaveis) : chavesInvalidadas;
      await Promise.all(chaves.map((queryKey) => cliente.invalidateQueries({ queryKey })));
    },
  });
}

/** Exclusão recusada porque o registro tem vínculos. */
export function ehEmUso(erro: ErroDados | null | undefined): boolean {
  return erro?.tipo === 'regra' && (erro.codigo === 'em_uso' || erro.codigo === 'categoria_em_uso');
}
