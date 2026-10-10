export interface Alvo {
  url: string;
  chaveAnon: string;
}

export interface Dependencias {
  buscar: (url: string, init: RequestInit) => Promise<Response>;
  esperar: (ms: number) => Promise<void>;
  log: (nivel: 'info' | 'erro', dados: Record<string, unknown>) => void;
}

/**
 * Chama `rpc/ping` com retentativas e espera exponencial. Só status e número da
 * tentativa são logados: a mensagem de erro de rede pode conter a URL.
 */
export async function manterAcordado(
  { url, chaveAnon }: Alvo,
  { buscar, esperar, log }: Dependencias,
  tentativas = 3,
  esperaBaseMs = 1000,
): Promise<void> {
  const destino = `${url.replace(/\/+$/, '')}/rest/v1/rpc/ping`;
  const init: RequestInit = {
    method: 'POST',
    headers: {
      apikey: chaveAnon,
      Authorization: `Bearer ${chaveAnon}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  };

  for (let n = 1; n <= tentativas; n++) {
    let status: number | 'erro_rede';
    let ok = false;
    try {
      const resposta = await buscar(destino, init);
      status = resposta.status;
      ok = resposta.ok;
    } catch {
      status = 'erro_rede';
    }
    log('info', { tentativa: n, status });
    if (ok) return;
    if (n < tentativas) await esperar(esperaBaseMs * 2 ** (n - 1));
  }

  log('erro', { tentativas, resultado: 'keepalive_falhou' });
  throw new Error('keepalive_falhou');
}
