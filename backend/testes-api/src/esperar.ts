interface RespostaSupabase {
  data: unknown;
  error: { message: string } | null;
}

/** Único jeito de afirmar recusa: erro `registro_invalido` e nenhum dado junto. */
export async function esperarRegistroInvalido(promessa: PromiseLike<RespostaSupabase>): Promise<void> {
  const { data, error } = await promessa;
  if (!error) throw new Error('Esperava registro_invalido, mas a chamada deu certo.');
  if (error.message !== 'registro_invalido') {
    throw new Error(`Esperava registro_invalido, veio "${error.message}".`);
  }
  if (data !== null && data !== undefined) throw new Error('A recusa devolveu dado junto com o erro.');
}
