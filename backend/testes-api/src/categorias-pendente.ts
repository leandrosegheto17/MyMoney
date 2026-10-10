import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClienteApi } from './sessoes';
import type { Database } from './tipos-api';

// A view api.categorias ainda não existe em schemas/api. Os casos de categoria já a leem, então
// ela fica tipada só aqui, fora de tipos-api.ts (que espelha apenas o que existe em schemas/api).
// Ao criar a view, mova o tipo para tipos-api.ts e apague este arquivo.
type CategoriasPlanejada = Database & {
  api: {
    Views: {
      categorias: {
        Row: { id: string; nome: string; tipo: string; escopo: string; variavel: boolean; arquivada: boolean };
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
        Relationships: [];
      };
    };
  };
};

export const comCategorias = (cliente: ClienteApi) => cliente as unknown as SupabaseClient<CategoriasPlanejada, 'api'>;
