// Limpeza dos e2e @integracao: apaga, pela API do Supabase local e com a sessão do próprio
// usuário de teste, os lançamentos que o teste criou. Recusa qualquer host que não seja local
// e usa só a chave anon (a mesma do app); nenhuma chave de serviço.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

const HOSTS_LOCAIS = new Set(['127.0.0.1', 'localhost']);

function lerAmbiente(): { url: string; chave: string } {
  const arquivo = join(process.cwd(), '.env.local');
  const linhas = Object.fromEntries(
    readFileSync(arquivo, 'utf8')
      .split(/\r?\n/)
      .map((linha) => linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
  );
  const url = process.env.VITE_SUPABASE_URL ?? linhas.VITE_SUPABASE_URL;
  const chave = process.env.VITE_SUPABASE_ANON_KEY ?? linhas.VITE_SUPABASE_ANON_KEY;
  if (!url || !chave) throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ausentes em .env.local');
  return { url, chave };
}

/** Registra os `p_id` enviados a `lancar_receita`/`lancar_despesa` pela página, para apagar depois. */
export function registrarLancamentosCriados(page: Page): string[] {
  const ids: string[] = [];
  page.on('request', (req) => {
    if (!/\/rest\/v1\/rpc\/lancar_(receita|despesa)$/.test(new URL(req.url()).pathname)) return;
    const id = (req.postDataJSON() as { p_id?: string } | null)?.p_id;
    if (id && !ids.includes(id)) ids.push(id);
  });
  return ids;
}

export async function excluirLancamentosLocais(ids: string[], email: string, senha: string): Promise<void> {
  if (ids.length === 0) return;
  const { url, chave } = lerAmbiente();
  if (!HOSTS_LOCAIS.has(new URL(url).hostname)) throw new Error(`Limpeza recusada: ${url} não é um host local`);

  const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: chave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  if (!login.ok) throw new Error(`Limpeza: login falhou (${login.status})`);
  const { access_token: token } = (await login.json()) as { access_token: string };

  for (const id of ids) {
    const resposta = await fetch(`${url}/rest/v1/rpc/excluir_lancamento`, {
      method: 'POST',
      headers: {
        apikey: chave,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'api',
      },
      body: JSON.stringify({ p_id: id }),
    });
    if (!resposta.ok) throw new Error(`Limpeza: excluir ${id} falhou (${resposta.status})`);
  }
}
