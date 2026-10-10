import { useQuery } from '@tanstack/react-query';
import { arquivarForma, definirPreferida, excluirForma, salvarForma } from '../dados/comandos/formas';
import { buscarForma, buscarFormas } from '../dados/consultas/formas';
import type { ErroDados } from '../dados/erros';
import { CHAVES } from './chavesConsulta';
import { useComandoCadastro } from './useComandoCadastro';

type Formas = Awaited<ReturnType<typeof buscarFormas>>;
type Forma = Awaited<ReturnType<typeof buscarForma>>;

export const useFormasPagamento = () =>
  useQuery<Formas, ErroDados>({ queryKey: CHAVES.formas, queryFn: buscarFormas, refetchOnWindowFocus: true });

export const useForma = (id: string) =>
  useQuery<Forma, ErroDados>({
    queryKey: CHAVES.forma(id),
    queryFn: () => buscarForma(id),
    refetchOnWindowFocus: true,
  });

export function useComandosForma() {
  const afetadas = [CHAVES.formas];
  return {
    salvarForma: useComandoCadastro(salvarForma, afetadas),
    arquivarForma: useComandoCadastro(arquivarForma, afetadas),
    excluirForma: useComandoCadastro(excluirForma, afetadas),
    definirPreferida: useComandoCadastro(
      (v: { id: string; preferida: boolean }) => definirPreferida(v.id, v.preferida),
      afetadas,
    ),
  };
}
