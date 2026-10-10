/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Só para o script `visual`; ver frontend/README.md. */
  readonly VITE_MODO_COMPARACAO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
