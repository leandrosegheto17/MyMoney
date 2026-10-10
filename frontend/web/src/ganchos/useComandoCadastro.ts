import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ErroDados } from '../dados/erros';

/** Fábrica dos comandos de cadastro: chama, expõe o `ErroDados` e só em sucesso invalida as chaves dadas. */
export function useComandoCadastro<V, R>(
  comando: (variaveis: V) => Promise<R>,
  chavesInvalidadas: readonly (readonly unknown[])[],
) {
  const cliente = useQueryClient();
  return useMutation<R, ErroDados, V>({
    mutationFn: (variaveis) => comando(variaveis),
    onSuccess: async () => {
      await Promise.all(chavesInvalidadas.map((queryKey) => cliente.invalidateQueries({ queryKey })));
    },
  });
}

/** Exclusão recusada porque o registro tem vínculos. */
export function ehEmUso(erro: ErroDados | null | undefined): boolean {
  return erro?.tipo === 'regra' && (erro.codigo === 'em_uso' || erro.codigo === 'categoria_em_uso');
}
