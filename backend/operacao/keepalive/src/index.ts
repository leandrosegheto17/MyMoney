import { manterAcordado } from './manter-acordado';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export default {
  scheduled(_evento, env, ctx) {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      throw new Error('secrets_ausentes');
    }
    ctx.waitUntil(
      manterAcordado(
        { url: env.SUPABASE_URL, chaveAnon: env.SUPABASE_ANON_KEY },
        {
          buscar: (url, init) => fetch(url, init),
          esperar: (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
          log: (nivel, dados) =>
            nivel === 'erro' ? console.error(JSON.stringify(dados)) : console.info(JSON.stringify(dados)),
        },
      ),
    );
  },
} satisfies ExportedHandler<Env>;
